import CanvasOp from '../models/canvasOp.model.js';
import { NotFoundError } from '../utils/errorHandler.js';

export const getCanvasHistory = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { since, limit = 100 } = req.query;
    
    // Check room access
    const hasAccess = await checkRoomAccess(roomId, req.user.id);
    if (!hasAccess) {
      throw new NotFoundError('Room not found or access denied');
    }
    
    const query = { roomId };
    
    // If 'since' timestamp is provided, only get operations after that time
    if (since) {
      query.createdAt = { $gt: new Date(parseInt(since)) };
    }
    
    const operations = await CanvasOp.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');
    
    res.json(operations);
  } catch (error) {
    next(error);
  }
};

export const saveCanvasSnapshot = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { imageData, thumbnailData } = req.body;
    
    // Check room access and get room
    const room = await checkRoomAccess(roomId, req.user.id, true);
    if (!room) {
      throw new NotFoundError('Room not found or access denied');
    }
    
    // In a real app, you would upload the image to a storage service 
    // and save the URL to the database. For now, we'll just save the data URL.
    const snapshot = {
      imageUrl: imageData, // In production, this would be a URL to the stored image
      thumbnailUrl: thumbnailData, // Optional thumbnail
      createdBy: req.user.id,
      createdAt: new Date(),
    };
    
    // Add to room's snapshots array
    room.snapshots.push(snapshot);
    room.lastSnapshot = {
      snapshotId: snapshot._id,
      timestamp: snapshot.createdAt,
    };
    
    await room.save();
    
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
};

// Helper function to check if user has access to a room
async function checkRoomAccess(roomId, userId, returnRoom = false) {
  const Room = (await import('../models/room.model.js')).default;
  
  const room = await Room.findOne({
    _id: roomId,
    $or: [
      { owner: userId },
      { 'members.user': userId },
    ],
  });
  
  return returnRoom ? room : !!room;
}

export const getSnapshot = async (req, res, next) => {
  try {
    const { roomId, snapshotId } = req.params;
    
    // Check room access
    const room = await checkRoomAccess(roomId, req.user.id, true);
    if (!room) {
      throw new NotFoundError('Room not found or access denied');
    }
    
    // Find the snapshot in the room's snapshots array
    const snapshot = room.snapshots.id(snapshotId);
    if (!snapshot) {
      throw new NotFoundError('Snapshot not found');
    }
    
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
};

// Get the latest snapshot for a room
export const getLatestSnapshot = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    // Check room access
    const room = await checkRoomAccess(roomId, req.user.id, true);
    if (!room) {
      throw new NotFoundError('Room not found or access denied');
    }
    
    if (!room.lastSnapshot) {
      return res.json(null);
    }
    
    // Find the latest snapshot
    const snapshot = room.snapshots.id(room.lastSnapshot.snapshotId);
    if (!snapshot) {
      throw new NotFoundError('Snapshot not found');
    }
    
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
};
