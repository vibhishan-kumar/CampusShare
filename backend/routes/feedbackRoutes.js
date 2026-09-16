const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateFeedback } = require('../middleware/validationMiddleware');

router.post('/', authenticateToken, validateFeedback, feedbackController.submitFeedback);
router.get('/item/:itemId', feedbackController.getItemReviews);

module.exports = router;
