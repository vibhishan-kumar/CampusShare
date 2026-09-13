const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/create-order', paymentController.createPaymentOrder);
router.post('/checkout', paymentController.processPayment);
router.post('/verify-razorpay', paymentController.verifyRazorpay);
router.get('/request/:borrowRequestId', paymentController.getPaymentDetails);

module.exports = router;
