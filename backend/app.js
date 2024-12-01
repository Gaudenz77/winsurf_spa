const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vue.js dev server
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
