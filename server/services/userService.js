const User = require('../models/User');

const sanitizeUser = (userDoc) => ({
  id: userDoc._id,
  firebaseUid: userDoc.firebaseUid,
  name: userDoc.name,
  email: userDoc.email,
  avatar: userDoc.avatar,
  createdAt: userDoc.createdAt,
});

const upsertUserFromAuth = async (authUser) => {
  const normalizedEmail = String(authUser.email || '').toLowerCase().trim();
  const payload = {
    firebaseUid: authUser.uid,
    name: authUser.name || normalizedEmail || 'Unknown User',
    email: normalizedEmail,
    avatar: authUser.avatar || '',
  };

  let user = await User.findOne({ firebaseUid: authUser.uid });

  if (!user && normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
  }

  if (user) {
    user.firebaseUid = payload.firebaseUid;
    user.name = payload.name;
    user.email = payload.email;
    user.avatar = payload.avatar;
    await user.save();
    return user;
  }

  user = await User.create(payload);

  return user;
};

module.exports = {
  sanitizeUser,
  upsertUserFromAuth,
};
