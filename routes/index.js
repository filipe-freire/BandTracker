'use strict';

const { Router } = require('express');
const router = new Router();

const routeGuard = require('./../middleware/route-guard');
const routeGuardDefault = require('./../middleware/route-guard-default');

// Install/Require additional dependencies
const axios = require('axios');

const Favourites = require('./../models/favourites');
const User = require('./../models/user');

const bandsInTownKey = process.env.BANDSINTOWN_KEY;

const multer = require('multer');
const cloudinary = require('cloudinary');
const multerStorageCloudinary = require('multer-storage-cloudinary');

const storage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2
});
const upload = multer({ storage });

// ----------- START OF TESTING BANDSINTOWN API -------------

// router.get('/bands-in-town', routeGuardDefault, (req, res, next) => {
//   axios
//     .get(`https://rest.bandsintown.com/artists/Kendrick%20Lamar?app_id=${bandsInTownKey}`)
//     .then(results => {
//       //console.log(results.data);
//       res.render('bands-in-town', { searchResult: results.data });
//     })
//     .catch(error => {
//       next(error);
//     });
// });

// router.get('/bands-in-town/events', routeGuardDefault, (req, res, next) => {
//   axios
//     .get(
//       `https://rest.bandsintown.com/artists/Kendrick%20Lamar/events?app_id=${bandsInTownKey}&date=upcoming`
//     )
//     .then(results => {
//       // console.log(results.data[0]);
//       res.render('bands-in-town--events', { searchResult: results.data[0] });
//     })
//     .catch(error => {
//       next(error);
//     });
// });

// ----------- END OF TESTING BANDSINTOWN API -------------

router.get('/show-events', (req, res, next) => {
  const term = req.query.term;

  const normalizedTerm = encodeURIComponent(term);

  if (term.trim()) {
    axios
      .get(
        `https://rest.bandsintown.com/artists/${normalizedTerm}/events?app_id=${bandsInTownKey}&date=upcoming`
      )
      .then(results => {
        // console.log(results.data.length === 0);
        res.render('show-events', { searchResults: results.data });
      });
  } else {
    next(new Error('Invalid Search!'));
  }
});

// NORMAL APP ROUTING
router.get('/', async (req, res, next) => {
  const artistTours = {};
  const user = req.user;

  //if there is a user signed ...

  try {
    if (user && user.createdFavourites) {
      //first get a list of the users favoriets
      const favourites = await Favourites.findOne({ creator: user }).exec();
      const favouritsArray = favourites.artistName;

      //iterate through that list and call the api
      for (const artist of favouritsArray) {
        const normalizedArtistName = encodeURIComponent(artist);
        const tours = await axios.get(
          `https://rest.bandsintown.com/artists/${normalizedArtistName}/events?app_id=${bandsInTownKey}&date=upcoming`
        );
        artistTours[artist] = tours.data;
      }
    }
    res.render('index', { title: 'BandTracker', shows: artistTours });
  } catch (error) {
    next(error);
  }
});

router.get('/private', routeGuardDefault, (req, res) => {
  res.render('private');
});

router.get('/edit', routeGuard, (req, res) => {
  res.render('edit');
});

router.post('/edit', upload.single('profilePicture'), routeGuard, (req, res, next) => {
  const id = req.session.user;
  const { name, email } = req.body;

  const data = { name, email };

  if (req.file) {
    const profilePicture = req.file.path;
    data.profilePicture = profilePicture;
  }

  User.findByIdAndUpdate(id, data)
    .then(() => {
      res.redirect('/private');
    })
    .catch(error => {
      next(error);
    });
});

router.post('/delete', routeGuard, (req, res, next) => {
  const id = req.session.user;

  User.findOneAndDelete({ _id: id })
    .then(() => {
      res.redirect('/');
    })
    .catch(error => {
      next(error);
    });
});

module.exports = router;
