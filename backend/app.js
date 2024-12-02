const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const WebSocket = require('ws');
const pool = require('./config/database');
const app = express();

// Test database connection
(async () => {
  try {
    const [result] = await pool.query('SELECT 1');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
})();

// Import routes
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');

// Import services
const NotificationService = require('./services/notificationService');

// Initialize WebSocket server first
const wss = new WebSocket.Server({ noServer: true });

// Create notification service instance and attach to app
const notificationService = new NotificationService(wss);
app.locals.notificationService = notificationService;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// Add notification service to every request
app.use((req, res, next) => {
  req.app.notificationService = app.locals.notificationService;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: err.message || 'Something broke!' });
});

// Create HTTP server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Add sendNotification method to WebSocket server
wss.sendNotification = (userId, notification) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify({
        type: 'notification',
        notification
      }));
    }
  });
};

module.exports = app;
