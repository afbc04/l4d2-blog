const express = require("express");
const router = express.Router(); 

const UserController = require("../controllers/user");
const PostController = require("../controllers/post");
const authController = require("../auth/auth");

// #######################
//       MAIN PAGE
// #######################

router.get('', authController.noToken, async (req, res) => {
  try {
    
    const includeDeleted = req.query.deletedPosts === 'true';
    const includePrivate = req.token != null;
    const posts = await PostController.findAll(includePrivate, includeDeleted);

    const user = req.token ? await UserController.findById(req.token._id) : null

    let final_posts = posts.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      return {
        ...obj,
        fileCount: p.files ? p.files.length : 0,
        wordCount: p.content ? p.content.split(/\s+/).length : 0,
        commentCount: p.comments ? p.comments.length : 0,
        viewersCount: p.viewers ? p.viewers.length : 0,
        seen: req.token ? p.viewers.includes(req.token._id) : false
      };
    });

    res.render('index/listPost', { 
      title: "Main Page",
      posts: final_posts,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading main page' });
  }
});

// #######################
//   INFORMATIONS
// #######################

router.get('/info', authController.noToken, async (req, res) => {
  try {
    const user = req.token ? await UserController.findById(req.token._id) : null

    res.render('index/info', { 
      title: "Informations",
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading informations page' });
  }
});

// #######################
//   ABOUT
// #######################

router.get('/about', authController.noToken, async (req, res) => {
  try {
    const user = req.token ? await UserController.findById(req.token._id) : null

    res.render('index/about', { 
      title: "About",
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error loading about page' });
  }
});

// #######################
//   BIRTHDAYS
// #######################

router.get('/birthdays', authController.validateToken, async (req, res) => {
  try {
    const user = await UserController.findById(req.token._id)
    const users = await UserController.findAllActive()

    const noBirthday = users.filter(u => u.birthDay == null || u.birthMonth == null);

    const monthNames = {
      1: "January",2: "February",3: "March",4: "April",5: "May",6: "June",
      7: "July",8: "August",9: "September",10: "October",11: "November",12: "December"
    };

  const today = new Date();
  const birthdays = users
    .filter(u => u.birthDay != null && u.birthMonth != null)
    .map(u => {

      let nextYear = today.getFullYear();
      let birthday = new Date(nextYear, u.birthMonth - 1, u.birthDay);

      if (birthday < today) 
        birthday.setFullYear(nextYear + 1);

      const age = u.birthYear != null ? birthday.getFullYear() - u.birthYear : null;

      return { 
        user: u, 
        nextBirthday: birthday, 
        birthday: `${u.birthDay} ${monthNames[u.birthMonth]}`,
        futureAge: age 
      };
    })
    .sort((a, b) => a.nextBirthday - b.nextBirthday);

    res.render('index/birthdays', { 
      title: "Birthdays",
      noBirthday,
      birthdays,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', err, message: 'Error fetching birthdates page' });
  }
});

module.exports = router;