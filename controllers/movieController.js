// controllers/movieController.js
const axios = require('axios');
const { spawn } = require('child_process');
const MovieUser = require('../models/MovieUser');
const Kyc = require('../models/Kyc');
const UserInteraction = require('../models/UserInteraction');

const tmdbApiKey = process.env.TMDB_API_KEY;

const tmdbApi = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
    params: {
        api_key: tmdbApiKey,
    },
});

const getPopularMovies = async (req, res) => {
    try {
        const response = await tmdbApi.get('/movie/popular');
        res.status(200).json(response.data.results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch popular movies', error: error.message });
    }
};

const searchMovies = async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
    }
    try {
        const response = await tmdbApi.get('/search/movie', {
            params: { query },
        });
        res.status(200).json(response.data.results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to search for movies', error: error.message });
    }
};

const getMovieDetails = async (req, res) => {
    const { movieId } = req.params;
    const { type } = req.query;

    if (!movieId || !type) {
        return res.status(400).json({ message: 'Movie ID and type are required' });
    }

    const endpoint = type === 'tv' ? `/tv/${movieId}` : `/movie/${movieId}`;

    try {
        const response = await tmdbApi.get(endpoint, {
            params: {
                append_to_response: 'videos,reviews'
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ message: `Failed to fetch ${type} details`, error: error.message });
    }
};

const getTvShows = async (req, res) => {
    try {
        const response = await tmdbApi.get('/tv/popular');
        res.status(200).json(response.data.results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch TV shows', error: error.message });
    }
};

const getLatest = async (req, res) => {
    try {
        const response = await tmdbApi.get('/movie/now_playing');
        res.status(200).json(response.data.results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch latest movies', error: error.message });
    }
};

const getMyList = async (req, res) => {
    const userId  = req.user;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const interactions = await UserInteraction.find({ user: userId, watchlist: true });
        const promises = interactions.map(interaction => 
            tmdbApi.get(`/${interaction.type}/${interaction.movieId}`)
        );
        const movies = await Promise.all(promises);

        res.status(200).json(movies.map(movie => ({
            ...movie.data,
            type: interactions.find(interaction => interaction.movieId === movie.data.id.toString()).type
        })));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch my list', error: error.message });
    }
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

const getRecommendations = async (req, res) => {
    const userId = req.user;
    try {
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const kycData = await Kyc.findOne({ user: userId });

        if (!kycData) {
            return res.status(400).json({ message: 'KYC data not found for user' });
        }

        const { favoriteGenres, streamingServices } = kycData;

        if (!favoriteGenres || !Array.isArray(favoriteGenres) || favoriteGenres.length === 0) {
            return res.status(400).json({ message: 'Favorite genres not provided or invalid in KYC data' });
        }

        if (!streamingServices || !Array.isArray(streamingServices) || streamingServices.length === 0) {
            return res.status(400).json({ message: 'Streaming services not provided or invalid in KYC data' });
        }

        const genreMap = {
            'Action': 28,
            'Adventure': 12,
            'Animation': 16,
            'Comedy': 35,
            'Crime': 80,
            'Documentary': 99,
            'Drama': 18,
            'Family': 10751,
            'Fantasy': 14,
            'History': 36,
            'Horror': 27,
            'Music': 10402,
            'Mystery': 9648,
            'Romance': 10749,
            'Science Fiction': 878,
            'TV Movie': 10770,
            'Thriller': 53,
            'War': 10752,
            'Western': 37
        };

        const serviceMap = {
            'Netflix': 8,
            'Amazon Prime Video': 119,
            'Disney+': 337,
            'Apple TV+': 350,
            'Hulu': 15,
            'HBO Max': 384
        };

        const genreIds = favoriteGenres.map(genre => genreMap[genre]).filter(id => id !== undefined).join(',');
        const serviceIds = streamingServices.map(service => serviceMap[service]).filter(id => id !== undefined).join('|');

        console.log(`Mapped genres: ${genreIds}`);
        console.log(`Mapped streaming services: ${serviceIds}`);

        // Fetch user interactions
        const userInteractions = await UserInteraction.find({ user: userId });

        // Collaborative filtering
        const likedMovies = userInteractions.filter(interaction => interaction.liked || interaction.loved).map(interaction => interaction.movieId);
        let similarUsers = [];

        if (likedMovies.length > 0) {
            similarUsers = await UserInteraction.aggregate([
                { $match: { movieId: { $in: likedMovies }, user: { $ne: userId } } },
                { $group: { _id: "$user", commonLikes: { $sum: 1 } } },
                { $sort: { commonLikes: -1 } },
                { $limit: 10 }
            ]);
        }

        let collaborativeRecommendations = [];

        if (similarUsers.length > 0) {
            const similarUserIds = similarUsers.map(user => user._id);
            const recommendations = await UserInteraction.find({
                user: { $in: similarUserIds },
                liked: true
            }).populate('movieId').limit(10);

            collaborativeRecommendations = recommendations.map(rec => rec.movieId);
        }

        // Content-based filtering
        const contentResponse = await axios.get('https://api.themoviedb.org/3/discover/movie', {
            params: {
                api_key: process.env.TMDB_API_KEY,
                with_genres: genreIds,
                with_watch_providers: serviceIds,
                watch_region: 'US',
                sort_by: 'popularity.desc',
            },
        });

        let contentRecommendations = contentResponse.data.results;

        // Combine recommendations
        const combinedRecommendations = [...collaborativeRecommendations, ...contentRecommendations];

        // Remove duplicates
        const uniqueRecommendations = Array.from(new Set(combinedRecommendations.map(a => a.id)))
            .map(id => {
                return combinedRecommendations.find(a => a.id === id);
            });

        // Shuffle recommendations to ensure variety
        shuffleArray(uniqueRecommendations);

        if (uniqueRecommendations.length > 0) {
            res.status(200).json(uniqueRecommendations);
        } else {
            res.status(200).json([]);
        }
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ message: 'Failed to fetch recommendations', error: error.message });
    }
};

const updateInteraction = async (req, res) => {
    const userId = req.user;
    const { movieId, action, type } = req.body;

    if (!userId || !movieId || !action || !type) {
        return res.status(400).json({ message: 'User ID, Movie ID, type, and action are required' });
    }

    let update = {};
    if (action === 'liked' || action === 'loved') {
        update = { liked: false, disliked: false, loved: false, [action]: true };
    } else if (action === 'disliked') {
        update = { liked: false, loved: false, disliked: true };
    } else if (action === 'watchlist') {
        update = { watchlist: true };
    } else if (action === 'remove_watchlist') {
        update = { watchlist: false };
    } else {
        return res.status(400).json({ message: 'Invalid action' });
    }

    try {
        const interaction = await UserInteraction.findOneAndUpdate(
            { user: userId, movieId, type },
            { $set: update },
            { new: true, upsert: true }
        );

        res.status(200).json(interaction);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update interaction', error: error.message });
    }
};

const getInteractions = async (req, res) => {
    const userId = req.user;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const interactions = await UserInteraction.find({ user: userId });
        res.status(200).json(interactions);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch interactions', error: error.message });
    }
};

const searchMoviesWithML = async (req, res) => {
    const { query } = req.query;
    const userId = req.user;

    if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
    }

    // Use the search query as the favorite movie
    const favorite_movie = query;

    try {
        const response = await tmdbApi.get('/search/movie', {
            params: { query },
        });

        // Trigger the ML script with dynamic values
        const mlProcess = spawn('python3', ['../flicksasa-ML/hybrid.py', '--user_id', userId.toString(), '--favorite_movie', favorite_movie]);

        mlProcess.stdout.on('data', (data) => {
            console.log(`ML Output: ${data}`);
        });

        mlProcess.stderr.on('data', (data) => {
            console.error(`ML Error: ${data}`);
        });

        mlProcess.on('close', (code) => {
            console.log(`ML process exited with code ${code}`);
        });

        res.status(200).json(response.data.results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to search for movies with ML', error: error.message });
    }
};


module.exports = {
    getPopularMovies,
    searchMovies,
    searchMoviesWithML,
    getMovieDetails,
    getTvShows,
    getLatest,
    getMyList,
    getRecommendations,
    updateInteraction,
    getInteractions
};

