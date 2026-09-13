const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, wishlistController.getWishlist);
router.post('/', authenticateToken, wishlistController.createWishlistItem);
router.delete('/:id', authenticateToken, wishlistController.deleteWishlistItem);

module.exports = router;
