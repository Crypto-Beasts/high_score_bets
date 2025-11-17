/**
 * Crypto Beats Multiplayer Server
 * Phase 1: Basic 2-player real-time versus mode
 * 
 * Run with: node server/server.js
 * Or: npm run server (if script is added to package.json)
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, specify your frontend URL
    methods: ["GET", "POST"]
  }
});

// Room management
const rooms = new Map();

// Helper function to get room by socket
function getRoomBySocket(socket) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.some(p => p.id === socket.id)) {
      return { id: roomId, ...room };
    }
  }
  return null;
}

// Helper function to remove player from room
function removePlayerFromRoom(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex(p => p.id === socketId);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      
      // If room is empty, delete it
      if (room.players.length === 0) {
        rooms.delete(roomId);
        console.log(`[Server] Room ${roomId} deleted (empty)`);
      } else {
        // Notify remaining players
        io.to(roomId).emit('playerLeft', { playerId: socketId });
      }
      return roomId;
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log(`[Server] Player connected: ${socket.id}`);

  // Create room
  socket.on('createRoom', (data) => {
    try {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const room = {
        players: [{ id: socket.id, ready: false }],
        song: data.song || "Aguado_Menuet_Aminor",
        difficulty: data.difficulty || "normal",
        status: 'waiting',
        createdAt: Date.now()
      };
      
      rooms.set(roomId, room);
      socket.join(roomId);
      
      console.log(`[Server] Room created: ${roomId} by ${socket.id}`);
      socket.emit('roomCreated', { roomId });
    } catch (error) {
      console.error(`[Server] Error creating room:`, error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // Join room
  socket.on('joinRoom', (roomId) => {
    try {
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      if (room.players.length >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      
      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Room is not accepting players' });
        return;
      }
      
      // Add player to room
      room.players.push({ id: socket.id, ready: false });
      socket.join(roomId);
      
      console.log(`[Server] Player ${socket.id} joined room ${roomId}`);
      
      // Notify all players in room
      io.to(roomId).emit('playerJoined', {
        playerId: socket.id,
        playerCount: room.players.length,
        totalPlayers: 2
      });
      
      // If room is full, start game countdown
      if (room.players.length === 2) {
        room.status = 'starting';
        const startTime = Date.now() + 3000; // Start in 3 seconds
        
        console.log(`[Server] Room ${roomId} full, starting game in 3 seconds`);
        
        io.to(roomId).emit('gameStarting', {
          song: room.song,
          difficulty: room.difficulty,
          startTime: startTime,
          players: room.players.map(p => p.id)
        });
        
        // Set room status to playing after countdown
        setTimeout(() => {
          if (rooms.has(roomId)) {
            rooms.get(roomId).status = 'playing';
          }
        }, 3000);
      }
    } catch (error) {
      console.error(`[Server] Error joining room:`, error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Player ready (optional - for future use)
  socket.on('playerReady', (data) => {
    const room = getRoomBySocket(socket);
    if (!room) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.ready = true;
      socket.emit('readyConfirmed');
      
      // Check if all players ready (for future use)
      const allReady = room.players.every(p => p.ready);
      if (allReady && room.players.length === 2) {
        // Could trigger game start here
      }
    }
  });

  // Score update
  socket.on('scoreUpdate', (data) => {
    const room = getRoomBySocket(socket);
    if (!room || room.status !== 'playing') return;
    
    // Broadcast to other players in room
    socket.to(room.id).emit('opponentScore', {
      playerId: socket.id,
      score: data.score || 0,
      combo: data.combo || 0
    });
  });

  // Player input (for spectator view)
  socket.on('playerInput', (data) => {
    const room = getRoomBySocket(socket);
    if (!room || room.status !== 'playing') return;
    
    // Broadcast to opponent for spectator view
    socket.to(room.id).emit('opponentInput', {
      playerId: socket.id,
      key: data.key,
      timestamp: data.timestamp,
      gameTime: data.gameTime,
      quality: data.quality || 'good' // Will be determined client-side
    });
  });

  // Game end
  socket.on('gameEnd', (data) => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    
    console.log(`[Server] Player ${socket.id} finished game in room ${room.id}`);
    
    // Broadcast to other players
    socket.to(room.id).emit('opponentFinished', {
      playerId: socket.id,
      finalScore: data.score || 0,
      accuracy: data.accuracy || 0,
      totalNotes: data.totalNotes || 0,
      notesHit: data.notesHit || 0,
      longestStreak: data.longestStreak || 0
    });
    
    // Mark player as finished
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.finished = true;
      player.finalScore = data.score || 0;
    }
    
    // Check if all players finished
    const allFinished = room.players.every(p => p.finished);
    if (allFinished) {
      // Determine winner
      const winner = room.players.reduce((prev, curr) => 
        (curr.finalScore > prev.finalScore) ? curr : prev
      );
      
      console.log(`[Server] Room ${room.id} - Winner: ${winner.id} with score ${winner.finalScore}`);
      
      // Could emit winner announcement here
      io.to(room.id).emit('matchComplete', {
        winner: winner.id,
        scores: room.players.map(p => ({
          playerId: p.id,
          score: p.finalScore
        }))
      });
      
      // Clean up room after a delay
      setTimeout(() => {
        rooms.delete(room.id);
        console.log(`[Server] Room ${room.id} cleaned up`);
      }, 30000); // 30 seconds
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Server] Player disconnected: ${socket.id}`);
    const roomId = removePlayerFromRoom(socket.id);
    if (roomId) {
      console.log(`[Server] Player ${socket.id} removed from room ${roomId}`);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    timestamp: Date.now()
  });
});

// Get server info
app.get('/info', (req, res) => {
  res.json({
    version: '1.0.0',
    phase: 'Phase 1 - Basic Multiplayer',
    rooms: rooms.size,
    activeRooms: Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      players: room.players.length,
      status: room.status
    }))
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Crypto Beats Multiplayer Server`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`\n💡 Connect clients to: http://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

