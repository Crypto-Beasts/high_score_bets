# Phase 1: Multiplayer Setup Guide

## ✅ What's Been Implemented

1. **Multiplayer Menu Option** - Added "Multiplayer" button to main menu
2. **Multiplayer Lobby** - Create/join rooms
3. **Multiplayer Game Scene** - Extends single-player with multiplayer features
4. **WebSocket Server** - Basic 2-player matchmaking and synchronization
5. **Real-time Score Updates** - See opponent's score and combo
6. **Synchronized Game Start** - Both players start at the same time

## 🚀 Quick Start

### 1. Install Client Dependencies

```bash
cd crypto-beats
npm install
```

This will install `socket.io-client` which is needed for multiplayer.

### 2. Set Up Server

```bash
cd server
npm install
```

### 3. Start the Server

```bash
cd server
npm start
```

You should see:
```
🚀 Crypto Beats Multiplayer Server
📡 Server running on port 3000
🌐 WebSocket endpoint: ws://localhost:3000
```

### 4. Configure Client (Optional)

If your server is not on `localhost:3000`, create a `.env` file in `crypto-beats/`:

```
VITE_SERVER_URL=http://your-server-url:3000
```

### 5. Start the Game

```bash
cd crypto-beats
npm run dev
```

### 6. Test Multiplayer

1. Open two browser windows
2. In window 1: Click "Multiplayer" → "Create Room"
3. Copy the Room ID
4. In window 2: Click "Multiplayer" → "Join Room" → Paste Room ID
5. Both players will see a 3-second countdown
6. Game starts simultaneously for both players
7. See opponent's score in real-time (top right)

## 🎮 How It Works

### Single-Player vs Multiplayer

- **Single-Player**: Click "Start Game" → Works exactly as before
- **Multiplayer**: Click "Multiplayer" → Create/Join room → Play together

The single-player game is **completely unchanged** and works independently.

### Multiplayer Features

- **Real-time Score Display**: See your opponent's score and combo
- **Synchronized Start**: Both players start at exactly the same time
- **Connection Status**: Green/yellow/red indicator shows connection quality
- **Room Management**: Create private rooms with unique IDs

## 🔧 Troubleshooting

### "Connection failed" Error

- Make sure the server is running (`npm start` in `server/` folder)
- Check that port 3000 is not blocked by firewall
- Verify server URL in client (defaults to `http://localhost:3000`)

### "Room not found" Error

- Room IDs are case-sensitive
- Rooms expire after 30 seconds of inactivity
- Make sure you're copying the full Room ID

### Game Not Starting

- Both players must be in the room
- Wait for the 3-second countdown
- Check browser console for errors

### Score Not Updating

- Scores update every 100ms to reduce network traffic
- Check connection status indicator (should be green)
- Verify server is receiving updates (check server console)

## 📝 Next Steps (Phase 2)

After Phase 1 is working:

- [ ] 4-player support
- [ ] Better lobby UI (song selection, difficulty)
- [ ] Friend invites
- [ ] Connection quality indicators
- [ ] Pause/resume synchronization
- [ ] Reconnection handling

## 🐛 Known Issues

- Room IDs use simple prompts (will be improved in Phase 2)
- No song/difficulty selection in lobby (uses defaults)
- Server runs on localhost only (needs deployment for online play)

## 📚 Documentation

- See `docs/ROADMAP.md` for full development plan
- See `docs/PHASE1_QUICKSTART.md` for detailed implementation guide
- See `server/README.md` for server API documentation

