# Crypto Beats Multiplayer Server

Phase 1: Basic 2-player real-time versus mode

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3001 npm start
```

## Client Configuration

Update the client to connect to your server by setting the environment variable:

```bash
VITE_SERVER_URL=http://localhost:3000
```

Or in your `.env` file:
```
VITE_SERVER_URL=http://localhost:3000
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and room count.

### Server Info
```
GET /info
```
Returns server version, phase, and active rooms.

## WebSocket Events

### Client → Server

- `createRoom` - Create a new game room
- `joinRoom` - Join an existing room
- `playerReady` - Mark player as ready
- `scoreUpdate` - Send score/combo updates
- `gameEnd` - Notify game completion

### Server → Client

- `roomCreated` - Room created successfully
- `playerJoined` - Another player joined
- `gameStarting` - Game is about to start
- `opponentScore` - Opponent's score update
- `opponentFinished` - Opponent finished the game
- `matchComplete` - Match finished with results
- `error` - Error occurred

## Testing

1. Start the server
2. Open two browser windows
3. In window 1: Click "Multiplayer" → "Create Room"
4. In window 2: Click "Multiplayer" → "Join Room" (enter room ID)
5. Both players should see countdown and start playing

## Troubleshooting

- **Connection failed**: Make sure server is running and port is accessible
- **Room not found**: Room IDs expire after 30 seconds of inactivity
- **CORS errors**: Check server CORS configuration matches your client URL

