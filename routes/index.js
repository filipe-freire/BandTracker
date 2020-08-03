'use strict';

const { Router } = require('express');
const router = new Router();
const routeGuard = require('./../middleware/route-guard');
// Install/Require additional dependencies
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

// Integration with the spotify app in order to get artist images
// brief description & genres
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID, // don't forget to put api keys in .env file
  clientSecret: process.env.CLIENT_SECRET
});

spotifyApi
  .clientCredentialsGrant()
  .then(data => spotifyApi.setAccessToken(data.body['access_token']))
  .catch(error => console.log('Something went wrong when retrieving an access token', error));

// Spotify get artist results route/view
router.get('/artist-search', (req, res) => {
  const term = req.query.term;

  spotifyApi
    .searchArtists(term)
    .then(data => {
      console.log('The received data from the API: ', data.body.artists.items);

      res.render('artist-search-results', { artists: data.body.artists.items });

      // ----> 'HERE WHAT WE WANT TO DO AFTER RECEIVING THE DATA FROM THE API'
    })
    .catch(err => console.log('The error while searching artists occurred: ', err));
});

// PREDICTHQ API - GET INFO OF ONLY CONCERTS & TOUR DATES
router.get('/artists', (req, res) => {
  axios
    .get('https://api.predicthq.com/v1/events/?category=concerts', {
      headers: {
        Authorization: 'Bearer ' + process.env.PREDICTHQ_ACCESS_TOKEN //the token given by PredictHQ
      }
    })
    .then(result => {
      console.log(result.data); // only logs the output so far, doesn't display it to the page - FIX
    });
});

// NORMAL APP ROUTING
router.get('/', (req, res, next) => {
  res.render('index', { title: 'BandTracker' });
});

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});

module.exports = router;
