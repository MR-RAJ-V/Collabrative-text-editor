const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    index: true,
  },
  versionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  yjsState: {
    type: Buffer,
    required: true,
  },
  createdBy: {
    userId: { type: String, default: '' },
    name: { type: String, default: 'System' },
  },
  summary: {
    type: String,
    default: 'Snapshot saved',
  },
  isNamedVersion: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: '',
  },
  textSnapshot: {
    type: String,
    default: '',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

module.exports = mongoose.model('Version', versionSchema);
