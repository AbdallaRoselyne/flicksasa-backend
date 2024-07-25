// routes/kycRoutes.js
const express = require('express');
const router = express.Router();
const { submitKyc } = require('../controllers/kycController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, submitKyc);

module.exports = router;
