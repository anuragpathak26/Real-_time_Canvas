import express from 'express';
import {
  createRoom,
  getUserRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  addMember,
  removeMember,
  updateMemberRole,
  joinRoom,
} from '../controllers/room.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Room routes
router.route('/')
  .post(createRoom)
  .get(getUserRooms);

router.route('/:id')
  .get(getRoomById)
  .put(updateRoom)
  .delete(deleteRoom);

// Member management routes
router.route('/:id/members')
  .post(addMember)
  .delete(removeMember);

router.put('/:id/members/role', updateMemberRole);

// Join room route
router.post('/join', joinRoom);

export default router;
