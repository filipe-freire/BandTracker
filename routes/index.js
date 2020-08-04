'use strict';

const { Router } = require('express');
const router = new Router();
const routeGuard = require('./../middleware/route-guard');
// Install/Require additional dependencies
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const Favourites = require('./../models/favourites');
const User = require('./../models/user');
// Integration with the spotify app in order to get artist images
// brief description & genres
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID, // don't forget to put api keys in .env file
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

router.get('/bands-in-town', (req, res, next) => {
  axios
    .get(`https://rest.bandsintown.com/artists/Kendrick%20Lamar?app_id=${bandsInTownKey}`)
    .then(results => {
      console.log(results.data);
      res.render('bands-in-town', { searchResult: results.data });
    })
    .catch(error => {
      next(error);
    });
});

router.get('/bands-in-town/events', (req, res, next) => {
  axios
    .get(
      `https://rest.bandsintown.com/artists/Kendrick%20Lamar/events?app_id=${bandsInTownKey}&date=upcoming`
    )
    .then(results => {
      console.log(results.data[0]);
      res.render('bands-in-town--events', { searchResult: results.data[0] });
    })
    .catch(error => {
      next(error);
    });
});

// ----------- END OF TESTING BANDSINTOWN API -------------

// ----------- START TESTING FAVOURITES -------------

router.get('/favourites-creation', routeGuard, (req, res) => {
  res.render('favourites-creation');
});

router.post('/favourites-creation', routeGuard, (req, res, next) => {
  const { artistName } = req.body;

  Favourites.create({
    artistName,
    creator: req.session.user
  })
    .then(res.redirect('/favourites-display'))
    .catch(error => {
      next(error);
    });
});

router.get('/favourites-display', routeGuard, (req, res, next) => {
  //const user = req.user;

  Favourites.find()
    .then(data => {
      console.log(data);
      res.render('favourites-display', { favourite: data });
    })
    .catch(error => {
      next(error);
    });
});
// -------- END TESTING FAVOURITES -----------

// -------- START SINGLE ARTIST PAGE ------------

router.get('/artist/:id', routeGuard, (req, res, next) => {
  const id = req.params.id;
  console.log(id);
  let spotifyData;
  spotifyApi
    .getArtist(id)
    .then(data => {
      //console.log('The received data from the API: ', data.body);
      spotifyData = data;
      return axios.get(
        'https://api.predicthq.com/v1/events/?category=concerts&limit=50&active.gte=2020-08-04&active.lte=2020-12-30',
        {
          headers: {
            Authorization: 'Bearer ' + process.env.PREDICTHQ_ACCESS_TOKEN //the token given by PredictHQ
          }
        }
      );
      //call the api with all the events
    })
    .then(response => {
      console.log(spotifyData.body.name);
      const events = response.data.results;
      const artistEvents = events.find(event => {
        if (event.title == spotifyData.body.name) {
          return event;
        }
      });
      console.log(artistEvents);
      const artist = {
        artist: spotifyData.body,
        artistEvents
      };
      res.render('artist-page', { artist });
    })
    .catch(err => console.log('The error while searching artists occurred: ', err));
});

// -------- ENDING SINGLE ARTIST PAGE ------------

// Spotify get artist results route/view
router.get('/artist-search', (req, res) => {
  const term = req.query.term;

  spotifyApi
    .searchArtists(term)
    .then(data => {
      console.log('The received data from the API: ', data.body.artists.items);

      res.render('artist-search-results', { artists: data.body.artists.items });
    })
    .catch(err => console.log('The error while searching artists occurred: ', err));
});

// PREDICTHQ API - GET INFO OF ONLY CONCERTS & TOUR DATES
router.get('/show-events', (req, res) => {
  axios
    .get(
      'https://api.predicthq.com/v1/events/?category=concerts&limit=50&active.gte=2020-08-04&active.lte=2020-12-30',
      {
        headers: {
          Authorization: 'Bearer ' + process.env.PREDICTHQ_ACCESS_TOKEN //the token given by PredictHQ
        }
      }
    )
    .then(results => {
      console.log(results.data.results);
      res.render('show-events', { searchResults: results.data.results });
    });
});

// NORMAL APP ROUTING
router.get('/', (req, res, next) => {
  res.render('index', { title: 'BandTracker' });
});

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});

router.get('/edit', routeGuard, (req, res, next) => {
  res.render('edit');
});

router.post('/edit', upload.single('profilePicture'), routeGuard, (req, res, next) => {
  const id = req.session.user;
  const { name, email, trackBands } = req.body;

  let data;

  if (req.file) {
    const profilePicture = req.file.path;
    data = { name, email, profilePicture, trackBands };
  } else {
    data = { name, email, trackBands };
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
