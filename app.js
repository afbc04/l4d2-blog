var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('./utils/logger');            
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

// Conection of Database
const mongoDB = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@mongo:27017/${process.env.MONGO_DB}?authSource=admin`;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

var connection = mongoose.connection;
connection.on('connecting', () => { logger.info('MongoDB connecting...'); });
connection.on('connected', () => { logger.info(`MongoDB connected | DB: ${connection.name} | Host: ${connection.host}:${connection.port}`); });
connection.on('error', (err) => { logger.error(`MongoDB error | ${err.message}`); });
connection.on('disconnected', () => { logger.warn('MongoDB disconnected'); });

// passport config
var User = require('./models/user');
passport.use(new LocalStrategy(
  {
    usernameField: '_id',
    passwordField: 'password'
  },
  User.authenticate()
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Routers
var authRouter = require('./routes/auth');
var userRouter = require('./routes/users');
var postRouter = require('./routes/posts');
var imagesRouter = require('./routes/images');
var filesRouter = require('./routes/files');
var indexRouter = require('./routes/index');

var app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());

// Middleware to log requests
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.httpRequest(req, res, duration);
  });

  next();
});

// Apply routers
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/posts', postRouter);
app.use('/images', imagesRouter);
app.use('/files', filesRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res) => {
  res.status(404).render('notfound', {
    title: 'Not Found'
  });
});

// error handler with logging
app.use((err, req, res, next) => {
  logger.err(err, req);

  res.status(500).render('error', {
    title: 'Error',
    message: err.message
  });
});

module.exports = app;
