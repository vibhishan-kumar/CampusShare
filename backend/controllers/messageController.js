const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// 1. Get or Create Conversation between Current User and Target User (optionally for an item)
async function getOrCreateConversation(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot start conversations.',
      });
    }

    const { target_user_id, item_id } = req.body;
    const currentUserId = req.user.id;

    if (!target_user_id) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    if (parseInt(target_user_id, 10) === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself.' });
    }

    // Look for existing conversation between these two users (order-independent)
    const { rows: existing } = await db.query(
      `SELECT * FROM conversations 
       WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
         AND (item_id = $3 OR ($3 IS NULL AND item_id IS NULL))`,
      [currentUserId, target_user_id, item_id || null]
    );

    if (existing.length > 0) {
      return res.json({ success: true, conversation: existing[0] });
    }

    // Create new conversation
    const { rows: created } = await db.query(
      `INSERT INTO conversations (item_id, user1_id, user2_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [item_id || null, currentUserId, target_user_id]
    );

    res.status(201).json({ success: true, conversation: created[0] });
  } catch (err) {
    next(err);
  }
}

// 2. Get All Conversations for Authenticated Student
async function getMyConversations(req, res, next) {
  try {
    const currentUserId = parseInt(req.user.id, 10);

    const { rows } = await db.query(
      `SELECT c.*, 
              i.name as item_name, 
              i.image_url as item_image,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.id ELSE u1.id END as other_user_id,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.name ELSE u1.name END as other_user_name,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.avatar_url ELSE u1.avatar_url END as other_user_avatar,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.hostel_room ELSE u1.hostel_room END as other_user_hostel,
              (SELECT message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND CAST(m.sender_id AS INTEGER) != CAST($1 AS INTEGER) AND m.is_read = 0) as unread_count
       FROM conversations c
       LEFT JOIN items i ON c.item_id = i.id
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) OR CAST(c.user2_id AS INTEGER) = CAST($1 AS INTEGER)
       ORDER BY c.updated_at DESC`,
      [currentUserId]
    );

    res.json({ success: true, conversations: rows });
  } catch (err) {
    next(err);
  }
}

// 3. Get Messages in a Conversation
async function getMessages(req, res, next) {
  try {
    const conversationId = parseInt(req.params.conversationId, 10);
    const currentUserId = parseInt(req.user.id, 10);

    // Verify participant
    const { rows: convoRows } = await db.query(
      `SELECT c.*, 
              i.name as item_name, i.image_url as item_image, i.price_per_day as item_price,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.id ELSE u1.id END as other_user_id,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.name ELSE u1.name END as other_user_name,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.avatar_url ELSE u1.avatar_url END as other_user_avatar,
              CASE WHEN CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) THEN u2.hostel_room ELSE u1.hostel_room END as other_user_hostel
       FROM conversations c
       LEFT JOIN items i ON c.item_id = i.id
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       WHERE c.id = $2 AND (CAST(c.user1_id AS INTEGER) = CAST($1 AS INTEGER) OR CAST(c.user2_id AS INTEGER) = CAST($1 AS INTEGER))`,
      [currentUserId, conversationId]
    );

    if (convoRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found or unauthorized.' });
    }

    // Mark unread messages sent by other user as read
    await db.query(
      `UPDATE messages 
       SET is_read = 1 
       WHERE conversation_id = $1 AND CAST(sender_id AS INTEGER) != CAST($2 AS INTEGER)`,
      [conversationId, currentUserId]
    );

    // Fetch messages
    const { rows: messages } = await db.query(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.json({
      success: true,
      conversation: convoRows[0],
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// 4. Send Message in a Conversation
async function sendMessage(req, res, next) {
  try {
    if (req.user && req.user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Your campus account has been suspended by the campus administrator. You cannot send messages.',
      });
    }

    const conversationId = parseInt(req.params.conversationId, 10);
    const { message_text } = req.body;
    const senderId = parseInt(req.user.id, 10);

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    // Verify conversation participant
    const { rows: convoRows } = await db.query(
      `SELECT * FROM conversations WHERE id = $1 AND (CAST(user1_id AS INTEGER) = CAST($2 AS INTEGER) OR CAST(user2_id AS INTEGER) = CAST($2 AS INTEGER))`,
      [conversationId, senderId]
    );

    if (convoRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not part of this conversation.' });
    }

    const conversation = convoRows[0];
    const receiverId = Number(conversation.user1_id) === Number(senderId) ? conversation.user2_id : conversation.user1_id;

    // Insert message
    const { rows: inserted } = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, message_text, is_read)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [conversationId, senderId, message_text.trim()]
    );

    // Update conversation timestamp
    await db.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );

    // Notify receiver
    await createNotification({
      userId: receiverId,
      title: `New message from ${req.user.name}`,
      message: message_text.trim().substring(0, 100),
      type: 'MESSAGE',
      link: `/messages?convo=${conversationId}`,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: {
        ...inserted[0],
        sender_name: req.user.name,
        sender_avatar: req.user.avatar_url,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  getMessages,
  sendMessage,
};
