const crypto = require('crypto');
const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// Create Payment Order / Session for online checkout
async function createPaymentOrder(req, res, next) {
  try {
    const { borrow_request_id } = req.body;
    const payerId = req.user.id;

    if (!borrow_request_id) {
      return res.status(400).json({ success: false, message: 'Borrow request ID is required.' });
    }

    const { rows: reqRows } = await db.query(
      `SELECT br.*, i.name as item_name, i.deposit as item_deposit, i.price_per_day, i.owner_id,
              u.name as owner_name, u.phone as owner_phone, u.hostel as owner_hostel, u.room_no as owner_room
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       JOIN users u ON i.owner_id = u.id
       WHERE br.id = $1`,
      [borrow_request_id]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = reqRows[0];

    if (request.borrower_id !== payerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the borrower of this request.' });
    }

    if (!['ACCEPTED', 'PAYMENT'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment order can only be created for accepted requests. Current status is ${request.status}.`,
      });
    }

    const rentalAmount = parseFloat(request.total_price || 0);
    const depositAmount = parseFloat(request.item_deposit || 0);
    const totalPayable = rentalAmount + depositAmount;
    const timestamp = Date.now();
    const orderId = `order_uoh_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`;

    res.json({
      success: true,
      order: {
        orderId,
        borrowRequestId: request.id,
        itemName: request.item_name,
        rentalAmount,
        depositAmount,
        totalPayable,
        currency: 'INR',
        borrower: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
        },
        owner: {
          name: request.owner_name,
          phone: request.owner_phone,
          hostel: request.owner_hostel,
          room: request.owner_room,
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Process Payment (handles Online UPI, Cards, NetBanking, Razorpay, and legacy mock)
async function processPayment(req, res, next) {
  try {
    const { 
      borrow_request_id, 
      payment_method, 
      transaction_id, 
      upi_id, 
      card_last4, 
      bank_name,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature 
    } = req.body;
    const payerId = req.user.id;

    if (!borrow_request_id) {
      return res.status(400).json({ success: false, message: 'Borrow request ID is required.' });
    }

    const validMethods = [
      'ONLINE_UPI', 
      'ONLINE_CARD', 
      'NETBANKING', 
      'RAZORPAY', 
      'UPI', 
      'CAMPUS_WALLET', 
      'CARD', 
      'CASH'
    ];
    const chosenMethod = validMethods.includes(payment_method) ? payment_method : 'ONLINE_UPI';

    // Verify razorpay signature if provided and secret exists
    if (chosenMethod === 'RAZORPAY' && razorpay_signature && process.env.RAZORPAY_KEY_SECRET) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Invalid Razorpay payment signature verification.' });
      }
    }

    // Fetch borrow request and item details
    const { rows: reqRows } = await db.query(
      `SELECT br.*, i.name as item_name, i.deposit as item_deposit, i.owner_id,
              u.name as owner_name, u.phone as owner_phone, u.hostel as owner_hostel, u.room_no as owner_room
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       JOIN users u ON i.owner_id = u.id
       WHERE br.id = $1`,
      [borrow_request_id]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = reqRows[0];

    // Must be the borrower
    if (request.borrower_id !== payerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the borrower of this request.' });
    }

    // Must be in ACCEPTED or PAYMENT state
    if (!['ACCEPTED', 'PAYMENT'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment can only be made for accepted requests. Current status is ${request.status}.`,
      });
    }

    const rentalAmount = parseFloat(request.total_price || 0);
    const depositAmount = parseFloat(request.item_deposit || 0);
    const totalPayable = rentalAmount + depositAmount;

    // Generate simulated/real payment reference & transaction codes
    const timestamp = Date.now();
    const paymentRef = razorpay_payment_id 
      ? `RZP-${razorpay_payment_id}`
      : `PAY-UOH-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    const gatewayTxnId = transaction_id || razorpay_payment_id || `GTXN-${timestamp}-${Math.floor(100000 + Math.random() * 900000)}`;
    const bankAuthCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;

    const txnCodeRent = `TXN-RENT-${timestamp}-${Math.floor(100 + Math.random() * 900)}`;
    const txnCodeDeposit = `TXN-DEP-${timestamp}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Insert into payments table
    const { rows: paymentRows } = await db.query(
      `INSERT INTO payments (
         borrow_request_id, payer_id, payee_id, amount, payment_method, status, payment_reference
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [borrow_request_id, payerId, request.owner_id, totalPayable, chosenMethod, 'SUCCESS', paymentRef]
    );

    const payment = paymentRows[0];

    // 2. Insert itemized transactions
    await db.query(
      `INSERT INTO transactions (payment_id, transaction_type, amount, status, transaction_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [payment.id, 'BORROW_FEE', rentalAmount, 'COMPLETED', txnCodeRent]
    );

    if (depositAmount > 0) {
      await db.query(
        `INSERT INTO transactions (payment_id, transaction_type, amount, status, transaction_code)
         VALUES ($1, $2, $3, $4, $5)`,
        [payment.id, 'SECURITY_DEPOSIT', depositAmount, 'COMPLETED', txnCodeDeposit]
      );
    }

    // 3. Update borrow request status to BORROWED
    await db.query(
      `UPDATE borrow_requests 
       SET status = 'BORROWED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [borrow_request_id]
    );

    // 4. Update item status to borrowed & unavailable
    await db.query(
      `UPDATE items 
       SET is_available = 0, status = 'borrowed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [request.item_id]
    );

    // 5. Send notifications
    await createNotification({
      userId: request.owner_id,
      title: 'Online Payment Confirmed! Handover Ready',
      message: `${req.user.name} completed online payment of ₹${totalPayable.toFixed(2)} (${chosenMethod}) for "${request.item_name}". Handover can proceed!`,
      type: 'PAYMENT_RECEIVED',
      link: '/dashboard?tab=lending',
    });

    await createNotification({
      userId: payerId,
      title: 'Online Payment Successful!',
      message: `Your online payment of ₹${totalPayable.toFixed(2)} for "${request.item_name}" was successful. Ref: ${paymentRef}.`,
      type: 'PAYMENT_SUCCESS',
      link: '/dashboard?tab=borrowing',
    });

    res.json({
      success: true,
      message: 'Online payment completed successfully! Item status updated to Borrowed.',
      payment,
      receipt: {
        paymentReference: paymentRef,
        gatewayTransactionId: gatewayTxnId,
        bankAuthCode,
        amountPaid: totalPayable,
        rentalFee: rentalAmount,
        securityDeposit: depositAmount,
        method: chosenMethod,
        details: {
          upiId: upi_id || null,
          cardLast4: card_last4 || null,
          bankName: bank_name || null,
        },
        item: {
          name: request.item_name,
          ownerName: request.owner_name,
          ownerPhone: request.owner_phone,
          ownerHostel: request.owner_hostel,
          ownerRoom: request.owner_room,
          startDate: request.start_date,
          endDate: request.end_date,
        },
        date: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// Get Payment Details for a Borrow Request
async function getPaymentDetails(req, res, next) {
  try {
    const requestId = req.params.borrowRequestId;
    const userId = req.user.id;

    const { rows: payments } = await db.query(
      `SELECT p.*, br.item_id, i.name as item_name
       FROM payments p
       JOIN borrow_requests br ON p.borrow_request_id = br.id
       JOIN items i ON br.item_id = i.id
       WHERE p.borrow_request_id = $1 AND (p.payer_id = $2 OR p.payee_id = $2)`,
      [requestId, userId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: 'No payment record found for this request.' });
    }

    const payment = payments[0];
    const { rows: txns } = await db.query(
      'SELECT * FROM transactions WHERE payment_id = $1 ORDER BY created_at ASC',
      [payment.id]
    );

    res.json({
      success: true,
      payment: {
        ...payment,
        transactions: txns,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Verify Razorpay webhook or direct signature
async function verifyRazorpay(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay parameters.' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      // In dev mode without keys, return simulated success
      return res.json({ success: true, verified: true, message: 'Dev simulated Razorpay verification.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, verified: true });
    } else {
      res.status(400).json({ success: false, verified: false, message: 'Signature mismatch.' });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPaymentOrder,
  processPayment,
  processMockPayment: processPayment, // Alias for backwards compatibility with test suite
  verifyRazorpay,
  getPaymentDetails,
};
