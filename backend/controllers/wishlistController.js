const db = require('../config/db');

// 1. Get All Active Campus Wishlist Items
async function getWishlist(req, res, next) {
  try {
    const { category_id } = req.query;
    let queryText = `
      SELECT w.*, 
             c.name as category_name, 
             c.slug as category_slug,
             u.name as user_name, 
             u.avatar_url as user_avatar,
             u.hostel_room as user_hostel,
             u.department as user_department
      FROM wishlist w
      LEFT JOIN categories c ON w.category_id = c.id
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'active' AND COALESCE(u.is_banned, 0) = 0
    `;
    const params = [];

    if (category_id) {
      params.push(category_id);
      queryText += ` AND w.category_id = $${params.length}`;
    }

    queryText += ` ORDER BY w.created_at DESC`;

    const { rows } = await db.query(queryText, params);

    const currentUserId = req.user ? req.user.id : null;
    const items = rows.map(w => ({
      ...w,
      is_my_wish: currentUserId ? w.user_id === currentUserId : false,
      max_price: w.max_price ? parseFloat(w.max_price) : null,
    }));

    res.json({ success: true, count: items.length, wishlist: items });
  } catch (err) {
    next(err);
  }
}

// 2. Add Item to Campus Wishlist
async function createWishlistItem(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot post wishes.',
      });
    }

    const { title, category_id, max_price, notes } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Wish item title is required.' });
    }

    const { rows } = await db.query(
      `INSERT INTO wishlist (user_id, category_id, title, max_price, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [
        userId,
        category_id || null,
        title.trim(),
        max_price !== undefined && max_price !== '' ? parseFloat(max_price) : null,
        notes || '',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Wishlist request posted to campus board! You will be notified when a matching item is listed.',
      wishlistItem: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 3. Delete / Fulfill Wishlist Item (Owner only)
async function deleteWishlistItem(req, res, next) {
  try {
    const wishId = req.params.id;
    const userId = req.user.id;

    const { rows } = await db.query(
      'SELECT * FROM wishlist WHERE id = $1',
      [wishId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Wishlist item not found.' });
    }

    if (rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only manage your own wishlist.' });
    }

    await db.query('DELETE FROM wishlist WHERE id = $1', [wishId]);

    res.json({
      success: true,
      message: 'Wishlist item removed.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWishlist,
  createWishlistItem,
  deleteWishlistItem,
};
