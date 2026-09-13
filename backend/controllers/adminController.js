const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// 1. Platform-wide Overview & Key Performance Indicators
async function getPlatformStats(req, res, next) {
  try {
    const { rows: userCount } = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
    );

    const { rows: itemCount } = await db.query(
      'SELECT COUNT(*) as count FROM items'
    );

    const { rows: activeBorrows } = await db.query(
      "SELECT COUNT(*) as count FROM borrow_requests WHERE status IN ('BORROWED', 'RETURN_REQUESTED', 'ACCEPTED')"
    );

    const { rows: completedBorrows } = await db.query(
      "SELECT COUNT(*) as count FROM borrow_requests WHERE status = 'COMPLETED'"
    );

    const { rows: volumeRows } = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as total_volume FROM payments WHERE status = 'SUCCESS'"
    );

    const { rows: categoryStats } = await db.query(
      `SELECT c.name, COUNT(i.id) as item_count 
       FROM categories c
       LEFT JOIN items i ON c.id = i.category_id
       GROUP BY c.id, c.name
       ORDER BY item_count DESC`
    );

    const { rows: recentActivity } = await db.query(
      `SELECT br.id, br.status, br.total_price, br.created_at,
              i.name as item_name,
              u1.name as borrower_name,
              u2.name as owner_name
       FROM borrow_requests br
       JOIN items i ON br.item_id = i.id
       JOIN users u1 ON br.borrower_id = u1.id
       JOIN users u2 ON i.owner_id = u2.id
       ORDER BY br.created_at DESC
       LIMIT 6`
    );

    res.json({
      success: true,
      stats: {
        totalStudents: parseInt(userCount[0]?.count || 0, 10),
        totalItems: parseInt(itemCount[0]?.count || 0, 10),
        activeBorrows: parseInt(activeBorrows[0]?.count || 0, 10),
        completedBorrows: parseInt(completedBorrows[0]?.count || 0, 10),
        totalVolume: parseFloat(volumeRows[0]?.total_volume || 0),
        categoryBreakdown: categoryStats,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 2. Student Directory & Moderation
async function getAllUsers(req, res, next) {
  try {
    const { search, school, hostel } = req.query;

    let queryText = `
      SELECT u.id, u.name, u.email, u.phone, u.school, u.program, u.hostel, u.room_no, 
             u.hostel_room, u.department, u.avatar_url, u.role, COALESCE(u.is_banned, 0) as is_banned,
             u.created_at,
             (SELECT COUNT(*) FROM items i WHERE i.owner_id = u.id) as items_count,
             (SELECT COUNT(*) FROM borrow_requests br WHERE br.borrower_id = u.id) as borrows_count,
             COALESCE((SELECT ROUND(AVG(rating), 1) FROM feedback f WHERE f.target_user_id = u.id), 5.0) as rating
      FROM users u
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      queryText += ` AND (LOWER(u.name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR LOWER(u.phone) LIKE $${pIdx})`;
    }

    if (school && school !== 'all') {
      params.push(school);
      queryText += ` AND u.school = $${params.length}`;
    }

    if (hostel && hostel !== 'all') {
      params.push(hostel);
      queryText += ` AND u.hostel = $${params.length}`;
    }

    queryText += ' ORDER BY u.created_at DESC';

    const { rows } = await db.query(queryText, params);

    res.json({
      success: true,
      count: rows.length,
      users: rows.map(u => ({
        ...u,
        is_banned: Boolean(u.is_banned),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// 3. Ban / Unban Student Account
async function toggleUserBan(req, res, next) {
  try {
    const targetUserId = req.params.id;

    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student account not found.' });
    }

    const targetUser = userRows[0];
    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot ban an administrator account.' });
    }

    const newStatus = targetUser.is_banned ? 0 : 1;

    await db.query('UPDATE users SET is_banned = $1 WHERE id = $2', [newStatus, targetUserId]);

    // Send notification
    await createNotification({
      userId: targetUserId,
      title: newStatus ? 'Account Suspended' : 'Account Re-activated',
      message: newStatus
        ? 'Your campus account has been temporarily suspended by an administrator.'
        : 'Your campus account suspension has been lifted.',
      type: 'ADMIN_ALERT',
      link: '/profile',
    });

    res.json({
      success: true,
      message: `Student account ${newStatus ? 'suspended' : 're-activated'}.`,
      is_banned: Boolean(newStatus),
    });
  } catch (err) {
    next(err);
  }
}

// 4. Moderate All Items
async function getAllItems(req, res, next) {
  try {
    const { search, category, status } = req.query;

    let queryText = `
      SELECT i.*, 
             c.name as category_name,
             u.name as owner_name, 
             u.email as owner_email,
             u.hostel as owner_hostel,
             u.room_no as owner_room
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      JOIN users u ON i.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      queryText += ` AND (LOWER(i.name) LIKE $${pIdx} OR LOWER(i.description) LIKE $${pIdx} OR LOWER(u.name) LIKE $${pIdx})`;
    }

    if (category && category !== 'all') {
      params.push(category);
      queryText += ` AND i.category_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      queryText += ` AND i.status = $${params.length}`;
    }

    queryText += ' ORDER BY i.created_at DESC';

    const { rows } = await db.query(queryText, params);

    res.json({ success: true, count: rows.length, items: rows });
  } catch (err) {
    next(err);
  }
}

// 5. Admin Force-Delete Item
async function deleteItemAdmin(req, res, next) {
  try {
    const itemId = req.params.id;
    const { reason } = req.body;

    const { rows: itemRows } = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);
    if (itemRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const item = itemRows[0];

    await db.query('DELETE FROM items WHERE id = $1', [itemId]);

    // Notify owner
    await createNotification({
      userId: item.owner_id,
      title: 'Item Listing Removed by Moderator',
      message: `Your listing "${item.name}" was removed by campus administration. Reason: ${reason || 'Policy violation'}.`,
      type: 'ADMIN_ALERT',
      link: '/dashboard',
    });

    res.json({ success: true, message: 'Item listing removed by admin.' });
  } catch (err) {
    next(err);
  }
}

// 6. Campus-wide Borrow Ledger
async function getAllBorrows(req, res, next) {
  try {
    const { status } = req.query;

    let queryText = `
      SELECT br.*, 
             i.name as item_name, i.image_url as item_image,
             u1.name as borrower_name, u1.email as borrower_email, u1.hostel as borrower_hostel, u1.room_no as borrower_room,
             u2.id as owner_id, u2.name as owner_name, u2.email as owner_email, u2.hostel as owner_hostel,
             p.payment_reference, p.payment_method, p.amount as amount_paid, p.status as payment_status
      FROM borrow_requests br
      JOIN items i ON br.item_id = i.id
      JOIN users u1 ON br.borrower_id = u1.id
      JOIN users u2 ON i.owner_id = u2.id
      LEFT JOIN payments p ON p.borrow_request_id = br.id AND p.status = 'SUCCESS'
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      queryText += ` AND br.status = $${params.length}`;
    }

    queryText += ' ORDER BY br.created_at DESC';

    const { rows } = await db.query(queryText, params);

    res.json({ success: true, count: rows.length, borrows: rows });
  } catch (err) {
    next(err);
  }
}

// 7. Force-Complete / Resolve a Borrow Dispute
async function forceCompleteBorrow(req, res, next) {
  try {
    const requestId = req.params.id;

    const { rows: reqRows } = await db.query(
      `SELECT br.*, i.id as item_id, i.name as item_name, i.owner_id 
       FROM borrow_requests br 
       JOIN items i ON br.item_id = i.id 
       WHERE br.id = $1`,
      [requestId]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Borrow request not found.' });
    }

    const request = reqRows[0];

    // Mark request COMPLETED
    await db.query(
      "UPDATE borrow_requests SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [requestId]
    );

    // Make item available again
    await db.query(
      "UPDATE items SET is_available = 1, status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [request.item_id]
    );

    // Notify both parties
    await createNotification({
      userId: request.owner_id,
      title: 'Borrow Transaction Completed by Admin',
      message: `The transaction for "${request.item_name}" has been marked completed by an administrator. The item is now back to Available.`,
      type: 'ADMIN_ALERT',
      link: '/dashboard',
    });

    await createNotification({
      userId: request.borrower_id,
      title: 'Borrow Transaction Resolved by Admin',
      message: `Your borrowing for "${request.item_name}" has been resolved and completed by an administrator.`,
      type: 'ADMIN_ALERT',
      link: '/dashboard',
    });

    res.json({
      success: true,
      message: 'Transaction force-completed and item marked Available again.',
    });
  } catch (err) {
    next(err);
  }
}

// 8. Categories Management
async function createCategory(req, res, next) {
  try {
    const { name, slug, description, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    const { rows } = await db.query(
      `INSERT INTO categories (name, slug, description, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), cleanSlug, description || '', icon || 'package']
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const catId = req.params.id;

    // Check if items belong to this category
    const { rows: itemRows } = await db.query('SELECT id FROM items WHERE category_id = $1 LIMIT 1', [catId]);
    if (itemRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that has existing items assigned to it. Reassign items first.',
      });
    }

    await db.query('DELETE FROM categories WHERE id = $1', [catId]);

    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
}

// 8. Permanently Remove Student & Cascade Delete All Associated Data
async function deleteStudent(req, res, next) {
  try {
    const targetUserId = req.params.id;

    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student account not found.' });
    }

    const targetUser = userRows[0];
    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete an administrator account.' });
    }

    const studentEmail = targetUser.email;

    // 1. Delete messages
    await db.query(
      `DELETE FROM messages 
       WHERE sender_id = $1 
          OR conversation_id IN (SELECT id FROM conversations WHERE user1_id = $1 OR user2_id = $1)`,
      [targetUserId]
    );

    // 2. Delete conversations
    await db.query(
      `DELETE FROM conversations WHERE user1_id = $1 OR user2_id = $1`,
      [targetUserId]
    );

    // 3. Delete feedback & reviews
    await db.query(
      `DELETE FROM feedback 
       WHERE reviewer_id = $1 
          OR target_user_id = $1 
          OR item_id IN (SELECT id FROM items WHERE owner_id = $1)`,
      [targetUserId]
    );

    // 4. Delete transactions
    await db.query(
      `DELETE FROM transactions 
       WHERE payment_id IN (
         SELECT id FROM payments 
         WHERE payer_id = $1 
            OR payee_id = $1 
            OR borrow_request_id IN (
              SELECT id FROM borrow_requests 
              WHERE borrower_id = $1 OR item_id IN (SELECT id FROM items WHERE owner_id = $1)
            )
       )`,
      [targetUserId]
    );

    // 5. Delete payments
    await db.query(
      `DELETE FROM payments 
       WHERE payer_id = $1 
          OR payee_id = $1 
          OR borrow_request_id IN (
            SELECT id FROM borrow_requests 
            WHERE borrower_id = $1 OR item_id IN (SELECT id FROM items WHERE owner_id = $1)
          )`,
      [targetUserId]
    );

    // 6. Delete returns
    await db.query(
      `DELETE FROM returns 
       WHERE borrow_request_id IN (
         SELECT id FROM borrow_requests 
         WHERE borrower_id = $1 OR item_id IN (SELECT id FROM items WHERE owner_id = $1)
       )`,
      [targetUserId]
    );

    // 7. Delete borrow requests
    await db.query(
      `DELETE FROM borrow_requests 
       WHERE borrower_id = $1 
          OR item_id IN (SELECT id FROM items WHERE owner_id = $1)`,
      [targetUserId]
    );

    // 8. Delete item listings
    await db.query(`DELETE FROM items WHERE owner_id = $1`, [targetUserId]);

    // 9. Delete wishlist entries
    await db.query(`DELETE FROM wishlist WHERE user_id = $1`, [targetUserId]);

    // 10. Delete notifications
    await db.query(`DELETE FROM notifications WHERE user_id = $1`, [targetUserId]);

    // 11. Delete email verification OTP records
    await db.query(`DELETE FROM email_verifications WHERE email = $1`, [studentEmail]);

    // 12. Finally, delete user record
    await db.query(`DELETE FROM users WHERE id = $1`, [targetUserId]);

    res.json({
      success: true,
      message: `Student "${targetUser.name}" and all associated campus records have been permanently deleted from the database.`,
      deletedUserId: targetUserId,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPlatformStats,
  getAllUsers,
  toggleUserBan,
  deleteStudent,
  getAllItems,
  deleteItemAdmin,
  getAllBorrows,
  forceCompleteBorrow,
  createCategory,
  deleteCategory,
};
