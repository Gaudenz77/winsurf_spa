require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profile');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');
const WebSocketServer = require('./websocket');
const NotificationService = require('./services/notificationService');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(cookieParser());

// Initialize WebSocket server and notification service
const wsServer = new WebSocketServer(server);
const notificationService = new NotificationService(wsServer);

// Make notification service available to routes
app.set('notificationService', notificationService);

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log(`${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  console.log('======================\n');
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Test route to verify Express is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Routes
console.log('Mounting routes...');
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/profile', profileRoutes);
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
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WebSocket server is ready for connections');
});
