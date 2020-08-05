'use strict';

// Route Guard Middleware
// This piece of middleware is going to check if a user is authenticated
// If not, it sends the request to the app error handler with a message
module.exports = (req, res, next) => {
  if (req.user.status === 1) {
    next();
  } else {
    const error = new Error(
      'To proceed, please check your email adress to finish create your account'
    );
    next(error);
  }
};
