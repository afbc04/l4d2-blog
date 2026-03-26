const UserModel = require('../models/user');
const logger = require('../utils/logger');

// Count Users
module.exports.count = async () =>
  await UserModel.countDocuments();

// Check if there is an user that used the registration token
module.exports.existsUserThatHasRegistrationToken = async (registrationToken) => {
  const user = await UserModel
    .findOne({ numberRegistrationToken: registrationToken })
    .select('_id');

  return user != null;
};

// List Users
module.exports.findAll = async () =>
  await UserModel.find({}, '-hash -salt -__v');

// List Active Users
module.exports.findAllActive = async () =>
  await UserModel.find({active: true}, '-hash -salt -__v');

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
        logger.event('User created', `UserID: ${createdUser._id} | CreatedBy: ${data.createdBy || 'system'}`);
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
      logger.event('Password changed', `UserID: ${id}`);
      resolve(await module.exports.findById(id));
    });
  });
};

// Update User
module.exports.update = async (id, data) => {
  await UserModel
    .findByIdAndUpdate(id, data, { new: true, runValidators: true });

  logger.event('User updated', `UserID: ${id}`);
  return await this.findById(id);
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
