// models/UserInteraction.js
const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MovieUser',
        required: true
    },
    movieId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['movie', 'tv'],
        required: true
    },
    liked: {
        type: Boolean,
        default: false
    },
    disliked: {
        type: Boolean,
        default: false
    },
    loved: {
        type: Boolean,
        default: false
    },
    watchlist: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);
module.exports = UserInteraction;
