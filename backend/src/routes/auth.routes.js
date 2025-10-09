import express from 'express';
import passport from 'passport';
import { register, login, getMe, oauthSuccess, oauthFailure, debugUsers, debugResetPassword, fixKushalPassword, testEndpoint, createTestUser, testLogin } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Debug middleware to log all auth requests
router.use((req, res, next) => {
  console.log('🔥 AUTH ROUTE HIT:', req.method, req.path);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Validation middleware
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ 
      message: 'Please provide name, email, and password' 
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ 
      message: 'Password must be at least 6 characters' 
    });
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Please provide email and password' 
    });
  }
  
  next();
};

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// OAuth routes
// Google OAuth
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failure' }),
  oauthSuccess
);

// GitHub OAuth
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/api/auth/failure' }),
  oauthSuccess
);

// OAuth failure route
router.get('/failure', oauthFailure);

// Protected routes
router.get('/me', protect, getMe);

// Test routes
router.get('/test', testEndpoint);
router.get('/create-test-user', createTestUser);
router.get('/test-login', testLogin);

// Debug routes (remove in production)
router.get('/debug/users', debugUsers);
router.post('/debug/reset-password', debugResetPassword);
router.get('/debug/fix-kushal-password', fixKushalPassword);

export default router;
