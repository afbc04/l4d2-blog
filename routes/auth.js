var express = require('express');
var router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
var logger = require('../utils/logger');            

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, 
  message: "Too many login attempts. Try again later.",
  handler: (req, res) => {
      const retryAfter = req.rateLimit ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) : null;
      
      logger.event('Login rate limit hit', `IP: ${req.ip} | User: ${req.body._id || '???'}`);
      
      res.status(429).render("auth/tooManyAttempts", {
        title: "Hold on",
        retryAfter
      });
    }
});

// #######################
//     LOGIN
// #######################

// Login - Get
router.get('/login', (req, res) => {
  res.render('auth/login', {
    title: "Login",
    success: req.query.username != null,
    usernameProvided: req.query.username || null,
    redirectURL: req.query.redirectURL || '/'
  });
});

// Login - Functionality
router.post("/login", loginLimiter, (req, res, next) => {

  const { _id, password, redirectURL } = req.body;

  //Verify is required fields are present
  if (!_id || !password) {
    return res.render("auth/login", {
      title: "Login",
      error: "Please enter username and password.",
      redirectURL
    });
  }

  //Check if user exists
  passport.authenticate("local", (err, user, info) => {

    if (err) {
      logger.err(err, req);

      return res.render("auth/login", {
        title: "Login",
        error: "Authentication error.",
        redirectURL
      });
    }

    if (!user) {
      logger.err(new Error('Invalid username or password'), req);
      return res.render("auth/login", {
        title: "Login",
        error: "Invalid username or password.",
        redirectURL
      });
    }

    if (user.active == false) {
      logger.err(new Error('Account inactive'), req);
      return res.render("auth/login", {
        title: "Login",
        error: "Account was terminated.",
        redirectURL
      });
    }

    // Create JWT
    const token = jwt.sign(
      { _id: user._id, rank: user.rank },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Store token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600 * 1000
    });

    // Finish
    logger.event('Login success', `User: ${user._id} | IP: ${req.ip}`);
    const safeRedirect = redirectURL && redirectURL.startsWith('/') ? redirectURL : '/';
    return res.redirect(safeRedirect);

  })(req, res, next);

});

// Logout
router.get('/logout', (req, res) => {
  logger.event('Logout', `User: ${req.token?._id || '???'} | IP: ${req.ip}`);
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.redirect('/');
});

module.exports = router;