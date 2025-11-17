# Phase 1: Basic Multiplayer - Quick Start Guide

## Overview

Get 2 players playing the same song simultaneously with real-time score comparison.

## Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │ <────────────────────────> │   Server    │
│  (Phaser)   │                            │ (Node.js)   │
└─────────────┘                            └─────────────┘
                                                   ▲
┌─────────────┐         WebSocket                  │
│   Client 2  │ <─────────────────────────────────┘
│  (Phaser)   │
└─────────────┘
```

## Server Setup (Node.js + Socket.io)

### 1. Install Dependencies
```bash
npm init -y
npm install socket.io express cors
```

### 2. Basic Server (`server.js`)
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Room management
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create room
  socket.on('createRoom', (data) => {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    rooms.set(roomId, {
      players: [socket.id],
      song: data.song,
      difficulty: data.difficulty,
      status: 'waiting'
    });
    
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
  });

  // Join room
  socket.on('joinRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    room.players.push(socket.id);
    socket.join(roomId);
    
    // Notify all players
    io.to(roomId).emit('playerJoined', {
      playerId: socket.id,
      playerCount: room.players.length
    });
    
    // If room is full, start game
    if (room.players.length === 2) {
      room.status = 'starting';
      io.to(roomId).emit('gameStarting', {
        song: room.song,
        difficulty: room.difficulty,
        startTime: Date.now() + 3000 // Start in 3 seconds
      });
    }
  });

  // Player ready
  socket.on('playerReady', (data) => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    
    socket.emit('readyConfirmed');
    // Check if all players ready, then start
  });

  // Score update
  socket.on('scoreUpdate', (data) => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    
    // Broadcast to other players in room
    socket.to(room.id).emit('opponentScore', {
      playerId: socket.id,
      score: data.score,
      combo: data.combo
    });
  });

  // Game end
  socket.on('gameEnd', (data) => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    
    socket.to(room.id).emit('opponentFinished', {
      playerId: socket.id,
      finalScore: data.score,
      accuracy: data.accuracy
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    // Handle cleanup
  });
});

function getRoomBySocket(socket) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.includes(socket.id)) {
      return { id: roomId, ...room };
    }
  }
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Client Setup (Phaser)

### 1. Install Socket.io Client
```bash
npm install socket.io-client
```

### 2. Create Multiplayer Scene (`MultiplayerGameScene.js`)
```javascript
import Phaser from "phaser";
import io from "socket.io-client";
import GameScene from "./GameScene.js";

export default class MultiplayerGameScene extends GameScene {
  constructor() {
    super({ key: "MultiplayerGameScene" });
    this.socket = null;
    this.roomId = null;
    this.opponentScore = 0;
    this.opponentCombo = 0;
  }

  init(data) {
    super.init(data);
    this.roomId = data.roomId;
    this.isHost = data.isHost;
  }

  create(data) {
    // Connect to server
    this.socket = io('http://localhost:3000');
    
    this.setupSocketListeners();
    
    if (this.isHost) {
      // Host creates room
      this.socket.emit('createRoom', {
        song: data.song,
        difficulty: data.difficulty
      });
    } else {
      // Client joins room
      this.socket.emit('joinRoom', this.roomId);
    }
    
    // Call parent create after socket setup
    super.create(data);
  }

  setupSocketListeners() {
    // Room created
    this.socket.on('roomCreated', (data) => {
      this.roomId = data.roomId;
      console.log('Room created:', this.roomId);
    });

    // Player joined
    this.socket.on('playerJoined', (data) => {
      console.log('Player joined:', data);
    });

    // Game starting
    this.socket.on('gameStarting', (data) => {
      console.log('Game starting in 3 seconds');
      // Wait for countdown, then start game
      this.time.delayedCall(3000, () => {
        this.startGame(data);
      });
    });

    // Opponent score update
    this.socket.on('opponentScore', (data) => {
      this.opponentScore = data.score;
      this.opponentCombo = data.combo;
      this.updateOpponentDisplay();
    });

    // Opponent finished
    this.socket.on('opponentFinished', (data) => {
      console.log('Opponent finished:', data);
      this.showOpponentResults(data);
    });
  }

  startGame(data) {
    // Start the actual game
    // This will call parent's game logic
  }

  updateScore(newScore) {
    super.updateScore(newScore);
    
    // Send score update to server
    if (this.socket) {
      this.socket.emit('scoreUpdate', {
        score: newScore,
        combo: this.currentStreak
      });
    }
  }

  updateOpponentDisplay() {
    // Update UI to show opponent's score
    if (!this.opponentScoreText) {
      const { width, height } = this.scale;
      this.opponentScoreText = this.add.text(
        width - 200, 20,
        `Opponent: ${this.opponentScore}`,
        { fontSize: 24, fill: "#ff0000" }
      );
    } else {
      this.opponentScoreText.setText(`Opponent: ${this.opponentScore}`);
    }
  }

  shutdown() {
    if (this.socket) {
      this.socket.disconnect();
    }
    super.shutdown();
  }
}
```

### 3. Create Lobby Scene (`MultiplayerLobbyScene.js`)
```javascript
import Phaser from "phaser";
import io from "socket.io-client";

export default class MultiplayerLobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: "MultiplayerLobbyScene" });
  }

  create() {
    const { width, height } = this.scale;
    
    // Create Room Button
    const createButton = this.add.text(
      width / 2, height / 2 - 50,
      "Create Room",
      { fontSize: 32, fill: "#ffffff", backgroundColor: "#00aa00", padding: 10 }
    ).setOrigin(0.5).setInteractive();
    
    createButton.on('pointerdown', () => {
      this.scene.start("MultiplayerGameScene", {
        isHost: true,
        song: "Aguado_Menuet_Aminor",
        difficulty: "normal"
      });
    });
    
    // Join Room Button
    const joinButton = this.add.text(
      width / 2, height / 2 + 50,
      "Join Room",
      { fontSize: 32, fill: "#ffffff", backgroundColor: "#0088cc", padding: 10 }
    ).setOrigin(0.5).setInteractive();
    
    joinButton.on('pointerdown', () => {
      // Show input for room ID
      this.showRoomIdInput();
    });
  }

  showRoomIdInput() {
    // Simple prompt for room ID
    const roomId = prompt("Enter Room ID:");
    if (roomId) {
      this.scene.start("MultiplayerGameScene", {
        isHost: false,
        roomId: roomId,
        song: "Aguado_Menuet_Aminor",
        difficulty: "normal"
      });
    }
  }
}
```

## Testing

### 1. Start Server
```bash
node server.js
```

### 2. Open Two Browser Windows
- Window 1: Create room
- Window 2: Join with room ID

### 3. Test Flow
1. Player 1 creates room
2. Player 2 joins room
3. Both players see "Game starting..."
4. Game starts simultaneously
5. Scores update in real-time
6. Winner announced at end

## Next Steps

After Phase 1 works:
- Add better UI for lobby
- Add connection status indicators
- Handle disconnections
- Add pause/resume synchronization
- Move to Phase 2 (4 players, enhanced features)

## Common Issues

### Connection Failed
- Check server is running
- Verify CORS settings
- Check firewall/port settings

### Synchronization Issues
- Use server timestamp for game start
- Add latency compensation
- Use interpolation for smooth updates

### Performance
- Limit update frequency (don't send every frame)
- Batch updates
- Use delta compression

