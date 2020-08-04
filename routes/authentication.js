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
router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

router.post('/sign-up', upload.single('profilePicture'), (req, res, next) => {
  const { name, email, password, /*userType,*/ trackBands } = req.body;
  const profilePicture = req.file.path;

  // Confirmation Email
  const confirmationToken = generateRandomToken(10);
  const confirmationUrl = `http://localhost:3000/authentication/confirm-email?token=${confirmationToken}`;

  bcryptjs
    .hash(password, 10)
    .then(hash => {
      return User.create({
        name,
        email,
        passwordHash: hash,
        // userType,  USERTYPE CREATION IF NEEDED
        profilePicture,
        trackBands,
        confirmationToken: confirmationToken
      });
    })
    .then(user => {
      req.session.user = user._id;

      transport
        .sendMail({
          from: process.env.NODEMAILER_EMAIL,
          to: user.email,
          subject: 'Click the link to activate your account!',
          html: `
          <html>
                    <head>
                      <style>
                        body {}
                        a {
                        background-color: skyblue;
                      </style>
                    </head>
                    <body>
                    <a href="${confirmationUrl}"> Link to confirm email </a>
                    </body>
                  </html>
                `
        })
        .then(result => {
          console.log('Email was sent ', result);
        })
        .catch(error => {
          console.log('There was an error sending the email', error);
        });
      res.redirect('/');
    })
    .catch(error => {
      next(error);
    });
});

router.get('/confirm-email', (req, res, next) => {
  const token = req.query.token;
  console.log(token);
  User.findOneAndUpdate({ confirmationToken: token }, { status: 'active' }, { new: true })
    .then(user => {
      console.log(user);
      res.render('confirmation', { user }); //render confirmation page
    })
    .catch(error => console.log(error));
});

router.get('/sign-in', (req, res, next) => {
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

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
