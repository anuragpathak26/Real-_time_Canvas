import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { JWT_SECRET, CLIENT_URL } from '../config/index.js';

export const register = async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;

    // 1. Normalize email to lowercase (prevent case sensitivity issues)
    const email = rawEmail.toLowerCase().trim();

    console.log('Registration attempt:', { 
      name, 
      rawEmail, 
      normalizedEmail: email, 
      mongoState: mongoose.connection.readyState 
    });

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, using demo mode for registration');
      // Fallback: Create temporary user for demo
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

    // 2. Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    if (existingUser) {
      console.log('User already exists:', email, '(found:', existingUser.email, ')');
      return res.status(400).json({ message: 'User already exists' });
    }

    // 3. Hash password properly with await
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed successfully, hash starts with:', hashedPassword.substring(0, 10));

    // 4. Create user with normalized email
    const user = new User({
      name,
      email, // normalized email
      password: hashedPassword,
    });

    await user.save();
    console.log('User saved to database with ID:', user._id);

    // 5. Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    console.log('User registered successfully:', email);
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to process login after user is found
async function processLogin(user, password, res) {
  console.log('Processing login for user:', { 
    id: user._id, 
    email: user.email, 
    name: user.name 
  });
  
  console.log('Provided password length:', password.length);
  console.log('Stored password hash length:', user.password ? user.password.length : 0);
  console.log('Hash starts with $2b$:', user.password && user.password.startsWith('$2b$'));

  if (!user.password) {
    console.log('❌ User has no password set');
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 3. Check password using bcrypt.compare
  let isMatch = false;
  
  try {
    isMatch = await bcrypt.compare(password, user.password);
    console.log('bcrypt.compare result:', isMatch);
  } catch (bcryptError) {
    console.log('❌ bcrypt.compare failed:', bcryptError.message);
    
    // If bcrypt fails, the password might be stored as plain text (legacy issue)
    const directMatch = password === user.password;
    console.log('Direct password comparison:', directMatch);
    
    if (directMatch) {
      console.log('⚠️ Password was stored as plain text, fixing...');
      // Hash the password and update the user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Update user with hashed password
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      console.log('✅ Password auto-fixed and hashed for user:', user.email);
      isMatch = true; // Allow login since we just fixed the password
    } else {
      console.log('❌ Password verification failed completely');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  }
  
  if (!isMatch) {
    console.log('❌ Password mismatch for user:', user.email);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 4. Generate JWT token
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

  console.log('✅ Login successful for user:', user.email);
  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
}

export const getMe = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Return demo user data
      const demoUser = {
        id: req.user.userId,
        name: 'Demo User',
        email: 'demo@example.com',
        createdAt: new Date(),
      };
      
      return res.json(demoUser);
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const oauthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: req.user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Redirect to frontend with token
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth success error:', error);
    res.redirect(`${CLIENT_URL}/login?error=oauth_error`);
  }
};

// OAuth failure callback
export const oauthFailure = (req, res) => {
  res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
};

// Debug endpoint to check users (remove in production)
export const debugUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected', users: [] });
    }
    
    const users = await User.find({}, 'email name createdAt');
    res.json({ 
      message: 'Users in database',
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Quick fix for Kushal's password (remove in production)
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
    
    console.log(`Fixing password for user: ${email}`);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });
    
    console.log(`Password fixed successfully for ${email}`);
    
    res.json({ 
      message: 'Password fixed successfully! You can now login with Kushal@2004',
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Fix password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Simple test endpoint
export const testEndpoint = async (req, res) => {
  console.log('TEST ENDPOINT HIT');
  res.json({ 
    message: 'Auth endpoint is working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
};

// Test login endpoint with detailed debugging
export const testLogin = async (req, res) => {
  try {
    console.log('TEST LOGIN ENDPOINT HIT');
    
    const testEmail = 'test@example.com';
    const testPassword = 'test123';
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ 
        message: 'MongoDB not connected - demo mode active',
        result: 'Any credentials should work in demo mode'
      });
    }

    // Find the test user
    const user = await User.findOne({ email: testEmail });
    if (!user) {
      return res.json({
        error: 'Test user not found',
        message: 'Please create test user first by visiting /api/auth/create-test-user',
        allUsers: await User.find({}, 'email name').limit(5)
      });
    }

    console.log('Test user found:', { id: user._id, email: user.email, name: user.name });
    console.log('Stored hash:', user.password);
    console.log('Test password:', testPassword);

    // Test bcrypt comparison
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('bcrypt.compare result:', isMatch);

    // Test direct comparison (should be false)
    const directMatch = testPassword === user.password;
    console.log('Direct comparison:', directMatch);

    // Test hash generation for comparison
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(testPassword, salt);
    console.log('New hash for same password:', newHash);

    res.json({
      message: 'Test login debug results',
      userFound: true,
      userEmail: user.email,
      storedHashPrefix: user.password.substring(0, 20) + '...',
      testPassword: testPassword,
      bcryptMatch: isMatch,
      directMatch: directMatch,
      hashLooksValid: user.password.startsWith('$2b$') || user.password.startsWith('$2a$'),
      recommendation: isMatch ? 'Login should work!' : 'Password mismatch - need to reset'
    });

  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ message: 'Test login failed', error: error.message });
  }
};

// Create test user endpoint
export const createTestUser = async (req, res) => {
  try {
    console.log(' CREATING TEST USER');
    
    const testEmail = 'test@example.com';
    const testPassword = 'test123';
    const testName = 'Test User';

    if (mongoose.connection.readyState !== 1) {
      return res.json({ 
        message: 'MongoDB not connected - using demo mode',
        testCredentials: {
          email: testEmail,
          password: testPassword,
          note: 'Any credentials will work in demo mode'
        }
      });
    }

    // Check if test user already exists
    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) {
      console.log('Test user already exists, deleting and recreating...');
      await User.findByIdAndDelete(existingUser._id);
    }

    // Hash password properly
    console.log('Hashing test password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    console.log('Test password hashed:', hashedPassword.substring(0, 20) + '...');

    // Create test user
    const testUser = new User({
      name: testName,
      email: testEmail,
      password: hashedPassword,
    });

    await testUser.save();
    console.log('Test user created successfully');

    res.json({
      message: 'Test user created successfully!',
      testCredentials: {
        email: testEmail,
        password: testPassword,
        name: testName
      },
      instructions: 'Use these credentials to test login',
      userId: testUser._id
    });

  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({ message: 'Failed to create test user', error: error.message });
  }
};

// Debug endpoint to reset password (remove in production)
export const debugResetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'MongoDB not connected' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Resetting password for user: ${email}`);
    console.log(`New password: ${newPassword}`);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`New hashed password: ${hashedPassword}`);
    
    // Update user password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });
    
    console.log(`Password updated successfully for ${email}`);
    
    res.json({ 
      message: 'Password updated successfully',
      email: user.email,
      name: user.name,
      newPasswordHash: hashedPassword
    });
  } catch (error) {
    console.error('Debug reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// New debug endpoint to check system status
export const debugSystemStatus = async (req, res) => {
  try {
    const systemInfo = {
      timestamp: new Date().toISOString(),
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
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
            createdAt: u.createdAt
          }))
        };
      } catch (dbError) {
        systemInfo.database = { error: dbError.message };
      }
    }

    res.json(systemInfo);
  } catch (error) {
    console.error('Debug system status error:', error);
    res.status(500).json({ message: 'System status check failed', error: error.message });
  }
};
