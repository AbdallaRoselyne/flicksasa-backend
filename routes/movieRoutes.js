// routes/movieRoutes.js
const express = require('express');
const movieController = require('../controllers/movieController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/recommendations', authMiddleware, movieController.getRecommendations);
router.get('/popular', movieController.getPopularMovies);
router.get('/search', movieController.searchMovies);
router.get('/details/:movieId', movieController.getMovieDetails);
router.get('/tv-shows', movieController.getTvShows);
router.get('/latest', movieController.getLatest);
router.get('/my-list', authMiddleware, movieController.getMyList);
router.post('/interaction', authMiddleware, movieController.updateInteraction);
router.get('/interactions', authMiddleware, movieController.getInteractions);

module.exports = router;
