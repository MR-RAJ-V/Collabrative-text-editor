const Y = require('yjs');

const SYSTEM_USER = Object.freeze({
  userId: 'system',
  uid: 'system',
  name: 'System',
  email: '',
  avatar: '',
});

const normalizeUser = (input = {}) => ({
  userId: input.userId || input.uid || input.id || 'system',
  uid: input.uid || input.userId || input.id || 'system',
  name: input.name || input.username || input.user || 'System',
  email: input.email || '',
  avatar: input.avatar || input.picture || '',
});

const extractTextFromYDoc = (ydoc) => {
  try {
    return ydoc
      .getXmlFragment('default')
      .toString()
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    return '';
  }
};

const ensureBuffer = (state) => {
  if (!state) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(state)) {
    return state;
  }

  if (state instanceof Uint8Array) {
    return Buffer.from(state);
  }

  if (ArrayBuffer.isView(state)) {
    return Buffer.from(state.buffer, state.byteOffset, state.byteLength);
  }

  if (state instanceof ArrayBuffer) {
    return Buffer.from(state);
  }

  if (typeof state === 'string') {
    return Buffer.from(state, 'base64');
  }

  return Buffer.from(state);
};

const stateToYDoc = (state) => {
  const ydoc = new Y.Doc();
  const buffer = ensureBuffer(state);

  if (buffer.length) {
    Y.applyUpdate(ydoc, new Uint8Array(buffer));
  }

  return ydoc;
};

const extractTextFromState = (state) => extractTextFromYDoc(stateToYDoc(state));

const createVersionSummary = (previousText, nextText, trigger = 'auto') => {
  if (trigger === 'manual') {
    return 'Manual version saved';
  }

  if (trigger === 'restore') {
    return 'Restored document version';
  }

  if (trigger === 'before-unload') {
    return 'Saved before leaving';
  }

  if (trigger === 'significant-change') {
    return 'Captured major edit';
  }

  if (!previousText && !nextText) {
    return 'Initialized empty document';
  }

  if (previousText === nextText) {
    return 'Updated document metadata';
  }

  if (nextText.length > previousText.length) {
    return `Added ${nextText.length - previousText.length} characters`;
  }

  if (nextText.length < previousText.length) {
    return `Removed ${previousText.length - nextText.length} characters`;
  }

  return 'Edited document content';
};

module.exports = {
  SYSTEM_USER,
  createVersionSummary,
  ensureBuffer,
  extractTextFromState,
  extractTextFromYDoc,
  normalizeUser,
  stateToYDoc,
};
