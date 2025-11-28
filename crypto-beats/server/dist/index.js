"use strict";
/**
 * Crypto Beats Multiplayer Server (Colyseus)
 *
 * Run with: npm run dev
 * Or: npm start (after build)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const colyseus_1 = require("colyseus");
const GameRoom_1 = require("./rooms/GameRoom");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Create Colyseus server
const gameServer = new colyseus_1.Server({
    server: server,
});
// Register room handlers
gameServer.define("game_room", GameRoom_1.GameRoom);
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
//# sourceMappingURL=index.js.map