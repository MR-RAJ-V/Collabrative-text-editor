const mongoose = require('mongoose');

const commentReplySchema = new mongoose.Schema({
  user: { type: String, required: true },
  color: { type: String, default: '#64748b' },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const commentSchema = new mongoose.Schema({
  user: { type: String, required: true },
  color: { type: String, default: '#64748b' },
  message: { type: String, required: true },
  textRange: {
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  },
  selectedText: { type: String, default: '' },
  resolved: { type: Boolean, default: false },
  comments: [commentReplySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const suggestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['insert', 'delete'],
    required: true,
  },
  content: { type: String, default: '' },
  position: {
    start: { type: Number, required: true },
    end: { type: Number, default: 0 },
  },
  user: { type: String, required: true },
  color: { type: String, default: '#64748b' },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const documentSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Untitled Document'
  },
  state: {
    type: Buffer,
  },
  content: {
    type: String,
    default: '',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  visibility: {
    type: String,
    enum: ['private', 'link', 'link-access'],
    default: 'private',
  },
  linkRole: {
    type: String,
    enum: ['viewer', 'editor'],
    default: 'viewer',
  },
  comments: [commentSchema],
  suggestions: [suggestionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
