const Document = require('../models/Document');
const Version = require('../models/Version');
const {
  buildVersionMetadata,
  createVersionSnapshot,
  restoreVersionSnapshot,
} = require('../services/versionService');
const { normalizeUser } = require('../utils/yjsHelpers');
const {
  canEditFromAccess,
  findDocumentOrThrow,
  populateDocumentAccess,
} = require('../services/documentAccess');

const listVersions = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id);
    await populateDocumentAccess({ document, authUser: req.user });

    const versions = await Version.find({ documentId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(versions.map(buildVersionMetadata));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching versions' });
  }
};

const getVersion = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id);
    await populateDocumentAccess({ document, authUser: req.user });

    const version = await Version.findOne({
      documentId: req.params.id,
      versionId: req.params.versionId,
    });

    if (!version) {
      return res.status(404).json({ message: 'Version not found' });
    }

    return res.json({
      ...buildVersionMetadata(version),
      yjsState: version.yjsState.toString('base64'),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching version' });
  }
};

const createVersion = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id);
    const access = await populateDocumentAccess({ document, authUser: req.user });
    if (!canEditFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to create versions for this document' });
    }

    const { summary, isNamedVersion, name, createdBy, trigger } = req.body || {};
    const result = await createVersionSnapshot({
      documentId: req.params.id,
      createdBy: normalizeUser(createdBy || req.user),
      summary,
      isNamedVersion: Boolean(isNamedVersion || name),
      name: typeof name === 'string' ? name.trim() : '',
      trigger: trigger || 'manual',
      allowDuplicateState: Boolean(isNamedVersion || name),
    });

    if (!result.version) {
      return res.status(200).json({
        created: false,
        reason: result.reason,
      });
    }

    return res.status(201).json({
      created: true,
      version: buildVersionMetadata(result.version),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || 'Error creating version' });
  }
};

const restoreVersion = async (req, res) => {
  try {
    const document = await findDocumentOrThrow(req.params.id);
    const access = await populateDocumentAccess({ document, authUser: req.user });
    if (!canEditFromAccess(access)) {
      return res.status(403).json({ message: 'You do not have permission to restore versions for this document' });
    }

    const payload = await restoreVersionSnapshot({
      documentId: req.params.id,
      versionId: req.params.versionId,
      restoredBy: normalizeUser(req.body?.createdBy || req.user),
    });

    return res.json({
      restored: true,
      restoredAt: payload.restoredAt,
      sourceVersion: payload.sourceVersion,
      restoredVersion: payload.restoredVersion,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || 'Error restoring version' });
  }
};

module.exports = {
  createVersion,
  getVersion,
  listVersions,
  restoreVersion,
};
