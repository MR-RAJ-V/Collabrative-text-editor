const crypto = require('crypto');
const Document = require('../models/Document');
const Version = require('../models/Version');
const { docs, getIO, roomUsers } = require('../sockets/runtime');
const { ensureBuffer, extractTextFromState } = require('../utils/yjsHelpers');
const { sendError } = require('../utils/http');
const {
  canCommentFromAccess,
  canEditFromAccess,
  canManageFromAccess,
  findDocumentOrThrow,
  populateDocumentAccess,
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
      comments: [],
      suggestions: [],
    });

    const populated = await Document.findById(document._id).populate('ownerId');
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
    return sendError(res, error, 'Error creating document');
  }
};

const getDocument = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    return res.json(serializeDocument(document, access));
  } catch (error) {
    return sendError(res, error, 'Error fetching document');
  }
};

const updateDocument = async (req, res) => {
  try {
    const { state, title, content } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
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
    return sendError(res, error, 'Error updating document');
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
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
    return sendError(res, error, 'Error deleting document');
  }
};

const addComment = async (req, res) => {
  try {
    const { message, textRange, selectedText } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
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
    return sendError(res, error, 'Error adding comment');
  }
};

const updateComment = async (req, res) => {
  try {
    const { action, reply, resolved } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
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
    return sendError(res, error, 'Error updating comment');
  }
};

const addSuggestion = async (req, res) => {
  try {
    const { type, content, position } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
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
    return sendError(res, error, 'Error adding suggestion');
  }
};

const updateSuggestion = async (req, res) => {
  try {
    const { status } = req.body;
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
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
    return sendError(res, error, 'Error updating suggestion');
  }
};

const shareDocument = async (req, res) => {
  try {
    const { role, visibility } = req.body || {};
    const document = await findDocumentOrThrow(req.params.id, 'ownerId');
    const access = await populateDocumentAccess({ document, authUser: req.user });

    if (!canManageFromAccess(access)) {
      return res.status(403).json({ message: 'Only the owner can share this document' });
    }

    if (visibility && !['private', 'public', 'link', 'link-access'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value' });
    }

    if (role && !['viewer', 'editor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }

    const normalizedVisibility = ['public', 'link', 'link-access'].includes(visibility) ? 'link' : visibility;
    if (normalizedVisibility) {
      document.visibility = normalizedVisibility;
    }

    if (role) {
      document.linkRole = role;
    }

    await document.save();
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, error, 'Error sharing document');
  }
};

const listDocuments = async (req, res) => {
  try {
    const dbUserId = req.user.dbUser._id;
    const documents = await Document.find({
      ownerId: dbUserId,
    })
      .populate('ownerId')
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
    return sendError(res, error, 'Error fetching documents');
  }
};

module.exports = {
  addComment,
  addSuggestion,
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  shareDocument,
  updateComment,
  updateDocument,
  updateSuggestion,
};
