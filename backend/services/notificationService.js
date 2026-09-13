const db = require('../config/db');

async function createNotification({ userId, title, message, type, link = null }) {
  try {
    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, message, type, link, 0]
    );
    return rows[0];
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

module.exports = {
  createNotification,
};
