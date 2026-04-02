const express = require('express');
const { verifyToken } = require('../middleware/auth');
const {
  createVersion,
  getVersion,
  listVersions,
  restoreVersion,
} = require('../controllers/versionController');

const router = express.Router({ mergeParams: true });

router.route('/').get(verifyToken, listVersions).post(verifyToken, createVersion);
router.route('/:versionId').get(verifyToken, getVersion);
router.route('/restore/:versionId').post(verifyToken, restoreVersion);

module.exports = router;
