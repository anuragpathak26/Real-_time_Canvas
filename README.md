# Real-Time Collaborative Canvas Platform

A full-featured, real-time collaborative drawing application built with React, Node.js, Socket.io, and MongoDB. Multiple users can draw simultaneously with live cursor tracking, presence indicators, and comprehensive drawing tools.

## 🚀 Features

### Authentication & Authorization
- **OAuth Integration**: Login with Google and GitHub
- **JWT Authentication**: Secure token-based authentication
- **User Management**: Profile management with avatars and preferences

### Real-Time Collaboration
- **Live Drawing**: Multiple users can draw simultaneously
- **Cursor Tracking**: See other users' cursors with names and avatars
- **Presence Indicators**: Real-time user presence with online status
- **Instant Synchronization**: All drawing operations sync in real-time

### Drawing Tools
- **Comprehensive Toolbar**: Pen, eraser, shapes, text, line tools
- **Color Picker**: Full color palette with custom colors
- **Brush Sizes**: Multiple brush sizes for different stroke weights
- **Shape Tools**: Rectangle, circle, and line drawing
- **Text Tool**: Add text annotations to the canvas

### Canvas Features
- **Undo/Redo**: Per-user undo/redo stacks
- **Zoom Controls**: Zoom in/out for detailed work
- **Clear Canvas**: Clear entire canvas with confirmation
- **Export**: Save canvas as PNG image
- **Snapshots**: Save and restore canvas states

### Room Management
- **Create Rooms**: Users can create collaborative rooms
- **Join Rooms**: Share room links for easy joining
- **Room Permissions**: Owner controls and member management
- **User List**: See all active participants

### Modern UI/UX
- **Responsive Design**: Works on desktop and mobile devices
- **Modern Interface**: Clean, intuitive design with smooth animations
- **Dark/Light Themes**: Support for different visual preferences
- **Accessibility**: Keyboard shortcuts and screen reader support

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database with Mongoose ODM
- **Passport.js** - OAuth authentication
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI framework with hooks
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Konva.js** - 2D canvas library
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Icons** - Icon components

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Google OAuth credentials (optional)
- GitHub OAuth credentials (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd realtime-canvas
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb+srv://your-connection-string
PORT=5000
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
```

Start the frontend development server:
```bash
npm start
```

### 4. Access the Application
Open your browser and navigate to `http://localhost:5173`

## 🔧 Configuration

### OAuth Setup (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Secret to your `.env` file

#### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy Client ID and Secret to your `.env` file

### Database Setup

#### MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and add to `.env` file
4. Whitelist your IP address

#### Local MongoDB
```bash
# Install MongoDB locally
# macOS
brew install mongodb-community

# Ubuntu
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongod

# Use local connection string
MONGODB_URI=mongodb://localhost:27017/realtime-canvas
```

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/me`
Get current user (requires authentication)

#### OAuth Routes
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/github` - Initiate GitHub OAuth

### Room Management

#### GET `/api/rooms`
Get user's rooms (requires authentication)

#### POST `/api/rooms`
Create new room
```json
{
  "name": "My Canvas Room",
  "description": "Collaborative drawing session",
  "isPrivate": false
}
```

#### GET `/api/rooms/:id`
Get room details

#### PUT `/api/rooms/:id`
Update room (owner only)

#### DELETE `/api/rooms/:id`
Delete room (owner only)

### Canvas Operations

#### GET `/api/canvas/:roomId/history`
Get canvas operation history

#### POST `/api/canvas/:roomId/snapshots`
Save canvas snapshot

## 🔌 Socket.io Events

### Client to Server

#### `join_room`
Join a canvas room
```javascript
socket.emit('join_room', { roomId, token });
```

#### `draw:operation`
Send drawing operation
```javascript
socket.emit('draw:operation', {
  roomId,
  opId: 'unique-id',
  opType: 'draw:start', // draw:start, draw:move, draw:end, shape:start, etc.
  payload: {
    id: 'line-id',
    points: [x1, y1, x2, y2],
    color: '#000000',
    brushSize: 5,
    tool: 'pen'
  },
  createdBy: 'user-id'
});
```

#### `cursor:update`
Update cursor position
```javascript
socket.emit('cursor:update', {
  roomId,
  position: { x: 100, y: 200 }
});
```

### Server to Client

#### `room:joined`
Confirmation of room join
```javascript
socket.on('room:joined', ({ roomId, user, timestamp }) => {
  // Handle successful room join
});
```

#### `draw:operation`
Receive drawing operation from other users
```javascript
socket.on('draw:operation', (data) => {
  // Update canvas with new operation
});
```

#### `cursor:update`
Receive cursor updates from other users
```javascript
socket.on('cursor:update', ({ userId, userName, position, roomId }) => {
  // Update cursor position
});
```

#### `presence:update`
User presence changes
```javascript
socket.on('presence:update', ({ roomId, users }) => {
  // Update user list
});
```

## 🎨 Drawing Operations

### Operation Types
- `draw:start` - Start drawing a line/stroke
- `draw:move` - Continue drawing (add points)
- `draw:end` - Finish drawing
- `shape:start` - Start creating a shape
- `shape:update` - Update shape dimensions
- `text:add` - Add text element
- `undo` - Undo last operation
- `redo` - Redo operation
- `clear` - Clear entire canvas

### Payload Structure
```javascript
{
  id: 'unique-operation-id',
  points: [x1, y1, x2, y2, ...], // For lines/strokes
  color: '#000000',
  brushSize: 5,
  tool: 'pen', // pen, eraser, etc.
  shape: { // For shapes
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    fill: '#ff0000',
    stroke: '#000000'
  }
}
```

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization
- Rate limiting (configurable)
- Room access control
- OAuth security best practices

## 🚀 Deployment

### Backend Deployment (Heroku)
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... other environment variables

# Deploy
git push heroku main
```

### Frontend Deployment (Netlify)
```bash
# Build the project
npm run build

# Deploy to Netlify
# Upload the build folder to Netlify or connect GitHub repository
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-strong-jwt-secret
SESSION_SECRET=your-strong-session-secret
CLIENT_URL=https://your-frontend-domain.com
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string format
- Verify network access (whitelist IP for Atlas)

#### Socket.io Connection Issues
- Check CORS configuration
- Verify WebSocket support
- Check firewall settings

#### OAuth Not Working
- Verify OAuth app configuration
- Check redirect URLs
- Ensure environment variables are set

#### Canvas Performance Issues
- Limit operation history size
- Implement operation batching
- Use canvas optimization techniques

### Performance Optimization

1. **Operation Batching**: Batch multiple operations for better performance
2. **History Limiting**: Limit undo/redo stack size
3. **Debouncing**: Debounce cursor updates
4. **Compression**: Compress large payloads
5. **Caching**: Cache frequently accessed data

## 📞 Support

For support, email support@example.com or create an issue on GitHub.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Voice chat integration
- [ ] Advanced shape tools
- [ ] Layer management
- [ ] Template system
- [ ] Real-time comments
- [ ] Version history
- [ ] Export to various formats (SVG, PDF)
- [ ] Collaborative cursors with user colors
- [ ] Advanced permissions system
