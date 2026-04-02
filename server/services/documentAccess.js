const Document = require('../models/Document');
const User = require('../models/User');

const VIEWER_ROLE = 'viewer';
const COMMENTER_ROLE = 'commenter';
const EDITOR_ROLE = 'editor';
const OWNER_ROLE = 'owner';

const canReadFromAccess = (access) => access.allowed;
const canCommentFromAccess = (access) => access.role === OWNER_ROLE || access.role === EDITOR_ROLE || access.role === COMMENTER_ROLE;
const canEditFromAccess = (access) => access.role === OWNER_ROLE || access.role === EDITOR_ROLE;
const canManageFromAccess = (access) => access.role === OWNER_ROLE;

const buildUserSummary = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user._id,
    firebaseUid: user.firebaseUid,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
  };
};

const createAccessDescriptor = ({ document, dbUser, role }) => ({
  allowed: Boolean(role),
  role: role || null,
  isOwner: role === OWNER_ROLE,
  canRead: Boolean(role),
  canComment: role === OWNER_ROLE || role === EDITOR_ROLE || role === COMMENTER_ROLE,
  canEdit: role === OWNER_ROLE || role === EDITOR_ROLE,
  canManage: role === OWNER_ROLE,
  visibility: document.visibility === 'link-access' ? 'link' : document.visibility,
  linkRole: document.linkRole,
  user: buildUserSummary(dbUser),
});

const resolveDocumentAccess = async ({ document, authUser }) => {
  if (!authUser?.uid) {
    if (document.visibility === 'link' || document.visibility === 'link-access') {
      return createAccessDescriptor({
        document,
        dbUser: null,
        role: document.linkRole || VIEWER_ROLE,
      });
    }

    return createAccessDescriptor({ document, dbUser: null, role: null });
  }

  const dbUser = await User.findOne({ firebaseUid: authUser.uid });
  if (!dbUser) {
    if (document.visibility === 'link' || document.visibility === 'link-access') {
      return createAccessDescriptor({
        document,
        dbUser: null,
        role: document.linkRole || VIEWER_ROLE,
      });
    }

    return createAccessDescriptor({ document, dbUser: null, role: null });
  }

  const dbUserId = String(dbUser._id);
  const ownerId = String(document.ownerId?._id || document.ownerId);

  if (ownerId === dbUserId) {
    return createAccessDescriptor({ document, dbUser, role: OWNER_ROLE });
  }

  const collaborator = (document.collaborators || []).find(
    (item) => String(item.userId?._id || item.userId) === dbUserId,
  );
  if (collaborator) {
    return createAccessDescriptor({ document, dbUser, role: collaborator.role });
  }

  const isExplicitlyShared = (document.sharedUsers || []).some(
    (userId) => String(userId?._id || userId) === dbUserId,
  );
  if (isExplicitlyShared) {
    return createAccessDescriptor({ document, dbUser, role: VIEWER_ROLE });
  }

  if (document.visibility === 'link' || document.visibility === 'link-access') {
    return createAccessDescriptor({ document, dbUser, role: document.linkRole || VIEWER_ROLE });
  }

  return createAccessDescriptor({ document, dbUser, role: null });
};

const populateDocumentAccess = async ({ document, authUser }) => {
  const access = await resolveDocumentAccess({ document, authUser });

  if (!access.allowed) {
    const error = new Error('You do not have access to this document');
    error.statusCode = 403;
    throw error;
  }

  return access;
};

const findDocumentOrThrow = async (documentId, populate = '') => {
  const query = Document.findOne({ documentId });
  if (populate) {
    populate.split(' ').filter(Boolean).forEach((path) => query.populate(path));
  }

  const document = await query;
  if (!document) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  return document;
};

const serializePermissions = (document) => ({
  owner: buildUserSummary(document.ownerId),
  collaborators: (document.collaborators || []).map((item) => ({
    role: item.role,
    user: buildUserSummary(item.userId),
  })),
  sharedUsers: (document.sharedUsers || []).map((item) => buildUserSummary(item)),
  visibility: document.visibility === 'link-access' ? 'link' : document.visibility,
  linkRole: document.linkRole,
});

module.exports = {
  COMMENTER_ROLE,
  EDITOR_ROLE,
  OWNER_ROLE,
  VIEWER_ROLE,
  canCommentFromAccess,
  canEditFromAccess,
  canManageFromAccess,
  canReadFromAccess,
  findDocumentOrThrow,
  populateDocumentAccess,
  resolveDocumentAccess,
  serializePermissions,
};
