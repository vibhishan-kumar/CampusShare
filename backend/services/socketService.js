const { Server } = require('socket.io');

let io = null;

/**
 * Initializes Socket.IO server with CORS and room event handlers.
 * @param {import('http').Server} httpServer
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Join student user room for targeted notifications and direct alerts
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Join active conversation room for instant chat delivery
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`convo_${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`convo_${conversationId}`);
      }
    });

    // Real-time typing indicators
    socket.on('typing', ({ conversationId, userId, userName }) => {
      if (conversationId) {
        socket.to(`convo_${conversationId}`).emit('user_typing', { userId, userName });
      }
    });

    socket.on('stop_typing', ({ conversationId, userId }) => {
      if (conversationId) {
        socket.to(`convo_${conversationId}`).emit('user_stop_typing', { userId });
      }
    });

    socket.on('disconnect', () => {
      // Disconnect handled silently
    });
  });

  return io;
}

function getIO() {
  return io;
}

/**
 * Emits an event to a specific student user room
 */
function emitToUser(userId, event, data) {
  if (io && userId) {
    io.to(`user_${userId}`).emit(event, data);
  }
}

/**
 * Emits an event to all participants in a conversation room
 */
function emitToConversation(conversationId, event, data) {
  if (io && conversationId) {
    io.to(`convo_${conversationId}`).emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToConversation,
};
