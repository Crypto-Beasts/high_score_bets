import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { getResponsiveTitleSize, getResponsiveButtonSize, getResponsiveSpacing, getResponsiveFontSize } from "../../utils/ui/responsive";
import { getAllSongs } from "../../config/songs";
import { DIFFICULTY_LEVELS, DifficultyLevel } from "../../utils/game/difficultyManager";
import { GameRoomState } from "../../types/GameRoomState";

interface RoomCreatedData {
  roomId: string;
  [key: string]: any;
}

interface GameStartingData {
  song: string;
  difficulty: string;
  startTime?: number;
  [key: string]: any;
}

interface PlayerJoinedData {
  song?: string;
  difficulty?: string;
  [key: string]: any;
}

interface ErrorData {
  message: string;
  [key: string]: any;
}

export default class MultiplayerLobbyScene extends Phaser.Scene {
  private client: Client | null = null;
  private room: Room<GameRoomState> | null = null;
  private roomId: string | null = null;
  private serverUrl: string;
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private createButton?: Phaser.GameObjects.Text;
  private joinButton?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;
  private roomInfoText?: Phaser.GameObjects.Text;
  private roomIdText?: Phaser.GameObjects.Text;
  private waitingText?: Phaser.GameObjects.Text;
  private copyButton?: Phaser.GameObjects.Text;
  private errorText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "MultiplayerLobbyScene" });
    // Colyseus default port is 2567
    this.serverUrl = import.meta.env?.VITE_SERVER_URL || "ws://localhost:2567";
  }

  create(): void {
    const { width, height } = this.scale;
    
    // Set background
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
      this.backgroundImage.setAlpha(0.3);
    } else {
      this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }
    
    // Title
    const titleSize = getResponsiveTitleSize(width);
    this.titleText = this.add.text(width / 2, height / 6, "Multiplayer Lobby", {
      fontSize: titleSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Connection status
    this.statusText = this.add.text(width / 2, height / 6 + getResponsiveSpacing(60, height), "Connecting...", {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      color: "#ffff00"
    }).setOrigin(0.5);
    
    // Buttons
    const buttonSize = getResponsiveButtonSize(width, height);
    const buttonSpacing = getResponsiveSpacing(80, height);
    const buttonY = height / 2;
    
    // Create Room Button
    this.createButton = this.add.text(width / 2, buttonY, "Create Room", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#00aa00",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    
    this.createButton.on("pointerdown", () => {
      this.showCreateRoomOptions();
    });
    
    this.createButton.on("pointerover", () => {
      if (this.createButton) {
        this.createButton.setBackgroundColor("#00ff00");
      }
    });
    
    this.createButton.on("pointerout", () => {
      if (this.createButton) {
        this.createButton.setBackgroundColor("#00aa00");
      }
    });
    
    // Join Room Button
    this.joinButton = this.add.text(width / 2, buttonY + buttonSpacing, "Join Room", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#0088cc",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    
    this.joinButton.on("pointerdown", () => {
      this.showJoinRoomInput();
    });
    
    this.joinButton.on("pointerover", () => {
      if (this.joinButton) {
        this.joinButton.setBackgroundColor("#00aaff");
      }
    });
    
    this.joinButton.on("pointerout", () => {
      if (this.joinButton) {
        this.joinButton.setBackgroundColor("#0088cc");
      }
    });
    
    // Back Button
    this.backButton = this.add.text(width / 2, buttonY + buttonSpacing * 2, "Back to Menu", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#666",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    
    this.backButton.on("pointerdown", () => {
      this.disconnectSocket();
      this.scene.start("MainMenuScene");
    });
    
    this.backButton.on("pointerover", () => {
      if (this.backButton) {
        this.backButton.setBackgroundColor("#777");
      }
    });
    
    this.backButton.on("pointerout", () => {
      if (this.backButton) {
        this.backButton.setBackgroundColor("#666");
      }
    });
    
    // Connect to server
    this.connectToServer();
    
    // Listen for resize
    this.scale.on('resize', this.handleResize, this);
  }
  
  private connectToServer(): void {
    try {
      this.client = new Client(this.serverUrl);
      
      if (this.statusText) {
        this.statusText.setText("Connected");
        this.statusText.setFill("#00ff00");
      }
    } catch (error) {
      console.error("[MultiplayerLobby] Connection error:", error);
      if (this.statusText) {
        this.statusText.setText("Connection failed. Check server.");
        this.statusText.setFill("#ff0000");
      }
    }
  }
  
  private async showCreateRoomOptions(): Promise<void> {
    if (!this.client) {
      this.showError("Not connected to server");
      return;
    }
    
    try {
      // Simple song and difficulty selection
      const songs = getAllSongs();
      const defaultSong = songs[0]?.id || "Aguado_Menuet_Aminor";
      const defaultDifficulty = DIFFICULTY_LEVELS.NORMAL;
      
      // Create or join room with Colyseus
      this.room = await this.client.joinOrCreate<GameRoomState>("game_room", {
        song: defaultSong,
        difficulty: defaultDifficulty
      });
      
      this.roomId = this.room.roomId;
      console.log("[MultiplayerLobby] Room created/joined:", this.roomId);
      
      // Check initial state - if game already started, transition immediately
      const initialState = this.room.state;
      if (initialState.status === "starting" || initialState.status === "playing") {
        // Game already started - server has verified 2 players, transition immediately
        const player = Array.from(initialState.players.values()).find(p => p.sessionId === this.room?.sessionId);
        const isHost = player && Array.from(initialState.players.values())[0]?.sessionId === this.room?.sessionId;
        
        this.scene.start("MultiplayerGameScene", {
          roomId: this.roomId,
          room: this.room, // Pass existing room connection
          isHost: isHost || false,
          song: initialState.song,
          difficulty: initialState.difficulty as DifficultyLevel,
          startTime: initialState.startTime
        });
        return;
      }
      
      // Setup room listeners
      this.setupRoomListeners();
      
      // Show room created UI
      this.showRoomCreated({ roomId: this.roomId });
    } catch (error) {
      console.error("[MultiplayerLobby] Error creating room:", error);
      this.showError("Failed to create room");
    }
  }
  
  private async showJoinRoomInput(): Promise<void> {
    if (!this.client) {
      this.showError("Not connected to server");
      return;
    }
    
    // Simple prompt for room ID
    // TODO: Replace with proper UI input
    const roomId = prompt("Enter Room ID:");
    if (roomId && roomId.trim()) {
      try {
        this.room = await this.client.joinById<GameRoomState>(roomId.trim());
        this.roomId = this.room.roomId;
        
        // Check initial state immediately (in case game already started)
        if (this.room.state.status === "starting" || this.room.state.status === "playing") {
          const player = Array.from(this.room.state.players.values()).find(p => p.sessionId === this.room?.sessionId);
          const isHost = player && Array.from(this.room.state.players.values())[0]?.sessionId === this.room?.sessionId;
          
          this.scene.start("MultiplayerGameScene", {
            roomId: this.roomId,
            isHost: isHost || false,
            song: this.room.state.song,
            difficulty: this.room.state.difficulty as DifficultyLevel,
            startTime: this.room.state.startTime
          });
          return;
        }
        
        // Setup room listeners for future state changes
        this.setupRoomListeners();
      } catch (error) {
        console.error("[MultiplayerLobby] Error joining room:", error);
        this.showError("Failed to join room. Room may not exist.");
      }
    }
  }
  
  private setupRoomListeners(): void {
    if (!this.room) return;
    
    // Track if we've already handled the initial state to prevent immediate transitions
    let initialStateHandled = false;
    
    // Listen for state changes (only for host who created room)
    this.room.onStateChange((state) => {
      // Skip the first state change (initial state) - we handle it separately
      if (!initialStateHandled) {
        initialStateHandled = true;
        console.log("[MultiplayerLobby] Initial state received, player count:", Object.keys(state.players || {}).length);
        return; // Don't transition on initial state
      }
      
      // Handle room state changes (status, players, etc.)
      // Trust the server: if status is "starting" or "playing", server has verified 2 players
      // Don't count players from state.players (includes disconnected players kept for reconnection)
      console.log(`[MultiplayerLobby] State change: status=${state.status}`);
      
      if (this.scene.isActive() && (state.status === "starting" || state.status === "playing")) {
        console.log("[MultiplayerLobby] Transitioning to game - server confirmed game starting");
        const player = Array.from(state.players.values()).find(p => p.sessionId === this.room?.sessionId);
        const isHost = player && Array.from(state.players.values())[0]?.sessionId === this.room?.sessionId;
        
        // Pass the room object so MultiplayerGameScene can reuse it
        this.scene.start("MultiplayerGameScene", {
          roomId: this.roomId,
          room: this.room, // Pass existing room connection
          isHost: isHost || false,
          song: state.song,
          difficulty: state.difficulty as DifficultyLevel,
          startTime: state.startTime
        });
      }
    });
    
    // Listen for errors
    this.room.onError((code, message) => {
      console.error("[MultiplayerLobby] Room error:", code, message);
      this.showError(message || "Room error occurred");
    });
    
    // Listen for leave
    this.room.onLeave((code) => {
      console.log("[MultiplayerLobby] Left room:", code);
    });
  }
  
  private showRoomCreated(data: RoomCreatedData): void {
    // Show room ID and waiting message
    const { width, height } = this.scale;
    
    // Hide buttons
    if (this.createButton) this.createButton.setVisible(false);
    if (this.joinButton) this.joinButton.setVisible(false);
    if (this.backButton) this.backButton.setVisible(false);
    
    // Show room info
    if (this.roomInfoText) this.roomInfoText.destroy();
    if (this.roomIdText) this.roomIdText.destroy();
    if (this.waitingText) this.waitingText.destroy();
    if (this.copyButton) this.copyButton.destroy();
    
    this.roomInfoText = this.add.text(width / 2, height / 2 - getResponsiveSpacing(60, height), "Room Created!", {
      fontSize: getResponsiveFontSize(32, width, 24, 40),
      color: "#00ff00",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    this.roomIdText = this.add.text(width / 2, height / 2, `Room ID: ${this.roomId}`, {
      fontSize: getResponsiveFontSize(24, width, 18, 30),
      color: "#ffffff",
      fontStyle: "bold",
      backgroundColor: "#333",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    // Copy button
    this.copyButton = this.add.text(width / 2, height / 2 + getResponsiveSpacing(50, height), "Copy Room ID", {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      color: "#ffffff",
      backgroundColor: "#0088cc",
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive();
    
    this.copyButton.on("pointerdown", () => {
      if (this.roomId) {
        navigator.clipboard.writeText(this.roomId).then(() => {
          if (this.copyButton) {
            this.copyButton.setText("Copied!");
            this.time.delayedCall(2000, () => {
              if (this.copyButton) {
                this.copyButton.setText("Copy Room ID");
              }
            });
          }
        });
      }
    });
    
    this.waitingText = this.add.text(width / 2, height / 2 + getResponsiveSpacing(100, height), "Waiting for player to join...", {
      fontSize: getResponsiveFontSize(20, width, 16, 24),
      color: "#ffff00"
    }).setOrigin(0.5);
    
    // Game start is handled by setupRoomListeners via state change
  }
  
  private showError(message: string): void {
    const { width, height } = this.scale;
    
    if (this.errorText) this.errorText.destroy();
    
    this.errorText = this.add.text(width / 2, height - getResponsiveSpacing(100, height), message, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      color: "#ff0000",
      backgroundColor: "#330000",
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);
    
    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.errorText) {
        this.errorText.destroy();
        this.errorText = undefined;
      }
    });
  }
  
  private disconnectSocket(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }
  
  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    const { width, height } = this.scale;
    
    // Handle different parameter formats
    let resizeWidth, resizeHeight;
    if (gameSize && gameSize.width && gameSize.height) {
      resizeWidth = gameSize.width;
      resizeHeight = gameSize.height;
    } else {
      resizeWidth = width || window.innerWidth || 1920;
      resizeHeight = height || window.innerHeight || 1080;
    }
    
    // Update background
    if (this.backgroundImage) {
      this.backgroundImage.setPosition(resizeWidth / 2, resizeHeight / 2);
      this.backgroundImage.setDisplaySize(resizeWidth, resizeHeight);
    }
    if (this.backgroundRect) {
      this.backgroundRect.setPosition(resizeWidth / 2, resizeHeight / 2);
      this.backgroundRect.setSize(resizeWidth, resizeHeight);
    }
    
    // Helper function to safely set font size on text objects
    const safeSetFontSize = (
      text: Phaser.GameObjects.Text | null | undefined,
      fontSize: number | string
    ): void => {
      if (text && text.active && text.scene && "texture" in text) {
        try {
          text.setFontSize(fontSize);
        } catch (error) {
          console.warn('[MultiplayerLobbyScene] Error setting font size:', error);
        }
      }
    };
    
    // Update title
    if (this.titleText) {
      const titleSize = getResponsiveTitleSize(resizeWidth);
      this.titleText.setPosition(resizeWidth / 2, resizeHeight / 6);
      safeSetFontSize(this.titleText, titleSize);
    }
    
    // Update status text
    if (this.statusText) {
      this.statusText.setPosition(resizeWidth / 2, resizeHeight / 6 + getResponsiveSpacing(60, resizeHeight));
      safeSetFontSize(this.statusText, getResponsiveFontSize(18, resizeWidth, 14, 22));
    }
    
    // Update buttons
    const buttonSize = getResponsiveButtonSize(resizeWidth, resizeHeight);
    const buttonSpacing = getResponsiveSpacing(80, resizeHeight);
    const buttonY = resizeHeight / 2;
    
    if (this.createButton) {
      this.createButton.setPosition(resizeWidth / 2, buttonY);
      safeSetFontSize(this.createButton, buttonSize.fontSize);
      // Padding is set in style, will be recalculated with new fontSize
    }
    
    if (this.joinButton) {
      this.joinButton.setPosition(resizeWidth / 2, buttonY + buttonSpacing);
      safeSetFontSize(this.joinButton, buttonSize.fontSize);
    }
    
    if (this.backButton) {
      this.backButton.setPosition(resizeWidth / 2, buttonY + buttonSpacing * 2);
      safeSetFontSize(this.backButton, buttonSize.fontSize);
    }
    
    // Update room info (if visible)
    if (this.roomInfoText) {
      this.roomInfoText.setPosition(resizeWidth / 2, resizeHeight / 2 - getResponsiveSpacing(60, resizeHeight));
      safeSetFontSize(this.roomInfoText, getResponsiveFontSize(32, resizeWidth, 24, 40));
    }
    
    if (this.roomIdText) {
      this.roomIdText.setPosition(resizeWidth / 2, resizeHeight / 2);
      safeSetFontSize(this.roomIdText, getResponsiveFontSize(24, resizeWidth, 18, 30));
    }
    
    if (this.copyButton) {
      this.copyButton.setPosition(resizeWidth / 2, resizeHeight / 2 + getResponsiveSpacing(50, resizeHeight));
      safeSetFontSize(this.copyButton, getResponsiveFontSize(18, resizeWidth, 14, 22));
    }
    
    if (this.waitingText) {
      this.waitingText.setPosition(resizeWidth / 2, resizeHeight / 2 + getResponsiveSpacing(100, resizeHeight));
      safeSetFontSize(this.waitingText, getResponsiveFontSize(20, resizeWidth, 16, 24));
    }
    
    // Update error text
    if (this.errorText) {
      this.errorText.setPosition(resizeWidth / 2, resizeHeight - getResponsiveSpacing(100, resizeHeight));
      safeSetFontSize(this.errorText, getResponsiveFontSize(18, resizeWidth, 14, 22));
    }
  }
  
  shutdown(): void {
    // Don't disconnect here - let MultiplayerGameScene handle it
    // this.disconnectSocket();
  }
}

