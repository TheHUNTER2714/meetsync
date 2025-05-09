// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory storage for room passwords (note: not persistent, for demo only)
const roomPasswords = {};

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Socket.IO signaling
io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, userId, password }) => {
    // If password provided, it's a room creator
    if (password) {
      roomPasswords[roomId] = password;
      socket.join(roomId);
      console.log(`Room created: ${roomId} with password.`);
    } else {
      // Joining user must provide the correct password
      const storedPassword = roomPasswords[roomId];
      if (!storedPassword) {
        socket.emit('error-message', 'Room does not exist or has expired.');
        return;
      }
      // You may optionally ask clients to send password for validation
      // If you want frontend to verify password later, just emit success/failure
      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);
    }

    socket.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
      console.log(`User disconnected: ${userId}`);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`MeetSync server running on http://localhost:${PORT}`)
);
