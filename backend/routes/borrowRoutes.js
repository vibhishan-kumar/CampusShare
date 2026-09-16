const express = require('express');
const router = express.Router();
const borrowController = require('../controllers/borrowController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateBorrowRequest } = require('../middleware/validationMiddleware');

router.use(authenticateToken);

router.post('/', validateBorrowRequest, borrowController.createBorrowRequest);
router.get('/my-borrows', borrowController.getMyBorrowRequests);
router.get('/incoming', borrowController.getIncomingBorrowRequests);
router.patch('/:id/status', borrowController.updateRequestStatus);
router.patch('/:id/cancel', borrowController.cancelBorrowRequest);

module.exports = router;
