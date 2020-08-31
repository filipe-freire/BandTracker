'use strict';

const { Router } = require('express');
const router = new Router();

// Install/Require additional dependencies
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

// Integration with the spotify app in order to get artist images
// brief description & genres
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});
const bandsInTownKey = process.env.BANDSINTOWN_KEY;

spotifyApi
  .clientCredentialsGrant()
  .then(data => spotifyApi.setAccessToken(data.body['access_token']))
  .catch(error => console.log('Something went wrong when retrieving an access token', error));

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
      const normalizedTerm = encodeURIComponent(spotifyData.body.name);

      return axios.get(
        `https://rest.bandsintown.com/artists/${normalizedTerm}/events?app_id=${bandsInTownKey}&date=upcoming`
      );
    })
    .then(response => {
      const events = response.data;

      const artist = {
        spotifyData: spotifyData.body,
        artistEvents: events
      };

      res.render('artist-page', { artist });
      // if (events.length) {
      //   if (events[0].artist.name == spotifyData.body.name) {
      //     // console.log(artist.artistEvents);
      //     return res.render('artist-page', { artist });
      //   }
      // } else {
      //   return res.render('artist-page', { artist });
      // }
    })
    .catch(error => {
      if (error.isAxiosError) {
        const artist = {
          spotifyData: spotifyData.body,
          artistEvents: null
        };
        res.render('artist-page', { artist });
        //see what you want to render here!
      } else {
        console.log('The error while searching artists occurred: ', error);
        next(error);
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
    next(new Error('Invalid Search!'));
  }
});

module.exports = router;
