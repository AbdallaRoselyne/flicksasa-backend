const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Route to get all users
router.get('/users', authMiddleware, adminController.getAllUsers);

// Route to delete a user
router.delete('/users/:userId', authMiddleware, adminController.deleteUser);

module.exports = router;
