const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Protect all admin endpoints with authentication AND requireAdmin
router.use(authenticateToken);
router.use(requireAdmin);

// Platform Overview & Stats
router.get('/stats', adminController.getPlatformStats);

// Student Directory & Moderation
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/ban', adminController.toggleUserBan);
router.delete('/users/:id', adminController.deleteStudent);

// Item Moderation
router.get('/items', adminController.getAllItems);
router.delete('/items/:id', adminController.deleteItemAdmin);

// Campus Borrow Ledger
router.get('/borrows', adminController.getAllBorrows);
router.patch('/borrows/:id/force-complete', adminController.forceCompleteBorrow);

// Category Management
router.post('/categories', adminController.createCategory);
router.delete('/categories/:id', adminController.deleteCategory);

module.exports = router;
