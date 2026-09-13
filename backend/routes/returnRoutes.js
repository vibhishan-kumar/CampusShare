const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/initiate', returnController.initiateReturn);
router.post('/confirm', returnController.confirmReturn);

module.exports = router;
