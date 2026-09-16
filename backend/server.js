const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const returnRoutes = require('./routes/returnRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const path = require('path');
const fs = require('fs');
const http = require('http');
const { initSocket, getIO } = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO real-time server
initSocket(server);

// Ensure uploads directory exists and serve statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Enable CORS for frontend development
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging for dev debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Campus platform health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'CampusShare - University of Hyderabad',
    database: db.isPostgres() ? 'PostgreSQL' : 'Dev-SQLite-Fallback',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Attach io to req for route handlers
app.use((req, res, next) => {
  req.io = getIO();
  next();
});

// Fallback & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎓 CampusShare @ UoH Backend running on port ${PORT}`);
    console.log(`⚡ Socket.IO Real-Time Engine Active`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
module.exports.server = server;
