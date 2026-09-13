const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'uohyd_campus_secret_key_lend_and_borrow_2026';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, name, email, phone, school, program, hostel, room_no, hostel_room, department, avatar_url, role, COALESCE(is_banned, 0) as is_banned FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid session. User not found.' });
    }

    req.user = {
      ...rows[0],
      is_banned: Boolean(rows[0].is_banned),
    };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

// Optional auth for public views that can customize if logged in
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, name, email, phone, school, program, hostel, room_no, hostel_room, department, avatar_url, role, COALESCE(is_banned, 0) as is_banned FROM users WHERE id = $1',
      [decoded.userId]
    );
    req.user = rows.length > 0 ? { ...rows[0], is_banned: Boolean(rows[0].is_banned) } : null;
  } catch (err) {
    req.user = null;
  }
  next();
}

// Guard to block suspended students from mutating data / writing
function requireNotBanned(req, res, next) {
  if (req.user && req.user.is_banned) {
    return res.status(403).json({
      success: false,
      isBanned: true,
      message: 'Your campus account has been suspended by the campus administrator. You cannot perform this action.',
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireNotBanned,
  JWT_SECRET,
};
