import React from 'react';
import { FiUsers } from 'react-icons/fi';

const UserPresence = ({ users, currentUser }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (userId) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-64">
      <div className="flex items-center gap-2 mb-4">
        <FiUsers className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">
          Active Users ({users.length})
        </h3>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user._id || user.id}
            className={`
              flex items-center gap-3 p-2 rounded-lg transition-colors
              ${(user._id || user.id) === (currentUser._id || currentUser.id) 
                ? 'bg-purple-50 border border-purple-200' 
                : 'hover:bg-gray-50'
              }
            `}
          >
            {/* Avatar */}
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
                  ${getAvatarColor(user._id || user.id)}
                `}>
                  {getInitials(user.name)}
                </div>
              )}
              
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
                {(user._id || user.id) === (currentUser._id || currentUser.id) && (
                  <span className="text-purple-600 ml-1">(You)</span>
                )}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>

            {/* User cursor color indicator */}
            <div 
              className="w-3 h-3 rounded-full border border-gray-300"
              style={{ backgroundColor: getAvatarColor(user._id || user.id).replace('bg-', '#') }}
              title="Cursor color"
            />
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FiUsers className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No other users online</p>
        </div>
      )}
    </div>
  );
};

export default UserPresence;
