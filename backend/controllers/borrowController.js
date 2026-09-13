const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// 1. Create Borrow Request (Borrower)
async function createBorrowRequest(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot borrow items.',
      });
    }

    const { item_id, start_date, end_date, request_note } = req.body;
    const borrowerId = req.user.id;

    if (!item_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Item, start date, and end date are required.' });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date format.' });
    }

    if (endDateObj < startDateObj) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
    }

    // Fetch Item details
    const { rows: itemRows } = await db.query(
      `SELECT i.*, u.name as owner_name, u.email as owner_email, COALESCE(u.is_banned, 0) as owner_is_banned 
       FROM items i 
       JOIN users u ON i.owner_id = u.id 
       WHERE i.id = $1`,
      [item_id]
    );

    if (itemRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const item = itemRows[0];

    if (Boolean(item.owner_is_banned)) {
      return res.status(400).json({
        success: false,
        message: 'This item is currently not available for borrowing.',
      });
    }

    // Rule: Students cannot borrow their own items
    if (item.owner_id === borrowerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot borrow your own item.',
      });
    }

    // Rule: Check if item is currently available
    if (!item.is_available || item.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'This item is currently not available for borrowing.',
      });
    }

    // Check if item currently has an active accepted or borrowed booking
    const { rows: activeBorrows } = await db.query(
      `SELECT * FROM borrow_requests 
       WHERE item_id = $1 AND status IN ('BORROWED', 'ACCEPTED')
       ORDER BY end_date DESC LIMIT 1`,
      [item_id]
    );

    if (activeBorrows.length > 0) {
      const activeBorrow = activeBorrows[0];
      return res.status(400).json({
        success: false,
        message: `This item is currently borrowed until ${activeBorrow.end_date}. It will be available for borrowing after this date.`,
      });
    }

    // Check if user already has an active or pending request for this item
    const { rows: existingPending } = await db.query(
      `SELECT id FROM borrow_requests 
       WHERE item_id = $1 AND borrower_id = $2 AND status IN ('PENDING', 'ACCEPTED', 'PAYMENT', 'BORROWED')`,
      [item_id, borrowerId]
    );

    if (existingPending.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active or pending borrow request for this item.',
      });
    }

    // Calculate days and total price
    const diffTime = Math.abs(endDateObj - startDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of start & end
    const totalPrice = (diffDays * parseFloat(item.price_per_day || 0)).toFixed(2);

    // Insert request
    const { rows } = await db.query(
      `INSERT INTO borrow_requests (
         item_id, borrower_id, start_date, end_date, total_price, status, request_note
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [item_id, borrowerId, start_date, end_date, totalPrice, 'PENDING', request_note || '']
    );

    const newRequest = rows[0];

    // Notify item owner
    await createNotification({
      userId: item.owner_id,
      title: 'New Borrow Request Received',
      message: `${req.user.name} requested to borrow your "${item.name}" from ${start_date} to ${end_date}.`,
      type: 'BORROW_REQUEST',
      link: '/dashboard?tab=lending',
    });

    res.status(201).json({
      success: true,
      message: 'Borrow request sent to owner for approval!',
      borrowRequest: newRequest,
      calculation: {
        days: diffDays,
        pricePerDay: parseFloat(item.price_per_day),
        deposit: parseFloat(item.deposit || 0),
        rentalTotal: parseFloat(totalPrice),
        grandTotal: parseFloat(totalPrice) + parseFloat(item.deposit || 0),
      },
    });
  } catch (err) {
    next(err);
  }
}

// 2. Get Requests sent by Current Student (My Borrows)
async function getMyBorrowRequests(req, res, next) {
  try {
    const borrowerId = req.user.id;

    const { rows } = await db.query(
      `SELECT br.*, 
              i.name as item_name, 
              i.image_url as item_image,
              i.deposit as item_deposit,
              i.location as item_location,
              u.id as owner_id,
              u.name as owner_name, 
              u.email as owner_email,
              u.phone as owner_phone,
              u.hostel_room as owner_hostel,
              p.status as payment_status,
              p.payment_reference,
              p.payment_method,
              (SELECT id FROM feedback f WHERE f.borrow_request_id = br.id AND f.reviewer_id = $1) as my_feedback_id
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       JOIN users u ON i.owner_id = u.id
       LEFT JOIN payments p ON p.borrow_request_id = br.id AND p.status = 'SUCCESS'
       WHERE br.borrower_id = $1
       ORDER BY br.created_at DESC`,
      [borrowerId]
    );

    res.json({ success: true, requests: rows });
  } catch (err) {
    next(err);
  }
}

// 3. Get Incoming Requests for Items Listed by Current Student (Lender Dashboard)
async function getIncomingBorrowRequests(req, res, next) {
  try {
    const ownerId = req.user.id;

    const { rows } = await db.query(
      `SELECT br.*, 
              i.name as item_name, 
              i.image_url as item_image,
              i.deposit as item_deposit,
              u.id as borrower_id,
              u.name as borrower_name, 
              u.email as borrower_email,
              u.phone as borrower_phone,
              u.hostel_room as borrower_hostel,
              u.department as borrower_department,
              COALESCE(avg_f.avg_rating, 5.0) as borrower_rating,
              p.status as payment_status,
              p.payment_reference,
              (SELECT id FROM feedback f WHERE f.borrow_request_id = br.id AND f.reviewer_id = $1) as my_feedback_id
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       JOIN users u ON br.borrower_id = u.id
       LEFT JOIN payments p ON p.borrow_request_id = br.id AND p.status = 'SUCCESS'
       LEFT JOIN (
         SELECT target_user_id, ROUND(AVG(rating), 1) as avg_rating
         FROM feedback
         GROUP BY target_user_id
       ) avg_f ON u.id = avg_f.target_user_id
       WHERE i.owner_id = $1
       ORDER BY br.created_at DESC`,
      [ownerId]
    );

    res.json({ success: true, requests: rows });
  } catch (err) {
    next(err);
  }
}

// 4. Accept / Reject Borrow Request (Owner Action)
async function updateRequestStatus(req, res, next) {
  try {
    const requestId = req.params.id;
    const { action, owner_remarks } = req.body; // action: 'ACCEPT' or 'REJECT'
    const ownerId = req.user.id;

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be ACCEPT or REJECT.' });
    }

    // Verify owner
    const { rows: reqRows } = await db.query(
      `SELECT br.*, i.owner_id, i.name as item_name 
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       WHERE br.id = $1`,
      [requestId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = reqRows[0];

    if (request.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Only the item owner can accept or reject requests.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request is already in ${request.status} status.` });
    }

    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    const { rows: updated } = await db.query(
      `UPDATE borrow_requests 
       SET status = $1, owner_remarks = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newStatus, owner_remarks || '', requestId]
    );

    // If accepted, immediately mark item as borrowed/unavailable
    if (action === 'ACCEPT') {
      await db.query(
        `UPDATE items 
         SET is_available = 0, status = 'borrowed', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [request.item_id]
      );
    }

    // Notify Borrower
    if (action === 'ACCEPT') {
      await createNotification({
        userId: request.borrower_id,
        title: 'Borrow Request Accepted! 🎉',
        message: `Your request for "${request.item_name}" has been accepted! Please proceed to payment to finalize.`,
        type: 'REQUEST_ACCEPTED',
        link: '/dashboard?tab=borrowing',
      });
    } else {
      await createNotification({
        userId: request.borrower_id,
        title: 'Borrow Request Declined',
        message: `Your request for "${request.item_name}" was declined. Reason: ${owner_remarks || 'Not specified'}.`,
        type: 'REQUEST_REJECTED',
        link: '/dashboard?tab=borrowing',
      });
    }

    res.json({
      success: true,
      message: `Borrow request ${action === 'ACCEPT' ? 'accepted' : 'rejected'}.`,
      borrowRequest: updated[0],
    });
  } catch (err) {
    next(err);
  }
}

// 5. Cancel Borrow Request (Borrower Action, if still PENDING)
async function cancelBorrowRequest(req, res, next) {
  try {
    const requestId = req.params.id;
    const borrowerId = req.user.id;

    const { rows } = await db.query(
      `SELECT * FROM borrow_requests WHERE id = $1 AND borrower_id = $2`,
      [requestId, borrowerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found or not owned by you.' });
    }

    if (!['PENDING', 'ACCEPTED'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: 'Only pending or accepted requests can be cancelled.' });
    }

    await db.query(
      `UPDATE borrow_requests SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );

    // If request was accepted, check if any other active borrow exists; if none, make item available again
    const { rows: otherBorrows } = await db.query(
      `SELECT id FROM borrow_requests WHERE item_id = $1 AND status IN ('BORROWED', 'ACCEPTED')`,
      [rows[0].item_id]
    );
    if (otherBorrows.length === 0) {
      await db.query(
        `UPDATE items SET is_available = 1, status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [rows[0].item_id]
      );
    }

    res.json({ success: true, message: 'Borrow request cancelled.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBorrowRequest,
  getMyBorrowRequests,
  getIncomingBorrowRequests,
  updateRequestStatus,
  cancelBorrowRequest,
};
