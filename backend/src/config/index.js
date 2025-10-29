import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realtime-canvas';
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
export const corsOptions = {
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://real-time-canvas-1.onrender.com',
    'https://real-time-canvas-backend-wd2v.onrender.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};


// Rate limiting configuration
export const rateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
};

// Socket.IO configuration
export const socketOptions = {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'https://real-time-canvas-1.onrender.com',
      'https://real-time-canvas-backend-wd2v.onrender.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
};

// File upload configuration
export const fileUploadOptions = {
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  useTempFiles: true,
  tempFileDir: '/tmp/',
};
