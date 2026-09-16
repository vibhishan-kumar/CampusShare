const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');
const { verifyItemOwner } = require('../middleware/ownershipMiddleware');
const { validateItem } = require('../middleware/validationMiddleware');

// Categories
router.get('/categories', itemController.getCategories);

// Item Browsing (supports optional auth to calculate is_owner)
router.get('/', optionalAuth, itemController.getItems);
router.get('/my-listings', authenticateToken, itemController.getMyItems);
router.get('/:id', optionalAuth, itemController.getItemById);

// Protected item management
router.post('/upload-image', authenticateToken, itemController.uploadItemImage);
router.post('/', authenticateToken, validateItem, itemController.createItem);
router.put('/:id', authenticateToken, verifyItemOwner, validateItem, itemController.updateItem);
router.delete('/:id', authenticateToken, verifyItemOwner, itemController.deleteItem);
router.patch('/:id/toggle-availability', authenticateToken, verifyItemOwner, itemController.toggleAvailability);

module.exports = router;
