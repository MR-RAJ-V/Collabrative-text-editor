const crypto = require('crypto');
const Document = require('../models/Document');
const User = require('../models/User');
const Version = require('../models/Version');
const { docs, getIO, roomUsers } = require('../sockets/runtime');
const { ensureBuffer, extractTextFromState } = require('../utils/yjsHelpers');
const {
  canCommentFromAccess,
  canEditFromAccess,
  canManageFromAccess,
  findDocumentOrThrow,
  populateDocumentAccess,
  serializePermissions,
} = require('../services/documentAccess');

const clearLiveDocumentState = (documentId) => {
  const liveDoc = docs.get(documentId);
  if (liveDoc?.saveTimeout) {
    clearTimeout(liveDoc.saveTimeout);
  }
  if (liveDoc?.snapshotTimeout) {
    clearTimeout(liveDoc.snapshotTimeout);
  }

  docs.delete(documentId);
  roomUsers.delete(documentId);
};

const serializeDocument = (document, access) => ({
  _id: document.documentId,
  documentId: document.documentId,
  title: document.title,
  content: document.content,
  state: document.state,
  lastUpdated: document.lastUpdated || document.updatedAt,
  comments: document.comments || [],
  suggestions: document.suggestions || [],
  owner: document.ownerId ? {
    id: document.ownerId._id,
    name: document.ownerId.name,
    email: document.ownerId.email,
    avatar: document.ownerId.avatar,
  } : null,
  collaborators: (document.collaborators || []).map((item) => ({
    role: item.role,
    user: item.userId ? {
      id: item.userId._id,
      name: item.userId.name,
      email: item.userId.email,
      avatar: item.userId.avatar,
    } : null,
  })),
  sharedUsers: (document.sharedUsers || []).map((item) => ({
    id: item._id,
    name: item.name,
    email: item.email,
    avatar: item.avatar,
  })),
  visibility: document.visibility === 'link-access' ? 'link' : document.visibility,
  linkRole: document.linkRole,
  access,
});

const createDocument = async (req, res) => {
  try {
    const documentId = req.body?.documentId || crypto.randomUUID();
    const document = await Document.create({
      documentId,
      ownerId: req.user.dbUser._id,
      title: 'Untitled Document',
      content: '',
      visibility: 'private',
      linkRole: 'viewer',
      sharedUsers: [],
      collaborators: [],
      comments: [],
      suggestions: [],
    });

    const populated = await Document.findById(document._id)
      .populate('ownerId')
      .populate('sharedUsers')
      .populate('collaborators.userId');
    return res.status(201).json(serializeDocument(populated, {
      allowed: true,
      role: 'owner',
      isOwner: true,
      canRead: true,
      canComment: true,
      canEdit: true,
      canManage: true,
      visibility: populated.visibility,
      linkRole: populated.linkRole,
      user: {
        id: req.user.dbUser._id,
        firebaseUid: req.user.dbUser.firebaseUid,
        name: req.user.dbUser.name,
        email: req.user.dbUser.email,
        avatar: req.user.dbUser.avatar,
      },
    }));
  } catch (error) {
    return res.status(500).json({ message: 'Error creating document', error: error.message });
  }
};

const getDocument = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    return res.json(serializeDocument(document, access));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching document' });
  }
};

const updateDocument = async (req, res) => {
  try {
    const { state, title, content } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canEditFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to edit this document' });
    }

    if (typeof title === 'string') {
      document.title = title.trim() || 'Untitled Document';
    }

    if (state !== undefined) {
      const buffer = ensureBuffer(state);
      document.state = buffer;
      document.content = content || extractTextFromState(buffer);
    }

    if (typeof title !== 'string' && state === undefined && content === undefined) {
      return res.status(400).json({ message: 'Provide a title, content, or Yjs state payload to update the document' });
    }

    if (typeof content === 'string') {
      document.content = content;
    }

    document.lastUpdated = new Date();
    await document.save();
    return res.json(serializeDocument(document, access));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error updating document' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canManageFromAccess(access)) {
      return res.status(403).json({ message: 'Only the owner can delete this document' });
    }

    clearLiveDocumentState(document.documentId);
    await Version.deleteMany({ documentId: document.documentId });
    await Document.deleteOne({ _id: document._id });
    getIO()?.to(document.documentId).emit('document-deleted', {
      documentId: document.documentId,
      deletedAt: new Date().toISOString(),
    });

    return res.json({ deleted: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error deleting document' });
  }
};

const addComment = async (req, res) => {
  try {
    const { message, textRange, selectedText } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canCommentFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to comment on this document' });
    }

    if (!message || !textRange || typeof textRange.start !== 'number' || typeof textRange.end !== 'number') {
      return res.status(400).json({ message: 'Comment message and valid text range are required' });
    }

    document.comments.push({
      user: req.user.name,
      color: req.body?.color || '#64748b',
      message,
      textRange,
      selectedText: selectedText || '',
      comments: [],
    });
    document.lastUpdated = new Date();
    await document.save();

    return res.status(201).json(document.comments[document.comments.length - 1]);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error adding comment' });
  }
};

const updateComment = async (req, res) => {
  try {
    const { action, reply, resolved } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canCommentFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to comment on this document' });
    }

    const comment = document.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (action === 'reply') {
      if (!reply?.message) {
        return res.status(400).json({ message: 'Reply payload is required' });
      }

      comment.comments.push({
        user: req.user.name,
        color: reply.color || '#64748b',
        message: reply.message,
      });
    }

    if (typeof resolved === 'boolean') {
      comment.resolved = resolved;
    }

    comment.updatedAt = new Date();
    document.lastUpdated = new Date();
    await document.save();
    return res.json(comment);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error updating comment' });
  }
};

const addSuggestion = async (req, res) => {
  try {
    const { type, content, position } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canCommentFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to suggest edits on this document' });
    }

    if (!['insert', 'delete'].includes(type) || !position || typeof position.start !== 'number') {
      return res.status(400).json({ message: 'Suggestion type and position are required' });
    }

    document.suggestions.push({
      type,
      content: content || '',
      position: {
        start: position.start,
        end: typeof position.end === 'number' ? position.end : position.start,
      },
      user: req.user.name,
      color: req.body?.color || '#64748b',
    });
    document.lastUpdated = new Date();
    await document.save();

    return res.status(201).json(document.suggestions[document.suggestions.length - 1]);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error adding suggestion' });
  }
};

const updateSuggestion = async (req, res) => {
  try {
    const { status } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canEditFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to manage suggestions on this document' });
    }

    const suggestion = document.suggestions.id(req.params.suggestionId);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    if (status) {
      suggestion.status = status;
    }

    suggestion.updatedAt = new Date();
    document.lastUpdated = new Date();
    await document.save();
    return res.json(suggestion);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error updating suggestion' });
  }
};

const shareDocument = async (req, res) => {
  try {
    const { email, role, visibility, sharedUsers } = req.body || {};
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canManageFromAccess(access)) {
      return res.status(403).json({ message: 'Only the owner can share this document' });
    }

    if (visibility && !['private', 'link', 'link-access'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value' });
    }

    const normalizedVisibility = visibility === 'link-access' ? 'link' : visibility;
    if (normalizedVisibility) {
      document.visibility = normalizedVisibility;
    }

    const nextSharedUsers = [];
    if (Array.isArray(sharedUsers)) {
      for (const entry of sharedUsers) {
        const rawUserId = typeof entry === 'string' ? entry : entry?.userId;
        if (!rawUserId) {
          continue;
        }

        const sharedUser = await User.findById(rawUserId);
        if (!sharedUser) {
          continue;
        }

        if (String(sharedUser._id) === String(document.ownerId._id || document.ownerId)) {
          continue;
        }

        nextSharedUsers.push(String(sharedUser._id));

        const existing = document.collaborators.find(
          (item) => String(item.userId._id || item.userId) === String(sharedUser._id),
        );
        const sharedRole = ['editor', 'commenter', 'viewer'].includes(entry?.role) ? entry.role : 'viewer';

        if (existing) {
          existing.role = sharedRole;
        } else {
          document.collaborators.push({ userId: sharedUser._id, role: sharedRole });
        }
      }
    }

    if (email) {
      if (!['editor', 'commenter', 'viewer'].includes(role)) {
        return res.status(400).json({ message: 'A valid role is required when sharing by email' });
      }

      const collaboratorUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (!collaboratorUser) {
        return res.status(404).json({ message: 'No registered user found with that email address' });
      }

      if (String(collaboratorUser._id) === String(document.ownerId._id || document.ownerId)) {
        return res.status(400).json({ message: 'The owner already has full access' });
      }

      nextSharedUsers.push(String(collaboratorUser._id));

      const existing = document.collaborators.find(
        (item) => String(item.userId._id || item.userId) === String(collaboratorUser._id),
      );

      if (existing) {
        existing.role = role;
      } else {
        document.collaborators.push({ userId: collaboratorUser._id, role });
      }
    }

    if (Array.isArray(sharedUsers) || email) {
      const uniqueIds = [...new Set(nextSharedUsers)];
      document.sharedUsers = uniqueIds;
      document.collaborators = (document.collaborators || []).filter((item) => {
        const userId = String(item.userId._id || item.userId);
        return uniqueIds.includes(userId);
      });
    }

    await document.save();
    const refreshed = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    return res.json(serializePermissions(refreshed));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error sharing document' });
  }
};

const listDocuments = async (req, res) => {
  try {
    const dbUserId = req.user.dbUser._id;
    const documents = await Document.find({
      $or: [
        { ownerId: dbUserId },
        { sharedUsers: dbUserId },
        { 'collaborators.userId': dbUserId },
      ],
    })
      .populate('ownerId')
      .populate('sharedUsers')
      .sort({ updatedAt: -1 });

    return res.json(documents.map((document) => ({
      _id: document.documentId,
      documentId: document.documentId,
      title: document.title || 'Untitled Document',
      owner: document.ownerId ? {
        id: document.ownerId._id,
        name: document.ownerId.name,
        email: document.ownerId.email,
        avatar: document.ownerId.avatar,
      } : null,
      visibility: document.visibility === 'link-access' ? 'link' : document.visibility,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })));
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
};

const getPermissions = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    return res.json({
      ...serializePermissions(document),
      access,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching permissions' });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const { visibility, linkRole } = req.body || {};
    const document = await findDocumentOrThrow(req.params.id, 'ownerId sharedUsers collaborators.userId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canManageFromAccess(access)) {
      return res.status(403).json({ message: 'Only the owner can update permissions' });
    }

    if (visibility && !['private', 'link', 'link-access'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value' });
    }

    if (linkRole && !['viewer', 'commenter', 'editor'].includes(linkRole)) {
      return res.status(400).json({ message: 'Invalid link role value' });
    }

    if (visibility) {
      document.visibility = visibility === 'link-access' ? 'link' : visibility;
    }

    if (linkRole) {
      document.linkRole = linkRole;
    }

    await document.save();
    return res.json(serializePermissions(document));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error updating permissions' });
  }
};

module.exports = {
  addComment,
  addSuggestion,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  getPermissions,
  shareDocument,
  updateComment,
  updateDocument,
  updatePermissions,
  updateSuggestion,
};
