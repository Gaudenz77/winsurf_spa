const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const WebSocket = require('ws');
const pool = require('./config/database');
const jwt = require('jsonwebtoken'); // Added jwt module
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
const messagesRoutes = require('./routes/messages');

// Import services
const NotificationService = require('./services/notificationService');

// Initialize WebSocket server
const wss = new WebSocket.Server({ noServer: true });
console.log('WebSocket server initialized');

// Initialize notification service with WebSocket server
const notificationService = new NotificationService(wss);
app.set('notificationService', notificationService); // Make sure service is available on app object

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
  console.log('\n=== Incoming Request ===');
  console.log(`${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  console.log('======================\n');
  next();
});

// Add notification service to every request
app.use((req, res, next) => {
  req.app.notificationService = app.locals.notificationService;
  next();
});

// Test route to verify Express is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Routes
console.log('Mounting routes...');
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
console.log('Mounting messages routes at /api/messages');
app.use('/api/messages', messagesRoutes);
console.log('All routes mounted');

// 404 handler
app.use((req, res, next) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Create HTTP server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Track client connections per user
const clients = new Map();

// Handle WebSocket upgrade
server.on('upgrade', async (request, socket, head) => {
  console.log('Verifying WebSocket connection...');
  
  try {
    // Get token from cookie
    const cookies = cookie.parse(request.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = {
      userId: decoded.userId,
      username: decoded.username
    };
    
    console.log('WebSocket connection authenticated for user:', user);

    // Attach user to request for later use
    request.user = user;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

wss.on('connection', (ws, request) => {
  const user = request.user;
  console.log('New WebSocket connection established for user:', user);

  // Initialize user's client set if it doesn't exist
  if (!clients.has(user.userId)) {
    clients.set(user.userId, new Set());
  }
  
  // Add this connection to user's set
  clients.get(user.userId).add(ws);
  
  console.log(`Client connected. Total clients for user ${user.userId}: ${clients.get(user.userId).size}`);

  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message from client:', data);
      
      if (data.type === 'auth') {
        ws.user = user;
        console.log('Client authenticated:', ws.user);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    if (user && user.userId) {
      const userClients = clients.get(user.userId);
      if (userClients) {
        userClients.delete(ws);
        console.log(`Client disconnected. Total clients for user ${user.userId}: ${userClients.size}`);
        
        // Clean up if no more clients for this user
        if (userClients.size === 0) {
          clients.delete(user.userId);
        }
      }
    }
  });

  // Send initial authentication request
  ws.send(JSON.stringify({ type: 'auth_request' }));
});

module.exports = app;
