'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
      // ADD UNIQUE
    },
    passwordHash: {
      type: String,
      required: true
    },
    // userType: {
    //   type: String,
    //   required: true,
    //   enum: ['Fan', 'Artist']
    //   // add default: "Fan" ?
    // },
    profilePicture: {
      type: String,
      required: [true, 'A profile picture is required.']
    },
    // Send confirmation email to user
    status: {
      type: Number,
      enum: [0, 1], // 0 = 'confirmation pending' \ 1 = 'active'
      default: 0
    },
    createdFavourites: {
      type: Boolean,
      enum: [false, true],
      default: false
    },
    confirmationToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', schema);
