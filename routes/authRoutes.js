const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/authMiddleware');

// Define the signup and login routes
router.post('/signup', authController.signupUser);
router.post('/login', authController.loginUser);
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/verify-first-time-user', authController.verifyFirstTimeUser);
router.post('/verify-phone', authController.verifyPhoneNumber);
router.get('/info', authMiddleware, authController.getUserInfo);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-code', authController.verifyResetCode);
router.post('/change-phone', authController.changePhoneNumber);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-verification-code', authController.resendResetCode);

// Export the router
module.exports = router;
