const mongoose = require('mongoose');

const trackingInfoSchema = new mongoose.Schema({
  fingerprintId: {
    type: String,
  },
  userIp: {
    type: String,
  },
  browser: {
    type: String,
  },
  os: {
    type: String,
  },
  platform: {
    type: String,
  },
  device: {
    type: String,
  }
}, { _id: false });

const MovieUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  profileImage: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  phoneNumber: {
    type: String,
    unique: true,
    trim: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isPhoneVerified: {
    type: Boolean,
    default: true,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    required: false,
  },
  otpResendAttempts: {
    type: Number,
    default: 0,
  },
  otpNextResendTime: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  trackingInfo: [trackingInfoSchema],
  favoriteMovies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }]
},
  {
    timestamps: true,
  });

// Check if the model has already been defined
const MovieUser = mongoose.models.MovieUser || mongoose.model('MovieUser', MovieUserSchema);
module.exports = MovieUser;
