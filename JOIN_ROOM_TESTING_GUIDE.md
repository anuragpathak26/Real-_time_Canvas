# Join Room Feature - Testing Guide

## Overview
The join room feature allows users to join collaborative canvas rooms by entering a room ID. This enables seamless collaboration between multiple users.

## How to Test

### Prerequisites
1. Start the backend server: `npm start` (in backend directory)
2. Start the frontend server: `npm start` (in frontend directory)
3. Open multiple browser tabs/windows to simulate different users

### Testing Steps

#### 1. Create a Room (User A)
1. Register/Login as User A
2. Go to Dashboard
3. In "Create New Room" section, enter a room name
4. Click "Create Room"
5. Note the Room ID displayed in the table (copy it using the 📋 button)

#### 2. Join the Room (User B)
1. Open a new browser tab/incognito window
2. Register/Login as User B (different user)
3. Go to Dashboard
4. In "Join Existing Room" section, paste the Room ID from step 1
5. Click "Join Room"
6. Verify success message appears
7. Check that the room now appears in User B's room list

#### 3. Test Collaboration
1. User A: Click "Join Room" on their created room
2. User B: Click "Join Room" on the same room
3. Both users should be in the same canvas
4. Test drawing - changes should appear in real-time for both users

### Expected Behaviors

#### Success Cases
- ✅ Valid room ID joins successfully
- ✅ Success message displays: "Successfully joined room: [Room Name]"
- ✅ Room appears in user's room list
- ✅ User can access the collaborative canvas
- ✅ Real-time collaboration works

#### Error Cases
- ❌ Invalid room ID shows error: "Room not found"
- ❌ Empty room ID prevents submission
- ❌ Already joined room shows: "You are already a member of this room"

#### UI Features
- 📋 Copy room ID button works
- 🟢 Green "Join Room" button for joining
- 🔵 Blue "Join Room" button for entering rooms
- ✅ Success messages appear and auto-dismiss
- ❌ Error messages appear for invalid actions

## Room ID Format
- Room IDs are MongoDB ObjectIds (24 character hex strings)
- Example: `507f1f77bcf86cd799439011`
- Displayed as truncated in UI: `507f1f77...`

## API Endpoints Used
- `POST /api/rooms/join` - Join room by ID
- `GET /api/rooms` - Get user's rooms
- WebSocket events for real-time collaboration

## Troubleshooting

### Common Issues
1. **"Cannot connect to server"** - Ensure backend is running on port 5000
2. **"Room not found"** - Check room ID is correct and complete
3. **Authentication errors** - Ensure user is logged in
4. **Real-time not working** - Check WebSocket connection

### Demo Mode
If MongoDB is not connected, the app runs in demo mode:
- Fake room data is used
- Join functionality still works for testing
- Real persistence requires database connection

## Files Modified
- `backend/src/controllers/room.controller.js` - Added joinRoom method
- `backend/src/routes/room.routes.js` - Added /join route
- `frontend/src/pages/Dashboard.jsx` - Added join room UI and functionality
