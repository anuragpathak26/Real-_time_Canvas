import mongoose from 'mongoose';
import Room from '../models/room.model.js';
import { NotFoundError, UnauthorizedError } from '../utils/errorHandler.js';

// Create a new room
export const createRoom = async (req, res, next) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Create demo room
      const demoRoom = {
        _id: Date.now().toString(),
        name,
        description: description || '',
        owner: {
          _id: req.user.id,
          name: req.user.name,
          email: req.user.email
        },
        isPrivate: isPrivate || false,
        members: [{
          user: req.user.id,
          role: 'editor',
          joinedAt: new Date()
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return res.status(201).json(demoRoom);
    }
    
    const room = new Room({
      name,
      description: description || '',
      owner: req.user.id,
      isPrivate: isPrivate || false,
      members: [{
        user: req.user.id,
        role: 'editor',
        joinedAt: new Date()
      }],
    });

    await room.save();
    
    // Populate the owner and members fields
    await room.populate('owner', 'name email');
    await room.populate('members.user', 'name email');
    
    console.log(`Room created: ${room._id} by user ${req.user.id}`);
    console.log('Room members:', room.members.map(m => ({ user: m.user._id, role: m.role })));
    
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

// Get all rooms for the current user
export const getUserRooms = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Return empty array for demo mode
      return res.json([]);
    }
    
    const rooms = await Room.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id },
      ],
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// Get a single room by ID
export const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id },
      ],
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!room) {
      throw new NotFoundError('Room not found or access denied');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// Update a room
export const updateRoom = async (req, res, next) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { name, description, isPrivate },
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!room) {
      throw new NotFoundError('Room not found or you are not the owner');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// Delete a room
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!room) {
      throw new NotFoundError('Room not found or you are not the owner');
    }

    // TODO: Delete all canvas operations for this room
    
    res.json({ message: 'Room removed' });
  } catch (error) {
    next(error);
  }
};

// Add member to room
export const addMember = async (req, res, next) => {
  try {
    const { userId, role = 'editor' } = req.body;
    
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $addToSet: { members: { user: userId, role } } },
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!room) {
      throw new NotFoundError('Room not found or you are not the owner');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// Remove member from room
export const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    // Prevent removing the owner
    if (userId === req.user.id) {
      throw new UnauthorizedError('You cannot remove yourself as the owner');
    }
    
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $pull: { members: { user: userId } } },
      { new: true }
    )
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!room) {
      throw new NotFoundError('Room not found or you are not the owner');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// Update member role
export const updateMemberRole = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    
    // Prevent changing owner role
    if (userId === req.user.id) {
      throw new UnauthorizedError('You cannot change your own role');
    }
    
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id, 'members.user': userId },
      { $set: { 'members.$.role': role } },
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!room) {
      throw new NotFoundError('Room or member not found or you are not the owner');
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
};

// Join a room by room ID
export const joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.body;
    
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      throw new Error('Invalid room ID format. Please check the room ID and try again.');
    }
    
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Fallback: Create demo room access
      const demoRoom = {
        _id: roomId,
        name: 'Demo Room',
        description: 'Demo collaborative room',
        owner: {
          _id: 'demo-owner',
          name: 'Demo Owner',
          email: 'demo@example.com'
        },
        isPrivate: false,
        members: [{
          user: req.user.id,
          role: 'editor',
          joinedAt: new Date()
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return res.status(200).json({
        message: 'Successfully joined room',
        room: demoRoom
      });
    }
    
    // Find the room
    const room = await Room.findById(roomId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Check if room is private and user is not already a member
    const isAlreadyMember = room.members.some(member => 
      member.user._id.toString() === req.user.id
    );
    
    const isOwner = room.owner._id.toString() === req.user.id;

    if (isAlreadyMember || isOwner) {
      return res.status(200).json({
        message: 'You are already a member of this room',
        room
      });
    }

    // If room is private, only allow joining if invited (for now, we'll allow all joins)
    // In a real app, you might want to implement invitation system for private rooms
    
    // Add user to room members
    console.log(`Adding user ${req.user.id} to room ${roomId}`);
    
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      { 
        $addToSet: { 
          members: { 
            user: req.user.id, 
            role: 'editor',
            joinedAt: new Date()
          } 
        } 
      },
      { new: true, runValidators: true }
    )
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    console.log(`User ${req.user.id} successfully added to room ${roomId}`);
    console.log('Updated room members:', updatedRoom.members.map(m => ({ user: m.user._id, role: m.role })));

    res.status(200).json({
      message: 'Successfully joined room',
      room: updatedRoom
    });
  } catch (error) {
    next(error);
  }
};
