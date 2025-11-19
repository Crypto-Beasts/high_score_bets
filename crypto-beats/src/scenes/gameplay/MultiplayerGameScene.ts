import Phaser from "phaser";
import { Socket } from "socket.io-client";
import io from "socket.io-client";
import GameScene from "./GameScene";
import { getResponsiveFontSize, getResponsiveSpacing } from "../../utils/ui/responsive";
import { OpponentReplaySystem } from "./OpponentReplaySystem";
import { DifficultyLevel } from "../../utils/game/difficultyManager";

interface MultiplayerGameData {
  roomId?: string;
  isHost?: boolean;
  startTime?: number;
  song?: string;
  difficulty?: string;
  [key: string]: any;
}

interface OpponentScoreData {
  score?: number;
  combo?: number;
  [key: string]: any;
}

interface OpponentInputData {
  key: string;
  timestamp?: number;
  gameTime?: number;
  quality: string;
  [key: string]: any;
}

interface OpponentFinishedData {
  finalScore?: number;
  totalNotes?: number;
  notesHit?: number;
  longestStreak?: number;
  [key: string]: any;
}

interface GameStartingData {
  startTime: number;
  [key: string]: any;
}

interface ErrorData {
  message: string;
  [key: string]: any;
}

/**
 * MultiplayerGameScene
 * Extends single-player gameplay with multiplayer features
 * Keeps all single-player functionality intact
 */
export default class MultiplayerGameScene extends GameScene {
  protected socket: Socket | null = null;
  protected roomId: string | null = null;
  protected isHost: boolean = false;
  protected serverUrl: string;
  
  // Multiplayer state
  protected opponentScore: number = 0;
  protected opponentCombo: number = 0;
  protected opponentFinished: boolean = false;
  protected opponentTotalNotes: number = 0;
  protected opponentNotesHit: number = 0;
  protected opponentLongestStreak: number = 0;
  protected gameStartTime: number | null = null;
  protected synchronizedStart: boolean = false;
  protected gameEndHandled: boolean = false;
  protected gameEndSent: boolean = false;
  protected lastScoreUpdate: number = 0;
  
  // Spectator view
  protected opponentReplay: OpponentReplaySystem | null = null;
  protected showSpectatorView: boolean = true;
  protected lastInputUpdate: number = 0;
  protected spectatorToggleButton: Phaser.GameObjects.Rectangle | null = null;
  protected spectatorToggleBg?: Phaser.GameObjects.Rectangle;
  protected spectatorToggleText?: Phaser.GameObjects.Text;
  protected toggleFeedbackText?: Phaser.GameObjects.Text;
  
  // UI elements
  protected multiplayerPanel?: Phaser.GameObjects.Rectangle;
  protected yourLabelText?: Phaser.GameObjects.Text;
  protected yourScoreText?: Phaser.GameObjects.Text;
  protected yourComboText?: Phaser.GameObjects.Text;
  protected opponentLabelText?: Phaser.GameObjects.Text;
  protected opponentScoreText?: Phaser.GameObjects.Text;
  protected opponentComboText?: Phaser.GameObjects.Text;
  protected scoreDiffText?: Phaser.GameObjects.Text;
  protected yourScoreBar?: Phaser.GameObjects.Rectangle;
  protected opponentScoreBar?: Phaser.GameObjects.Rectangle;
  protected connectionStatus?: Phaser.GameObjects.Arc;
  protected countdownText?: Phaser.GameObjects.Text | null;
  protected opponentFinishedText?: Phaser.GameObjects.Text;
  protected errorText?: Phaser.GameObjects.Text | null;
  protected waitingText?: Phaser.GameObjects.Text | null;
  protected waitForOpponentTimeout?: Phaser.Time.TimerEvent | null;
  
  // Multiplayer song/difficulty
  protected multiplayerSong?: string;
  protected multiplayerDifficulty?: DifficultyLevel;

  constructor(config?: Phaser.Types.Scenes.SettingsConfig) {
    // Create config with correct key BEFORE calling super
    // This prevents Phaser from registering with parent's key
    const sceneConfig = { ...config, key: "MultiplayerGameScene" };
    super(sceneConfig);
    
    // Override the scene key after construction to be absolutely sure
    if (this.sys && this.sys.settings) {
      this.sys.settings.key = "MultiplayerGameScene";
    }
    
    this.serverUrl = import.meta.env?.VITE_SERVER_URL || "http://localhost:3000";
    this.showSpectatorView = this.loadSpectatorViewPreference();
  }

  init(data?: MultiplayerGameData): void {
    // Store multiplayer data
    this.roomId = data?.roomId || null;
    this.isHost = data?.isHost || false;
    this.gameStartTime = data?.startTime || null;
    this.multiplayerSong = data?.song;
    this.multiplayerDifficulty = data?.difficulty as DifficultyLevel | undefined;
  }

  create(data?: MultiplayerGameData): void {
    // Connect to server first
    this.connectToServer();
    
    // Call parent create to initialize game first
    super.create({
      song: this.multiplayerSong || data?.song,
      difficulty: this.multiplayerDifficulty || data?.difficulty
    });
    
    // Override GameUpdateHandler's onGameEnd callback to prevent single-player debrief transition
    // MultiplayerGameScene handles game end itself via handleGameEnd -> transitionToDebrief
    if (this.gameUpdateHandler) {
      // Store reference to original callback (if we need it)
      // But set to undefined so GameUpdateHandler doesn't trigger single-player debrief
      (this.gameUpdateHandler as any).onGameEnd = undefined;
    }
    
    // Setup multiplayer UI after parent create (so we can hide parent's score text)
    this.setupMultiplayerUI();
    
    // Hide parent's score text since we have our own multiplayer UI
    if (this.scoreText) {
      this.scoreText.setVisible(false);
    }
    if (this.comboText) {
      this.comboText.setVisible(false);
    }
    if (this.comboMultiplierText) {
      this.comboMultiplierText.setVisible(false);
    }
    
    // Setup socket listeners after parent create
    this.setupSocketListeners();
    
    // Setup spectator view toggle button
    this.setupSpectatorToggle();
    
    // Setup opponent replay system (spectator view)
    if (this.showSpectatorView) {
      this.setupOpponentReplay();
    }
    
    // Wait for synchronization before starting
    if (this.gameStartTime) {
      this.waitForSynchronizedStart();
    }
  }
  
  protected connectToServer(): void {
    try {
      // Reuse socket from lobby if available, or create new one
      // For now, create new connection
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        reconnection: true
      });
      
      // If we have a roomId, join it
      if (this.roomId) {
        this.socket.emit('joinRoom', this.roomId);
      }
    } catch (error) {
      console.error("[MultiplayerGameScene] Connection error:", error);
    }
  }
  
  protected setupMultiplayerUI(): void {
    const { width, height } = this.scale;
    
    // Create multiplayer score panel (top of screen)
    const panelY = getResponsiveSpacing(10, height);
    const panelHeight = getResponsiveSpacing(120, height);
    
    // Background panel for multiplayer scores
    this.multiplayerPanel = this.add.rectangle(
      width / 2,
      panelY + panelHeight / 2,
      width,
      panelHeight,
      0x000000,
      0.7
    ).setDepth(100).setOrigin(0.5, 0);
    
    // Player labels
    const labelY = panelY + getResponsiveSpacing(15, height);
    const leftX = getResponsiveSpacing(20, width);
    const rightX = width - getResponsiveSpacing(20, width);
    
    // Your score (left side)
    this.yourLabelText = this.add.text(
      leftX,
      labelY,
      "YOU",
      {
        fontSize: getResponsiveFontSize(16, width, 12, 20),
        color: "#00ff00",
        fontStyle: "bold"
      }
    ).setOrigin(0, 0).setDepth(101);
    
    this.yourScoreText = this.add.text(
      leftX,
      labelY + getResponsiveSpacing(25, height),
      "0",
      {
        fontSize: getResponsiveFontSize(32, width, 24, 40),
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0, 0).setDepth(101);
    
    this.yourComboText = this.add.text(
      leftX,
      labelY + getResponsiveSpacing(60, height),
      "",
      {
        fontSize: getResponsiveFontSize(18, width, 14, 22),
        color: "#ffff00",
        fontStyle: "bold"
      }
    ).setOrigin(0, 0).setDepth(101).setAlpha(0);
    
    // Opponent score (right side)
    this.opponentLabelText = this.add.text(
      rightX,
      labelY,
      "OPPONENT",
      {
        fontSize: getResponsiveFontSize(16, width, 12, 20),
        color: "#ff0000",
        fontStyle: "bold"
      }
    ).setOrigin(1, 0).setDepth(101);
    
    this.opponentScoreText = this.add.text(
      rightX,
      labelY + getResponsiveSpacing(25, height),
      "0",
      {
        fontSize: getResponsiveFontSize(32, width, 24, 40),
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(1, 0).setDepth(101);
    
    this.opponentComboText = this.add.text(
      rightX,
      labelY + getResponsiveSpacing(60, height),
      "",
      {
        fontSize: getResponsiveFontSize(18, width, 14, 22),
        color: "#ff6666",
        fontStyle: "bold"
      }
    ).setOrigin(1, 0).setDepth(101).setAlpha(0);
    
    // Score difference indicator (center)
    this.scoreDiffText = this.add.text(
      width / 2,
      labelY + getResponsiveSpacing(25, height),
      "TIE",
      {
        fontSize: getResponsiveFontSize(20, width, 16, 24),
        color: "#ffff00",
        fontStyle: "bold"
      }
    ).setOrigin(0.5, 0).setDepth(101);
    
    // Visual indicator bars (showing relative scores)
    const barY = labelY + getResponsiveSpacing(85, height);
    const barWidth = width * 0.35;
    const barHeight = getResponsiveSpacing(8, height);
    
    // Your score bar (left, green)
    this.yourScoreBar = this.add.rectangle(
      width / 2 - barWidth / 2 - getResponsiveSpacing(10, width),
      barY,
      barWidth,
      barHeight,
      0x00ff00,
      0.5
    ).setOrigin(0, 0.5).setDepth(101);
    
    // Opponent score bar (right, red)
    this.opponentScoreBar = this.add.rectangle(
      width / 2 + barWidth / 2 + getResponsiveSpacing(10, width),
      barY,
      barWidth,
      barHeight,
      0xff0000,
      0.5
    ).setOrigin(1, 0.5).setDepth(101);
    
    // Connection status indicator (small, top right corner)
    this.connectionStatus = this.add.circle(
      width - getResponsiveSpacing(15, width),
      panelY + getResponsiveSpacing(15, height),
      6,
      0xffff00
    ).setDepth(102);
  }
  
  protected setupSocketListeners(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log("[MultiplayerGameScene] Connected to server");
      if (this.connectionStatus) {
        this.connectionStatus.setFillStyle(0x00ff00);
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log("[MultiplayerGameScene] Disconnected from server");
      if (this.connectionStatus) {
        this.connectionStatus.setFillStyle(0xff0000);
      }
    });
    
    this.socket.on('connect_error', (error: Error) => {
      console.error("[MultiplayerGameScene] Connection error:", error);
      if (this.connectionStatus) {
        this.connectionStatus.setFillStyle(0xff0000);
      }
    });
    
    // Opponent score update
    this.socket.on('opponentScore', (data: OpponentScoreData) => {
      this.opponentScore = data.score || 0;
      this.opponentCombo = data.combo || 0;
      this.updateOpponentDisplay();
      
      // Update replay system if active
      if (this.opponentReplay) {
        this.opponentReplay.updateScore(this.opponentScore, this.opponentCombo);
      }
    });
    
    // Opponent input event (for spectator view)
    this.socket.on('opponentInput', (data: OpponentInputData) => {
      if (this.showSpectatorView && this.opponentReplay && this.synchronizedStart) {
        this.opponentReplay.handleOpponentInput(data);
      }
    });
    
    // Opponent finished
    this.socket.on('opponentFinished', (data: OpponentFinishedData) => {
      this.opponentFinished = true;
      // Store opponent's final stats
      this.opponentScore = data.finalScore || this.opponentScore;
      this.opponentTotalNotes = data.totalNotes || 0;
      this.opponentNotesHit = data.notesHit || 0;
      this.opponentLongestStreak = data.longestStreak || 0;
      this.showOpponentFinished(data);
      
      // If we already finished, transition to debrief now
      if (this.gameEndHandled) {
        this.transitionToDebrief();
      }
    });
    
    // Game starting (synchronization)
    this.socket.on('gameStarting', (data: GameStartingData) => {
      console.log("[MultiplayerGameScene] Game starting signal received");
      this.gameStartTime = data.startTime;
      this.waitForSynchronizedStart();
    });
    
    // Player joined (for host)
    this.socket.on('playerJoined', (data: any) => {
      console.log("[MultiplayerGameScene] Player joined:", data);
    });
    
    // Error handling
    this.socket.on('error', (data: ErrorData) => {
      console.error("[MultiplayerGameScene] Server error:", data.message);
      this.showMultiplayerError(data.message);
    });
  }
  
  protected waitForSynchronizedStart(): void {
    if (!this.gameStartTime || this.synchronizedStart) return;
    
    const now = Date.now();
    const delay = this.gameStartTime - now;
    
    if (delay > 0) {
      console.log(`[MultiplayerGameScene] Waiting ${delay}ms for synchronized start`);
      
      // Show countdown
      this.showCountdown(delay);
      
      // Wait for synchronized start
      this.time.delayedCall(delay, () => {
        this.synchronizedStart = true;
        console.log("[MultiplayerGameScene] Synchronized start!");
        
        // Ensure music starts at the right time
        if (this.music && !this.musicStarted) {
          // Reset start time to match synchronization
          this.startTime = this.time.now;
          this.audioStartTime = Date.now();
          
          // Update GameUpdateHandler with synchronized audio start time
          if (this.gameUpdateHandler) {
            this.gameUpdateHandler.updateAudioStartTime(this.audioStartTime);
            this.gameUpdateHandler.currentNoteIndex = 0; // Reset note index for synchronized start
          }
        }
      });
    } else {
      // Start time already passed, start immediately
      this.synchronizedStart = true;
    }
  }
  
  protected showCountdown(delay: number): void {
    const { width, height } = this.scale;
    const countdownTime = Math.ceil(delay / 1000);
    
    if (this.countdownText) this.countdownText.destroy();
    
    this.countdownText = this.add.text(
      width / 2,
      height / 2,
      countdownTime.toString(),
      {
        fontSize: getResponsiveFontSize(120, width, 80, 160),
        color: "#00ff00",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 8
      }
    ).setOrigin(0.5).setDepth(1000);
    
    // Update countdown
    let remaining = countdownTime;
    const countdownInterval = setInterval(() => {
      remaining--;
      if (remaining > 0 && this.countdownText) {
        this.countdownText.setText(remaining.toString());
      } else {
        clearInterval(countdownInterval);
        if (this.countdownText) {
          this.countdownText.destroy();
          this.countdownText = null;
        }
      }
    }, 1000);
  }
  
  updateScore(newScore: number): void {
    // Call parent updateScore
    super.updateScore(newScore);
    
    // Update multiplayer UI
    this.updateMultiplayerScores();
    
    // Send score update to server (throttled to avoid spam)
    if (this.socket && this.socket.connected && this.synchronizedStart) {
      // Only send updates every 100ms to reduce network traffic
      if (!this.lastScoreUpdate || (Date.now() - this.lastScoreUpdate) > 100) {
        this.socket.emit('scoreUpdate', {
          score: this.score,
          combo: this.currentStreak
        });
        this.lastScoreUpdate = Date.now();
      }
    }
  }
  
  protected updateMultiplayerScores(): void {
    // Update your score display
    if (this.yourScoreText) {
      this.yourScoreText.setText(this.score.toLocaleString());
    }
    
    // Update your combo
    if (this.yourComboText) {
      if (this.currentStreak > 0) {
        this.yourComboText.setText(`${this.currentStreak}x COMBO`);
        this.yourComboText.setAlpha(1);
      } else {
        this.yourComboText.setAlpha(0);
      }
    }
    
    // Update opponent score
    if (this.opponentScoreText) {
      this.opponentScoreText.setText(this.opponentScore.toLocaleString());
    }
    
    // Update opponent combo
    if (this.opponentComboText) {
      if (this.opponentCombo > 0) {
        this.opponentComboText.setText(`${this.opponentCombo}x COMBO`);
        this.opponentComboText.setAlpha(1);
      } else {
        this.opponentComboText.setAlpha(0);
      }
    }
    
    // Update score difference
    this.updateScoreDifference();
    
    // Update visual bars
    this.updateScoreBars();
  }
  
  protected updateScoreDifference(): void {
    if (!this.scoreDiffText) return;
    
    const diff = this.score - this.opponentScore;
    const absDiff = Math.abs(diff);
    
    if (absDiff < 100) {
      // Tie (within 100 points)
      this.scoreDiffText.setText("TIE");
      this.scoreDiffText.setFill("#ffff00");
    } else if (diff > 0) {
      // You're winning
      this.scoreDiffText.setText(`+${absDiff.toLocaleString()}`);
      this.scoreDiffText.setFill("#00ff00");
    } else {
      // Opponent is winning
      this.scoreDiffText.setText(`-${absDiff.toLocaleString()}`);
      this.scoreDiffText.setFill("#ff0000");
    }
  }
  
  protected updateScoreBars(): void {
    if (!this.yourScoreBar || !this.opponentScoreBar) return;
    
    const totalScore = this.score + this.opponentScore;
    if (totalScore === 0) {
      // Both at 0, show equal bars
      this.yourScoreBar.setScale(0.5, 1);
      this.opponentScoreBar.setScale(0.5, 1);
      return;
    }
    
    // Calculate relative sizes (0.1 to 0.9 to keep bars visible)
    const yourRatio = Math.max(0.1, Math.min(0.9, this.score / totalScore));
    const opponentRatio = Math.max(0.1, Math.min(0.9, this.opponentScore / totalScore));
    
    this.yourScoreBar.setScale(yourRatio, 1);
    this.opponentScoreBar.setScale(opponentRatio, 1);
    
    // Update colors based on who's winning
    if (this.score > this.opponentScore) {
      this.yourScoreBar.setFillStyle(0x00ff00, 0.8);
      this.opponentScoreBar.setFillStyle(0xff0000, 0.5);
    } else if (this.opponentScore > this.score) {
      this.yourScoreBar.setFillStyle(0x00ff00, 0.5);
      this.opponentScoreBar.setFillStyle(0xff0000, 0.8);
    } else {
      this.yourScoreBar.setFillStyle(0x00ff00, 0.5);
      this.opponentScoreBar.setFillStyle(0xff0000, 0.5);
    }
  }
  
  protected loadSpectatorViewPreference(): boolean {
    try {
      const stored = localStorage.getItem('cryptoBeats_spectatorView');
      return stored !== null ? stored === 'true' : true; // Default to true
    } catch (error) {
      console.warn('[MultiplayerGameScene] Error loading spectator view preference:', error);
      return true; // Default to true
    }
  }
  
  protected saveSpectatorViewPreference(enabled: boolean): void {
    try {
      localStorage.setItem('cryptoBeats_spectatorView', enabled.toString());
    } catch (error) {
      console.warn('[MultiplayerGameScene] Error saving spectator view preference:', error);
    }
  }
  
  protected setupSpectatorToggle(): void {
    const { width, height } = this.scale;
    
    // Toggle button (top right, below connection status)
    const buttonX = width - getResponsiveSpacing(100, width);
    const buttonY = getResponsiveSpacing(100, height);
    
    // Background for button
    this.spectatorToggleBg = this.add.rectangle(
      buttonX,
      buttonY,
      getResponsiveSpacing(80, width),
      getResponsiveSpacing(30, height),
      this.showSpectatorView ? 0x00aa00 : 0x666666,
      0.8
    ).setDepth(103).setInteractive();
    
    // Button text
    this.spectatorToggleText = this.add.text(
      buttonX,
      buttonY,
      this.showSpectatorView ? "👁️ ON" : "👁️ OFF",
      {
        fontSize: getResponsiveFontSize(14, width, 12, 18),
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(104);
    
    // Hover effects
    this.spectatorToggleBg.on('pointerover', () => {
      if (this.spectatorToggleBg) {
        this.spectatorToggleBg.setFillStyle(
          this.showSpectatorView ? 0x00ff00 : 0x888888,
          0.9
        );
      }
    });
    
    this.spectatorToggleBg.on('pointerout', () => {
      if (this.spectatorToggleBg) {
        this.spectatorToggleBg.setFillStyle(
          this.showSpectatorView ? 0x00aa00 : 0x666666,
          0.8
        );
      }
    });
    
    // Click handler
    this.spectatorToggleBg.on('pointerdown', () => {
      this.toggleSpectatorView();
    });
  }
  
  protected toggleSpectatorView(): void {
    this.showSpectatorView = !this.showSpectatorView;
    
    // Save preference
    this.saveSpectatorViewPreference(this.showSpectatorView);
    
    // Update button appearance
    if (this.spectatorToggleBg) {
      this.spectatorToggleBg.setFillStyle(
        this.showSpectatorView ? 0x00aa00 : 0x666666,
        0.8
      );
    }
    if (this.spectatorToggleText) {
      this.spectatorToggleText.setText(this.showSpectatorView ? "👁️ ON" : "👁️ OFF");
    }
    
    // Show/hide opponent replay
    if (this.showSpectatorView) {
      if (!this.opponentReplay) {
        this.setupOpponentReplay();
      } else {
        // Show existing replay
        if (this.opponentReplay.background) this.opponentReplay.background.setVisible(true);
        if (this.opponentReplay.titleText) this.opponentReplay.titleText.setVisible(true);
        if (this.opponentReplay.judgmentLine) this.opponentReplay.judgmentLine.setVisible(true);
        Object.values(this.opponentReplay.opponentKeyVisuals).forEach(visual => visual.setVisible(true));
        this.opponentReplay.opponentNotes.forEach(note => note.setVisible(true));
      }
    } else {
      // Hide opponent replay
      if (this.opponentReplay) {
        if (this.opponentReplay.background) this.opponentReplay.background.setVisible(false);
        if (this.opponentReplay.titleText) this.opponentReplay.titleText.setVisible(false);
        if (this.opponentReplay.judgmentLine) this.opponentReplay.judgmentLine.setVisible(false);
        Object.values(this.opponentReplay.opponentKeyVisuals).forEach(visual => visual.setVisible(false));
        this.opponentReplay.opponentNotes.forEach(note => note.setVisible(false));
      }
    }
    
    // Show feedback
    this.showToggleFeedback();
  }
  
  protected showToggleFeedback(): void {
    const { width, height } = this.scale;
    
    if (this.toggleFeedbackText) this.toggleFeedbackText.destroy();
    
    this.toggleFeedbackText = this.add.text(
      width / 2,
      height / 2,
      this.showSpectatorView ? "Spectator View: ON" : "Spectator View: OFF",
      {
        fontSize: getResponsiveFontSize(24, width, 18, 30),
        color: this.showSpectatorView ? "#00ff00" : "#ff0000",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: { x: 15, y: 10 }
      }
    ).setOrigin(0.5).setDepth(1000);
    
    // Fade out after 1 second
    this.tweens.add({
      targets: this.toggleFeedbackText,
      alpha: 0,
      duration: 1000,
      delay: 500,
      onComplete: () => {
        if (this.toggleFeedbackText) {
          this.toggleFeedbackText.destroy();
          this.toggleFeedbackText = undefined;
        }
      }
    });
  }
  
  protected setupOpponentReplay(): void {
    const { width, height } = this.scale;
    
    // Create opponent view area (right side, 30% width)
    const opponentViewWidth = width * 0.3;
    const opponentViewHeight = height * 0.6;
    const opponentViewX = width - opponentViewWidth;
    const opponentViewY = getResponsiveSpacing(130, height); // Below score panel
    
    const viewArea = {
      x: opponentViewX,
      y: opponentViewY,
      width: opponentViewWidth,
      height: opponentViewHeight
    };
    
    this.opponentReplay = new OpponentReplaySystem(this, viewArea);
  }
  
  protected updateOpponentDisplay(): void {
    // This is called when opponent score updates from server
    this.updateMultiplayerScores();
  }
  
  // Override spawnKey to also spawn notes in opponent view
  spawnKey(key: string, isHoldNote: boolean, duration: number = 0): void {
    // Call parent to spawn note in main game
    super.spawnKey(key, isHoldNote, duration);
    
    // Also spawn in opponent view (same song, same notes) - only if spectator view is on
    if (this.showSpectatorView && this.opponentReplay && this.synchronizedStart) {
      this.opponentReplay.spawnOpponentNote({
        key: key,
        time: this.music ? ((this.music as any).currentTime || 0) : 0,
        isHold: isHoldNote,
        duration: duration
      });
    }
  }
  
  // Override handlePlayerInput to send input events for spectator view
  handlePlayerInput(event: KeyboardEvent): void {
    const keyPressed = event.key.toUpperCase();
    const scoreBefore = this.score;
    const comboBefore = this.currentStreak;
    
    // Call parent to handle actual gameplay
    super.handlePlayerInput(event);
    
    // Determine quality based on score/combo change
    let quality = "miss";
    const scoreChange = this.score - scoreBefore;
    const comboChange = this.currentStreak - comboBefore;
    
    if (comboChange > 0) {
      // Note was hit - determine quality from score change
      // Perfect = 20 base, Good = 10 base (before multiplier)
      // But we need to account for combo multiplier
      const comboMultiplier = this.getComboMultiplier(comboBefore);
      const baseScore = scoreChange / comboMultiplier;
      
      if (baseScore >= 18) { // Close to 20 (perfect)
        quality = "perfect";
      } else if (baseScore >= 8) { // Close to 10 (good)
        quality = "good";
      } else {
        quality = "good"; // Default to good if hit
      }
    }
    
    // Send input event to server for opponent's spectator view (only if enabled)
    if (this.showSpectatorView && this.socket && this.socket.connected && this.synchronizedStart) {
      // Only send if it's a valid game key
      if (['W', 'A', 'S', 'D'].includes(keyPressed)) {
        // Throttle input updates (every 50ms)
        if (!this.lastInputUpdate || (Date.now() - this.lastInputUpdate) > 50) {
          const currentTime = this.music ? ((this.music as any).currentTime || 0) : 0;
          
          this.socket.emit('playerInput', {
            key: keyPressed,
            timestamp: Date.now(),
            gameTime: currentTime,
            quality: quality
          });
          
          this.lastInputUpdate = Date.now();
        }
      }
    }
  }
  
  // Override update to also update opponent replay
  update(time: number, delta: number): void {
    // Only update if synchronized start has occurred (or single player mode)
    if (!this.roomId || this.synchronizedStart) {
      super.update(time, delta);
      
      // Update opponent replay system (only if spectator view is enabled)
      if (this.showSpectatorView && this.opponentReplay && this.synchronizedStart) {
        // Spawn opponent notes (same song, so same notes at same time)
        // We spawn notes in opponent view when they spawn in our view
        // This keeps them synchronized
        
        // Update opponent notes movement
        if (this.PIXELS_PER_SECOND) {
          this.opponentReplay.updateOpponentNotes(delta, this.PIXELS_PER_SECOND);
        }
      }
      
      // Check if game ended (music stopped)
      if (this.music && (!this.music.isPlaying || (this.music as any).currentTime >= this.music.duration)) {
        if (!this.gameEndHandled) {
          this.handleGameEnd();
        }
      }
    }
  }
  
  protected showOpponentFinished(data: OpponentFinishedData): void {
    const { width, height } = this.scale;
    
    if (this.opponentFinishedText) this.opponentFinishedText.destroy();
    
    this.opponentFinishedText = this.add.text(
      width / 2,
      height / 2 - getResponsiveSpacing(100, height),
      "Opponent Finished!",
      {
        fontSize: getResponsiveFontSize(32, width, 24, 40),
        color: "#ff0000",
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(1000);
    
    // Show opponent's final score
    if (data.finalScore !== undefined) {
      const scoreText = this.add.text(
        width / 2,
        height / 2 - getResponsiveSpacing(60, height),
        `Score: ${data.finalScore.toLocaleString()}`,
        {
          fontSize: getResponsiveFontSize(24, width, 18, 30),
          color: "#ffffff"
        }
      ).setOrigin(0.5).setDepth(1000);
    }
  }
  
  protected showMultiplayerError(message: string): void {
    const { width, height } = this.scale;
    
    if (this.errorText) this.errorText.destroy();
    
    this.errorText = this.add.text(
      width / 2,
      height - getResponsiveSpacing(100, height),
      `Error: ${message}`,
      {
        fontSize: getResponsiveFontSize(18, width, 14, 22),
        color: "#ff0000",
        backgroundColor: "#330000",
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5).setDepth(1000);
    
    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.errorText) {
        this.errorText.destroy();
        this.errorText = null;
      }
    });
  }
  
  
  protected handleGameEnd(): void {
    this.gameEndHandled = true;
    
    // Send game end to server
    if (this.socket && this.socket.connected && !this.gameEndSent) {
      const percentageHit = this.totalNotes > 0 ? (this.notesHit / this.totalNotes) * 100 : 0;
      
      this.socket.emit('gameEnd', {
        score: this.score,
        accuracy: percentageHit,
        totalNotes: this.totalNotes,
        notesHit: this.notesHit,
        longestStreak: this.longestStreak
      });
      this.gameEndSent = true;
    }
    
    // If opponent hasn't finished yet, wait a bit for their final stats
    if (!this.opponentFinished) {
      this.showWaitingForOpponent();
      // Wait up to 10 seconds for opponent to finish
      this.waitForOpponentTimeout = this.time.delayedCall(10000, () => {
        this.transitionToDebrief();
      });
    } else {
      // Opponent already finished, transition immediately
      this.transitionToDebrief();
    }
  }
  
  protected showWaitingForOpponent(): void {
    const { width, height } = this.scale;
    
    if (this.waitingText) this.waitingText.destroy();
    
    this.waitingText = this.add.text(
      width / 2,
      height / 2,
      "Waiting for opponent to finish...",
      {
        fontSize: getResponsiveFontSize(32, width, 24, 40),
        color: "#ffff00",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: { x: 20, y: 15 }
      }
    ).setOrigin(0.5).setDepth(1000);
  }
  
  protected transitionToDebrief(): void {
    // Clear waiting timeout if it exists
    if (this.waitForOpponentTimeout) {
      this.time.removeEvent(this.waitForOpponentTimeout);
      this.waitForOpponentTimeout = null;
    }
    
    // Remove waiting text
    if (this.waitingText) {
      this.waitingText.destroy();
      this.waitingText = null;
    }
    
    // Transition to multiplayer debrief scene
    const percentageHit = this.totalNotes > 0 ? (this.notesHit / this.totalNotes) * 100 : 0;
    const averageCombo = this.comboHistory.length > 0
      ? this.comboHistory.reduce((a, b) => a + b, 0) / this.comboHistory.length
      : 0;
    
    // Calculate opponent accuracy if we have their data
    const opponentAccuracy = this.opponentTotalNotes > 0 
      ? (this.opponentNotesHit / this.opponentTotalNotes) * 100 
      : 0;
    
    this.scene.start("MultiplayerDebriefScene", {
      // Your stats
      score: this.score,
      totalNotes: this.totalNotes,
      notesHit: this.notesHit,
      longestStreak: this.longestStreak,
      averageCombo: Math.round(averageCombo * 10) / 10,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
      failed: this.failed,
      
      // Opponent stats
      opponentScore: this.opponentScore,
      opponentAccuracy: opponentAccuracy,
      opponentTotalNotes: this.opponentTotalNotes || 0,
      opponentNotesHit: this.opponentNotesHit || 0,
      opponentLongestStreak: this.opponentLongestStreak || 0,
      
      // Match info
      song: this.currentSongId,
      difficulty: this.currentDifficulty,
      roomId: this.roomId
    });
  }
  
  shutdown(): void {
    // Cleanup spectator toggle
    if (this.spectatorToggleBg) this.spectatorToggleBg.destroy();
    if (this.spectatorToggleText) this.spectatorToggleText.destroy();
    if (this.toggleFeedbackText) this.toggleFeedbackText.destroy();
    
    // Cleanup opponent replay
    if (this.opponentReplay) {
      this.opponentReplay.destroy();
      this.opponentReplay = null;
    }
    
    // Send game end if not already sent
    if (this.socket && this.socket.connected && !this.gameEndSent) {
      const percentageHit = this.totalNotes > 0 ? (this.notesHit / this.totalNotes) * 100 : 0;
      
      this.socket.emit('gameEnd', {
        score: this.score,
        accuracy: percentageHit,
        totalNotes: this.totalNotes,
        notesHit: this.notesHit,
        longestStreak: this.longestStreak
      });
      this.gameEndSent = true;
    }
    
    // Disconnect socket (but don't disconnect if we're transitioning to debrief)
    // The socket will be cleaned up when scene fully shuts down
    
    // Call parent shutdown
    super.shutdown();
  }
}

