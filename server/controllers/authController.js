const { sanitizeUser } = require('../services/userService');
const { sendError } = require('../utils/http');

const getCurrentUser = async (req, res) => {
  try {
    return res.json({
      user: sanitizeUser(req.user.dbUser),
    });
  } catch (error) {
    return sendError(res, error, 'Error fetching current user');
  }
};

module.exports = {
  getCurrentUser,
};
