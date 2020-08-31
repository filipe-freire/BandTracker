'use strict';

const { join } = require('path');
const express = require('express');
const createError = require('http-errors');
const connectMongo = require('connect-mongo');
const expressSession = require('express-session');
const logger = require('morgan');
const mongoose = require('mongoose');
const hbs = require('hbs');
const helperDate = require('helper-date');
const sassMiddleware = require('node-sass-middleware');
const serveFavicon = require('serve-favicon');

const basicAuthenticationDeserializer = require('./middleware/basic-authentication-deserializer.js');
const bindUserToViewLocals = require('./middleware/bind-user-to-view-locals.js');

const indexRouter = require('./routes/index');
const authenticationRouter = require('./routes/authentication');
const favouritesRouter = require('./routes/favourites');
const artistsRouter = require('./routes/artists');

const app = express();

app.set('views', join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerHelper('date', helperDate);

app.use(serveFavicon(join(__dirname, 'public/images', 'logo-bt.png')));
app.use(
  sassMiddleware({
    src: join(__dirname, 'public'),
    dest: join(__dirname, 'public'),
    outputStyle: process.env.NODE_ENV === 'development' ? 'nested' : 'compressed',
    force: process.env.NODE_ENV === 'development',
    sourceMap: true
  })
);
app.use(express.static(join(__dirname, 'public')));
app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    cookie: {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true
      //secure: process.env.NODE_ENV === 'production'
    },
    store: new (connectMongo(expressSession))({
      mongooseConnection: mongoose.connection,
      ttl: 60 * 60 * 24
    })
  })
);
app.use(basicAuthenticationDeserializer);
app.use(bindUserToViewLocals);

// ADD ROUTERS HERE IF MORE ARE NEEDED
app.use('/', indexRouter);
app.use('/', favouritesRouter);
app.use('/', artistsRouter);
app.use('/authentication', authenticationRouter);

// Catch missing routes and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Catch all error handler
app.use((error, req, res) => {
  res.locals.message = error.message;
  // Set error information, with stack only available in development
  // res.locals.error = req.app.get('env') === 'development' ? error : {};
  console.log(error);
  res.status(error.status || 500);
  res.render('error');
});

module.exports = app;
