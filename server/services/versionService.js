const crypto = require('crypto');
const Y = require('yjs');
const Document = require('../models/Document');
const Version = require('../models/Version');
const { docs, getIO } = require('../sockets/runtime');
const {
  SYSTEM_USER,
  createVersionSummary,
  ensureBuffer,
  extractTextFromState,
  normalizeUser,
} = require('../utils/yjsHelpers');

const SNAPSHOT_COOLDOWN_MS = 8000;

const buildVersionMetadata = (version) => ({
  versionId: version.versionId,
  createdAt: version.createdAt,
  createdBy: version.createdBy,
  summary: version.summary,
  isNamedVersion: version.isNamedVersion,
  name: version.name,
  textSnapshot: version.textSnapshot || '',
});

const loadDocumentState = async (documentId) => {
  const liveDoc = docs.get(documentId);
  if (liveDoc?.ydoc) {
    return Buffer.from(Y.encodeStateAsUpdate(liveDoc.ydoc));
  }

  const document = await Document.findOne({ documentId }, { state: 1 });
  return ensureBuffer(document?.state);
};

const persistDocumentState = async (documentId, state, extra = {}) => {
  const buffer = ensureBuffer(state);
  const content = extractTextFromState(buffer);

  await Document.findOneAndUpdate(
    { documentId },
    {
      $set: {
        state: buffer,
        content,
        lastUpdated: new Date(),
        ...extra,
      },
    },
    {
      upsert: false,
    },
  );

  return { buffer, content };
};

const createVersionSnapshot = async ({
  documentId,
  state,
  createdBy = SYSTEM_USER,
  summary,
  trigger = 'auto',
  isNamedVersion = false,
  name = '',
  allowDuplicateState = false,
  emitEvent = true,
}) => {
  const buffer = state ? ensureBuffer(state) : await loadDocumentState(documentId);
  const actor = normalizeUser(createdBy);

  if (!buffer.length) {
    return { version: null, reason: 'empty-state' };
  }

  const latestVersion = await Version.findOne({ documentId }).sort({ createdAt: -1 });
  if (!allowDuplicateState && latestVersion?.yjsState?.equals(buffer)) {
    return { version: null, reason: 'duplicate-state' };
  }

  const liveDoc = docs.get(documentId);
  const now = Date.now();
  if (
    !allowDuplicateState &&
    liveDoc?.lastSnapshotAt &&
    now - liveDoc.lastSnapshotAt < SNAPSHOT_COOLDOWN_MS
  ) {
    return { version: null, reason: 'cooldown' };
  }

  const previousText = latestVersion?.textSnapshot || '';
  const textSnapshot = extractTextFromState(buffer);
  const version = await Version.create({
    documentId,
    versionId: crypto.randomUUID(),
    yjsState: buffer,
    createdBy: actor,
    summary: summary || createVersionSummary(previousText, textSnapshot, trigger),
    isNamedVersion,
    name: name || '',
    textSnapshot,
  });

  if (liveDoc) {
    liveDoc.lastSnapshotAt = now;
    liveDoc.lastSnapshotText = textSnapshot;
    liveDoc.pendingChangeScore = 0;
  }

  if (emitEvent) {
    getIO()?.to(documentId).emit('version-created', buildVersionMetadata(version));
  }

  return { version, reason: 'created' };
};

const restoreVersionSnapshot = async ({ documentId, versionId, restoredBy = SYSTEM_USER }) => {
  const version = await Version.findOne({ documentId, versionId });
  if (!version) {
    const error = new Error('Version not found');
    error.statusCode = 404;
    throw error;
  }

  const actor = normalizeUser(restoredBy);
  const currentState = await loadDocumentState(documentId);
  if (currentState.length) {
    await createVersionSnapshot({
      documentId,
      state: currentState,
      createdBy: actor,
      summary: `Backup before restore from ${version.name || new Date(version.createdAt).toLocaleString()}`,
      trigger: 'manual',
      allowDuplicateState: false,
    });
  }

  const liveDoc = docs.get(documentId);
  if (liveDoc?.saveTimeout) {
    clearTimeout(liveDoc.saveTimeout);
  }
  if (liveDoc?.snapshotTimeout) {
    clearTimeout(liveDoc.snapshotTimeout);
  }

  if (liveDoc) {
    liveDoc.ydoc = new Y.Doc();
    Y.applyUpdate(liveDoc.ydoc, new Uint8Array(version.yjsState));
    liveDoc.pendingChangeScore = 0;
    liveDoc.lastSnapshotText = version.textSnapshot || '';
    liveDoc.lastSnapshotAt = Date.now();
  } else {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(version.yjsState));
    docs.set(documentId, {
      ydoc,
      saveTimeout: null,
      snapshotTimeout: null,
      pendingChangeScore: 0,
      lastSnapshotText: version.textSnapshot || '',
      lastSnapshotAt: Date.now(),
      lastChangedBy: actor,
    });
  }

  await persistDocumentState(documentId, version.yjsState);
  const restoredVersion = await createVersionSnapshot({
    documentId,
    state: version.yjsState,
    createdBy: actor,
    summary: `Restored ${version.name || 'version'} from ${new Date(version.createdAt).toLocaleString()}`,
    trigger: 'restore',
    allowDuplicateState: true,
  });

  const payload = {
    restoredAt: new Date().toISOString(),
    restoredBy: actor,
    sourceVersion: buildVersionMetadata(version),
    restoredVersion: restoredVersion.version ? buildVersionMetadata(restoredVersion.version) : null,
    state: version.yjsState,
  };

  getIO()?.to(documentId).emit('version-restored', payload);
  return payload;
};

module.exports = {
  buildVersionMetadata,
  createVersionSnapshot,
  loadDocumentState,
  persistDocumentState,
  restoreVersionSnapshot,
};
