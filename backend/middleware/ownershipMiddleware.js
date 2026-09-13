const db = require('../config/db');

// Verify that req.user is the owner of the item in req.params.id
async function verifyItemOwner(req, res, next) {
  try {
    const itemId = req.params.id || req.body.item_id;
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'Item ID is required.' });
    }

    const { rows } = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the owner of this item.' });
    }

    req.item = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

// Verify that req.user is either borrower or item owner of the borrow request in req.params.id
async function verifyBorrowParticipant(req, res, next) {
  try {
    const requestId = req.params.id;
    const { rows } = await db.query(
      `SELECT br.*, i.owner_id, i.name as item_name 
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       WHERE br.id = $1`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = rows[0];
    const isBorrower = request.borrower_id === req.user.id;
    const isOwner = request.owner_id === req.user.id;

    if (!isBorrower && !isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not part of this borrow transaction.' });
    }

    req.borrowRequest = request;
    req.isBorrower = isBorrower;
    req.isOwner = isOwner;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verifyItemOwner,
  verifyBorrowParticipant,
};
