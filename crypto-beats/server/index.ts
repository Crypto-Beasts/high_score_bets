/**
 * Crypto Beats Multiplayer Server (Colyseus)
 * 
 * Run with: npm run dev
 * Or: npm start (after build)
 */

import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { GameRoom } from "./rooms/GameRoom";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Create Colyseus server
const gameServer = new Server({
  server: server,
});

// Register room handlers
gameServer.define("game_room", GameRoom);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
  });
});

// Get server info
app.get("/info", (req, res) => {
  res.json({
    version: "2.0.0",
    phase: "Colyseus Migration",
    status: "running",
  });
});

const PORT = parseInt(process.env.PORT || "2567", 10);
gameServer.listen(PORT);

console.log(`\n🚀 Crypto Beats Multiplayer Server (Colyseus)`);
console.log(`📡 Server running on port ${PORT}`);
console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}`);
console.log(`\n💡 Connect clients to: http://localhost:${PORT}\n`);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n[Server] SIGTERM received, shutting down gracefully...");
  gameServer.gracefullyShutdown().then(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});

