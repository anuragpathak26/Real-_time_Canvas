import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Canvas from '../components/canvas/Canvas';
import Toolbar from '../components/canvas/Toolbar';
import UserPresence from '../components/canvas/UserPresence';
import { FiArrowLeft, FiUsers, FiShare2, FiSettings } from 'react-icons/fi';

const CanvasRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  // toolbar states
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/rooms/${roomId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRoom(response.data);
    } catch (err) {
      console.error('Failed to fetch room:', err);
      setError('Failed to load room. You may not have permission to access it.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId) fetchRoom();
  }, [roomId, fetchRoom]);

  // Update undo/redo state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current) {
        setCanUndo(canvasRef.current.getCanUndo?.() || false);
        setCanRedo(canvasRef.current.getCanRedo?.() || false);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Update canvas size when container size changes
  useLayoutEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(rect.width - 20, 800), // Use almost full width with minimal padding
          height: Math.max(rect.height - 20, 600) // Use almost full height with minimal padding
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);


  const handlePresenceUpdate = (updatedUsers) => {
    setUsers(updatedUsers);
  };

  const handleLeaveRoom = () => {
    navigate('/dashboard');
  };

  const handleExport = () => {
    const uri = canvasRef.current.exportCanvas();
    const link = document.createElement('a');
    link.download = `canvas-${room?.name || 'untitled'}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = uri;
    link.click();
  };

  const handleSaveCanvas = async () => {
    try {
      const imageData = canvasRef.current.exportCanvas();
      // Here you would typically save to backend
      console.log('Canvas saved:', imageData);
    } catch (error) {
      console.error('Failed to save canvas:', error);
    }
  };

  const handleToolChange = (tool) => {
    setActiveTool(tool);
    canvasRef.current?.setTool(tool);
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    canvasRef.current?.setColor(newColor);
  };

  const handleBrushSizeChange = (size) => {
    setBrushSize(size);
    canvasRef.current?.setBrushSize(size);
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      canvasRef.current?.clear();
    }
  };

  const handleZoomIn = () => {
    canvasRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    canvasRef.current?.zoomOut();
  };

  const handleShareRoom = () => {
    const shareUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Room link copied to clipboard!');
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;

  if (error) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600">{error}</div>;

  if (!room) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Room not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back</span>
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
              <p className="text-sm text-gray-500">Collaborative Canvas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUserPanel(!showUserPanel)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiUsers className="w-4 h-4" />
              <span className="font-medium">{users.length} online</span>
            </button>
            
            <button
              onClick={handleShareRoom}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
            >
              <FiShare2 className="w-4 h-4" />
              <span className="font-medium">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Toolbar */}
        <Toolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          color={color}
          onColorChange={handleColorChange}
          brushSize={brushSize}
          onBrushSizeChange={handleBrushSizeChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onExport={handleExport}
          onSave={handleSaveCanvas}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Canvas Area */}
        <main className="flex-1 p-2 overflow-hidden">
          <div ref={canvasContainerRef} className="h-full w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex items-center justify-center">
            <Canvas 
              ref={canvasRef} 
              roomId={roomId} 
              user={user} 
              onSave={handleSaveCanvas} 
              onPresenceUpdate={handlePresenceUpdate}
              width={canvasSize.width}
              height={canvasSize.height}
            />
          </div>
        </main>

        {/* User Presence Panel */}
        {showUserPanel && (
          <div className="w-80 bg-white shadow-lg border-l border-gray-200 p-6">
            <UserPresence users={users} currentUser={user} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasRoom;