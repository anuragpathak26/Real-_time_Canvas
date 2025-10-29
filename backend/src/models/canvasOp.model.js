import mongoose from 'mongoose';


const canvasOpSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    opId: {
      type: String,
      required: true,
    },
    opType: {
      type: String,
      required: true,
      // Align with frontend Canvas.jsx event names
      enum: [
        'draw:start',
        'draw:move',
        'draw:end',
        'shape:start',
        'shape:update',
        'shape:delete',
        'shape:end',
        'image:add',
        'text:add',
        'clear',
        'undo',
        'redo',
      ],
    },
    payload: {
      // Common fields
      // Optional in current client; make it optional to avoid validation errors
      layerId: { type: String },
      zIndex: { type: Number, default: 0 },
      
      // For strokes
      points: {
        type: [Number],
        default: [],
      },
      brush: {
        color: { type: String, default: '#000000' },
        size: { type: Number, default: 5 },
        type: { type: String, enum: ['pen', 'marker', 'highlighter'], default: 'pen' },
      },
      
      // For shapes
      shape: {
        type: { type: String, enum: ['rect', 'circle', 'line', 'arrow', 'text'] },
        x: Number,
        y: Number,
        width: Number,
        height: Number,
        radius: Number,
        fill: String,
        stroke: String,
        strokeWidth: Number,
        text: String,
        fontSize: Number,
        fontFamily: String,
      },
      
      // For images
      image: {
        url: String,
        width: Number,
        height: Number,
        x: Number,
        y: Number,
        scaleX: { type: Number, default: 1 },
        scaleY: { type: Number, default: 1 },
        rotation: { type: Number, default: 0 },
      },
      
      // For undo/redo
      targetOpId: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster querying
canvasOpSchema.index({ roomId: 1, createdAt: 1 });
canvasOpSchema.index({ roomId: 1, opId: 1 }, { unique: true });

const CanvasOp = mongoose.model('CanvasOp', canvasOpSchema);

export default CanvasOp;
