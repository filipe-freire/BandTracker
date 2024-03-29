'use strict';

const { Router } = require('express');
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});
const multer = require('multer');
const cloudinary = require('cloudinary');
const multerStorageCloudinary = require('multer-storage-cloudinary');

const storage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2
});
const upload = multer({ storage });

const bcryptjs = require('bcryptjs');
const User = require('./../models/user');

const router = new Router();

// token for Confirmation Email
const generateRandomToken = length => {
  const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
  return token;
};

// Routers
router.get('/sign-up', (req, res) => {
  res.render('sign-up');
});

router.post('/sign-up', upload.single('profilePicture'), (req, res, next) => {
  const { name, email, password } = req.body;
  const profilePicture = req.file.path;

  //const trackBandsArr = trackBands.split(',');

  // Confirmation Email
  const confirmationToken = generateRandomToken(10);
  const confirmationUrl = `https://bandtrackerapp.herokuapp.com/authentication/confirm-email?token=${confirmationToken}`; //`http://localhost:3000/authentication/confirm-email?token=${confirmationToken}`;

  User.findOne({ email: email })
    .then(existingUser => {
      if (existingUser) {
        return Promise.reject(new Error('User already owns an account'));
      } else {
        return bcryptjs.hash(password, 10);
      }
    })
    .then(hash => {
      return User.create({
        name,
        email,
        passwordHash: hash,
        // userType,  USERTYPE CREATION IF NEEDED
        profilePicture,
        // trackBands: trackBandsArr,
        confirmationToken: confirmationToken
      });
    })
    .then(user => {
      req.session.user = user._id;

      return transport.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: user.email,
        subject: 'Click the link to activate your account!',
        html: `<html>  
          <head>
          <title>Welcome to BandTracker</title>  
          <meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">  
          </head>  
          <style>  
          body  {font-family:arial;font-size: 9pt; background-color: orange }  
           </style>
          <body bgcolor="#FFFFFF" text="#000000">  
          <h1> Welcome to BandTracker, ${user.name}! </h1>
          <h2> You are one click away from awesomeness! </h2>
          <p>Thank you for creating an account with BandTracker. <p>
          <p>Creating an account allows you to follow your favorite bands and check their tour dates whenever you sign in!</p>    
          <p>To confirm your email address, click here: </p>
          <a href="${confirmationUrl}" target="_blank"> Confirm email </a>
          <p> Now you can become the most informed fan! </p>
          </body>
          </html>`
      });
    })
    .then(result => {
      console.log('Email was sent ', result);
      res.redirect('/favourites-creation');
    })
    .catch(error => {
      next(error);
    });
});

router.get('/confirm-email', (req, res, next) => {
  const token = req.query.token;
  //console.log(token);
  User.findOneAndUpdate({ confirmationToken: token }, { status: 1 }, { new: true })
    .then(user => {
      //console.log(user);
      res.render('confirmation', { user }); //render confirmation page
    })
    .catch(error => {
      console.log(error);
      next(error);
    });
});

router.get('/sign-in', (req, res) => {
  res.render('sign-in');
});

router.post('/sign-in', (req, res, next) => {
  let user;
  const { email, password } = req.body;
  User.findOne({ email })
    .then(document => {
      if (!document) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        user = document;
        return bcryptjs.compare(password, user.passwordHash);
      }
    })
    .then(result => {
      if (result) {
        req.session.user = user._id;
        res.redirect('/private');
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch(error => {
      next(error);
    });
});

router.post('/sign-out', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
