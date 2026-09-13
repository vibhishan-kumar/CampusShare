const db = require('../config/db');

// 1. Get Notifications for Authenticated Student
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    const { rows: notifications } = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    const { rows: unreadCountRows } = await db.query(
      `SELECT COUNT(*) as unread_count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = 0`,
      [userId]
    );

    const unreadCount = parseInt(unreadCountRows[0]?.unread_count || 0, 10);

    res.json({
      success: true,
      unreadCount,
      notifications: notifications.map(n => ({
        ...n,
        is_read: Boolean(n.is_read),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// 2. Mark Single Notification as Read
async function markNotificationAsRead(req, res, next) {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    await db.query(
      `UPDATE notifications 
       SET is_read = 1 
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

// 3. Mark All Notifications as Read
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE notifications 
       SET is_read = 1 
       WHERE user_id = $1 AND is_read = 0`,
      [userId]
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
