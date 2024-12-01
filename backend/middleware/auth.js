const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  console.log('Auth Headers:', req.headers);
  console.log('Cookies:', req.cookies);
  
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  console.log('Token found:', token ? 'Yes' : 'No');

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = {
  verifyToken
};
