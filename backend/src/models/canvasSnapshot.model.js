import mongoose from 'mongoose';

const canvasSnapshotSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    snapshotData: {
      type: String, // Base64 encoded canvas image
      required: true,
    },
    operations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CanvasOp',
    }],
    metadata: {
      width: {
        type: Number,
        default: 800,
      },
      height: {
        type: Number,
        default: 600,
      },
      totalOperations: {
        type: Number,
        default: 0,
      },
      activeUsers: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        userName: String,
        lastActivity: Date,
      }],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAutoSnapshot: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
canvasSnapshotSchema.index({ roomId: 1, version: -1 });
canvasSnapshotSchema.index({ roomId: 1, createdAt: -1 });

// Auto-increment version for each room
canvasSnapshotSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastSnapshot = await this.constructor
      .findOne({ roomId: this.roomId })
      .sort({ version: -1 });
    
    this.version = lastSnapshot ? lastSnapshot.version + 1 : 1;
  }
  next();
});

const CanvasSnapshot = mongoose.model('CanvasSnapshot', canvasSnapshotSchema);

export default CanvasSnapshot;
