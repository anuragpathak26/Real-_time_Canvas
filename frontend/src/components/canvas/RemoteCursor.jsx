import React from 'react';

const RemoteCursor = ({ userId, userName, position, color }) => {
  if (!position) return null;

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-200"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-lg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>

      {/* User label */}
      <div className="absolute top-6 left-2 bg-gray-900 text-white px-2 py-1 rounded-md text-xs whitespace-nowrap shadow-lg">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: color }}
          >
            {getInitials(userName)}
          </div>
          <span>{userName}</span>
        </div>
        
        {/* Arrow pointing to cursor */}
        <div 
          className="absolute -top-1 left-2 w-2 h-2 rotate-45"
          style={{ backgroundColor: '#1f2937' }}
        />
      </div>
    </div>
  );
};

export default RemoteCursor;
