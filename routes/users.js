const express = require('express');
const router = express.Router();
const ct = require('countries-and-timezones');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
var logger = require('../utils/logger');            

const authController = require('../auth/auth')
const registrationTokenController = require('../auth/registrationToken')
const UserController = require('../controllers/user');

const countries = Object.values(ct.getAllCountries()).map(c => ({
  code: c.id,
  name: c.name
}));

const upload = multer({ storage: multer.memoryStorage() });

// #######################
// GENERATE REGISTRATION TOKENS
// #######################

router.get('/get-registration-token', authController.validateAdmin, async (req, res) => {
  try {
    const registrationToken = registrationTokenController.generateRegistrationToken(req.token._id);
    
    logger.event('Registration token generated', `CreatedBy: ${req.token._id} | TokenNumber: ${registrationToken}`);
    
    return res.render('users/getRegistrationToken', { 
      title: "Generating Registration Token",
      registrationToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error generating registration token' });
  }
});

// #######################
//   LIST USERS
// #######################

router.get('', authController.validateToken, async (req, res) => {
  try {
    const users = await UserController.findAll();
    const user = await UserController.findById(req.token._id)

    return res.render('users/listUsers', { 
      title: "List of User",
      countries,
      users,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error fetching users list' });
  }
});

// #######################
//        CREATION USER
// #######################

router.get('/create', async (req, res) => {
  try {
    const users_registered = await UserController.count();
    return res.render('users/createUser', { 
      title: "Registration of User",
      requiresToken: users_registered > 0, 
      countries
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading create user page' });
  }
});

router.post('/create', upload.single('profilePicture'), async (req, res) => {
  try {
    const {
      token, username, name, realName, password, email, location, birthDay, birthMonth, birthYear
    } = req.body;

    let rank = 'A', createdBy = null, numberRegistrationToken = 0;
    const users_registered = await UserController.count();

    if (users_registered > 0) {
      if (!token)
        return res.render('users/createUser', {
          title: "Registration of User",
          requiresToken: true,
          error: "Registration token is required to create an account. Provide it!",
          countries
        });

      const registrationTokenProvided = registrationTokenController.validateRegistrationToken(token);
      if (!registrationTokenProvided)
        return res.render('users/createUser', {
          title: "Registration of User",
          requiresToken: true,
          error: "Registration token is expired or invalid. Request another one from administrators",
          countries
        });

      if (await UserController.existsUserThatHasRegistrationToken(registrationTokenProvided.number))
        return res.render('users/createUser', {
          title: "Registration of User",
          requiresToken: true,
          error: "Registration token was already used. Request another one from administrators",
          countries
        });

      rank = 'U';
      createdBy = registrationTokenProvided.createdBy;
      numberRegistrationToken = registrationTokenProvided.number;
    }

    const newUser = {
      _id: username,
      name,
      realName: realName || null,
      email: email || null,
      location: location || null,
      birthDay: birthDay || null,
      birthMonth: birthMonth || null,
      birthYear: birthYear || null,
      rank,
      creationDate: new Date().toISOString(),
      createdBy,
      active: true,
      deletedBy: null,
      deletionDate: null,
      deletionReason: null,
      profilePicture: '/images/panado.jpg',
      numberRegistrationToken
    };

    if (await UserController.findById(username)) {
      return res.status(400).render('users/createUser', {
        title: "Registration of User",
        requiresToken: true,
        error: "The username is already taken. Please choose another one.",
        countries
      });
    }

    await UserController.create(newUser, password);

    if (req.file) {
      const dir = path.join(__dirname, '../uploads/profile_pictures');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(req.file.originalname);
      const filePath = path.join(dir, `${username}${ext}`);
      fs.writeFileSync(filePath, req.file.buffer);
      await UserController.updateProfilePicture(username, `/images/profilePicture/${username}${ext}`);
    }

    return res.redirect(`/auth/login?username=${username}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error while creating user' });
  }
});

// #######################
//        VIEW USER
// #######################

router.get('/details/:username', authController.validateToken, async (req, res) => {
  try {
    const id = req.params.username;
    const user = await UserController.findById(id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    const country = countries.find(c => c.code === user.location);
    const countryName = country ? country.name : null;

    const monthNames = {
      1: "January",2: "February",3: "March",4: "April",5: "May",6: "June",
      7: "July",8: "August",9: "September",10: "October",11: "November",12: "December"
    };

    let birthDate = null, age = null;
    if (user.birthDay && user.birthMonth) {
      birthDate = `${user.birthDay} ${monthNames[user.birthMonth]}`;
      if (user.birthYear) {
        birthDate += ` ${user.birthYear}`;
        age = calculateAgeFromDate(user.birthDay, user.birthMonth, user.birthYear);
      }
    }

    return res.render('users/viewUser', { 
      title: `${user.name} page`, 
      user, 
      countryName, 
      birthDate, 
      age, 
      viewer: req.token 
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error fetching user' });
  }
});

// #######################
//        EDIT USER
// #######################

router.get('/edit/:id', authController.validateSelf('id'), async (req, res) => {
  try {
    const user = await UserController.findById(req.params.id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    return res.render('users/editUser', { title: "Edit Account", user, countries });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading edit user page' });
  }
});

router.post('/edit/:id', authController.validateSelf('id'), upload.single('profilePicture'), async (req, res) => {
  try {
    const { name, realName, email, location, birthDay, birthMonth, birthYear } = req.body;

    const updatedUser = { 
      name, 
      realName: realName || null, 
      email: email || null, 
      location: location || null, 
      birthDay, 
      birthMonth, 
      birthYear 
    };

    const user = await UserController.findById(req.params.id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    await UserController.update(req.params.id, updatedUser);

    const old_profile_picture_path = user.profilePicture;

    if (req.file) {
      const dir = path.join(__dirname, '../uploads/profile_pictures');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const ext = path.extname(req.file.originalname);
      const filePath = path.join(dir, `${req.params.id}${ext}`);
      fs.writeFileSync(filePath, req.file.buffer);

      const new_profile_picture_path = `/images/profilePicture/${req.params.id}${ext}`;
      await UserController.updateProfilePicture(req.params.id, new_profile_picture_path);

      if (old_profile_picture_path !== new_profile_picture_path && old_profile_picture_path !== '/images/panado.jpg') {
        const oldFilePath = path.join(__dirname, '../uploads/profile_pictures', path.basename(old_profile_picture_path));
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
    }

    return res.redirect(`/users`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error editing user' });
  }
});

// #######################
//        DELETE USER
// #######################

router.get('/delete/:id', authController.validateAdminAndSelf('id'), async (req, res) => {
  try {
    const user = await UserController.findById(req.params.id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    return res.render('users/deleteUser', { title: "Terminate account", deletionUser: req.token._id, user });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading delete user page' });
  }
});

router.post('/delete/:id', authController.validateAdminAndSelf('id'), async (req, res) => {
  try {
    const { deletionReason } = req.body;
    const user = await UserController.findById(req.params.id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    const deletedUser = {
      deletionDate: new Date().toISOString(),
      deletedBy: req.token._id,
      deletionReason: deletionReason || null,
      active: false
    };

    await UserController.update(req.params.id, deletedUser);
    return res.redirect(`/users`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error deleting user' });
  }
});

// #######################
//  CHANGE PASSWORD OF USER
// #######################

router.get('/change-password/:id', authController.validateAdminAndSelf('id'), async (req, res) => {
  try {
    const user = await UserController.findById(req.params.id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    return res.render('users/changePassword', { title: "Change password", changePasswordUser: req.token._id, user });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading change password page' });
  }
});

router.post('/change-password/:id', authController.validateAdminAndSelf('id'), async (req, res) => {
  try {
    const { password } = req.body;
    const user = await UserController.findById(req.params.id);
    if (!user) return res.status(404).render('users/noUserFound', { title: "User not found" });

    await UserController.changePassword(req.params.id, password);
    return res.redirect(`/`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error changing password' });
  }
});

// Utility function
function calculateAgeFromDate(day, month, year) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - month;
  const dayDiff = today.getDate() - day;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
  return age;
}

module.exports = router;