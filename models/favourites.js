'use strict';

const mongoose = require('mongoose');

const favouritesSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      required: true
    },
    artistName: [{ type: String, unique: true, trim: true }]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Favourites', favouritesSchema);
