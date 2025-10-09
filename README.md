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

