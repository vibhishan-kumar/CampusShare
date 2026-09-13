const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// 1. Borrower requests return
async function initiateReturn(req, res, next) {
  try {
    const { borrow_request_id, borrower_note } = req.body;
    const borrowerId = req.user.id;

    if (!borrow_request_id) {
      return res.status(400).json({ success: false, message: 'Borrow request ID is required.' });
    }

    const { rows } = await db.query(
      `SELECT br.*, i.name as item_name, i.owner_id 
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       WHERE br.id = $1`,
      [borrow_request_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = rows[0];

    if (request.borrower_id !== borrowerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the borrower of this item.' });
    }

    if (request.status !== 'BORROWED') {
      return res.status(400).json({
        success: false,
        message: `Cannot request return. Item is currently in ${request.status} status.`,
      });
    }

    // Insert into returns table
    const { rows: returnRows } = await db.query(
      `INSERT INTO returns (borrow_request_id, borrower_note, return_status)
       VALUES ($1, $2, 'PENDING')
       RETURNING *`,
      [borrow_request_id, borrower_note || 'Item ready for handover back to owner.']
    );

    // Update borrow request status to RETURN_REQUESTED
    await db.query(
      `UPDATE borrow_requests 
       SET status = 'RETURN_REQUESTED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [borrow_request_id]
    );

    // Notify item owner
    await createNotification({
      userId: request.owner_id,
      title: 'Item Return Requested',
      message: `${req.user.name} has requested to return "${request.item_name}". Please verify the item and confirm handover.`,
      type: 'RETURN_REQUESTED',
      link: '/dashboard?tab=lending',
    });

    res.json({
      success: true,
      message: 'Return initiated! Owner has been notified to verify handover.',
      returnData: returnRows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 2. Owner confirms return received
async function confirmReturn(req, res, next) {
  try {
    const { borrow_request_id, owner_note, deposit_refunded } = req.body;
    const ownerId = req.user.id;

    if (!borrow_request_id) {
      return res.status(400).json({ success: false, message: 'Borrow request ID is required.' });
    }

    const { rows } = await db.query(
      `SELECT br.*, i.name as item_name, i.owner_id, i.id as item_id 
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       WHERE br.id = $1`,
      [borrow_request_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = rows[0];

    if (request.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the owner of this item.' });
    }

    if (!['BORROWED', 'RETURN_REQUESTED'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm return. Current request status is ${request.status}.`,
      });
    }

    const now = new Date().toISOString();

    // Update return record or insert if owner directly confirms
    const { rows: existingReturns } = await db.query(
      'SELECT id FROM returns WHERE borrow_request_id = $1',
      [borrow_request_id]
    );

    if (existingReturns.length > 0) {
      await db.query(
        `UPDATE returns 
         SET actual_return_date = $1, return_status = 'CONFIRMED', owner_note = $2, deposit_refunded = $3
         WHERE borrow_request_id = $4`,
        [now, owner_note || 'Item received in good condition.', deposit_refunded !== false ? 1 : 0, borrow_request_id]
      );
    } else {
      await db.query(
        `INSERT INTO returns (borrow_request_id, return_request_date, actual_return_date, return_status, owner_note, deposit_refunded)
         VALUES ($1, $2, $3, 'CONFIRMED', $4, $5)`,
        [borrow_request_id, now, now, owner_note || 'Item received.', deposit_refunded !== false ? 1 : 0]
      );
    }

    // 1. Mark borrow request as COMPLETED
    await db.query(
      `UPDATE borrow_requests 
       SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [borrow_request_id]
    );

    // 2. Make item available again!
    await db.query(
      `UPDATE items 
       SET is_available = 1, status = 'available', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [request.item_id]
    );

    // 3. Notify borrower
    await createNotification({
      userId: request.borrower_id,
      title: 'Item Return Confirmed! ⭐',
      message: `The owner confirmed receipt of "${request.item_name}". Please leave a rating and review!`,
      type: 'RETURN_CONFIRMED',
      link: '/dashboard?tab=borrowing',
    });

    res.json({
      success: true,
      message: 'Return confirmed! The item is now back to Available status.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  initiateReturn,
  confirmReturn,
};
