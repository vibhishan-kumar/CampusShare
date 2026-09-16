const db = require('../config/db');
const { checkWishlistMatchesForNewItem } = require('../services/wishlistService');

// 1. Get Categories
async function getCategories(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, categories: rows });
  } catch (err) {
    next(err);
  }
}

// 2. Browse & Search Items with Filters
async function getItems(req, res, next) {
  try {
    const {
      search,
      category,
      condition,
      max_price,
      availability,
      sort,
    } = req.query;

    let queryText = `
      SELECT i.*, 
             c.name as category_name, 
             c.slug as category_slug,
             u.name as owner_name, 
             u.avatar_url as owner_avatar,
             u.hostel_room as owner_hostel,
             u.department as owner_department,
             COALESCE(avg_f.avg_rating, 5.0) as owner_rating,
             (
               SELECT br.end_date 
               FROM borrow_requests br 
               WHERE br.item_id = i.id 
                 AND br.status IN ('BORROWED', 'ACCEPTED')
               ORDER BY br.end_date DESC 
               LIMIT 1
             ) as active_borrow_end_date,
             (
               SELECT br.start_date 
               FROM borrow_requests br 
               WHERE br.item_id = i.id 
                 AND br.status IN ('BORROWED', 'ACCEPTED')
               ORDER BY br.end_date DESC 
               LIMIT 1
             ) as active_borrow_start_date,
             (
               SELECT br.status 
               FROM borrow_requests br 
               WHERE br.item_id = i.id 
                 AND br.status IN ('BORROWED', 'ACCEPTED')
               ORDER BY br.end_date DESC 
               LIMIT 1
             ) as active_borrow_status
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      JOIN users u ON i.owner_id = u.id
      LEFT JOIN (
        SELECT target_user_id, ROUND(AVG(rating), 1) as avg_rating
        FROM feedback
        GROUP BY target_user_id
      ) avg_f ON u.id = avg_f.target_user_id
      WHERE 1=1 AND COALESCE(u.is_banned, 0) = 0
    `;

    const params = [];

    // Filter: Search Keyword
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      queryText += ` AND (LOWER(i.name) LIKE $${pIdx} OR LOWER(i.description) LIKE $${pIdx} OR LOWER(i.location) LIKE $${pIdx})`;
    }

    // Filter: Category
    if (category && category !== 'all') {
      params.push(category);
      const pIdx = params.length;
      // category can be slug or id
      if (!isNaN(category)) {
        queryText += ` AND i.category_id = $${pIdx}`;
      } else {
        queryText += ` AND c.slug = $${pIdx}`;
      }
    }

    // Filter: Condition
    if (condition && condition !== 'all') {
      params.push(condition);
      queryText += ` AND i.condition = $${params.length}`;
    }

    // Filter: Max Price per day
    if (max_price && !isNaN(max_price)) {
      params.push(parseFloat(max_price));
      queryText += ` AND i.price_per_day <= $${params.length}`;
    }

    // Filter: Availability
    if (availability === 'available') {
      queryText += ` AND i.is_available = 1 AND i.status = 'available' AND (
        SELECT COUNT(*) FROM borrow_requests br 
        WHERE br.item_id = i.id AND br.status IN ('BORROWED', 'ACCEPTED')
      ) = 0`;
    } else if (availability === 'borrowed') {
      queryText += ` AND (i.status = 'borrowed' OR (
        SELECT COUNT(*) FROM borrow_requests br 
        WHERE br.item_id = i.id AND br.status IN ('BORROWED', 'ACCEPTED')
      ) > 0)`;
    }

    // Sort order
    if (sort === 'price_asc') {
      queryText += ` ORDER BY i.price_per_day ASC`;
    } else if (sort === 'price_desc') {
      queryText += ` ORDER BY i.price_per_day DESC`;
    } else if (sort === 'name_asc') {
      queryText += ` ORDER BY i.name ASC`;
    } else {
      queryText += ` ORDER BY i.created_at DESC`;
    }

    const { rows } = await db.query(queryText, params);

    // Annotate is_owner and live borrow availability
    const currentUserId = req.user ? req.user.id : null;
    const items = rows.map(item => {
      const hasActiveBorrow = Boolean(item.active_borrow_end_date);
      const isCurrentlyBorrowed = item.status === 'borrowed' || hasActiveBorrow;
      const isAvailable = Boolean(item.is_available) && !isCurrentlyBorrowed;
      const effectiveStatus = isCurrentlyBorrowed ? 'borrowed' : (item.is_available ? 'available' : 'unavailable');
      const availableAfter = item.active_borrow_end_date || null;

      return {
        ...item,
        is_owner: currentUserId ? item.owner_id === currentUserId : false,
        price_per_day: parseFloat(item.price_per_day || 0),
        deposit: parseFloat(item.deposit || 0),
        is_available: isAvailable,
        status: effectiveStatus,
        is_currently_borrowed: isCurrentlyBorrowed,
        available_after: availableAfter,
      };
    });

    res.json({ success: true, count: items.length, items });
  } catch (err) {
    next(err);
  }
}

// 3. Get Single Item Details
async function getItemById(req, res, next) {
  try {
    const itemId = req.params.id;

    const { rows } = await db.query(
      `SELECT i.*, 
              c.name as category_name, 
              c.slug as category_slug,
              u.name as owner_name, 
              u.email as owner_email,
              u.phone as owner_phone,
              u.avatar_url as owner_avatar,
              u.hostel_room as owner_hostel,
              u.department as owner_department,
              COALESCE(u.is_banned, 0) as owner_is_banned,
              COALESCE(avg_f.avg_rating, 5.0) as owner_rating,
              COALESCE(avg_f.review_count, 0) as owner_review_count,
              (
                SELECT br.end_date 
                FROM borrow_requests br 
                WHERE br.item_id = i.id 
                  AND br.status IN ('BORROWED', 'ACCEPTED')
                ORDER BY br.end_date DESC 
                LIMIT 1
              ) as active_borrow_end_date,
              (
                SELECT br.start_date 
                FROM borrow_requests br 
                WHERE br.item_id = i.id 
                  AND br.status IN ('BORROWED', 'ACCEPTED')
                ORDER BY br.end_date DESC 
                LIMIT 1
              ) as active_borrow_start_date,
              (
                SELECT br.status 
                FROM borrow_requests br 
                WHERE br.item_id = i.id 
                  AND br.status IN ('BORROWED', 'ACCEPTED')
                ORDER BY br.end_date DESC 
                LIMIT 1
              ) as active_borrow_status
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       JOIN users u ON i.owner_id = u.id
       LEFT JOIN (
         SELECT target_user_id, ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count
         FROM feedback
         GROUP BY target_user_id
       ) avg_f ON u.id = avg_f.target_user_id
       WHERE i.id = $1`,
      [itemId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const item = rows[0];
    const currentUserId = req.user ? req.user.id : null;
    const isAdmin = req.user && req.user.role === 'admin';

    // If owner is banned and requester is neither owner nor admin, hide item
    if (Boolean(item.owner_is_banned) && item.owner_id !== currentUserId && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Item not found or listing currently unavailable.' });
    }

    // Fetch reviews on this item
    const { rows: itemReviews } = await db.query(
      `SELECT f.*, u.name as reviewer_name, u.avatar_url as reviewer_avatar
       FROM feedback f
       JOIN users u ON f.reviewer_id = u.id
       WHERE f.item_id = $1
       ORDER BY f.created_at DESC`,
      [itemId]
    );

    const hasActiveBorrow = Boolean(item.active_borrow_end_date);
    const isCurrentlyBorrowed = item.status === 'borrowed' || hasActiveBorrow;
    const isAvailable = Boolean(item.is_available) && !isCurrentlyBorrowed;
    const effectiveStatus = isCurrentlyBorrowed ? 'borrowed' : (item.is_available ? 'available' : 'unavailable');
    const availableAfter = item.active_borrow_end_date || null;

    res.json({
      success: true,
      item: {
        ...item,
        is_owner: currentUserId ? item.owner_id === currentUserId : false,
        price_per_day: parseFloat(item.price_per_day || 0),
        deposit: parseFloat(item.deposit || 0),
        is_available: isAvailable,
        status: effectiveStatus,
        is_currently_borrowed: isCurrentlyBorrowed,
        available_after: availableAfter,
        borrow_start_date: item.active_borrow_start_date || null,
        borrow_end_date: item.active_borrow_end_date || null,
        reviews: itemReviews,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. Create New Item (Authenticated)
async function createItem(req, res, next) {
  try {
    const {
      name,
      category_id,
      description,
      condition,
      price_per_day,
      deposit,
      image_url,
      location,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    if (!condition) {
      return res.status(400).json({ success: false, message: 'Item condition is required.' });
    }

    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot list items.',
      });
    }

    const ownerId = req.user.id;
    const defaultImage = image_url && image_url.trim()
      ? image_url.trim()
      : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600';

    const { rows } = await db.query(
      `INSERT INTO items (
         owner_id, category_id, name, description, condition, 
         price_per_day, deposit, image_url, location, is_available, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        ownerId,
        category_id || null,
        name.trim(),
        description || '',
        condition,
        parseFloat(price_per_day) || 0,
        parseFloat(deposit) || 0,
        defaultImage,
        location || req.user.hostel_room || 'UoH Campus',
        1,
        'available',
      ]
    );

    const newItem = rows[0];

    // Trigger Wishlist Matching and dispatch notifications
    await checkWishlistMatchesForNewItem(newItem);

    res.status(201).json({
      success: true,
      message: 'Item listed successfully on campus!',
      item: newItem,
    });
  } catch (err) {
    next(err);
  }
}

// 5. Update Item (Owner only)
async function updateItem(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot edit items.',
      });
    }

    const itemId = req.params.id;
    const {
      name,
      category_id,
      description,
      condition,
      price_per_day,
      deposit,
      image_url,
      location,
      is_available,
      status,
    } = req.body;

    const { rows } = await db.query(
      `UPDATE items
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           description = COALESCE($3, description),
           condition = COALESCE($4, condition),
           price_per_day = COALESCE($5, price_per_day),
           deposit = COALESCE($6, deposit),
           image_url = COALESCE($7, image_url),
           location = COALESCE($8, location),
           is_available = COALESCE($9, is_available),
           status = COALESCE($10, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        name,
        category_id,
        description,
        condition,
        price_per_day !== undefined ? parseFloat(price_per_day) : null,
        deposit !== undefined ? parseFloat(deposit) : null,
        image_url,
        location,
        is_available !== undefined ? (is_available ? 1 : 0) : null,
        status,
        itemId,
      ]
    );

    res.json({
      success: true,
      message: 'Item details updated successfully.',
      item: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 6. Delete Item (Owner only)
async function deleteItem(req, res, next) {
  try {
    const itemId = req.params.id;

    // Check if there are active borrow requests in 'BORROWED' state
    const { rows: activeBorrows } = await db.query(
      `SELECT id FROM borrow_requests WHERE item_id = $1 AND status IN ('BORROWED', 'RETURN_REQUESTED')`,
      [itemId]
    );

    if (activeBorrows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an item that is currently borrowed or undergoing return.',
      });
    }

    await db.query('DELETE FROM items WHERE id = $1', [itemId]);

    res.json({
      success: true,
      message: 'Item deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// 7. Toggle Item Availability (Owner quick switch)
async function toggleAvailability(req, res, next) {
  try {
    const itemId = req.params.id;
    const currentStatus = req.item.is_available;
    const newStatus = currentStatus ? 0 : 1;
    const newStatusText = newStatus ? 'available' : 'maintenance';

    const { rows } = await db.query(
      `UPDATE items 
       SET is_available = $1, status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [newStatus, newStatusText, itemId]
    );

    res.json({
      success: true,
      message: `Item marked as ${newStatus ? 'Available' : 'Unavailable'}.`,
      item: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 8. Get Items Listed by Current Authenticated Student
async function getMyItems(req, res, next) {
  try {
    const userId = req.user.id;

    const { rows } = await db.query(
      `SELECT i.*, c.name as category_name,
              (SELECT COUNT(*) FROM borrow_requests br WHERE br.item_id = i.id AND br.status = 'PENDING') as pending_requests_count,
              (
                SELECT br.end_date 
                FROM borrow_requests br 
                WHERE br.item_id = i.id 
                  AND br.status IN ('BORROWED', 'ACCEPTED')
                ORDER BY br.end_date DESC 
                LIMIT 1
              ) as active_borrow_end_date,
              (
                SELECT br.status 
                FROM borrow_requests br 
                WHERE br.item_id = i.id 
                  AND br.status IN ('BORROWED', 'ACCEPTED')
                ORDER BY br.end_date DESC 
                LIMIT 1
              ) as active_borrow_status
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       WHERE i.owner_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    const items = rows.map(item => {
      const hasActiveBorrow = Boolean(item.active_borrow_end_date);
      const isCurrentlyBorrowed = item.status === 'borrowed' || hasActiveBorrow;
      const isAvailable = Boolean(item.is_available) && !isCurrentlyBorrowed;
      const effectiveStatus = isCurrentlyBorrowed ? 'borrowed' : (item.is_available ? 'available' : 'unavailable');
      const availableAfter = item.active_borrow_end_date || null;

      return {
        ...item,
        is_available: isAvailable,
        status: effectiveStatus,
        is_currently_borrowed: isCurrentlyBorrowed,
        available_after: availableAfter,
      };
    });

    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
}

// 9. Upload Image from Device
async function uploadItemImage(req, res, next) {
  try {
    const path = require('path');
    const fs = require('fs');
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image data provided.' });
    }

    // Parse Data URI
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 3) {
      const mimeType = matches[1].toLowerCase();
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';
      else if (mimeType.includes('gif')) ext = 'gif';
      else if (mimeType.includes('svg')) ext = 'svg';
      else ext = 'jpg';

      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    // Upload to Cloudinary (or local fallback if Cloudinary credentials not configured)
    const cloudinaryService = require('../services/cloudinaryService');
    const uploadResult = await cloudinaryService.uploadImage(filePath, 'campusshare_items');

    res.json({
      success: true,
      url: uploadResult.url,
      provider: uploadResult.provider,
      filename: safeName,
      message: `Image uploaded successfully (${uploadResult.provider === 'cloudinary' ? 'Cloudinary CDN' : 'Local storage'}).`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleAvailability,
  getMyItems,
  uploadItemImage,
};
