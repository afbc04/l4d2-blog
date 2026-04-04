const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, default: null },
  realName: { type: String, default: null },
  email: { type: String, default: null },
  changePasswordToken: { type: Number, default: null },
  rank: { type: String, default: 'U' }, // U = user, A = admin
  creationDate: { type: Date, default: Date.now },
  location: { type: String, default: null },
  birthDay: { type: Number, default: null },
  birthMonth: { type: Number, default: null },
  birthYear: { type: Number, default: null },
  approvedBy: { type: String, default: null },
  active: { type: Boolean, default: true },
  profilePicture: { type: String, default: null },
  deletedBy: { type: String, default: null },
  deletionDate: { type: Date, default: null },
  deletionReason: { type: String, default: null },
  approved: { type: Boolean, default: false },
});

userSchema.plugin(passportLocalMongoose, { usernameField: '_id' });
module.exports = mongoose.model('User', userSchema, 'users');