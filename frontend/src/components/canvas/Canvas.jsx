// src/components/canvas/Canvas.jsx
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import RemoteCursor from './RemoteCursor';

const Canvas = forwardRef(({ roomId, user, onSave, onPresenceUpdate, width = 1200, height = 800 }, ref) => {
  // connection
  const [socket, setSocket] = useState(null);

  // drawing state
  const stageRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentLineRef = useRef(null);
  const startPosRef = useRef(null);
  const currentShapeRef = useRef(null);
  const currentTextRef = useRef(null);

  // app state
  const [lines, setLines] = useState([]);         // strokes
  const [shapes, setShapes] = useState([]);       // rectangles, circles, etc.
  const [texts, setTexts] = useState([]);         // text elements
  const [cursorPositions, setCursorPositions] = useState({});
  const [scale, setScale] = useState(1);

  // settings
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [shapeType, setShapeType] = useState('rectangle'); // for shapes tool

  // history
  const opHistoryRef = useRef([]);
  const redoStackRef = useRef([]);
  const opMapRef = useRef({});
  const pendingOperations = useRef({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Performance optimization - batch operations
  const operationBatchRef = useRef([]);
  const batchTimeoutRef = useRef(null);

  // Helper function to get cursor color for user
  const getCursorColor = (userId) => {
    const colors = [
      '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
    ];
    if (!userId || typeof userId !== 'string') {
      return colors[0]; // Default color
    }
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    const newSocket = io(wsUrl, {
      auth: { token: localStorage.getItem('token') },
      query: { roomId },
    });

    setSocket(newSocket);
    
    // Join the room after connect to receive presence/history
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token ? 'Present' : 'Missing');
    
    newSocket.on('connect', () => {
      console.log('Socket connected, joining room:', roomId);
      if (roomId && token) {
        console.log('Emitting join_room with roomId:', roomId);
        newSocket.emit('join_room', { roomId, token });
      } else {
        console.error('Missing roomId or token:', { roomId: !!roomId, token: !!token });
      }
    });

    // Handle connection confirmation
    newSocket.on('connection:confirmed', (data) => {
      console.log('Socket connection confirmed:', data);
    });

    // Handle connection errors
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Handle general errors
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle room join success
    newSocket.on('room:joined', (data) => {
      console.log('✅ Successfully joined room:', data);
    });

    // Handle disconnect
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => newSocket.disconnect();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleDrawOp = (data) => {
      const { opType, payload, createdBy, opId } = data;

      switch (opType) {
        case 'draw:start':
          setLines(prev => [...prev, { id: payload.id, points: payload.points.slice(), color: payload.color, brushSize: payload.brushSize, tool: payload.tool, createdBy }]);
          opMapRef.current[payload.id] = { ...data };
          break;
        case 'draw:move':
          setLines(prev => prev.map(line => line.id === payload.id ? { ...line, points: [...line.points, ...payload.points] } : line));
          break;
        case 'draw:end':
          if (opId) opHistoryRef.current.push(payload.id || opId);
          break;
        case 'shape:start':
          setShapes(prev => [...prev, { id: payload.id, ...payload, createdBy }]);
          opMapRef.current[payload.id] = { ...data };
          break;
        case 'shape:update':
          setShapes(prev => prev.map(shape => shape.id === payload.id ? { ...shape, ...payload } : shape));
          break;
        case 'text:add':
          setTexts(prev => [...prev, { id: payload.id, ...payload, createdBy }]);
          opMapRef.current[payload.id] = { ...data };
          break;
        case 'undo':
          const targetId = payload.targetOpId;
          setLines(prev => prev.filter(line => line.id !== targetId));
          setShapes(prev => prev.filter(shape => shape.id !== targetId));
          setTexts(prev => prev.filter(text => text.id !== targetId));
          const idx = opHistoryRef.current.lastIndexOf(targetId);
          if (idx !== -1) {
            opHistoryRef.current.splice(idx, 1);
            redoStackRef.current.push(targetId);
          }
          break;
        case 'redo':
          const redoId = payload.targetOpId;
          const original = opMapRef.current[redoId];
          if (original) {
            if (original.opType === 'draw:start') setLines(prev => [...prev, original.payload]);
            if (original.opType === 'shape:start') setShapes(prev => [...prev, original.payload]);
            if (original.opType === 'text:add') setTexts(prev => [...prev, original.payload]);
            opHistoryRef.current.push(redoId);
            const rIdx = redoStackRef.current.lastIndexOf(redoId);
            if (rIdx !== -1) redoStackRef.current.splice(rIdx, 1);
          }
          break;
        case 'clear':
          // Clear all canvas elements for all users
          setLines([]);
          setShapes([]);
          setTexts([]);
          // Clear history as well
          opHistoryRef.current = [];
          redoStackRef.current = [];
          opMapRef.current = {};
          setCanUndo(false);
          setCanRedo(false);
          break;
        default:
          console.log('Unhandled opType', opType);
      }
    };

    socket.on('draw:operation', handleDrawOp);
    // Presence updates
    const handlePresence = (payload) => {
      // payload: { roomId, users: [userId, ...] }
      if (payload?.roomId === roomId && typeof onPresenceUpdate === 'function') {
        onPresenceUpdate(payload.users || []);
      }
    };
    socket.on('presence:update', handlePresence);

    // Room joined acknowledgement (optional)
    const handleJoined = () => {
      // could request history here if needed
    };
    socket.on('room:joined', handleJoined);

    // Cursor updates
    const handleCursorUpdate = (payload) => {
      // payload: { roomId, userId, userName, position: { x, y } }
      if (payload?.roomId === roomId && payload.userId !== user?.id) {
        setCursorPositions(prev => ({ 
          ...prev, 
          [payload.userId]: {
            position: payload.position,
            userName: payload.userName,
            userId: payload.userId,
            lastSeen: Date.now()
          }
        }));
      }
    };
    socket.on('cursor:update', handleCursorUpdate);

    // Handle operation acknowledgments
    const handleOpAck = (data) => {
      const { clientOpId, status, message, serverOpId } = data;
      
      if (status === 'ok') {
        // Remove from pending operations
        delete pendingOperations.current[clientOpId];
        
        // Update operation history for undo/redo
        if (serverOpId && !opHistoryRef.current.includes(clientOpId)) {
          opHistoryRef.current.push(clientOpId);
          setCanUndo(true);
        }
      } else {
        console.error('Operation failed:', message);
        // Handle failed operation - could show user notification
        delete pendingOperations.current[clientOpId];
      }
    };
    socket.on('op:ack', handleOpAck);

    return () => {
      socket.off('draw:operation', handleDrawOp);
      socket.off('presence:update', handlePresence);
      socket.off('room:joined', handleJoined);
      socket.off('cursor:update', handleCursorUpdate);
      socket.off('op:ack', handleOpAck);
    };
  }, [socket, onPresenceUpdate, roomId, user]);

  // Clean up old cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursorPositions(prev => {
        const filtered = {};
        Object.entries(prev).forEach(([userId, cursor]) => {
          if (cursor && now - cursor.lastSeen < 5000) {
            filtered[userId] = cursor;
          }
        });
        return filtered;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+Z or Cmd+Shift+Z for redo
              if (redoStackRef.current.length > 0) {
                const redoId = redoStackRef.current.pop();
                const original = opMapRef.current[redoId];
                if (original) {
                  if (original.opType === 'draw:start') setLines(prev => [...prev, original.payload]);
                  if (original.opType === 'shape:start') setShapes(prev => [...prev, original.payload]);
                  if (original.opType === 'text:add') setTexts(prev => [...prev, original.payload]);
                  opHistoryRef.current.push(redoId);
                }
                setCanUndo(opHistoryRef.current.length > 0);
                setCanRedo(redoStackRef.current.length > 0);
                if (socket) {
                  socket.emit('draw:operation', { 
                    opId: uuidv4(), 
                    opType: 'redo', 
                    roomId, 
                    payload: { targetOpId: redoId }, 
                    createdBy: user.id 
                  });
                }
              }
            } else {
              // Ctrl+Z or Cmd+Z for undo
              if (opHistoryRef.current.length > 0) {
                const lastId = opHistoryRef.current.pop();
                redoStackRef.current.push(lastId);
                setLines(prev => prev.filter(l => l.id !== lastId));
                setShapes(prev => prev.filter(s => s.id !== lastId));
                setTexts(prev => prev.filter(t => t.id !== lastId));
                setCanUndo(opHistoryRef.current.length > 0);
                setCanRedo(redoStackRef.current.length > 0);
                if (socket) {
                  socket.emit('draw:operation', { 
                    opId: uuidv4(), 
                    opType: 'undo', 
                    roomId, 
                    payload: { targetOpId: lastId }, 
                    createdBy: user.id 
                  });
                }
              }
            }
            break;
          case 'y':
            // Ctrl+Y or Cmd+Y for redo (alternative)
            e.preventDefault();
            if (redoStackRef.current.length > 0) {
              const redoId = redoStackRef.current.pop();
              const original = opMapRef.current[redoId];
              if (original) {
                if (original.opType === 'draw:start') setLines(prev => [...prev, original.payload]);
                if (original.opType === 'shape:start') setShapes(prev => [...prev, original.payload]);
                if (original.opType === 'text:add') setTexts(prev => [...prev, original.payload]);
                opHistoryRef.current.push(redoId);
              }
              setCanUndo(opHistoryRef.current.length > 0);
              setCanRedo(redoStackRef.current.length > 0);
              if (socket) {
                socket.emit('draw:operation', { 
                  opId: uuidv4(), 
                  opType: 'redo', 
                  roomId, 
                  payload: { targetOpId: redoId }, 
                  createdBy: user.id 
                });
              }
            }
            break;
        }
      } else {
        // Tool shortcuts
        switch (e.key) {
          case 'v':
            setTool('pointer');
            break;
          case 'p':
            setTool('pen');
            break;
          case 'e':
            setTool('eraser');
            break;
          case 'l':
            setTool('line');
            break;
          case 'r':
            setTool('rectangle');
            break;
          case 'c':
            setTool('circle');
            break;
          case 't':
            setTool('text');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [socket, roomId, user]);

  const handleMouseDown = (e) => {
    if (!socket || !user) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const clientOpId = uuidv4();

    if (tool === 'pen' || tool === 'eraser') {
      const newLine = { id: clientOpId, points: [pos.x, pos.y], color, brushSize, tool, createdBy: user.id };
      setLines(prev => [...prev, newLine]);
      socket.emit('draw:operation', { opId: clientOpId, opType: 'draw:start', roomId, payload: newLine, createdBy: user.id });
      pendingOperations.current[clientOpId] = { operation: { payload: newLine }, timestamp: Date.now() };
      isDrawingRef.current = true;
      currentLineRef.current = clientOpId;
    } else if (tool === 'line') {
      startPosRef.current = pos;
      const newLine = { id: clientOpId, points: [pos.x, pos.y, pos.x, pos.y], color, brushSize, tool: 'line', createdBy: user.id };
      setLines(prev => [...prev, newLine]);
      socket.emit('draw:operation', { opId: clientOpId, opType: 'draw:start', roomId, payload: newLine, createdBy: user.id });
      pendingOperations.current[clientOpId] = { operation: { payload: newLine }, timestamp: Date.now() };
      isDrawingRef.current = true;
      currentLineRef.current = clientOpId;
    } else if (tool === 'rectangle' || tool === 'circle') {
      startPosRef.current = pos;
      const newShape = { 
        id: clientOpId, 
        type: tool, 
        x: pos.x, 
        y: pos.y, 
        width: 0, 
        height: 0, 
        fill: 'transparent', 
        stroke: color, 
        strokeWidth: brushSize, 
        createdBy: user.id 
      };
      setShapes(prev => [...prev, newShape]);
      socket.emit('draw:operation', { opId: clientOpId, opType: 'shape:start', roomId, payload: newShape, createdBy: user.id });
      pendingOperations.current[clientOpId] = { operation: { payload: newShape }, timestamp: Date.now() };
      isDrawingRef.current = true;
      currentShapeRef.current = clientOpId;
    } else if (tool === 'text') {
      const textContent = prompt('Enter text:') || 'Text';
      const newText = { 
        id: clientOpId, 
        text: textContent, 
        x: pos.x, 
        y: pos.y, 
        fontSize: brushSize + 10, 
        fill: color, 
        fontFamily: 'Arial',
        createdBy: user.id 
      };
      setTexts(prev => [...prev, newText]);
      socket.emit('draw:operation', { opId: clientOpId, opType: 'text:add', roomId, payload: newText, createdBy: user.id });
      opHistoryRef.current.push(clientOpId);
      setCanUndo(true);
      currentTextRef.current = clientOpId;
    }
  };

  const handleMouseMove = (e) => {
    if (!socket) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    // Broadcast cursor position for presence/cursor previews
    socket.emit('cursor:update', { roomId, position: { x: pos.x, y: pos.y } });

    if (!isDrawingRef.current) return;

    if (tool === 'pen' || tool === 'eraser') {
      setLines(prev => prev.map(line => line.id === currentLineRef.current ? { ...line, points: [...line.points, pos.x, pos.y] } : line));
      socket.emit('draw:operation', { opId: uuidv4(), opType: 'draw:move', roomId, payload: { id: currentLineRef.current, points: [pos.x, pos.y] }, createdBy: user.id });
    } else if (tool === 'line') {
      // Update line endpoint
      setLines(prev => prev.map(line => line.id === currentLineRef.current ? { ...line, points: [startPosRef.current.x, startPosRef.current.y, pos.x, pos.y] } : line));
      socket.emit('draw:operation', { opId: uuidv4(), opType: 'draw:move', roomId, payload: { id: currentLineRef.current, points: [startPosRef.current.x, startPosRef.current.y, pos.x, pos.y] }, createdBy: user.id });
    } else if (tool === 'rectangle' || tool === 'circle') {
      const width = pos.x - startPosRef.current.x;
      const height = pos.y - startPosRef.current.y;
      setShapes(prev => prev.map(shape => shape.id === currentShapeRef.current ? { ...shape, width, height } : shape));
      socket.emit('draw:operation', { opId: uuidv4(), opType: 'shape:update', roomId, payload: { id: currentShapeRef.current, width, height }, createdBy: user.id });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;

    if (tool === 'pen' || tool === 'eraser' || tool === 'line') {
      socket.emit('draw:operation', { opId: uuidv4(), opType: 'draw:end', roomId, payload: { id: currentLineRef.current }, createdBy: user.id });
      opHistoryRef.current.push(currentLineRef.current);
    } else if (tool === 'rectangle' || tool === 'circle') {
      socket.emit('draw:operation', { opId: uuidv4(), opType: 'shape:end', roomId, payload: { id: currentShapeRef.current }, createdBy: user.id });
      opHistoryRef.current.push(currentShapeRef.current);
    }
    
    setCanUndo(opHistoryRef.current.length > 0);
    isDrawingRef.current = false;
    currentLineRef.current = null;
    currentShapeRef.current = null;
    startPosRef.current = null;
  };

  useImperativeHandle(ref, () => ({
    setColor: (c) => setColor(c),
    setTool: (t) => setTool(t),
    setBrushSize: (s) => setBrushSize(s),
    setShapeType: (type) => setShapeType(type),
    undo: () => {
      if (!socket || opHistoryRef.current.length === 0) return;
      const lastId = opHistoryRef.current.pop();
      if (!lastId) return;
      
      redoStackRef.current.push(lastId);
      
      // Update local state
      setLines(prev => prev.filter(l => l.id !== lastId));
      setShapes(prev => prev.filter(s => s.id !== lastId));
      setTexts(prev => prev.filter(t => t.id !== lastId));
      
      // Update undo/redo state
      setCanUndo(opHistoryRef.current.length > 0);
      setCanRedo(redoStackRef.current.length > 0);
      
      // Notify others
      socket.emit('draw:operation', { 
        opId: uuidv4(), 
        opType: 'undo', 
        roomId, 
        payload: { targetOpId: lastId }, 
        createdBy: user.id 
      });
    },
    redo: () => {
      if (!socket || redoStackRef.current.length === 0) return;
      const redoId = redoStackRef.current.pop();
      if (!redoId) return;
      
      const original = opMapRef.current[redoId];
      if (original) {
        if (original.opType === 'draw:start') setLines(prev => [...prev, original.payload]);
        if (original.opType === 'shape:start') setShapes(prev => [...prev, original.payload]);
        if (original.opType === 'text:add') setTexts(prev => [...prev, original.payload]);
        opHistoryRef.current.push(redoId);
      }
      
      // Update undo/redo state
      setCanUndo(opHistoryRef.current.length > 0);
      setCanRedo(redoStackRef.current.length > 0);
      
      socket.emit('draw:operation', { 
        opId: uuidv4(), 
        opType: 'redo', 
        roomId, 
        payload: { targetOpId: redoId }, 
        createdBy: user.id 
      });
    },
    clear: () => {
      setLines([]);
      setShapes([]);
      setTexts([]);
      if (socket) {
        socket.emit('draw:operation', { opId: uuidv4(), opType: 'clear', roomId, payload: {}, createdBy: user?.id });
      }
    },
    exportCanvas: () => stageRef.current.toDataURL(),
    zoomIn: () => setScale(prev => prev * 1.2),
    zoomOut: () => setScale(prev => prev / 1.2),
    getCanUndo: () => canUndo,
    getCanRedo: () => canRedo,
  }), [socket, user, roomId, canUndo, canRedo]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        scaleX={scale}
        scaleY={scale}
        ref={stageRef}
        className="rounded-lg shadow-xl border border-purple-100"
      >
        <Layer>
          {shapes.map((shape, i) => {
            if (shape.type === 'rectangle') {
              return (
                <Rect 
                  key={i} 
                  x={shape.width < 0 ? shape.x + shape.width : shape.x}
                  y={shape.height < 0 ? shape.y + shape.height : shape.y}
                  width={Math.abs(shape.width)}
                  height={Math.abs(shape.height)}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                />
              );
            }
            if (shape.type === 'circle') {
              const radius = Math.abs(shape.width) / 2;
              return (
                <Circle 
                  key={i} 
                  x={shape.x + shape.width / 2}
                  y={shape.y + shape.height / 2}
                  radius={radius}
                  fill={shape.fill}
                  stroke={shape.stroke}
                  strokeWidth={shape.strokeWidth}
                />
              );
            }
            return null;
          })}
          {lines.map((line) => (
            <Line 
              key={line.id} 
              points={line.points} 
              stroke={line.tool === 'eraser' ? '#ffffff' : line.color} 
              strokeWidth={line.brushSize} 
              tension={line.tool === 'line' ? 0 : 0.5}
              lineCap="round" 
              lineJoin="round" 
              globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'} 
            />
          ))}
          {texts.map((text, i) => <Text key={i} {...text} />)}
        </Layer>
      </Stage>
      
      {/* Remote Cursors */}
      {Object.entries(cursorPositions).map(([userId, cursor]) => 
        cursor && cursor.position ? (
          <RemoteCursor
            key={userId}
            userId={userId}
            userName={cursor.userName}
            position={cursor.position}
            color={getCursorColor(userId)}
          />
        ) : null
      )}
    </div>
  );
});

export default Canvas;