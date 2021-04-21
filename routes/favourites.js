'use strict';

const { Router } = require('express');
const router = new Router();

const routeGuard = require('./../middleware/route-guard');
const routeGuardDefault = require('./../middleware/route-guard-default');
const routeGuardFavourites = require('./../middleware/route-guard-created-favourites');

const Favourites = require('./../models/favourites');
const User = require('./../models/user');

// ----------- START TESTING FAVOURITES -------------

router.get('/favourites-creation', routeGuardDefault, routeGuardFavourites, (req, res) => {
  res.render('favourites-creation');
});

router.post('/favourites-creation', (req, res, next) => {
  const { artistName } = req.body;
  const artistNameArr = artistName.split(',');
  const userId = req.user._id;

  Favourites.create({
    artistName: artistNameArr,
    creator: req.session.user
  })
    .then(() => {
      return User.findByIdAndUpdate(userId, { createdFavourites: true });
    })
    .then(() => {
      res.redirect('/private');
    })
    .catch(error => {
      next(error);
    });
});

router.get('/favourites-display', routeGuard, (req, res, next) => {
  const id = req.user._id;
  Favourites.find({ creator: id })
    .then(data => {
      res.render('favourites-display', { favourite: data });
    })
    .catch(error => {
      next(error);
    });
});

router.post('/favourites-delete', routeGuard, (req, res, next) => {
  //artist to be deleted
  const { deleteArtistName } = req.body;
  //console.log(deleteArtistName);
  //we need to find which artsits is the user following
  const userId = req.user;

  Favourites.find({ creator: userId })
    .then(followingBands => {
      //delete or filter the bands that are not the one that the user wants to delete
      const newFollowingBands = followingBands[0].artistName.filter(
        artist => artist !== deleteArtistName
      );
      return Favourites.findOneAndUpdate(
        { creator: userId },
        { artistName: newFollowingBands },
        { new: true }
      );
    })
    .then(() => {
      res.redirect('/favourites-display');
    })
    .catch(error => {
      next(error);
    });
});

router.get('/favourites-add', routeGuard, (req, res) => {
  res.render('favourites-add');
});

router.post('/favourites-add', routeGuard, (req, res, next) => {
  const { artistName } = req.body;
  const artistNameArr = artistName.split(', ');
  //console.log(artistNameArr);
  const userId = req.user._id;

  Favourites.findOne({ creator: userId })
    .then(favourites => {
      //delete or filter the bands that are not the one that the user wants to delete
      const favouriteBands = favourites.artistName;

      // filters the submitted array to check if the artist was previosly added. Shows no erro to the user though
      const filteredSubmittedArtistArr = artistNameArr.filter(
        artist => !favouriteBands.includes(artist)
      );

      if (artistName.trim().length === 0) {
        return res.render('favourites-add', {
          error: 'Please write the name of an artist or band'
        });
      } else if (!favouriteBands.includes(artistName)) {
        Favourites.findOneAndUpdate(
          { creator: userId },
          { $push: { artistName: filteredSubmittedArtistArr } }
        )
          .then(() => res.redirect('/favourites-display'))
          .catch(error => {
            next(error);
          });
      } else {
        res.render('favourites-add', { error: 'Artist already added' });
      }
    })
    .catch(error => next(error));
});

// -------- END TESTING FAVOURITES -----------

module.exports = router;
