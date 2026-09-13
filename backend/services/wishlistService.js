const db = require('../config/db');
const { createNotification } = require('./notificationService');

async function checkWishlistMatchesForNewItem(newItem) {
  try {
    // Find active wishlist requests from other students that match category or title keywords
    const { rows: wishlists } = await db.query(
      `SELECT w.*, u.name as requester_name 
       FROM wishlist w
       JOIN users u ON w.user_id = u.id
       WHERE w.status = 'active' AND w.user_id != $1`,
      [newItem.owner_id]
    );

    const itemNameLower = (newItem.name || '').toLowerCase();
    const itemDescLower = (newItem.description || '').toLowerCase();
    const itemPrice = parseFloat(newItem.price_per_day || 0);

    for (const wish of wishlists) {
      let matched = false;
      const wishTitle = (wish.title || '').toLowerCase().trim();

      // Check category match
      const categoryMatch = wish.category_id && parseInt(wish.category_id, 10) === parseInt(newItem.category_id, 10);

      // Check keyword match
      const words = wishTitle.split(/\s+/).filter(w => w.length > 2);
      const titleMatches = words.some(w => itemNameLower.includes(w) || itemDescLower.includes(w));

      // Check budget
      const budgetOk = wish.max_price === null || isNaN(wish.max_price) || itemPrice <= parseFloat(wish.max_price);

      if ((titleMatches || (categoryMatch && words.length === 0)) && budgetOk) {
        matched = true;
      }

      if (matched) {
        await createNotification({
          userId: wish.user_id,
          title: 'Campus Wishlist Match!',
          message: `An item matching your wish "${wish.title}" was just listed: "${newItem.name}" at ₹${newItem.price_per_day}/day!`,
          type: 'WISHLIST_MATCH',
          link: `/items/${newItem.id}`,
        });
      }
    }
  } catch (err) {
    console.error('Error checking wishlist matches:', err.message);
  }
}

module.exports = {
  checkWishlistMatchesForNewItem,
};
