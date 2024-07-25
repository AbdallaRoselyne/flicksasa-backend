// models/Kyc.js
const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MovieUser',
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    favoriteGenres: {
        type: [String],
        required: true
    },
    devices: {
        type: [String],
        required: true
    },
    streamingServices: {
        type: [String],
        required: true
    },
},
{
    timestamps: true,
});

// Check if the model has already been defined
const Kyc = mongoose.models.Kyc || mongoose.model('Kyc', kycSchema);
module.exports = Kyc;
