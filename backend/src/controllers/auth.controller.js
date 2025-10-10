import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { JWT_SECRET, CLIENT_URL } from '../config/index.js';

export const register = async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;
    const email = rawEmail.toLowerCase().trim();

    if (mongoose.connection.readyState !== 1) {
      const tempUser = {
        id: Date.now().toString(),
        name,
        email,
        createdAt: new Date(),
      };
      const token = jwt.sign({ userId: tempUser.id }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'Demo user created (data not persisted)',
        token,
        user: tempUser,
      });
    }

    const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function for login logic
async function processLogin(user, password, res) {
  if (!user.password) return res.status(401).json({ message: 'Invalid credentials' });

  let isMatch = false;
  try {
    isMatch = await bcrypt.compare(password, user.password);
  } catch {
    const directMatch = password === user.password;
    if (directMatch) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      isMatch = true;
    } else {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  }

  if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    message: 'Login successful',
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
}

// Main login handler (newly added)
export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    if (!rawEmail || !password) return res.status(400).json({ message: 'Email and password required' });

    const email = rawEmail.toLowerCase().trim();

    if (mongoose.connection.readyState !== 1) {
      const tempUser = { id: Date.now().toString(), name: 'Demo User', email };
      const token = jwt.sign({ userId: tempUser.id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'Demo login successful (no DB connection)',
        token,
        user: tempUser,
      });
    }

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await processLogin(user, password, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        id: req.user.userId,
        name: 'Demo User',
        email: 'demo@example.com',
        createdAt: new Date(),
      });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const oauthSuccess = async (req, res) => {
  try {
    if (!req.user) return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
    const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
  } catch {
    res.redirect(`${CLIENT_URL}/login?error=oauth_error`);
  }
};

export const oauthFailure = (req, res) => {
  res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
};

export const debugUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ message: 'MongoDB not connected', users: [] });
    const users = await User.find({}, 'email name createdAt');
    res.json({
      message: 'Users in database',
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const fixKushalPassword = async (req, res) => {
  try {
    const email = 'kushal1@gmail.com';
    const newPassword = 'Kushal@2004';
    if (mongoose.connection.readyState !== 1) return res.json({ message: 'MongoDB not connected' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    res.json({ message: 'Password fixed successfully', email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const testEndpoint = async (req, res) => {
  res.json({ message: 'Auth endpoint is working!', timestamp: new Date().toISOString() });
};

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

    const isMatch = await bcrypt.compare(testPassword, user.password);
    res.json({
      message: 'Test login debug results',
      bcryptMatch: isMatch,
    });
  } catch (error) {
    res.status(500).json({ message: 'Test login failed', error: error.message });
  }
};

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

    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) await User.findByIdAndDelete(existingUser._id);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);

    const testUser = new User({ name: testName, email: testEmail, password: hashedPassword });
    await testUser.save();

    res.json({
      message: 'Test user created successfully',
      testCredentials: { email: testEmail, password: testPassword },
      userId: testUser._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create test user', error: error.message });
  }
};

export const debugResetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (mongoose.connection.readyState !== 1) return res.json({ message: 'MongoDB not connected' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    res.json({ message: 'Password updated successfully', email: user.email });
  } catch (error) {
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
        const sampleUsers = await User.find({}, 'email name createdAt').limit(3);
        systemInfo.database = {
          userCount,
          sampleUsers: sampleUsers.map(u => ({
            email: u.email,
            name: u.name,
            createdAt: u.createdAt,
          })),
        };
      } catch (dbError) {
        systemInfo.database = { error: dbError.message };
      }
    }

    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ message: 'System status check failed', error: error.message });
  }
};
