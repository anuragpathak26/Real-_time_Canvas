import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { JWT_SECRET, CLIENT_URL } from '../config/index.js';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to create user response
const createUserResponse = (user, message = 'Success') => {
  const token = generateToken(user._id || user.id);
  return {
    message,
    token,
    user: {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      role: user.role || 'user'
    }
  };
};

// Register new user
export const register = async (req, res) => {
  try {
    console.log('Registration attempt:', { email: req.body.email, name: req.body.name });
    
    const { name, email: rawEmail, password } = req.body;
    
    // Validate input
    if (!name || !rawEmail || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const email = rawEmail.toLowerCase().trim();
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, creating demo user');
      const tempUser = {
        id: Date.now().toString(),
        name,
        email,
        avatar: '',
        role: 'user',
        createdAt: new Date(),
      };
      const response = createUserResponse(tempUser, 'Demo user created (data not persisted)');
      return res.status(201).json(response);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create new user (password will be hashed by the pre-save middleware)
    const user = new User({ 
      name: name.trim(), 
      email, 
      password 
    });
    
    await user.save();
    console.log('User created successfully:', user.email);
    
    const response = createUserResponse(user, 'User registered successfully');
    res.status(201).json(response);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    
    const { email: rawEmail, password } = req.body;
    
    // Validate input
    if (!rawEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const email = rawEmail.toLowerCase().trim();
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, creating demo login');
      const tempUser = { 
        id: Date.now().toString(), 
        name: 'Demo User', 
        email,
        avatar: '',
        role: 'user'
      };
      const response = createUserResponse(tempUser, 'Demo login successful (no database connection)');
      return res.json(response);
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password using the model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log('Login successful:', user.email);
    const response = createUserResponse(user, 'Login successful');
    res.json(response);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// Get current user profile
export const getMe = async (req, res) => {
  try {
    console.log('Getting user profile for:', req.user.userId);
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        id: req.user.userId,
        name: 'Demo User',
        email: 'demo@example.com',
        avatar: '',
        role: 'user',
        createdAt: new Date(),
      });
    }
    
    // Find user and exclude password
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      console.log('User not found:', req.user.userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User profile retrieved:', user.email);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
};

// OAuth success handler (kept for compatibility)
export const oauthSuccess = async (req, res) => {
  try {
    if (!req.user) return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
    const token = generateToken(req.user._id);
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth success error:', error);
    res.redirect(`${CLIENT_URL}/login?error=oauth_error`);
  }
};

// OAuth failure handler (kept for compatibility)
export const oauthFailure = (req, res) => {
  console.log('OAuth authentication failed');
  res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
};

// Debug: List all users (for development only)
export const debugUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected', users: [] });
    }
    
    const users = await User.find({}, 'email name createdAt role').sort({ createdAt: -1 });
    res.json({
      message: 'Users in database',
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error(' Debug users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Debug: Fix specific user password (remove in production)
export const fixKushalPassword = async (req, res) => {
  try {
    const email = 'kushal1@gmail.com';
    const newPassword = 'Kushal@2004';
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();
    
    console.log(' Password fixed for user:', user.email);
    res.json({ 
      message: 'Password fixed successfully', 
      email: user.email, 
      name: user.name 
    });
  } catch (error) {
    console.error(' Fix password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Test endpoint to verify auth service is working
export const testEndpoint = async (req, res) => {
  res.json({ 
    message: 'Auth endpoint is working!', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
};

// Test login functionality
export const testLogin = async (req, res) => {
  try {
    const testEmail = 'test@example.com';
    const testPassword = 'test123';

    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected - demo mode active' });
    }

    const user = await User.findOne({ email: testEmail });
    if (!user) {
      return res.json({
        error: 'Test user not found',
        message: 'Create test user first by visiting /api/auth/create-test-user',
      });
    }

    const isMatch = await user.comparePassword(testPassword);
    res.json({
      message: 'Test login debug results',
      userFound: true,
      passwordMatch: isMatch,
      userEmail: user.email,
      userName: user.name
    });
  } catch (error) {
    console.error('❌ Test login error:', error);
    res.status(500).json({ message: 'Test login failed', error: error.message });
  }
};

// Create test user for development
export const createTestUser = async (req, res) => {
  try {
    const testEmail = 'test@example.com';
    const testPassword = 'test123';
    const testName = 'Test User';

    if (mongoose.connection.readyState !== 1) {
      return res.json({
        message: 'MongoDB not connected - demo mode',
        testCredentials: { email: testEmail, password: testPassword },
      });
    }

    // Remove existing test user if exists
    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) {
      await User.findByIdAndDelete(existingUser._id);
      console.log('🗑️ Removed existing test user');
    }

    // Create new test user (password will be hashed automatically)
    const testUser = new User({ 
      name: testName, 
      email: testEmail, 
      password: testPassword 
    });
    
    await testUser.save();
    console.log('Test user created successfully');

    res.json({
      message: 'Test user created successfully',
      testCredentials: { email: testEmail, password: testPassword },
      userId: testUser._id,
    });
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({ message: 'Failed to create test user', error: error.message });
  }
};

// Debug: Reset user password
export const debugResetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();
    
    console.log('Password reset for user:', user.email);
    res.json({ 
      message: 'Password updated successfully', 
      email: user.email 
    });
  } catch (error) {
    console.error('Debug reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Debug: System status
// Debug: Fix user login (create or reset user)
export const debugFixUserLogin = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected' });
    }
    
    const userEmail = email.toLowerCase().trim();
    
    // Find or create user
    let user = await User.findOne({ email: userEmail });
    
    if (user) {
      // Update existing user password
      user.password = password;
      await user.save();
      console.log('Password updated for existing user:', user.email);
    } else {
      // Create new user
      user = new User({ 
        name: name || 'User', 
        email: userEmail, 
        password 
      });
      await user.save();
      console.log('New user created:', user.email);
    }
    
    res.json({ 
      message: user ? 'Password reset successfully' : 'User created successfully',
      user: { 
        id: user._id,
        email: user.email, 
        name: user.name 
      }
    });
  } catch (error) {
    console.error('Fix user login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const debugSystemStatus = async (req, res) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      },
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const userCount = await User.countDocuments();
        const sampleUsers = await User.find({}, 'email name createdAt role').limit(5).sort({ createdAt: -1 });
        systemInfo.database = {
          userCount,
          sampleUsers: sampleUsers.map(u => ({
            email: u.email,
            name: u.name,
            role: u.role,
            createdAt: u.createdAt,
          })),
        };
      } catch (dbError) {
        systemInfo.database = { error: dbError.message };
      }
    }

    res.json(systemInfo);
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ message: 'System status check failed', error: error.message });
  }
};
