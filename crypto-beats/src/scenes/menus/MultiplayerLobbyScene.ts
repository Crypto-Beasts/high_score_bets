import Phaser from "phaser";
import { Socket } from "socket.io-client";
import io from "socket.io-client";
import { getResponsiveTitleSize, getResponsiveButtonSize, getResponsiveSpacing, getResponsiveFontSize } from "../../utils/ui/responsive";
import { getAllSongs } from "../../config/songs";
import { DIFFICULTY_LEVELS, DifficultyLevel } from "../../utils/game/difficultyManager";

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
  private socket: Socket | null = null;
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
    this.serverUrl = import.meta.env?.VITE_SERVER_URL || "http://localhost:3000";
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
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      this.setupSocketListeners();
    } catch (error) {
      console.error("[MultiplayerLobby] Connection error:", error);
      if (this.statusText) {
        this.statusText.setText("Connection failed. Check server.");
        this.statusText.setFill("#ff0000");
      }
    }
  }
  
  private setupSocketListeners(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log("[MultiplayerLobby] Connected to server");
      if (this.statusText) {
        this.statusText.setText("Connected");
        this.statusText.setFill("#00ff00");
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log("[MultiplayerLobby] Disconnected from server");
      if (this.statusText) {
        this.statusText.setText("Disconnected");
        this.statusText.setFill("#ff0000");
      }
    });
    
    this.socket.on('connect_error', (error: Error) => {
      console.error("[MultiplayerLobby] Connection error:", error);
      if (this.statusText) {
        this.statusText.setText("Connection failed. Server may be offline.");
        this.statusText.setFill("#ff0000");
      }
    });
    
    this.socket.on('roomCreated', (data: RoomCreatedData) => {
      this.roomId = data.roomId;
      console.log("[MultiplayerLobby] Room created:", this.roomId);
      this.showRoomCreated(data);
    });
    
    this.socket.on('error', (data: ErrorData) => {
      console.error("[MultiplayerLobby] Server error:", data.message);
      this.showError(data.message);
    });
  }
  
  private showCreateRoomOptions(): void {
    if (!this.socket || !this.socket.connected) {
      this.showError("Not connected to server");
      return;
    }
    
    // Simple song and difficulty selection
    const songs = getAllSongs();
    const defaultSong = songs[0]?.id || "Aguado_Menuet_Aminor";
    const defaultDifficulty = DIFFICULTY_LEVELS.NORMAL;
    
    // For now, create room with defaults
    // TODO: Add UI for song/difficulty selection
    this.socket.emit('createRoom', {
      song: defaultSong,
      difficulty: defaultDifficulty
    });
  }
  
  private showJoinRoomInput(): void {
    if (!this.socket || !this.socket.connected) {
      this.showError("Not connected to server");
      return;
    }
    
    // Simple prompt for room ID
    // TODO: Replace with proper UI input
    const roomId = prompt("Enter Room ID:");
    if (roomId && roomId.trim()) {
      this.socket.emit('joinRoom', roomId.trim());
      
      // Listen for join confirmation
      this.socket.once('playerJoined', (data: PlayerJoinedData) => {
        this.roomId = roomId.trim();
        this.scene.start("MultiplayerGameScene", {
          roomId: this.roomId,
          isHost: false,
          song: data.song || "Aguado_Menuet_Aminor",
          difficulty: (data.difficulty as DifficultyLevel) || DIFFICULTY_LEVELS.NORMAL
        });
      });
      
      this.socket.once('error', (data: ErrorData) => {
        this.showError(data.message || "Failed to join room");
      });
    }
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
    
    // Listen for game start
    if (this.socket) {
      this.socket.on('gameStarting', (data: GameStartingData) => {
        this.scene.start("MultiplayerGameScene", {
          roomId: this.roomId,
          isHost: true,
          song: data.song,
          difficulty: data.difficulty as DifficultyLevel,
          startTime: data.startTime
        });
      });
    }
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Could recreate UI if needed
  }
  
  shutdown(): void {
    // Don't disconnect here - let MultiplayerGameScene handle it
    // this.disconnectSocket();
  }
}

