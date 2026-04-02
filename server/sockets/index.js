const { Server } = require('socket.io');
const Y = require('yjs');
const Document = require('../models/Document');
const { verifyAuthToken } = require('../middleware/auth');
const { createVersionSnapshot, persistDocumentState } = require('../services/versionService');
const {
  canEditFromAccess,
  populateDocumentAccess,
} = require('../services/documentAccess');
const {
  SYSTEM_USER,
  createVersionSummary,
  extractTextFromYDoc,
  normalizeUser,
} = require('../utils/yjsHelpers');
const { docs, roomUsers, setIO } = require('./runtime');

const IDLE_TIMEOUT = 30000;
const TYPING_TIMEOUT = 2500;
const SAVE_DELAY_MS = 3000;
const SNAPSHOT_DEBOUNCE_MS = 12000;
const SIGNIFICANT_CHANGE_THRESHOLD = 180;

const colorFromId = (id = 'system') => {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = id.charCodeAt(index) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360} 70% 55%)`;
};

const emitRoomUsers = (io, documentId) => {
  io.to(documentId).emit(
    'users-update',
    (roomUsers.get(documentId) || []).map((user) => serializePresenceUser(user)),
  );
};

const serializePresenceUser = (user = {}) => ({
  socketId: user.socketId,
  userId: user.userId,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  color: user.color,
  role: user.role,
  isTyping: Boolean(user.isTyping),
  isIdle: Boolean(user.isIdle),
  lastActivityAt: user.lastActivityAt,
});

const touchUser = (io, documentId, socketId, updates = {}) => {
  const users = roomUsers.get(documentId) || [];
  const target = users.find((user) => user.socketId === socketId);
  if (!target) {
    return;
  }

  Object.assign(target, updates, {
    lastActivityAt: new Date().toISOString(),
    isIdle: false,
  });

  if (target.idleTimeout) {
    clearTimeout(target.idleTimeout);
  }

  target.idleTimeout = setTimeout(() => {
    target.isIdle = true;
    target.isTyping = false;
    emitRoomUsers(io, documentId);
  }, IDLE_TIMEOUT);

  emitRoomUsers(io, documentId);
};

const clearTimers = (docObj) => {
  if (docObj?.saveTimeout) {
    clearTimeout(docObj.saveTimeout);
  }
  if (docObj?.snapshotTimeout) {
    clearTimeout(docObj.snapshotTimeout);
  }
};

const scheduleDocumentSave = (io, documentId, docObj) => {
  if (docObj.saveTimeout) {
    clearTimeout(docObj.saveTimeout);
  }

  docObj.saveTimeout = setTimeout(async () => {
    try {
      await persistDocumentState(documentId, Y.encodeStateAsUpdate(docObj.ydoc));
      io.to(documentId).emit('save-status', { status: 'saved', at: new Date().toISOString() });
    } catch (error) {
      console.error(`Failed to persist document ${documentId}:`, error);
      io.to(documentId).emit('save-status', { status: 'error', at: new Date().toISOString() });
    }
  }, SAVE_DELAY_MS);
};

const maybeCreateSignificantSnapshot = async (documentId, docObj) => {
  if ((docObj.pendingChangeScore || 0) < SIGNIFICANT_CHANGE_THRESHOLD) {
    return;
  }

  const currentText = extractTextFromYDoc(docObj.ydoc);
  const { version } = await createVersionSnapshot({
    documentId,
    state: Y.encodeStateAsUpdate(docObj.ydoc),
    createdBy: docObj.lastChangedBy || SYSTEM_USER,
    summary: createVersionSummary(docObj.lastSnapshotText || '', currentText, 'significant-change'),
    trigger: 'significant-change',
  });

  if (version) {
    docObj.lastSnapshotText = currentText;
    docObj.pendingChangeScore = 0;
  }
};

const scheduleDebouncedSnapshot = (documentId, docObj) => {
  if (docObj.snapshotTimeout) {
    clearTimeout(docObj.snapshotTimeout);
  }

  docObj.snapshotTimeout = setTimeout(async () => {
    try {
      const currentText = extractTextFromYDoc(docObj.ydoc);
      const { version } = await createVersionSnapshot({
        documentId,
        state: Y.encodeStateAsUpdate(docObj.ydoc),
        createdBy: docObj.lastChangedBy || SYSTEM_USER,
        summary: createVersionSummary(docObj.lastSnapshotText || '', currentText, 'auto'),
        trigger: 'auto',
      });

      if (version) {
        docObj.lastSnapshotText = currentText;
        docObj.pendingChangeScore = 0;
      }
    } catch (error) {
      console.error(`Failed to create snapshot for ${documentId}:`, error);
    }

    docObj.snapshotTimeout = null;
  }, SNAPSHOT_DEBOUNCE_MS);
};

const buildPresenceUser = (socket) => ({
  socketId: socket.id,
  userId: socket.user.uid,
  username: socket.user.name,
  email: socket.user.email,
  avatar: socket.user.avatar,
  color: colorFromId(socket.user.uid),
  role: socket.accessRole,
  isTyping: false,
  isIdle: false,
  lastActivityAt: new Date().toISOString(),
  idleTimeout: null,
  typingTimeout: null,
});

const setupSocket = (server, options = {}) => {
  const { corsOptions } = options;
  const io = new Server(server, {
    cors: corsOptions || { origin: true, methods: ['GET', 'POST'], credentials: true },
  });

  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      socket.user = await verifyAuthToken(token);
      return next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-document', async (data) => {
      try {
        const documentId = typeof data === 'string' ? data : data.documentId;
        const document = await Document.findOne({ documentId }).populate('ownerId').populate('collaborators.userId');
        if (!document) {
          socket.emit('access-denied', { message: 'Document not found' });
          return;
        }

        const access = await populateDocumentAccess({ document, authUser: socket.user });
        socket.join(documentId);
        socket.documentId = documentId;
        socket.accessRole = access.role;

        if (!roomUsers.has(documentId)) {
          roomUsers.set(documentId, []);
        }

        const usersInRoom = roomUsers.get(documentId);
        const existingIdx = usersInRoom.findIndex((user) => user.socketId === socket.id);
        if (existingIdx !== -1) {
          usersInRoom.splice(existingIdx, 1);
        }

        const presenceUser = buildPresenceUser(socket);
        usersInRoom.push(presenceUser);
        emitRoomUsers(io, documentId);
        socket.broadcast.to(documentId).emit('user-joined', serializePresenceUser(presenceUser));
        touchUser(io, documentId, socket.id);

        let docObj = docs.get(documentId);
        if (!docObj) {
          const ydoc = new Y.Doc();
          if (document.state) {
            Y.applyUpdate(ydoc, new Uint8Array(document.state));
          }

          docObj = {
            ydoc,
            saveTimeout: null,
            snapshotTimeout: null,
            pendingChangeScore: 0,
            lastSnapshotText: document.content || '',
            lastSnapshotAt: document.lastUpdated ? new Date(document.lastUpdated).getTime() : 0,
            lastChangedBy: normalizeUser(socket.user),
          };
          docs.set(documentId, docObj);
        }

        socket.emit('title-init', document.title || 'Untitled Document');
        socket.emit('document-access', access);
        socket.emit('yjs-update', Y.encodeStateAsUpdate(docObj.ydoc));
      } catch (error) {
        socket.emit('access-denied', { message: error.message || 'Unable to join document' });
      }
    });

    socket.on('title-update', async (title) => {
      if (!socket.documentId || !canEditFromAccess({ role: socket.accessRole })) {
        return;
      }

      socket.broadcast.to(socket.documentId).emit('title-update', title);
      touchUser(io, socket.documentId, socket.id);

      try {
        await Document.updateOne(
          { documentId: socket.documentId },
          { $set: { title, lastUpdated: new Date() } },
        );
      } catch (error) {
        console.error('Failed to save title', error);
      }
    });

    socket.on('yjs-update', async (update) => {
      if (!socket.documentId || !canEditFromAccess({ role: socket.accessRole })) {
        return;
      }

      const docObj = docs.get(socket.documentId);
      if (!docObj) {
        return;
      }

      try {
        const beforeText = extractTextFromYDoc(docObj.ydoc);
        Y.applyUpdate(docObj.ydoc, new Uint8Array(update));
        const afterText = extractTextFromYDoc(docObj.ydoc);

        socket.broadcast.to(socket.documentId).emit('yjs-update', update);
        touchUser(io, socket.documentId, socket.id, { isTyping: true });

        docObj.lastChangedBy = normalizeUser(socket.user);
        docObj.pendingChangeScore = (docObj.pendingChangeScore || 0) + Math.max(1, Math.abs(afterText.length - beforeText.length));

        scheduleDocumentSave(io, socket.documentId, docObj);
        scheduleDebouncedSnapshot(socket.documentId, docObj);
        await maybeCreateSignificantSnapshot(socket.documentId, docObj);
      } catch (error) {
        console.error(`Error applying update to document ${socket.documentId}:`, error);
      }
    });

    socket.on('cursor-update', (update) => {
      if (!socket.documentId) {
        return;
      }

      touchUser(io, socket.documentId, socket.id);
      socket.broadcast.to(socket.documentId).emit('cursor-update', update);
    });

    socket.on('typing-status', (isTyping) => {
      if (!socket.documentId || !roomUsers.has(socket.documentId)) {
        return;
      }

      const users = roomUsers.get(socket.documentId);
      const target = users.find((user) => user.socketId === socket.id);
      if (!target) {
        return;
      }

      target.isTyping = Boolean(isTyping);
      touchUser(io, socket.documentId, socket.id, { isTyping: Boolean(isTyping) });

      if (target.typingTimeout) {
        clearTimeout(target.typingTimeout);
      }

      if (isTyping) {
        target.typingTimeout = setTimeout(() => {
          target.isTyping = false;
          emitRoomUsers(io, socket.documentId);
        }, TYPING_TIMEOUT);
      }
    });

    socket.on('comment-added', (payload) => {
      if (socket.documentId) {
        io.to(socket.documentId).emit('comment-added', payload);
      }
    });

    socket.on('comment-updated', (payload) => {
      if (socket.documentId) {
        io.to(socket.documentId).emit('comment-updated', payload);
      }
    });

    socket.on('suggestion-added', (payload) => {
      if (socket.documentId) {
        io.to(socket.documentId).emit('suggestion-added', payload);
      }
    });

    socket.on('suggestion-updated', (payload) => {
      if (socket.documentId) {
        io.to(socket.documentId).emit('suggestion-updated', payload);
      }
    });

    socket.on('disconnect', () => {
      if (!socket.documentId) {
        return;
      }

      if (roomUsers.has(socket.documentId)) {
        let usersInRoom = roomUsers.get(socket.documentId);
        const disconnectedUser = usersInRoom.find((user) => user.socketId === socket.id);

        if (disconnectedUser?.idleTimeout) {
          clearTimeout(disconnectedUser.idleTimeout);
        }
        if (disconnectedUser?.typingTimeout) {
          clearTimeout(disconnectedUser.typingTimeout);
        }

        usersInRoom = usersInRoom.filter((user) => user.socketId !== socket.id);
        if (usersInRoom.length === 0) {
          roomUsers.delete(socket.documentId);
        } else {
          roomUsers.set(socket.documentId, usersInRoom);
          emitRoomUsers(io, socket.documentId);
        }

        if (disconnectedUser) {
          socket.broadcast.to(socket.documentId).emit('user-left', serializePresenceUser(disconnectedUser));
        }
      }

      const roomSize = io.sockets.adapter.rooms.get(socket.documentId)?.size || 0;
      if (roomSize === 0) {
        clearTimers(docs.get(socket.documentId));
      }
    });
  });
};

module.exports = setupSocket;
