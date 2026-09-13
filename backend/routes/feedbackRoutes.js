const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, feedbackController.submitFeedback);
router.get('/item/:itemId', feedbackController.getItemReviews);

module.exports = router;
