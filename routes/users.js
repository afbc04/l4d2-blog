const express = require('express');
const router = express.Router();
const ct = require('countries-and-timezones');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const emailUtil = require('../utils/email');
const asyncHandler = require('../utils/errors');

const authController = require('../utils/auth');
const UserController = require('../controllers/user');

const countries = Object.values(ct.getAllCountries()).map(c => ({
  code: c.id,
  name: c.name
}));

const upload = multer({ storage: multer.memoryStorage() });

// #######################
//   LIST USERS
// #######################

router.get('', authController.validateToken, asyncHandler(async (req, res) => {
    const users = await UserController.findAll();
    const user = await UserController.findById(req.token._id);

    res.render('users/listUsers', {
      title: "List of User",
      countries,
      users,
      user
    });
  })
);

// #######################
//        CREATION USER
// #######################
router.get('/create', asyncHandler(async (req, res) => {
    const users_registered = await UserController.count();

    res.render('users/createUser', {
      title: "Registration of User",
      requiresApproval: users_registered > 0,
      countries
    });
  })
);

router.post('/create', upload.single('profilePicture'), asyncHandler(async (req, res) => {
    
    const {
      username, 
      name, 
      realName, 
      password, 
      email, 
      location,
      birthDay, 
      birthMonth, 
      birthYear
    } = req.body;

    const users_registered = await UserController.count();
    let rank = users_registered > 0 ? 'U' : 'A';
    let approved = users_registered == 0;

    const usernameRegex = /^[A-Za-z0-9]+$/;

    if (!usernameRegex.test(username)) {
      return res.status(400).render('users/createUser', {
        title: "Registration of User",
        requiresApproval: users_registered > 0,
        error: "Username is in invalid format, use only letters and numbers.",
        countries
      });
    }

    if (await UserController.findById(username)) {
      return res.status(400).render('users/createUser', {
        title: "Registration of User",
        requiresApproval: true,
        error: "The username is already taken. Please choose another one.",
        countries
      });
    }

    const newUser = {
      _id: username,
      name,
      realName: realName || null,
      email: email || null,
      changePasswordToken: null,
      location: location || null,
      birthDay: birthDay || null,
      birthMonth: birthMonth || null,
      birthYear: birthYear || null,
      rank,
      creationDate: new Date().toISOString(),
      approvedBy: null,
      active: true,
      deletedBy: null,
      deletionDate: null,
      deletionReason: null,
      profilePicture: '/images/panado.jpg',
      approved
    };

    await UserController.create(newUser, password);

    if (req.file) {
      const dir = path.join(__dirname, '../uploads/profile_pictures');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const ext = path.extname(req.file.originalname);
      const filePath = path.join(dir, `${username}${ext}`);
      fs.writeFileSync(filePath, req.file.buffer);

      await UserController.updateProfilePicture(username, `/images/profilePicture/${username}${ext}`);
    }

    res.redirect(users_registered > 0 ? "/" : `/auth/login?username=${username}&message=createdAccount`);
  })
);

// #######################
//        VIEW USER
// #######################
router.get('/details/:username', authController.validateToken, asyncHandler(async (req, res) => {
    const user = await UserController.findById(req.params.username);

    if (!user)
      return res.status(404).render('users/noUserFound', { title: "User not found" });

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

    res.render('users/viewUser', {
      title: `${user.name} page`,
      user,
      countryName,
      birthDate,
      age,
      viewer: req.token
    });
  })
);

// #######################
//        EDIT USER
// #######################
router.get('/edit/:id', authController.validateSelf('id'), asyncHandler(async (req, res) => {
    const user = await UserController.findById(req.params.id);

    if (!user || !user.active)
      return res.status(404).render('users/noUserFound', { title: "User not found" });

    res.render('users/editUser', { title: "Edit Account", user, countries });
  })
);

router.post('/edit/:id', authController.validateSelf('id'), upload.single('profilePicture'), asyncHandler(async (req, res) => {
    
    const { 
      name, 
      realName, 
      email,
      location, 
      birthDay, 
      birthMonth, 
      birthYear 
    } = req.body;

    const user = await UserController.findById(req.params.id);
    if (!user || !user.active)
      return res.status(404).render('users/noUserFound', { title: "User not found" });

    const updatedUser = {
      name,
      realName: realName || null,
      email: email || null,
      location: location || null,
      birthDay,
      birthMonth,
      birthYear
    };

    await UserController.update(req.params.id, updatedUser);

    if (req.file) {
      const dir = path.join(__dirname, '../uploads/profile_pictures');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const ext = path.extname(req.file.originalname);
      const filePath = path.join(dir, `${req.params.id}${ext}`);
      fs.writeFileSync(filePath, req.file.buffer);

      const newPath = `/images/profilePicture/${req.params.id}${ext}`;
      await UserController.updateProfilePicture(req.params.id, newPath);

      if (user.profilePicture !== newPath && user.profilePicture !== '/images/panado.jpg') {
        const oldPath = path.join(__dirname, '../uploads/profile_pictures', path.basename(user.profilePicture));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    res.redirect(`/users`);
  })
);

// #######################
//        DELETE USER
// #######################
router.get('/delete/:id', authController.validateAdminAndSelf('id'), asyncHandler(async (req, res) => { 
    const user = await UserController.findById(req.params.id); 
    
    if (!user || !user.active) 
      return res.status(404).render('users/noUserFound', { title: "User not found" }); 
    
    return res.render('users/deleteUser', { 
      title: "Terminate account", 
      deletionUser: req.token._id, user 
    });

  })
);

router.post('/delete/:id', authController.validateAdminAndSelf('id'), asyncHandler(async (req, res) => {
    
  const user = await UserController.findById(req.params.id);

    if (!user || !user.active)
      return res.status(404).render('users/noUserFound', { title: "User not found" });

    if (user.rank === 'A')
      return res.status(403).send();

    await UserController.update(req.params.id, {
      deletionDate: new Date().toISOString(),
      deletedBy: req.token._id,
      deletionReason: req.body.deletionReason || null,
      active: false
    });

    res.redirect(`/users`);
  })
);

// ####################### 
//  LIST USERS NEEDING APPROVAL 
// ####################### 

router.get('/waitingApproval', authController.validateAdmin, asyncHandler(async (req, res) => { 
  
    const users = await UserController.findAllNotApproved(); 
    const user = await UserController.findById(req.token._id) 
    
    const isUserUpdated = req.query.userUpdated ? req.query.userUpdated === "true" : null 
    const isUserApproved = req.query.userApproved ? req.query.userApproved === "true" : null 
    const userApprovedName = req.query.userApprovedName 
    const userApprovedID = req.query.userApprovedID 
    const userApproved = userApprovedName && userApprovedID ? { _id: userApprovedID, name: userApprovedName } : null 
    
    return res.render('users/listUsersWaitingApproval', { 
      title: "List of Accounts needing approval", 
      users, 
      user, 
      isUserUpdated, 
      isUserApproved, 
      userApproved 
    });
  })
);
    
router.post('/approveUser/:id', authController.validateAdmin, asyncHandler(async (req, res) => { 
  
    const user = await UserController.findById(req.params.id) 
    const viewer = await UserController.findById(req.token._id) 
    
    if (!user || user.approved == true)  
      return res.redirect('/users/waitingApproval');
    
    await UserController.update(user._id,{ 
      approved: true, 
      approvedBy: viewer._id 
    }) 
    
    if (user.email)
      await emailUtil.sendApprovalAccountEmail(user.email,user.name,user._id);

    return res.redirect(`/users/waitingApproval?userUpdated=true&userApproved=true&userApprovedName=${user.name}&userApprovedID=${user._id}`); 
    
  })
);

router.post('/rejectUser/:id', authController.validateAdmin, asyncHandler(async (req, res) => { 
  
    const user = await UserController.findById(req.params.id) 
    
    if (!user || user.approved == true)
      return res.redirect('/users/waitingApproval');

    await UserController.delete(user._id) 
    
    return res.redirect(`/users/waitingApproval?userUpdated=true&userApproved=false&userApprovedName=${user.name}&userApprovedID=${user._id}`);
    
  })
);

// ################################## 
// CHANGE PASSWORD OF USER - VIA USER
// ##################################

router.get('/change-password/:id', authController.validateSelf('id'), asyncHandler(async (req, res) => { 
  
    const user = await UserController.findById(req.params.id); 
    
    if (!user || !user.active) 
      return res.status(404).render('users/noUserFound', { title: "User not found" }); 
    
    return res.render('users/changePassword', { 
      title: "Change password", 
      changePasswordUser: req.token._id, user 
    });

  })
);

router.post('/change-password/:id', authController.validateSelf('id'), asyncHandler(async (req, res) => {
    const user = await UserController.findById(req.params.id);

    if (!user)
      return res.status(404).render('users/noUserFound', { title: "User not found" });

    await UserController.changePassword(req.params.id, req.body.password);
    res.redirect(`/`);
  })
);

// ################################## 
// CHANGE PASSWORD OF USER - VIA EMAIL
// ################################## 

router.get('/recover/:id/:email/:token', asyncHandler(async (req, res) => { 
  
    const user = await UserController.findById(req.params.id); 
    
    if (!user || !user.active || user.email != req.params.email || user.changePasswordToken != req.params.token) 
      return res.status(404).render('users/noUserFound', { title: "User not found" }); 
    
    return res.render('users/changePasswordViaEmail', { 
      title: "Change password", 
      changePasswordUser: req.params.id, 
      user 
    });

  })
);

router.post('/recover/:id/:email/:token', asyncHandler(async (req, res) => { 
    const user = await UserController.findById(req.params.id);

    if (!user || !user.active || user.email != req.params.email || user.changePasswordToken != req.params.token) 
      return res.status(404).render('users/noUserFound', { title: "User not found" }); 

    await UserController.changePassword(req.params.id, req.body.password);
    res.redirect(`/auth/login?username=${req.params.id}&message=recoveredAccount`);
  })
);

// #######################
// Utility
// #######################

function calculateAgeFromDate(day, month, year) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - month;
  const dayDiff = today.getDate() - day;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
  return age;
}

module.exports = router;