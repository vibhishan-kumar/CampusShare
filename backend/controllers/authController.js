const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { sendVerificationEmail } = require('../services/emailService');

const UOH_DOMAIN = '@uohyd.ac.in';

// 1. Send OTP for Student Registration
async function sendRegistrationOTP(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'University email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate university email domain @uohyd.ac.in
    if (!normalizedEmail.endsWith(UOH_DOMAIN)) {
      return res.status(400).json({
        success: false,
        message: `Only official University of Hyderabad email addresses (${UOH_DOMAIN}) are permitted.`,
      });
    }

    // Check if email already registered
    const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A student account with this university email already exists. Please sign in.',
      });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Clean up older verification entries for this email
    await db.query('DELETE FROM email_verifications WHERE email = $1', [normalizedEmail]);

    // Save OTP to database
    await db.query(
      'INSERT INTO email_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
      [normalizedEmail, otp, expiresAt]
    );

    // Send email (or log to server console)
    await sendVerificationEmail(normalizedEmail, otp);

    res.json({
      success: true,
      message: `Verification OTP has been sent to ${normalizedEmail}. Please check your inbox.`,
      // Provide devOtp for offline evaluation or local development without live SMTP
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    next(err);
  }
}

// 2. Student Registration
async function register(req, res, next) {
  try {
    const {
      name,
      phone,
      school,
      program,
      hostel,
      room_no,
      email,
      otp,
      password,
      avatar_url,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone Number is required.' });
    }
    if (!school || !school.trim()) {
      return res.status(400).json({ success: false, message: 'School / Faculty is required.' });
    }
    if (!program || !program.trim()) {
      return res.status(400).json({ success: false, message: 'Academic Program (e.g. MCA, M.Tech) is required.' });
    }
    if (!hostel || !hostel.trim()) {
      return res.status(400).json({ success: false, message: 'Hostel Name is required.' });
    }
    if (!room_no || !room_no.trim()) {
      return res.status(400).json({ success: false, message: 'Room Number is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'University Email is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate university email domain @uohyd.ac.in
    if (!normalizedEmail.endsWith(UOH_DOMAIN)) {
      return res.status(400).json({
        success: false,
        message: `Only official University of Hyderabad email addresses (${UOH_DOMAIN}) are permitted.`,
      });
    }

    // Check if email already registered
    const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A student account with this university email already exists.',
      });
    }

    // Verify OTP if provided
    if (otp && otp.trim()) {
      const { rows: verificationRows } = await db.query(
        'SELECT * FROM email_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
        [normalizedEmail]
      );

      if (verificationRows.length > 0) {
        const verification = verificationRows[0];
        const isExpired = new Date(verification.expires_at) < new Date();

        if (isExpired) {
          return res.status(400).json({
            success: false,
            message: 'Verification OTP has expired. Please request a new OTP.',
          });
        }

        if (verification.otp !== otp.trim()) {
          return res.status(400).json({
            success: false,
            message: 'Invalid verification OTP. Please check the 6-digit code entered.',
          });
        }

        // Delete verified OTP so it cannot be reused
        await db.query('DELETE FROM email_verifications WHERE email = $1', [normalizedEmail]);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification OTP.',
        });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Prepare combined fields for backward compatibility
    const hostelRoomCombined = `${hostel.trim()} - ${room_no.trim()}`;
    const departmentCombined = `${program.trim()}, ${school.trim()}`;
    const defaultAvatar = avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    // Insert user
    const { rows } = await db.query(
      `INSERT INTO users (
         name, email, password_hash, phone, school, program, hostel, room_no, 
         hostel_room, department, avatar_url, role, is_verified
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, name, email, phone, school, program, hostel, room_no, hostel_room, department, avatar_url, role, created_at`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        phone.trim(),
        school.trim(),
        program.trim(),
        hostel.trim(),
        room_no.trim(),
        hostelRoomCombined,
        departmentCombined,
        defaultAvatar,
        'student',
        1,
      ]
    );

    const newUser = rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to CampusShare @ UoH!',
      token,
      user: newUser,
    });
  } catch (err) {
    next(err);
  }
}

// 2. Student Login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail.endsWith(UOH_DOMAIN)) {
      return res.status(400).json({
        success: false,
        message: `Please use your university email ending with ${UOH_DOMAIN}`,
      });
    }

    // Query user
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'No student account found with this email address.',
      });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please try again.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      school: user.school,
      program: user.program,
      hostel: user.hostel,
      room_no: user.room_no,
      hostel_room: user.hostel_room,
      department: user.department,
      avatar_url: user.avatar_url,
      role: user.role,
      is_banned: Boolean(user.is_banned),
      created_at: user.created_at,
    };

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

// 3. Get Authenticated Student Profile & Reputation
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    // Get item count
    const { rows: itemStats } = await db.query(
      'SELECT COUNT(*) as listed_count FROM items WHERE owner_id = $1',
      [userId]
    );

    // Get borrow count
    const { rows: borrowStats } = await db.query(
      'SELECT COUNT(*) as borrow_count FROM borrow_requests WHERE borrower_id = $1',
      [userId]
    );

    // Get average feedback rating received
    const { rows: feedbackStats } = await db.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count 
       FROM feedback 
       WHERE target_user_id = $1`,
      [userId]
    );

    const avgRating = feedbackStats[0]?.avg_rating ? parseFloat(feedbackStats[0].avg_rating).toFixed(1) : '5.0';
    const reviewCount = parseInt(feedbackStats[0]?.review_count || 0, 10);

    res.json({
      success: true,
      user: req.user,
      stats: {
        itemsListed: parseInt(itemStats[0]?.listed_count || 0, 10),
        itemsBorrowed: parseInt(borrowStats[0]?.borrow_count || 0, 10),
        rating: avgRating,
        reviewCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. Update Profile
async function updateProfile(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot edit your profile.',
      });
    }

    const userId = req.user.id;
    const { name, phone, school, program, hostel, room_no, hostel_room, department, avatar_url } = req.body;

    const computedHostelRoom = hostel && room_no ? `${hostel} - ${room_no}` : hostel_room;
    const computedDept = program && school ? `${program}, ${school}` : department;

    const { rows } = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           school = COALESCE($3, school),
           program = COALESCE($4, program),
           hostel = COALESCE($5, hostel),
           room_no = COALESCE($6, room_no),
           hostel_room = COALESCE($7, hostel_room),
           department = COALESCE($8, department),
           avatar_url = COALESCE($9, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING id, name, email, phone, school, program, hostel, room_no, hostel_room, department, avatar_url, role, updated_at`,
      [name, phone, school, program, hostel, room_no, computedHostelRoom, computedDept, avatar_url, userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 5. Get Public Profile of Student
async function getPublicProfile(req, res, next) {
  try {
    const targetId = req.params.id;

    const { rows: userRows } = await db.query(
      'SELECT id, name, email, school, program, hostel, room_no, hostel_room, department, avatar_url, COALESCE(is_banned, 0) as is_banned, created_at FROM users WHERE id = $1',
      [targetId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const targetUser = userRows[0];
    const currentUserId = req.user ? req.user.id : null;
    const isAdmin = req.user && req.user.role === 'admin';

    // If target user is banned, hide profile unless requested by self or admin
    if (Boolean(targetUser.is_banned) && targetUser.id !== currentUserId && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Student profile not found or currently unavailable.' });
    }

    const { rows: feedbackRows } = await db.query(
      `SELECT f.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar, i.name as item_name
       FROM feedback f
       JOIN users u ON f.reviewer_id = u.id
       LEFT JOIN items i ON f.item_id = i.id
       WHERE f.target_user_id = $1
       ORDER BY f.created_at DESC`,
      [targetId]
    );

    const { rows: activeItems } = await db.query(
      `SELECT i.*, c.name as category_name 
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.owner_id = $1 AND i.is_available = 1
       ORDER BY i.created_at DESC`,
      [targetId]
    );

    const avgRating = feedbackRows.length > 0
      ? (feedbackRows.reduce((acc, f) => acc + f.rating, 0) / feedbackRows.length).toFixed(1)
      : '5.0';

    res.json({
      success: true,
      student: userRows[0],
      rating: avgRating,
      reviewCount: feedbackRows.length,
      reviews: feedbackRows,
      activeListings: activeItems,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendRegistrationOTP,
  register,
  login,
  getProfile,
  updateProfile,
  getPublicProfile,
};
