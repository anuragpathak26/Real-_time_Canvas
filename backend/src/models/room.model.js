import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  imageUrl: String,
  thumbnailUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const lastSnapshotSchema = new mongoose.Schema({
  snapshotId: { type: mongoose.Schema.Types.ObjectId },
  timestamp: Date,
});

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isPrivate: { type: Boolean, default: false },
    thumbnail: { type: String, default: '' },
    lastModified: { type: Date, default: Date.now },
    snapshots: [snapshotSchema],
    lastSnapshot: lastSnapshotSchema,
  },
  { timestamps: true }
);

// Text index for search
roomSchema.index({ name: 'text', description: 'text' });

const Room = mongoose.model('Room', roomSchema);
export default Room;
