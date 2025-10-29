import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Chat = ({ socket, roomId, isOpen, onToggle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Helpers to dedupe and reconcile optimistic messages
  const upsertMessage = useCallback((incoming) => {
    if (!incoming) return;
    const incomingId = incoming._id || incoming.id;

    // If we've seen this exact ID, ignore
    if (incomingId && seenMessageIdsRef.current.has(incomingId)) return;

    setMessages((prev) => {
      // Try to find a matching optimistic message (by content and author) to replace
      const currentUserId = user._id || user.id;
      const incomingUserId = incoming.user?._id || incoming.user?.id;

      let replaced = false;
      const next = prev.map((m) => {
        const isOptimistic = String(m._id || '').startsWith('temp-');
        const sameAuthor = (m.user?._id || m.user?.id) === incomingUserId && incomingUserId === currentUserId;
        const sameContent = m.content === incoming.content;
        if (!replaced && isOptimistic && sameAuthor && sameContent) {
          replaced = true;
          if (incomingId) {
            seenMessageIdsRef.current.add(incomingId);
          }
          return { ...incoming };
        }
        return m;
      });

      if (!replaced) {
        if (incomingId) {
          seenMessageIdsRef.current.add(incomingId);
        }
        return [...next, incoming];
      }
      return next;
    });
  }, [user]);

  const handleNewMessage = useCallback((message) => {
    // Always upsert; this handles both self and others
    upsertMessage(message);
  }, [upsertMessage]);

  const handleMessageHistory = useCallback((messageList) => {
    // Reset seen IDs and load history uniquely
    const idSet = new Set();
    const unique = [];
    for (const msg of messageList || []) {
      const mid = msg._id || msg.id;
      if (mid && !idSet.has(mid)) {
        idSet.add(mid);
        unique.push(msg);
        seenMessageIdsRef.current.add(mid);
      }
    }
    setMessages(unique);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:history', handleMessageHistory);

    // Request message history when component mounts or room changes
    socket.emit('chat:getHistory', { roomId });

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:history', handleMessageHistory);
    };
  }, [socket, roomId, handleNewMessage, handleMessageHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const optimistic = {
      _id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      user: {
        _id: user._id || user.id,
        name: user.name,
        email: user.email
      },
      timestamp: new Date()
    };

    // Add message optimistically to UI (tracked as temp id)
    setMessages(prev => [...prev, optimistic]);

    // Send to server
    socket.emit('chat:message', {
      roomId,
      content: newMessage.trim()
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
          messages.map((msg, index) => {
            const isOwnMessage = (msg.user._id || msg.user.id) === (user._id || user.id);
            return (
              <div 
                key={msg._id || index} 
                className={`mb-4 ${isOwnMessage ? 'text-right' : ''}`}
              >
                <div className={`inline-block rounded-lg px-3 py-2 max-w-xs break-words ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
                  {!isOwnMessage && (
                    <div className="font-semibold text-xs mb-1">
                      {msg.user.name}
                    </div>
                  )}
                  <div className="text-sm">{msg.content}</div>
                  <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
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
