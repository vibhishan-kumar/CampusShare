const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markNotificationAsRead);
router.patch('/mark-all-read', notificationController.markAllNotificationsAsRead);

module.exports = router;
