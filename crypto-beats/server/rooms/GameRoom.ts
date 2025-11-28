import { Room, Client } from "colyseus";
import { GameRoomState, PlayerSchema } from "./GameRoomState";

interface CreateRoomOptions {
  song?: string;
  difficulty?: string;
}

interface ScoreUpdateMessage {
  score: number;
  combo: number;
}

interface PlayerInputMessage {
  key: string;
  timestamp?: number;
  gameTime?: number;
  quality?: string;
}

interface GameEndMessage {
  score: number;
  accuracy: number;
  totalNotes: number;
  notesHit: number;
  longestStreak: number;
}

export class GameRoom extends Room<GameRoomState> {
  private startTimeout?: NodeJS.Timeout;
  private unlockInterval?: NodeJS.Timeout;

  onCreate(options: CreateRoomOptions) {
    console.log(`[GameRoom] Room created: ${this.roomId}`);
    
    // Initialize room state
    this.setState(new GameRoomState());
    this.state.roomId = this.roomId;
    this.state.song = options.song || "Aguado_Menuet_Aminor";
    this.state.difficulty = options.difficulty || "normal";
    this.state.status = "waiting";

    // Set max clients higher to prevent auto-lock
    // We'll control actual capacity (2 players) manually in onAuth
    this.maxClients = 10;
    
    this.autoDispose = false;
    
    // Ensure room starts unlocked
    // Use setImmediate to unlock after Colyseus initialization
    setImmediate(() => {
      if (this.locked) {
        this.unlock();
        console.log(`[GameRoom] Unlocked room ${this.roomId} on creation`);
      }
    });
    
    // Keep room unlocked at all times - we control access via onAuth
    // Set up interval to ensure room stays unlocked
    this.unlockInterval = setInterval(() => {
      if (this.locked) {
        this.unlock();
        console.log(`[GameRoom] Proactively unlocked room ${this.roomId}`);
      }
    }, 500); // Check every 500ms to catch locks quickly

    // Handle messages
    this.onMessage("scoreUpdate", (client, message: ScoreUpdateMessage) => {
      this.handleScoreUpdate(client, message);
    });

    this.onMessage("playerInput", (client, message: PlayerInputMessage) => {
      this.handlePlayerInput(client, message);
    });

    this.onMessage("gameEnd", (client, message: GameEndMessage) => {
      this.handleGameEnd(client, message);
    });
  }

  async onAuth(client: Client, options: CreateRoomOptions, req: any) {
    // Simple approach: allow all clients through, handle validation in onJoin
    // This matches simple-shooter's approach and avoids state access issues
    return true;
  }

  onJoin(client: Client, options?: CreateRoomOptions) {
    console.log(`[GameRoom] Player ${client.sessionId} joined room ${this.roomId}`);
    
    // Validate join here (moved from onAuth to avoid state access issues)
    if (this.state.status === "finished") {
      console.log(`[GameRoom] Room ${this.roomId} is finished, disconnecting client`);
      client.leave();
      return;
    }
    
    // Check if this is a reconnection (player already in state)
    let player = this.state.players.get(client.sessionId);
    
    if (!player) {
      // New player - check if room has space
      const activeClientCount = this.clients.length;
      if (activeClientCount > 2) {
        // Room is over capacity (shouldn't happen with maxClients=10, but check anyway)
        console.log(`[GameRoom] Room ${this.roomId} over capacity (${activeClientCount}), disconnecting client`);
        client.leave();
        return;
      }
      
      // Create player schema
      player = new PlayerSchema();
      player.sessionId = client.sessionId;
      player.ready = false;
      player.song = this.state.song;
      player.difficulty = this.state.difficulty;
      this.state.players.set(client.sessionId, player);
      console.log(`[GameRoom] New player ${client.sessionId} added (${activeClientCount + 1} active clients)`);
    } else {
      // Reconnection - player already exists in state
      console.log(`[GameRoom] Player ${client.sessionId} reconnected`);
    }

    // Immediately unlock room after join - we control access manually
    if (this.locked) {
      this.unlock();
      console.log(`[GameRoom] Unlocked room ${this.roomId} after join`);
    }

    // Log current client count for debugging
    const currentClientCount = this.clients.length;
    console.log(`[GameRoom] Room ${this.roomId} now has ${currentClientCount} active client(s), status: ${this.state.status}`);

    // If room is full (2 active clients), start game countdown (only if waiting)
    if (currentClientCount >= 2 && this.state.status === "waiting") {
      console.log(`[GameRoom] Room ${this.roomId} has 2 players, starting game countdown`);
      this.startGame();
    } else {
      console.log(`[GameRoom] Room ${this.roomId} waiting for more players (${currentClientCount}/2)`);
    }
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`[GameRoom] Player ${client.sessionId} left room ${this.roomId} (consented: ${consented})`);
    
    // Don't remove player from state immediately - keep them for potential reconnection
    // They will be removed after timeout or when room disposes

    // Immediately unlock room when player leaves
    if (this.locked) {
      this.unlock();
      console.log(`[GameRoom] Unlocked room ${this.roomId} after player left`);
    }

    // Clear start timeout if exists
    if (this.startTimeout) {
      clearTimeout(this.startTimeout);
      this.startTimeout = undefined;
    }

    // Set timeout to remove player from state if they don't reconnect
    // This prevents ghost players from staying in state forever
    setTimeout(() => {
      if (!this.clients.find(c => c.sessionId === client.sessionId)) {
        // Player didn't reconnect, remove from state
        if (this.state.players.has(client.sessionId)) {
          this.state.players.delete(client.sessionId);
          console.log(`[GameRoom] Removed ${client.sessionId} from state (reconnection timeout)`);
        }
      }
    }, 30000); // 30 second timeout

    // If room becomes empty, dispose it
    if (this.clients.length === 0) {
      console.log(`[GameRoom] Room ${this.roomId} is empty, disposing...`);
      // Now remove all players from state before disposing
      this.state.players.clear();
      this.disconnect();
    }
  }

  onDispose() {
    console.log(`[GameRoom] Room ${this.roomId} disposed`);
    if (this.startTimeout) {
      clearTimeout(this.startTimeout);
    }
    if (this.unlockInterval) {
      clearInterval(this.unlockInterval);
    }
  }

  private startGame() {
    if (this.state.status !== "waiting") {
      return; // Game already started or starting
    }

    console.log(`[GameRoom] Room ${this.roomId} full, starting game in 3 seconds`);
    this.state.status = "starting";

    // Set start time (3 seconds from now)
    this.state.startTime = Date.now() + 3000;

    // Set room status to playing after countdown
    this.startTimeout = setTimeout(() => {
      if (this.state.status === "starting") {
        this.state.status = "playing";
        console.log(`[GameRoom] Room ${this.roomId} game started`);
      }
    }, 3000);
  }

  private handleScoreUpdate(client: Client, message: ScoreUpdateMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`[GameRoom] Player ${client.sessionId} not found for scoreUpdate`);
      return;
    }

    // Only allow score updates when room is 'starting' or 'playing'
    if (this.state.status !== "playing" && this.state.status !== "starting") {
      console.warn(`[GameRoom] Score update rejected: room status is '${this.state.status}', not 'playing' or 'starting'`);
      return;
    }

    // Update player score and combo (automatically synced to all clients)
    const oldScore = player.score;
    const oldCombo = player.combo;
    player.score = message.score || 0;
    player.combo = message.combo || 0;
    
    // Log score update
    if (oldScore !== player.score || oldCombo !== player.combo) {
      console.log(`[GameRoom] Player ${client.sessionId} score updated: ${oldScore} -> ${player.score}, combo: ${oldCombo} -> ${player.combo}`);
    }
  }

  private handlePlayerInput(client: Client, message: PlayerInputMessage) {
    if (this.state.status !== "playing") {
      return;
    }

    // Broadcast player input to other clients (for spectator view)
    // In Colyseus, we can use broadcast to send to all except sender
    this.broadcast("opponentInput", {
      playerId: client.sessionId,
      key: message.key,
      timestamp: message.timestamp,
      gameTime: message.gameTime,
      quality: message.quality || "good"
    }, { except: client });
  }

  private handleGameEnd(client: Client, message: GameEndMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`[GameRoom] Player ${client.sessionId} not found for gameEnd`);
      return;
    }

    console.log(`[GameRoom] Player ${client.sessionId} finished game in room ${this.roomId}`);

    // Update player final stats
    player.finished = true;
    player.finalScore = message.score || 0;
    player.accuracy = message.accuracy || 0;
    player.totalNotes = message.totalNotes || 0;
    player.notesHit = message.notesHit || 0;
    player.longestStreak = message.longestStreak || 0;

    // Broadcast opponent finished to other players
    this.broadcast("opponentFinished", {
      playerId: client.sessionId,
      finalScore: player.finalScore,
      accuracy: player.accuracy,
      totalNotes: player.totalNotes,
      notesHit: player.notesHit,
      longestStreak: player.longestStreak
    }, { except: client });

    // Check if all players finished
    const allFinished = Array.from(this.state.players.values()).every(p => p.finished);
    if (allFinished) {
      // Determine winner
      const players = Array.from(this.state.players.values());
      const winner = players.reduce((prev, curr) => 
        (curr.finalScore || 0) > (prev.finalScore || 0) ? curr : prev
      );

      console.log(`[GameRoom] Room ${this.roomId} - Winner: ${winner.sessionId} with score ${winner.finalScore}`);

      this.state.status = "finished";

      // Broadcast match complete
      this.broadcast("matchComplete", {
        winner: winner.sessionId,
        scores: players.map(p => ({
          playerId: p.sessionId,
          score: p.finalScore || 0
        }))
      });

      // Auto-dispose room after 30 seconds
      setTimeout(() => {
        this.disconnect();
      }, 30000);
    }
  }
}

