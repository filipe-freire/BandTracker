'use strict';

const { Router } = require('express');
const router = new Router();
const routeGuard = require('./../middleware/route-guard');
const routeGuardDefault = require('./../middleware/route-guard-default');
const routeGuardFavourites = require('./../middleware/route-guard-created-favourites');
// Install/Require additional dependencies
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const Favourites = require('./../models/favourites');
const User = require('./../models/user');
// Integration with the spotify app in order to get artist images
// brief description & genres
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});
const bandsInTownKey = process.env.BANDSINTOWN_KEY;
const multer = require('multer');
const cloudinary = require('cloudinary');
const multerStorageCloudinary = require('multer-storage-cloudinary');

const storage = new multerStorageCloudinary.CloudinaryStorage({
  cloudinary: cloudinary.v2
});
const upload = multer({ storage });

spotifyApi
  .clientCredentialsGrant()
  .then(data => spotifyApi.setAccessToken(data.body['access_token']))
  .catch(error => console.log('Something went wrong when retrieving an access token', error));

// ----------- START OF TESTING BANDSINTOWN API -------------

router.get('/bands-in-town', routeGuardDefault, (req, res, next) => {
  axios
    .get(`https://rest.bandsintown.com/artists/Kendrick%20Lamar?app_id=${bandsInTownKey}`)
    .then(results => {
      //console.log(results.data);
      res.render('bands-in-town', { searchResult: results.data });
    })
    .catch(error => {
      next(error);
    });
});

router.get('/bands-in-town/events', routeGuardDefault, (req, res, next) => {
  axios
    .get(
      `https://rest.bandsintown.com/artists/Kendrick%20Lamar/events?app_id=${bandsInTownKey}&date=upcoming`
    )
    .then(results => {
      // console.log(results.data[0]);
      res.render('bands-in-town--events', { searchResult: results.data[0] });
    })
    .catch(error => {
      next(error);
    });
});

// ----------- END OF TESTING BANDSINTOWN API -------------

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
    .then(() =>
      User.findByIdAndUpdate(userId, { createdFavourites: true })
        .then(() => res.redirect('/private'))
        .catch(error => {
          next(error);
        })
    )
    .catch(error => {
      next(error);
    });
});

router.get('/favourites-display', routeGuard, (req, res, next) => {
  const id = req.user._id;
  //console.log(id);
  Favourites.find({ creator: id })
    .then(data => {
      // console.log(data);
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
      //console.log(followingBands);
      const newFollowingBands = followingBands[0].artistName.filter(
        artist => artist !== deleteArtistName
      );
      // console.log(newFollowingBands);
      return Favourites.findOneAndUpdate(
        { creator: userId },
        { artistName: newFollowingBands },
        { new: true }
      );
    })
    .then(() => res.redirect('/favourites-display'))
    .catch(error => next(error));
});

router.get('/favourites-add', routeGuard, (req, res) => {
  res.render('favourites-add');
});

router.post('/favourites-add', routeGuard, (req, res, next) => {
  const { artistName } = req.body;
  //console.log(artistName);
  const artistNameArr = artistName.split(',');
  //console.log(artistNameArr);
  const userId = req.user._id;

  Favourites.find({ creator: userId })
    .then(followingBands => {
      //delete or filter the bands that are not the one that the user wants to delete
      //console.log(followingBands);
      const favouriteBands = followingBands[0].artistName;
      // console.log(favouriteBands);
      if (artistName.trim().length === 0) {
        return res.render('favourites-add', {
          error: 'Please write the name of an artist or band'
        });
      } else if (!favouriteBands.includes(artistName)) {
        Favourites.findOneAndUpdate({ creator: userId }, { $push: { artistName: artistNameArr } })
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

// -------- START SINGLE ARTIST PAGE ------------

router.get('/artist/:id', (req, res, next) => {
  const id = req.params.id;
  let spotifyData;
  spotifyApi
    .getArtist(id)
    .then(data => {
      //console.log('The received data from the API: ', data.body);
      spotifyData = data;
      //console.log(spotifyData.body.name);
      const normalizedTerm = spotifyData.body.name.split(' ').join('%20');

      return axios.get(
        `https://rest.bandsintown.com/artists/${normalizedTerm}/events?app_id=${bandsInTownKey}&date=upcoming`
      );
    })
    .then(response => {
      const events = response.data;
      //console.log(events.isAxiosError);
      const artist = {
        spotifyData: spotifyData.body,
        artistEvents: events
      };

      if (events.length) {
        if (events[0].artist.name == spotifyData.body.name) {
          // console.log(artist.artistEvents);
          return res.render('artist-page', { artist });
        }
      } else {
        return res.render('artist-page', { artist });
      }
    })
    .catch(err => {
      if (err.isAxiosError) {
        const artist = {
          spotifyData: spotifyData.body,
          artistEvents: null
        };
        res.render('artist-page', { artist });
        //see what you want to render here!
      } else {
        console.log('The error while searching artists occurred: ', err);
        next(err);
      }
    });
});

// -------- ENDING SINGLE ARTIST PAGE ------------

// Spotify get artist results route/view
router.get('/artist-search', (req, res, next) => {
  const term = req.query.term;
  if (term.trim()) {
    spotifyApi
      .searchArtists(term)
      .then(data => {
        // console.log('The received data from the API: ', data.body.artists.items);
        res.render('artist-search-results', { artists: data.body.artists.items });
      })
      .catch(err => console.log('The error while searching artists occurred: ', err));
  } else {
    console.log('error occured');
    throw Error('Invalid Search!');
    // res.render('index');
  }
});

router.get('/show-events', (req, res) => {
  const term = req.query.term;
  //console.log(term);
  const normalizedTerm = term.split(' ').join('%20');

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
    throw Error('Invalid Search!');
    // res.render('index');
  }
});

// NORMAL APP ROUTING
router.get('/', async (req, res) => {
  const artistTours = {};
  const user = req.user;

  //if there is a user signed ...

  if (user) {
    //first get a list of the users favoriets
    //console.log(user);
    const favouritesObject = await Favourites.find({ creator: user }).exec();
    // console.log(favouritesObject);
    const favouritsArray = favouritesObject[0].artistName;
    //console.log('favouritsArray', favouritsArray);

    //iterate through that list and call the api
    for (const artist of favouritsArray) {
      const normalizedArtistName = artist.split(' ').join('%20');
      const tours = await axios.get(
        `https://rest.bandsintown.com/artists/${normalizedArtistName}/events?app_id=${bandsInTownKey}&date=upcoming`
      );
      artistTours[artist] = tours.data;
    }
  }
  res.render('index', { title: 'BandTracker', shows: artistTours });
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

  let data;

  if (req.file) {
    const profilePicture = req.file.path;
    data = { name, email, profilePicture };
  } else {
    data = { name, email };
  }

  User.findByIdAndUpdate(id, data)
    .then(() => {
      res.redirect('/private');
    })
    .catch(error => {
      console.log(error);
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
