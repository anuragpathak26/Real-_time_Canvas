# Debug Room Access Issue

## Problem
Users are getting "Access to room denied" error when trying to join rooms via WebSocket, even after successfully joining via the API.

## Debugging Steps

### 1. Check Backend Logs
When you start the backend server (`npm start`), you should see detailed logs in the console:

```
Join room request: roomId=..., socketId=...
Token decoded: userId=...
User found: ... (...)
Checking access for user ... to room ...
Access granted/denied: ...
```

### 2. Test Room Creation and Joining

#### Step A: Create a Room
1. Login to the dashboard
2. Create a new room
3. Check backend logs for room creation
4. Note the room ID

#### Step B: Join via API (Dashboard)
1. Use the "Join Existing Room" form with the room ID
2. Check backend logs for join operation
3. Verify success message appears

#### Step C: Access Canvas (WebSocket)
1. Click "Join Room" to enter the canvas
2. Check backend logs for WebSocket join attempt
3. Look for access check results

### 3. Common Issues and Solutions

#### Issue 1: User ID Format Mismatch
**Symptoms:** Room exists, user is member, but access denied
**Solution:** Check if user IDs are being compared as strings vs ObjectIds

#### Issue 2: Room Not Found
**Symptoms:** "Room does not exist" in logs
**Solution:** Verify room ID is correct and room was created successfully

#### Issue 3: User Not in Members Array
**Symptoms:** "Room exists but user is not a member"
**Solution:** Check if the join API actually added the user to the room

#### Issue 4: Database Connection Issues
**Symptoms:** Demo mode messages in logs
**Solution:** Check MongoDB connection string in .env file

### 4. Manual Database Check

If you have MongoDB access, you can manually check:

```javascript
// Find the room
db.rooms.findOne({_id: ObjectId("YOUR_ROOM_ID")})

// Check if user is in members array
db.rooms.findOne({
  _id: ObjectId("YOUR_ROOM_ID"),
  $or: [
    {owner: ObjectId("YOUR_USER_ID")},
    {"members.user": ObjectId("YOUR_USER_ID")}
  ]
})
```

### 5. Quick Fix Attempts

#### Fix 1: Restart Backend
Sometimes the issue resolves after restarting the backend server.

#### Fix 2: Clear Browser Storage
Clear localStorage and login again to get fresh tokens.

#### Fix 3: Use Demo Mode
If MongoDB is having issues, the app should fall back to demo mode automatically.

### 6. Expected Log Flow

**Successful Flow:**
```
Join room request: roomId=507f1f77bcf86cd799439011, socketId=abc123
Token decoded: userId=507f1f77bcf86cd799439012
User found: John Doe (507f1f77bcf86cd799439012)
Checking access for user 507f1f77bcf86cd799439012 to room 507f1f77bcf86cd799439011
Access granted: User 507f1f77bcf86cd799439012 found in room 507f1f77bcf86cd799439011
Room owner: 507f1f77bcf86cd799439013
Room members: [507f1f77bcf86cd799439012, 507f1f77bcf86cd799439013]
Socket abc123 joined room 507f1f77bcf86cd799439011
User John Doe (507f1f77bcf86cd799439012) successfully joined room 507f1f77bcf86cd799439011
```

**Failed Flow:**
```
Join room request: roomId=507f1f77bcf86cd799439011, socketId=abc123
Token decoded: userId=507f1f77bcf86cd799439012
User found: John Doe (507f1f77bcf86cd799439012)
Checking access for user 507f1f77bcf86cd799439012 to room 507f1f77bcf86cd799439011
Access denied: User 507f1f77bcf86cd799439012 not found in room 507f1f77bcf86cd799439011
Room 507f1f77bcf86cd799439011 exists but user 507f1f77bcf86cd799439012 is not a member
Room owner: 507f1f77bcf86cd799439013
Room members: [507f1f77bcf86cd799439013]
Join room error: Access to room denied
```

## Next Steps

1. Start the backend and check the console logs
2. Follow the test steps above
3. Share the log output to identify the specific issue
4. Apply the appropriate fix based on the logs
