const express = require('express');
const router = express.Router();
const versionRoutes = require('./versionRoutes');
const { verifyOptionalToken, verifyToken } = require('../middleware/auth');
const {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  addComment,
  updateComment,
  addSuggestion,
  updateSuggestion,
  shareDocument,
  getPermissions,
  updatePermissions,
} = require('../controllers/documentController');

router.route('/')
  .get(verifyToken, listDocuments)
  .post(verifyToken, createDocument);
router.get('/:id', verifyOptionalToken, getDocument);
router.put('/:id', verifyToken, updateDocument);
router.delete('/:id', verifyToken, deleteDocument);
router.post('/:id/comments', verifyToken, addComment);
router.put('/:id/comments/:commentId', verifyToken, updateComment);
router.post('/:id/suggestions', verifyToken, addSuggestion);
router.put('/:id/suggestions/:suggestionId', verifyToken, updateSuggestion);
router.patch('/:id/share', verifyToken, shareDocument);
router.route('/:id/permissions').get(verifyToken, getPermissions).put(verifyToken, updatePermissions);
router.use('/:id/versions', versionRoutes);

module.exports = router;
