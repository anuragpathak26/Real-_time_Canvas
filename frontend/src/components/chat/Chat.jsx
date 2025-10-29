import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Chat = ({ socket, roomId, isOpen, onToggle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    // Listen for message history
    const handleMessageHistory = (messageList) => {
      setMessages(messageList);
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:history', handleMessageHistory);

    // Request message history when component mounts
    socket.emit('chat:getHistory', { roomId });

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:history', handleMessageHistory);
    };
  }, [socket, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      content: newMessage,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      timestamp: new Date()
    };

    socket.emit('chat:message', {
      roomId,
      content: newMessage
    });

    setNewMessage('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Open chat"
      >
        <FiMessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl flex flex-col" style={{ height: '500px' }}>
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <h3 className="font-semibold">Chat Room</h3>
        <button 
          onClick={onToggle}
          className="text-white hover:text-gray-200"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">No messages yet. Say hello! 👋</div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 ${msg.user._id === user._id ? 'text-right' : ''}`}
            >
              <div className={`inline-block rounded-lg px-3 py-2 max-w-xs ${msg.user._id === user._id ? 'bg-blue-100 text-blue-900' : 'bg-gray-100'}`}>
                <div className="font-semibold text-sm">
                  {msg.user._id === user._id ? 'You' : msg.user.name}
                </div>
                <div className="text-sm">{msg.content}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiSend />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
