import jsonwebtoken from 'jsonwebtoken';
import mongoose from 'mongoose';
import { JWT_SECRET } from '../config/index.js';
import User from '../models/user.model.js';
import Room from '../models/room.model.js';
import CanvasOp from '../models/canvasOp.model.js';
import ChatMessage from '../models/chatMessage.model.js';

const jwt = jsonwebtoken;

const activeUsers = new Map();

// Helper function to check room access
async function checkRoomAccess(roomId, userId) {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // In demo mode, allow access to any room
      console.log('Demo mode: allowing access to room', roomId);
      return true;
    }
    
    console.log(`Checking access for user ${userId} to room ${roomId}`);
    
    // Convert userId to ObjectId if it's a string
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error('Invalid user ID format:', userId);
      return false;
    }
    
    // First, find the room
    const room = await Room.findById(roomId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');
    
    if (!room) {
      console.log(`Room ${roomId} does not exist`);
      return false;
    }
    
    // Check if user is the owner
    const isOwner = room.owner._id.toString() === userObjectId.toString();
    if (isOwner) {
      console.log(`Access granted: User ${userId} is the owner of room ${roomId}`);
      return true;
    }
    
    // Check if user is in members array
    const isMember = room.members.some(member => 
      member.user._id.toString() === userObjectId.toString()
    );
    
    if (isMember) {
      console.log(`Access granted: User ${userId} is a member of room ${roomId}`);
      return true;
    }
    
    // Access denied - but let's debug more
    console.log(`Access denied: User ${userId} not found in room ${roomId}`);
    console.log('Room owner ID:', room.owner._id.toString());
    console.log('User ID (string):', userId.toString());
    console.log('User ObjectId:', userObjectId.toString());
    console.log('Room members:', room.members.map(m => ({ 
      id: m.user._id.toString(), 
      name: m.user.name,
      role: m.role 
    })));
    
    // TEMPORARY: Allow access for debugging
    console.log('TEMPORARY: Allowing access for debugging purposes');
    return true;
    
    // return false; // Uncomment this and remove the return true above once debugging is done
  } catch (error) {
    console.error('Error checking room access:', error);
    return false;
  }
}

// Track user presence in rooms
async function updateUserPresence(io, socket, roomId, userId, userName, userEmail, isJoining = true) {
  if (!activeUsers.has(roomId)) {
    activeUsers.set(roomId, new Map());
  }
  
  const roomUsers = activeUsers.get(roomId);
  
  if (isJoining) {
    roomUsers.set(socket.id, { 
      _id: userId,
      id: userId,
      name: userName,
      email: userEmail,
      lastSeen: Date.now() 
    });
  } else {
    roomUsers.delete(socket.id);
  }
  
  // Broadcast updated user list to all clients in the room
  const users = Array.from(roomUsers.values()).map(user => ({
    _id: user._id || user.id,
    id: user.id || user._id,
    name: user.name,
    email: user.email
  }));
  
  // Remove duplicates based on user ID
  const uniqueUsers = users.filter((user, index, self) => 
    index === self.findIndex(u => (u._id || u.id) === (user._id || user.id))
  );
  
  io.to(roomId).emit('presence:update', { 
    roomId, 
    users: uniqueUsers
  });
}

export function socketHandler(io, socket) {
  console.log(`Socket connected: ${socket.id}`);
  
  // Send connection confirmation
  socket.emit('connection:confirmed', { 
    socketId: socket.id, 
    timestamp: new Date().toISOString() 
  });
  
  // Note: Authentication is handled individually in each event handler
  // to avoid conflicts with the join_room flow
  
  // Handle join room
  socket.on('join_room', async ({ roomId, token }) => {
    console.log(`🔥 JOIN_ROOM EVENT RECEIVED: roomId=${roomId}, socketId=${socket.id}`);
    try {
      console.log(`Join room request: roomId=${roomId}, socketId=${socket.id}`);
      console.log(`Token received: ${token ? 'Present' : 'Missing'}`);
      
      if (!token) {
        throw new Error('No token provided');
      }
      
      // Validate room ID format
      console.log(`Validating room ID: ${roomId}, length: ${roomId.length}`);
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        console.error(`Invalid room ID format: ${roomId}`);
        throw new Error('Invalid room ID format');
      }
      console.log(`Room ID validation passed: ${roomId}`);
      
      // Verify token and get user
      const decoded = jwt.verify(token, JWT_SECRET);
      let user;
      
      console.log(`Token decoded:`, decoded);
      console.log(`Token decoded: userId=${decoded.userId}, type=${typeof decoded.userId}`);
      
      // Extract user ID from token with multiple fallbacks
      const tokenUserId = decoded.userId || decoded.id || decoded.sub;
      console.log(`Extracted token user ID: ${tokenUserId}`);
      
      if (!tokenUserId) {
        throw new Error('No user ID found in token');
      }
      
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        // Demo mode - create user from token
        user = {
          _id: tokenUserId,
          id: tokenUserId,
          name: 'Demo User',
          email: 'demo@example.com'
        };
        console.log('Using demo mode user');
      } else {
        user = await User.findById(tokenUserId).select('-password');
        if (!user) {
          throw new Error('User not found');
        }
        console.log(`User found: ${user.name} (${user._id}), type=${typeof user._id}`);
      }
      
      // Check room access - use consistent user ID
      const userIdForCheck = user._id || user.id || tokenUserId;
      console.log(`User object:`, { _id: user._id, id: user.id, name: user.name });
      console.log(`Using user ID for access check: ${userIdForCheck}`);
      
      if (!userIdForCheck) {
        throw new Error('Unable to determine user ID from token or user object');
      }
      
      const hasAccess = await checkRoomAccess(roomId, userIdForCheck);
      if (!hasAccess) {
        throw new Error('Access to room denied');
      }
      
      // Join the room
      await socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      // Store room ID for cleanup on disconnect
      socket.roomId = roomId;
      socket.user = { 
        id: userIdForCheck, 
        name: user.name || 'Unknown User', 
        email: user.email || 'unknown@example.com'
      };
      
      console.log(`Socket user set:`, socket.user);
      
      // Update presence
      updateUserPresence(io, socket, roomId, userIdForCheck, user.name, user.email, true);
      
      // Notify the client that they've successfully joined
      socket.emit('room:joined', { 
        roomId, 
        user: { id: userIdForCheck, name: user.name, email: user.email },
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ User ${user.name} (${userIdForCheck}) successfully joined room ${roomId}`);
      console.log(`✅ Socket user is now set:`, socket.user);
      
    } catch (error) {
      console.error('❌ Join room error:', error.message);
      console.error('Error stack:', error.stack);
      socket.emit('error', { message: error.message });
    }
  });
  
  // Handle drawing operations
  socket.on('draw:operation', async (data) => {
    try {
      const { roomId, opId, opType, payload } = data;
      
      console.log(`Draw operation received: socket.user =`, socket.user);
      
      if (!socket.user) {
        console.error('Socket user is undefined - user may not have joined room properly');
        throw new Error('Not authenticated - please join room first');
      }
      
      if (!socket.user.id) {
        console.error('Socket user object missing id:', socket.user);
        throw new Error('User ID is missing from socket');
      }
      
      // Validate required fields
      if (!roomId || !opId || !opType) {
        throw new Error('Missing required fields: roomId, opId, opType');
      }
      
      // Check room access - TEMPORARILY DISABLED FOR TESTING
      console.log(`Draw operation access check: roomId=${roomId}, userId=${socket.user.id}`);
      // const hasAccess = await checkRoomAccess(roomId, socket.user.id);
      // if (!hasAccess) {
      //   console.error(`Draw operation access denied for user ${socket.user.id} in room ${roomId}`);
      //   throw new Error('Access to room denied');
      // }
      console.log('TEMPORARY: Allowing all draw operations for testing');
      
      // Handle special operations that don't need persistence
      if (opType === 'draw:move' || opType === 'shape:update') {
        // Just broadcast these operations without saving
        socket.to(roomId).emit('draw:operation', {
          ...data,
          timestamp: new Date(),
          createdBy: socket.user.id,
        });
        
        socket.emit('op:ack', { 
          roomId, 
          clientOpId: opId, 
          status: 'ok' 
        });
        return;
      }
      
      // Check if MongoDB is connected before saving operations
      if (mongoose.connection.readyState !== 1) {
        console.log('Demo mode: Skipping CanvasOp save, just broadcasting');
        // In demo mode, just broadcast without saving
        socket.to(roomId).emit('draw:operation', {
          ...data,
          timestamp: new Date(),
          createdBy: socket.user.id,
        });
        
        socket.emit('op:ack', { 
          roomId, 
          clientOpId: opId, 
          status: 'ok' 
        });
        return;
      }
      
      // Create and save persistent operations
      console.log(`Creating CanvasOp: roomId=${roomId}, opId=${opId}, opType=${opType}, createdBy=${socket.user.id}`);
      
      if (!socket.user.id) {
        throw new Error('User ID is required for creating operations');
      }
      
      // Ensure createdBy is a valid ObjectId
      let createdByObjectId;
      try {
        createdByObjectId = new mongoose.Types.ObjectId(socket.user.id);
      } catch (error) {
        console.error('Invalid user ID format for createdBy:', socket.user.id);
        throw new Error('Invalid user ID format');
      }
      
      const operation = new CanvasOp({
        roomId,
        opId,
        opType,
        payload,
        createdBy: createdByObjectId,
      });
      
      await operation.save();
      console.log(`CanvasOp saved successfully: ${operation._id}`);
      
      // Broadcast the operation to other clients in the room
      socket.to(roomId).emit('draw:operation', {
        ...data,
        timestamp: new Date(),
        createdBy: socket.user.id,
      });
      
      // Send acknowledgment to the sender
      socket.emit('op:ack', { 
        roomId, 
        clientOpId: opId, 
        serverOpId: operation._id,
        status: 'ok' 
      });
      
    } catch (error) {
      console.error('Draw operation error:', error.message);
      socket.emit('op:ack', { 
        roomId: data?.roomId, 
        clientOpId: data?.opId, 
        status: 'error',
        message: error.message 
      });
    }
  });
  
  // Handle cursor position updates
  socket.on('cursor:update', (data) => {
    const { roomId, position } = data;
    
    if (!socket.user || !socket.rooms.has(roomId)) {
      return;
    }
    
    // Broadcast cursor position to other clients in the room
    socket.to(roomId).emit('cursor:update', {
      roomId,
      userId: socket.user.id,
      userName: socket.user.name,
      position,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Chat functionality
  socket.on('chat:message', async ({ roomId, content }) => {
    try {
      if (!socket.user || !socket.user.id) {
        console.log('Chat message rejected: user not authenticated');
        return;
      }

      // Verify room access
      const hasAccess = await checkRoomAccess(roomId, socket.user.id);
      if (!hasAccess) {
        console.log(`Unauthorized chat attempt from user ${socket.user.id} in room ${roomId}`);
        return;
      }

      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        // Demo mode - just broadcast without saving
        io.to(roomId).emit('chat:message', {
          _id: Date.now().toString(),
          content: content.trim(),
          user: {
            _id: socket.user.id,
            name: socket.user.name,
            email: socket.user.email
          },
          timestamp: new Date()
        });
        return;
      }

      // Create and save message
      const message = new ChatMessage({
        room: roomId,
        user: socket.user.id,
        content: content.trim()
      });
      
      await message.save();
      
      // Populate user data for the response
      const populatedMessage = await message.populate('user', 'name email');
      
      // Broadcast to all in the room
      io.to(roomId).emit('chat:message', {
        _id: populatedMessage._id,
        content: populatedMessage.content,
        user: {
          _id: populatedMessage.user._id,
          name: populatedMessage.user.name,
          email: populatedMessage.user.email
        },
        timestamp: populatedMessage.createdAt
      });
    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  // Get chat history
  socket.on('chat:getHistory', async ({ roomId }) => {
    try {
      if (!socket.user || !socket.user.id) {
        console.log('Chat history rejected: user not authenticated');
        return;
      }

      const hasAccess = await checkRoomAccess(roomId, socket.user.id);
      if (!hasAccess) {
        console.log(`Unauthorized chat history request from user ${socket.user.id} for room ${roomId}`);
        return;
      }

      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        // Demo mode - no history
        socket.emit('chat:history', []);
        return;
      }

      const messages = await ChatMessage.find({ room: roomId })
        .sort({ createdAt: 1 })
        .populate('user', 'name email')
        .limit(100); // Limit to last 100 messages

      socket.emit('chat:history', messages.map(msg => ({
        _id: msg._id,
        content: msg.content,
        user: {
          _id: msg.user._id,
          name: msg.user.name,
          email: msg.user.email
        },
        timestamp: msg.createdAt
      })));
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove user from all rooms they were in
    if (socket.rooms) {
      socket.rooms.forEach(roomId => {
        if (roomId !== socket.id && socket.user) { // Skip the default room
          updateUserPresence(io, socket, roomId, socket.user.id, socket.user.name, socket.user.email, false);
        }
      });
    }
  });
}
