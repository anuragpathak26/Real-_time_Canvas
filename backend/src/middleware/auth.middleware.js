import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { JWT_SECRET } from '../config/index.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Get token from cookie
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        // Fallback: Create demo user from token
        req.user = {
          userId: decoded.userId,
          id: decoded.userId,
          name: 'Demo User',
          email: 'demo@example.com'
        };
        return next();
      }

      // Get user from token
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Ensure consistent user ID properties
      req.user = {
        ...user.toObject(),
        id: user._id,
        userId: user._id
      };
      
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
