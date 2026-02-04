const DatabaseService = require('./databaseService');
const User = require('../models/User');

async function getProfile({ userId, phone }) {
  if (userId) {
    const user = await DatabaseService.getUserById(userId);
    return user || null;
  }
  if (phone) {
    let user = await DatabaseService.findUserByPhone(phone);
    if (!user) {
      user = await DatabaseService.createUser({ phone });
    }
    return user;
  }
  let user = await User.findOne({});
  if (!user) {
    user = await DatabaseService.createUser({ phone: 'unknown' });
  }
  return user;
}

async function updateProfile({ id, phone, name, username, bio, profilePic, avatar, displayName, avatar_url, cover_image, location }) {
  console.log(`[ProfileService] Updating profile for identifier: ${id || phone}`);
  
  const payload = {
    ...(phone ? { phone } : {}),
    ...(name ? { name } : {}),
    ...(username ? { username } : {}),
    ...(bio ? { bio } : {}),
    ...(profilePic ? { profilePic } : {}),
    ...(avatar ? { avatar } : {}),
    ...(displayName ? { displayName } : {}),
    ...(avatar_url ? { avatar: avatar_url, profilePic: avatar_url } : {}),
    ...(cover_image ? { coverImage: cover_image } : {}),
    ...(location ? { location } : {}),
  };

  if (id) {
    const updated = await DatabaseService.updateUser(id, payload);
    if (!updated) {
      // If ID not found, maybe it's a firebaseUid or phone
      const user = await User.findOne({ 
        $or: [
          { firebaseUid: id },
          { phone: id },
          { email: id }
        ]
      });
      if (user) return await DatabaseService.updateUser(user._id, payload);
    }
    return updated;
  }
  
  if (phone) {
    const existing = await DatabaseService.findUserByPhone(phone);
    if (existing) {
      return await DatabaseService.updateUser(existing._id, payload);
    }
    return await DatabaseService.createUser({ phone, ...payload });
  }
  
  // Fallback: If no identifier, try to find ANY user (last resort for dev stability)
  const fallbackUser = await User.findOne({});
  if (fallbackUser) {
    return await DatabaseService.updateUser(fallbackUser._id, payload);
  }

  throw new Error('Missing user identifier: Please provide userId or phone');
}

async function uploadProfileImage(userId, imageUrl) {
  if (!userId || !imageUrl) throw new Error('userId and imageUrl required');
  const user = await DatabaseService.updateUser(userId, { avatar: imageUrl, profilePic: imageUrl });
  return user?.avatar || null;
}

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImage,
};
