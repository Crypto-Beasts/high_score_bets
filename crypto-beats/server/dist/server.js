"use strict";
/**
 * Crypto Beats Multiplayer Server
 * Phase 1: Basic 2-player real-time versus mode
 *
 * Run with: npm run server
 * Or: npx ts-node server/server.ts (if ts-node is installed)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // In production, specify your frontend URL
        methods: ["GET", "POST"]
    }
});
// Room management
const rooms = new Map();
// Helper function to get room by socket
function getRoomBySocket(socket) {
    // First check if socket is in any socket.io room
    const socketRooms = Array.from(socket.rooms);
    for (const roomId of socketRooms) {
        // Skip the socket's own room (socket.id is always in its own room)
        if (roomId === socket.id)
            continue;
        // Check if this is one of our game rooms
        if (roomId.startsWith('room_') && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            if (room) {
                return { id: roomId, ...room };
            }
        }
    }
    // Fallback: check by player ID (for backwards compatibility)
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
            }
            else {
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
        }
        catch (error) {
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
            // Check if room is full
            if (room.players.length >= 2) {
                // Room is full, but if it's in 'starting' status, allow this socket to join
                // (This handles the case where a player creates a new socket after joining)
                if (room.status === 'starting') {
                    socket.join(roomId);
                    // Resend gameStarting event to this new socket
                    const startTime = Date.now() + 1000; // Give them 1 second to sync
                    socket.emit('gameStarting', {
                        song: room.song,
                        difficulty: room.difficulty,
                        startTime: startTime,
                        players: room.players.map(p => p.id)
                    });
                    console.log(`[Server] Resent gameStarting to new socket ${socket.id} in room ${roomId}`);
                    return;
                }
                else {
                    socket.emit('error', { message: 'Room is full' });
                    return;
                }
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
                totalPlayers: 2,
                song: room.song,
                difficulty: room.difficulty
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
                        const currentRoom = rooms.get(roomId);
                        if (currentRoom) {
                            currentRoom.status = 'playing';
                        }
                    }
                }, 3000);
            }
        }
        catch (error) {
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
        console.log(`[Server] Received scoreUpdate from ${socket.id}:`, data);
        const room = getRoomBySocket(socket);
        if (!room) {
            console.log(`[Server] WARNING: Socket ${socket.id} not in any room`);
            return;
        }
        // Allow score updates when room is 'starting' or 'playing' (to handle timing edge cases)
        if (room.status !== 'playing' && room.status !== 'starting') {
            console.log(`[Server] WARNING: Room ${room.id} status is '${room.status}', not 'playing' or 'starting'`);
            return;
        }
        console.log(`[Server] Broadcasting scoreUpdate from ${socket.id} to room ${room.id} (status: ${room.status})`);
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
        if (!room || room.status !== 'playing')
            return;
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
        console.log(`[Server] Received gameEnd from ${socket.id}:`, data);
        const room = getRoomBySocket(socket);
        if (!room) {
            console.log(`[Server] WARNING: Socket ${socket.id} not in any room for gameEnd`);
            return;
        }
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
        // Mark player as finished (try to find in players array, or add if reconnected)
        let player = room.players.find(p => p.id === socket.id);
        if (!player) {
            // Socket reconnected - add to players array for tracking (but limit to 2 players max)
            if (room.players.length < 2) {
                player = { id: socket.id, ready: true, finished: false };
                room.players.push(player);
                console.log(`[Server] Added reconnected socket ${socket.id} to room ${room.id} players`);
            }
            else {
                // Room already has 2 players, just track this socket finished status separately
                console.log(`[Server] Socket ${socket.id} finished but not in players array (reconnected socket)`);
            }
        }
        if (player) {
            player.finished = true;
            player.finalScore = data.score || 0;
        }
        // Check if all players finished
        const allFinished = room.players.every(p => p.finished);
        if (allFinished) {
            // Determine winner
            const winner = room.players.reduce((prev, curr) => (curr.finalScore || 0) > (prev.finalScore || 0) ? curr : prev);
            console.log(`[Server] Room ${room.id} - Winner: ${winner.id} with score ${winner.finalScore}`);
            // Could emit winner announcement here
            io.to(room.id).emit('matchComplete', {
                winner: winner.id,
                scores: room.players.map(p => ({
                    playerId: p.id,
                    score: p.finalScore || 0
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
//# sourceMappingURL=server.js.map