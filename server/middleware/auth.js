const { getFirebaseAdmin } = require('../config/firebaseAdmin');
const { upsertUserFromAuth } = require('../services/userService');

const parseBearerToken = (authorizationHeader = '') => {
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const verifyAuthToken = async (token) => {
  const admin = getFirebaseAdmin();
  const decoded = await admin.auth().verifyIdToken(token);

  if (!decoded.email) {
    throw new Error('Authenticated user is missing an email address');
  }

  const dbUser = await upsertUserFromAuth({
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name || decoded.email,
    avatar: decoded.picture || '',
  });

  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name || dbUser.name,
    avatar: decoded.picture || dbUser.avatar || '',
    dbUser,
  };
};

const verifyToken = async (req, res, next) => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: 'Authentication token is required' });
    }

    req.user = await verifyAuthToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authentication token', error: error.message });
  }
};

const verifyOptionalToken = async (req, res, next) => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      req.user = null;
      return next();
    }

    req.user = await verifyAuthToken(token);
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

module.exports = {
  parseBearerToken,
  verifyAuthToken,
  verifyOptionalToken,
  verifyToken,
};
