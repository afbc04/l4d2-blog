const jwt = require('jsonwebtoken');

function generateRegistrationToken(createdBy) {

  const payload = {
    createdBy,
    number: Date.now()
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET_REGISTRATION_TOKEN, { expiresIn: '30m' });
  return token;
}

function validateRegistrationToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_REGISTRATION_TOKEN);
    return decoded;
  } catch (err) {
    return null
  }
}

module.exports = {
  generateRegistrationToken,
  validateRegistrationToken
};