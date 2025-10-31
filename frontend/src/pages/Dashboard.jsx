import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { INPUT_WRAPPER, INPUT_FIELD, BUTTON_PRIMARY } from '../styles/constants';
import { FiPlus, FiFilter, FiArrowUp, FiTrash2, FiShare2, FiEdit3, FiUsers, FiZap, FiDroplet, FiLayers, FiMousePointer } from 'react-icons/fi';

const Dashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const API_BASE_URL = (process.env.REACT_APP_API_URL?.replace(/\/$/, '')) || 'https://real-time-canvas-backend-wd2v.onrender.com/api';
        const response = await axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        });
        setRooms(response.data);
      } catch (err) {
        if (!err.response) setError('Cannot connect to server. Please ensure the backend is reachable.');
        else setError('Failed to load rooms.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) fetchRooms();
  }, [user]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName?.trim()) return;
    
    setIsCreating(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = (process.env.REACT_APP_API_URL?.replace(/\/$/, '')) || 'https://real-time-canvas-backend-wd2v.onrender.com/api';
      const response = await axios.post(
        `${API_BASE_URL}/rooms`,
        { 
          name: newRoomName.trim(),
          description: `Collaborative canvas room created by ${user?.name}`,
          isPrivate: false
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        }
      );
      
      setRooms(prev => [...prev, response.data]);
      setNewRoomName('');
      
      // Show success message
      setTimeout(() => {
        setError('');
      }, 3000);
      
    } catch (err) {
      console.error('Failed to create room:', err);
      setError(err.response?.data?.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoomById = async (e) => {
    e.preventDefault();
    if (!joinRoomId?.trim()) return;
    
    // Validate room ID format (MongoDB ObjectId is 24 characters hex)
    const roomIdTrimmed = joinRoomId.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(roomIdTrimmed)) {
      setError('Invalid room ID format. Room ID should be 24 characters long and contain only letters and numbers.');
      return;
    }
    
    setIsJoining(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = (process.env.REACT_APP_API_URL?.replace(/\/$/, '')) || 'https://real-time-canvas-backend-wd2v.onrender.com/api';
      const response = await axios.post(
        `${API_BASE_URL}/rooms/join`,
        { roomId: joinRoomId.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        }
      );
      
      // Add the joined room to the rooms list if not already present
      const joinedRoom = response.data.room;
      setRooms(prev => {
        const existingRoom = prev.find(r => r._id === joinedRoom._id);
        if (existingRoom) {
          return prev.map(r => r._id === joinedRoom._id ? joinedRoom : r);
        }
        return [...prev, joinedRoom];
      });
      
      setJoinRoomId('');
      setSuccessMessage(`Successfully joined room: ${joinedRoom.name}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err.response?.data?.message || 'Failed to join room. Please check the room ID and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleShareRoom = (room) => {
    const shareText = `Join my collaborative canvas room "${room.name}"!\n\nRoom ID: ${room._id}\n\nGo to the dashboard and use "Join Existing Room" to collaborate with me.`;
    
    if (navigator.share) {
      // Use native sharing if available
      navigator.share({
        title: `Join Canvas Room: ${room.name}`,
        text: shareText,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        setSuccessMessage('Room sharing info copied to clipboard!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }).catch(() => {
        // Final fallback: show alert with text to copy
        alert(`Share this room:\n\n${shareText}`);
      });
    }
  };

  const handleJoinRoom = (roomId) => navigate(`/room/${roomId}`);
  
  // Helper function to check if user is room owner
  const isRoomOwner = (room, currentUser) => {
    if (!room || !currentUser) return false;
    
    const ownerId = room.owner?._id || room.owner?.id || room.owner;
    const userId = currentUser.id || currentUser._id;
    
    console.log('Owner check:', { ownerId, userId, room: room.name });
    
    return ownerId === userId || 
           ownerId?.toString() === userId?.toString() ||
           String(ownerId) === String(userId);
  };
  const handleDeleteRoom = async (roomId) => {
    if (!user) return;
    
    const room = rooms.find(r => r._id === roomId);
    if (!room) return;
    
    // Confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the room "${room.name}"?\n\nThis action cannot be undone and will remove all canvas data.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!isRoomOwner(room, user)) {
        setError('Only the room owner can delete this room.');
        return;
      }
      await axios.delete(`${(process.env.REACT_APP_API_URL?.replace(/\/$/, '')) || 'https://real-time-canvas-backend-wd2v.onrender.com/api'}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(rooms.filter(r => r._id !== roomId));
      setSuccessMessage(`Room "${room.name}" has been deleted successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (!err.response) setError('Cannot connect to server. Please ensure the backend is running.');
      else setError('Failed to delete room.');
    }
  };

  const sortedRooms = React.useMemo(() => {
    let sortableRooms = [...rooms];
    if (sortConfig.key) {
      sortableRooms.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableRooms;
  }, [rooms, sortConfig]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Canvas Rooms</h1>
              <p className="text-sm text-gray-600">Real-time collaborative drawing</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.name}</span>
            <button 
              onClick={logout} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Features Showcase Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-100 to-green-100 rounded-full -ml-12 -mb-12 opacity-50"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">🎨 Realtime Collaborative Canvas</h2>
              <p className="text-lg text-gray-600">Create, collaborate, and bring your ideas to life together</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Drawing Tools Feature */}
              <div className="group bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FiEdit3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Drawing Suite</h3>
                <p className="text-sm text-gray-600 mb-3">Pencil, eraser, shapes, text, and more professional drawing tools</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">✏️ Pencil</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">🧹 Eraser</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">⬜ Shapes</span>
                </div>
              </div>

              {/* Real-time Collaboration */}
              <div className="group bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FiUsers className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Collaboration</h3>
                <p className="text-sm text-gray-600 mb-3">Work together with live cursors, instant sync, and user presence</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">👥 Live Users</span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">⚡ Instant Sync</span>
                </div>
              </div>

              {/* Advanced Features */}
              <div className="group bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FiZap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Features</h3>
                <p className="text-sm text-gray-600 mb-3">Undo/redo, zoom, export, and keyboard shortcuts</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">↩️ Undo/Redo</span>
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">🔍 Zoom</span>
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">💾 Export</span>
                </div>
              </div>

              {/* Color & Customization */}
              <div className="group bg-gradient-to-br from-green-50 to-lime-50 p-6 rounded-xl border border-green-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-lime-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FiDroplet className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rich Customization</h3>
                <p className="text-sm text-gray-600 mb-3">16 preset colors, custom picker, and variable brush sizes</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">🎨 Colors</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">📏 Sizes</span>
                </div>
              </div>

              {/* Room Management */}
              <div className="group bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FiLayers className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Room Management</h3>
                <p className="text-sm text-gray-600 mb-3">Create rooms, join by ID, share with team members</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">🏠 Create</span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">🔗 Share</span>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="group bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-xl border border-teal-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FiMousePointer className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Keyboard Shortcuts</h3>
                <p className="text-sm text-gray-600 mb-3">Quick access with P, E, L, R, C, T keys and Ctrl+Z/Y</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">⌨️ Shortcuts</span>
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">⚡ Fast</span>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center mt-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <FiZap className="w-5 h-5" />
                <span>Start Creating Below!</span>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md shadow-sm">
            {successMessage}
          </div>
        )}

        {/* Create Room Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Room</h2>
          <form onSubmit={handleCreateRoom} className="flex gap-2">
            <div className={INPUT_WRAPPER}>
              <input
                type="text"
                value={newRoomName || ''}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name (e.g., 'Design Team Canvas')"
                className={INPUT_FIELD}
                disabled={!user}
                required
              />
            </div>
            <button 
              type="submit" 
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating || !user || !newRoomName?.trim()}
            >
              <FiPlus className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>

        {/* Join Room Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Join Existing Room</h2>
          <form onSubmit={handleJoinRoomById} className="flex gap-2">
            <div className={INPUT_WRAPPER}>
              <input
                type="text"
                value={joinRoomId || ''}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID (24 characters, e.g., '507f1f77bcf86cd799439011')"
                className={INPUT_FIELD}
                disabled={!user}
                required
              />
            </div>
            <button 
              type="submit" 
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isJoining || !user || !joinRoomId?.trim()}
            >
              <FiPlus className="w-4 h-4" />
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Ask the room owner for the room ID to join their collaborative canvas. Room ID must be exactly 24 characters.
          </p>
        </div>

        {/* Rooms List Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Rooms</h2>
            <p className="text-sm text-gray-600">Join existing rooms or create your own collaborative canvas</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-green-50 transition-colors" onClick={() => requestSort('name')}>
                    <div className="flex items-center gap-2">
                      Room Name
                      <FiArrowUp className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array(3).fill(0).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan="5" className="px-6 py-4">
                        <div className="animate-pulse flex space-x-4">
                          <div className="rounded-full bg-gray-300 h-10 w-10"></div>
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : sortedRooms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <FiPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No rooms available</p>
                        <p className="text-sm">Create your first collaborative canvas room above</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedRooms.map((room) => (
                    <tr key={room._id} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {room.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{room.name}</div>
                            <div className="text-sm text-gray-500">Collaborative Canvas</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{room?.owner?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{room?.owner?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {room._id.substring(0, 8)}...
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(room._id);
                              setSuccessMessage('Room ID copied to clipboard!');
                              setTimeout(() => setSuccessMessage(''), 2000);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copy full room ID"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(room.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleJoinRoom(room._id)} 
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2"
                          >
                            Join Room
                          </button>
                          <button 
                            onClick={() => handleShareRoom(room)} 
                            className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="Share Room"
                          >
                            <FiShare2 className="w-4 h-4" />
                          </button>
                          {isRoomOwner(room, user) && (
                            <button 
                              onClick={() => handleDeleteRoom(room._id)} 
                              className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete Room"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;