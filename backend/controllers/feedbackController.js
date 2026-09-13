const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// Submit Feedback & Rating (1-5 stars)
async function submitFeedback(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot submit feedback.',
      });
    }

    const { borrow_request_id, rating, comment } = req.body;
    const reviewerId = req.user.id;

    if (!borrow_request_id || !rating) {
      return res.status(400).json({ success: false, message: 'Borrow request ID and rating (1-5) are required.' });
    }

    const numericRating = parseInt(rating, 10);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    // Fetch borrow request
    const { rows: reqRows } = await db.query(
      `SELECT br.*, i.owner_id, i.name as item_name 
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       WHERE br.id = $1`,
      [borrow_request_id]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = reqRows[0];

    // Must be COMPLETED or RETURNED or BORROWED
    if (!['COMPLETED', 'RETURNED', 'BORROWED'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted for completed or active borrow requests.',
      });
    }

    // Determine target user (if reviewer is borrower, target is owner; if reviewer is owner, target is borrower)
    let targetUserId = null;
    if (reviewerId === request.borrower_id) {
      targetUserId = request.owner_id;
    } else if (reviewerId === request.owner_id) {
      targetUserId = request.borrower_id;
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not a participant in this transaction.' });
    }

    // Check if reviewer already gave feedback for this request
    const { rows: existing } = await db.query(
      `SELECT id FROM feedback WHERE borrow_request_id = $1 AND reviewer_id = $2`,
      [borrow_request_id, reviewerId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already submitted a review for this transaction.' });
    }

    // Insert feedback
    const { rows: inserted } = await db.query(
      `INSERT INTO feedback (borrow_request_id, reviewer_id, target_user_id, item_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [borrow_request_id, reviewerId, targetUserId, request.item_id, numericRating, comment || '']
    );

    // Notify target user
    await createNotification({
      userId: targetUserId,
      title: 'New Review Received! ⭐',
      message: `${req.user.name} gave you a ${numericRating}-star review for "${request.item_name}".`,
      type: 'FEEDBACK_RECEIVED',
      link: `/profile/${targetUserId}`,
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully! Thank you for strengthening our campus trust.',
      feedback: inserted[0],
    });
  } catch (err) {
    next(err);
  }
}

// Get Reviews for an Item
async function getItemReviews(req, res, next) {
  try {
    const itemId = req.params.itemId;

    const { rows } = await db.query(
      `SELECT f.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar, u.department as reviewer_department
       FROM feedback f
       JOIN users u ON f.reviewer_id = u.id
       WHERE f.item_id = $1
       ORDER BY f.created_at DESC`,
      [itemId]
    );

    res.json({ success: true, reviews: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitFeedback,
  getItemReviews,
};
