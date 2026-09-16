// Campus validation regular expressions
const UOH_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@uohyd\.ac\.in$/i;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const ALLOWED_CONDITIONS = ['Brand New', 'Like New', 'Good', 'Fair', 'Usable'];

/**
 * Validates student registration input
 */
function validateRegistration(req, res, next) {
  const { name, email, password, phone, department, hostel, room_no } = req.body;
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Full Name must be at least 2 characters long.');
  }

  // Email Regex validation (@uohyd.ac.in strictly enforced)
  if (!email || !UOH_EMAIL_REGEX.test(email.trim())) {
    errors.push('Invalid institutional email. You must use your official @uohyd.ac.in campus email address.');
  }

  // Password length validation
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  // Phone Regex validation
  if (phone) {
    let cleanPhone = String(phone).trim().replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.slice(3);
    } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = cleanPhone.slice(1);
    }
    if (!INDIAN_PHONE_REGEX.test(cleanPhone)) {
      errors.push('Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).');
    }
  }

  // Department / Hostel presence
  if (department && department.trim().length < 2) {
    errors.push('School/Department must be at least 2 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
}

/**
 * Validates login credentials
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !UOH_EMAIL_REGEX.test(email.trim())) {
    errors.push('Please provide a valid @uohyd.ac.in email address.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
}

/**
 * Validates item listing data
 */
function validateItem(req, res, next) {
  if (req.user && req.user.is_banned) {
    return res.status(403).json({
      success: false,
      message: 'Your campus account has been suspended by the campus administrator. You cannot list or edit items.',
    });
  }

  const { name, category_id, condition, price_per_day, deposit } = req.body;
  const errors = [];

  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 3)) {
    errors.push('Item name must be at least 3 characters long.');
  }

  if (category_id !== undefined && isNaN(parseInt(category_id, 10))) {
    errors.push('A valid campus category must be selected.');
  }

  if (condition && !ALLOWED_CONDITIONS.includes(condition)) {
    errors.push(`Condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}.`);
  }

  const parsedPrice = parseFloat(price_per_day);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    errors.push('Daily rental fee must be a non-negative number (enter 0 for free sharing).');
  }

  const parsedDeposit = parseFloat(deposit);
  if (isNaN(parsedDeposit) || parsedDeposit < 0) {
    errors.push('Security deposit must be a non-negative number (enter 0 for no deposit).');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
}

/**
 * Validates borrow request dates
 */
function validateBorrowRequest(req, res, next) {
  const { item_id, start_date, end_date } = req.body;
  const errors = [];

  if (!item_id) {
    errors.push('Item ID is required.');
  }

  if (!start_date || !end_date) {
    errors.push('Both start date and end date are required.');
  } else {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = String(start_date).slice(0, 10);
    const endStr = String(end_date).slice(0, 10);

    if (startStr < todayStr) {
      errors.push('Start date cannot be in the past.');
    }
    if (endStr < startStr) {
      errors.push('End date must be on or after the start date.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
}

/**
 * Validates peer feedback/review
 */
function validateFeedback(req, res, next) {
  const { rating, comment } = req.body;
  const errors = [];

  const parsedRating = parseInt(rating, 10);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    errors.push('Rating must be an integer between 1 and 5 stars.');
  }

  if (comment && comment.length > 1000) {
    errors.push('Review comment cannot exceed 1000 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  next();
}

module.exports = {
  UOH_EMAIL_REGEX,
  INDIAN_PHONE_REGEX,
  ALLOWED_CONDITIONS,
  validateRegistration,
  validateLogin,
  validateItem,
  validateBorrowRequest,
  validateFeedback,
};
