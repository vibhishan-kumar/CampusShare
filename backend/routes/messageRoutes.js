const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/start', messageController.getOrCreateConversation);
router.get('/conversations', messageController.getMyConversations);
router.get('/conversations/:conversationId', messageController.getMessages);
router.post('/conversations/:conversationId', messageController.sendMessage);

module.exports = router;
