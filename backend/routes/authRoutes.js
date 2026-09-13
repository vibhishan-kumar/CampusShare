const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/send-otp', authController.sendRegistrationOTP);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/students/:id', authController.getPublicProfile);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
