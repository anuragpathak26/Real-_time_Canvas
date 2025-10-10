import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
// import session from 'express-session'; // Removed - using JWT authentication only
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Config
import { PORT, MONGODB_URI, corsOptions, socketOptions } from './src/config/index.js';

// Passport configuration removed - using JWT authentication only
// import passport from './src/config/passport.js';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import roomRoutes from './src/routes/room.routes.js';
import canvasRoutes from './src/routes/canvas.routes.js';

// Socket handler
import { socketHandler } from './src/sockets/index.js';

// Error handler
import { errorHandler } from './src/utils/errorHandler.js';

// ES module fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Express setup
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, socketOptions);

// MongoDB Connection with Retry Logic
const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ MongoDB Atlas connected successfully');
    console.log('✅ Database: realtimecanvas');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('🔄 Server continuing in demo mode...');
    console.log('📝 Note: Data will not be persisted until MongoDB connects');
    
    if (err.message.includes('IP')) {
      console.log('💡 Tip: Add your IP to MongoDB Atlas Network Access');
      console.log('💡 Or add 0.0.0.0/0 to allow all IPs');
    }
    
    // Retry connection every 30 seconds
    setTimeout(connectMongoDB, 30000);
  }
};

// Start MongoDB connection
connectMongoDB();

// Middleware
app.use(cors(corsOptions));
app.use(express.json()); // Add JSON parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware removed - using JWT authentication only
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-session-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   }
// }));

// Passport middleware removed - using JWT authentication only
// app.use(passport.initialize());
// app.use(passport.session());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/canvas', canvasRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handler middleware
app.use(errorHandler);

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socketHandler(io, socket);
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export { app, io };
