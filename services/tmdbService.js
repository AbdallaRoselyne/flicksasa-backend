const axios = require('axios');
const tmdbApiKey = process.env.TMDB_API_KEY;

const tmdbApi = axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    params: {
        api_key: tmdbApiKey,
    },
});

const getPopularMovies = async () => {
    const response = await tmdbApi.get('/movie/popular');
    return response.data.results;
};

const searchMovies = async (query) => {
    const response = await tmdbApi.get('/search/movie', {
        params: { query },
    });
    return response.data.results;
};

const getMovieDetails = async (movieId) => {
    const response = await tmdbApi.get(`/movie/${movieId}`);
    return response.data;
};

module.exports = { getPopularMovies, searchMovies, getMovieDetails };
