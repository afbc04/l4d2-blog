const UserModel = require('../models/user');
const logger = require('../utils/logger');

// Count Users
module.exports.count = async () =>
  await UserModel.countDocuments();

// List Users
module.exports.findAll = async () =>
  await UserModel.find({approved: true}, '-hash -salt -__v');

// List Active Users
module.exports.findAllActive = async () =>
  await UserModel.find({active: true, approved: true}, '-hash -salt -__v');

// List Users that needs approving
module.exports.findAllNotApproved = async () =>
  await UserModel.find({approved: false}, '-hash -salt -__v');

// Get User by ID
module.exports.findById = async (id) =>
  await UserModel.findById(id, '-hash -salt -__v');

// Create User
module.exports.create = async (data, password) => {
  return new Promise((resolve, reject) => {
    UserModel
      .register(new UserModel(data), password, async (err, user) => {
        if (err) 
          return reject(err);

        const createdUser = await module.exports.findById(user._id);
        resolve(createdUser);
      });
  });
};

// Change Password of user
module.exports.changePassword = async (id, newPassword) => {
  const user = await UserModel.findById(id);
  
  return new Promise((resolve, reject) => {
    user.setPassword(newPassword, async (err) => {
      if (err) 
        return reject(err);

      await user.save();
      resolve(await module.exports.findById(id));
    });
  });
};

// Get users from an email
module.exports.getUsersFromEmailToRecovery = async (email) => {
  const users = await UserModel.find({ email: email });

  if (!users || users.length === 0)
    return [];

  const results = [];

  for (const user of users) {
    const token = Math.floor(100000 + Math.random() * 900000);

    user.changePasswordToken = token;
    await user.save();

    results.push({
      userId: user._id,
      userName: user.name,
      token: token
    });
  }

  return results;
};

// Update User
module.exports.update = async (id, data) => {
  await UserModel
    .findByIdAndUpdate(id, data, { new: true, runValidators: true });

  return await this.findById(id);
};

// Delete User
module.exports.delete = async (id) => {
  try {
    const deletedUser = await UserModel.findByIdAndDelete(id);

    if (deletedUser) {
      return deletedUser;
    }
  } catch (err) {}
};

// Update Profile Picture
module.exports.updateProfilePicture = async (id, profilePicturePath) =>
  await UserModel.findByIdAndUpdate(
    id,
    { profilePicture: profilePicturePath },
    { new: true }
  );

// Get Users' profile pictures
module.exports.getProfilePicturesDictionary = async () => {
  const users = await UserModel
    .find({}, '_id profilePicture')
    .lean();

  const map = {};
  for (const user of users)
    map[user._id.toString()] = user.profilePicture || null;

  return map;
};
