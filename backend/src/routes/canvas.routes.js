import express from 'express';
import {
  getCanvasHistory,
  saveCanvasSnapshot,
  getSnapshot,
  getLatestSnapshot,
} from '../controllers/canvas.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Canvas history routes
router.get('/:roomId/history', getCanvasHistory);

// Snapshot routes
router.post('/:roomId/snapshots', saveCanvasSnapshot);
router.get('/:roomId/snapshots/latest', getLatestSnapshot);
router.get('/:roomId/snapshots/:snapshotId', getSnapshot);

export default router;
