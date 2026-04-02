const express = require('express');
const { getCurrentUser } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/me', verifyToken, getCurrentUser);

module.exports = router;
