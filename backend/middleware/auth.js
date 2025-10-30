const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    console.log('\n=== Authentication Process ===');
    const authHeader = req.headers['authorization'];
    console.log('Auth header exists:', !!authHeader);
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('Token exists:', !!token);

    if (!token) {
      return res.status(401).json({ 
        message: 'Failed to mark complaint as noted',
        error: 'Access token required' 
      });
    }

    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Token decoded successfully. User type:', decoded.userId ? 'User' : 'Admin');
    
    let user = null;
    // Support both user and admin tokens
    if (decoded.userId) {
      user = await User.findById(decoded.userId).select('-password');
      console.log('Regular user found:', !!user);
    } else if (decoded.adminId) {
      user = await Admin.findById(decoded.adminId).select('-password');
      console.log('Admin user found:', !!user);
    }

    if (!user) {
      console.log('No user/admin found for token');
      return res.status(401).json({ 
        message: 'Failed to mark complaint as noted',
        error: 'Invalid token - User not found'
      });
    }

    req.user = user;
    console.log('Authentication successful');
    next();
  } catch (error) {
    console.error('Authentication error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Failed to mark complaint as noted',
        error: 'Invalid authentication token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Failed to mark complaint as noted',
        error: 'Authentication token has expired'
      });
    }
    return res.status(500).json({ 
      message: 'Failed to mark complaint as noted',
      error: 'Authentication error: ' + error.message
    });
  }
};

// Middleware to check if user is admin or staff
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Middleware to check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({ message: 'Email verification required' });
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireVerification,
  optionalAuth
}; 