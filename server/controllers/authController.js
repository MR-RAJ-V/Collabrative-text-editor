const { sanitizeUser } = require('../services/userService');

const getCurrentUser = async (req, res) => {
  return res.json({
    user: sanitizeUser(req.user.dbUser),
  });
};

module.exports = {
  getCurrentUser,
};
