import Phaser from "phaser";
import { getSongById } from "../../config/songs";
import { DIFFICULTY_CONFIG } from "../../utils/game/difficultyManager";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveButtonSize
} from "../../utils/ui/responsive";

interface MultiplayerDebriefData {
  score?: number;
  totalNotes?: number;
  notesHit?: number;
  longestStreak?: number;
  averageCombo?: number;
  perfectCount?: number;
  goodCount?: number;
  missCount?: number;
  failed?: boolean;
  opponentScore?: number;
  opponentAccuracy?: number;
  opponentTotalNotes?: number;
  opponentNotesHit?: number;
  opponentLongestStreak?: number;
  opponentDisconnected?: boolean;
  song?: string;
  difficulty?: string;
  roomId?: string | null;
}

export default class MultiplayerDebriefScene extends Phaser.Scene {
  private yourScore: number = 0;
  private yourTotalNotes: number = 1;
  private yourNotesHit: number = 0;
  private yourLongestStreak: number = 0;
  private yourAverageCombo: number = 0;
  private yourPerfectCount: number = 0;
  private yourGoodCount: number = 0;
  private yourMissCount: number = 0;
  private yourFailed: boolean = false;
  private opponentScore: number = 0;
  private opponentAccuracy: number = 0;
  private opponentTotalNotes: number = 0;
  private opponentNotesHit: number = 0;
  private opponentLongestStreak: number = 0;
  private opponentDisconnected: boolean = false;
  private song: string = "Aguado_Menuet_Aminor";
  private difficulty: string = "normal";
  private roomId: string | null = null;
  private isWinner: boolean = false;
  private isTie: boolean = false;
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private songText?: Phaser.GameObjects.Text;
  private scorePanel?: Phaser.GameObjects.Rectangle;
  private yourLabel?: Phaser.GameObjects.Text;
  private yourScoreText?: Phaser.GameObjects.Text;
  private yourAccuracyText?: Phaser.GameObjects.Text;
  private yourBreakdownText?: Phaser.GameObjects.Text;
  private yourComboText?: Phaser.GameObjects.Text;
  private vsText?: Phaser.GameObjects.Text;
  private opponentLabel?: Phaser.GameObjects.Text;
  private opponentScoreText?: Phaser.GameObjects.Text;
  private opponentAccuracyText?: Phaser.GameObjects.Text;
  private opponentComboText?: Phaser.GameObjects.Text;
  private diffText?: Phaser.GameObjects.Text;
  private rematchButton?: Phaser.GameObjects.Rectangle;
  private rematchText?: Phaser.GameObjects.Text;
  private menuButton?: Phaser.GameObjects.Rectangle;
  private menuText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "MultiplayerDebriefScene" });
  }

  init(data?: MultiplayerDebriefData): void {
    // Your stats
    this.yourScore = data?.score || 0;
    this.yourTotalNotes = data?.totalNotes || 1;
    this.yourNotesHit = data?.notesHit || 0;
    this.yourLongestStreak = data?.longestStreak || 0;
    this.yourAverageCombo = data?.averageCombo || 0;
    this.yourPerfectCount = data?.perfectCount || 0;
    this.yourGoodCount = data?.goodCount || 0;
    this.yourMissCount = data?.missCount || 0;
    this.yourFailed = data?.failed || false;
    
    // Opponent stats
    this.opponentScore = data?.opponentScore || 0;
    this.opponentAccuracy = data?.opponentAccuracy || 0;
    this.opponentTotalNotes = data?.opponentTotalNotes || 0;
    this.opponentNotesHit = data?.opponentNotesHit || 0;
    this.opponentLongestStreak = data?.opponentLongestStreak || 0;
    this.opponentDisconnected = data?.opponentDisconnected || false;
    
    // Match info
    this.song = data?.song || "Aguado_Menuet_Aminor";
    this.difficulty = data?.difficulty || "normal";
    this.roomId = data?.roomId || null;
    
    // Determine winner (if opponent disconnected, you win by default)
    if (this.opponentDisconnected || this.opponentTotalNotes === 0) {
      this.isWinner = true;
      this.isTie = false;
    } else {
      this.isWinner = this.yourScore > this.opponentScore;
      this.isTie = this.yourScore === this.opponentScore;
      console.log(`[MultiplayerDebriefScene] Score comparison:`, {
        yourScore: this.yourScore,
        opponentScore: this.opponentScore,
        isWinner: this.isWinner,
        isTie: this.isTie,
        diff: this.yourScore - this.opponentScore
      });
    }
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
    
    // Calculate your accuracy
    const yourAccuracy = parseFloat(((this.yourNotesHit / this.yourTotalNotes) * 100).toFixed(1));
    const opponentAccuracy = this.opponentAccuracy || 0;
    
    this.setupUI(yourAccuracy, opponentAccuracy);
    
    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);
  }

  private destroyUI(): void {
    // Destroy all UI elements
    if (this.titleText) this.titleText.destroy();
    if (this.songText) this.songText.destroy();
    if (this.scorePanel) this.scorePanel.destroy();
    if (this.yourLabel) this.yourLabel.destroy();
    if (this.yourScoreText) this.yourScoreText.destroy();
    if (this.yourAccuracyText) this.yourAccuracyText.destroy();
    if (this.yourBreakdownText) this.yourBreakdownText.destroy();
    if (this.yourComboText) this.yourComboText.destroy();
    if (this.vsText) this.vsText.destroy();
    if (this.opponentLabel) this.opponentLabel.destroy();
    if (this.opponentScoreText) this.opponentScoreText.destroy();
    if (this.opponentAccuracyText) this.opponentAccuracyText.destroy();
    if (this.opponentComboText) this.opponentComboText.destroy();
    if (this.diffText) this.diffText.destroy();
    if (this.rematchButton) this.rematchButton.destroy();
    if (this.rematchText) this.rematchText.destroy();
    if (this.menuButton) this.menuButton.destroy();
    if (this.menuText) this.menuText.destroy();
    
    // Clear references
    this.titleText = undefined;
    this.songText = undefined;
    this.scorePanel = undefined;
    this.yourLabel = undefined;
    this.yourScoreText = undefined;
    this.yourAccuracyText = undefined;
    this.yourBreakdownText = undefined;
    this.yourComboText = undefined;
    this.vsText = undefined;
    this.opponentLabel = undefined;
    this.opponentScoreText = undefined;
    this.opponentAccuracyText = undefined;
    this.opponentComboText = undefined;
    this.diffText = undefined;
    this.rematchButton = undefined;
    this.rematchText = undefined;
    this.menuButton = undefined;
    this.menuText = undefined;
  }

  private setupUI(yourAccuracy: number, opponentAccuracy: number): void {
    const { width, height } = this.scale;
    
    // Title - Winner/Loser/Tie
    const titleSize = getResponsiveTitleSize(width);
    let titleText = "";
    let titleColor = "#ffffff";
    
    if (this.isTie) {
      titleText = "IT'S A TIE!";
      titleColor = "#ffff00";
    } else if (this.isWinner) {
      titleText = "VICTORY!";
      titleColor = "#00ff00";
    } else {
      titleText = "DEFEAT";
      titleColor = "#ff0000";
    }
    
    this.titleText = this.add.text(width / 2, getResponsiveSpacing(40, height), titleText, {
      fontSize: titleSize,
      color: titleColor,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(3, Math.round(6 * (width / 1920)))
    }).setOrigin(0.5);
    
    // Song info
    const song = getSongById(this.song);
    const songName = song ? song.name : this.song;
    const difficultyConfig = DIFFICULTY_CONFIG[this.difficulty as keyof typeof DIFFICULTY_CONFIG];
    
    this.songText = this.add.text(width / 2, getResponsiveSpacing(100, height), 
      `${songName} - ${difficultyConfig.name}`, {
      fontSize: getResponsiveFontSize(20, width, 16, 24),
      color: "#aaaaaa"
    }).setOrigin(0.5);
    
    // Score comparison panel
    const panelY = getResponsiveSpacing(160, height);
    const panelHeight = getResponsiveSpacing(400, height);
    
    // Background panel
    this.scorePanel = this.add.rectangle(
      width / 2,
      panelY + panelHeight / 2,
      width * 0.9,
      panelHeight,
      0x000000,
      0.7
    ).setStrokeStyle(3, this.isWinner ? 0x00ff00 : this.isTie ? 0xffff00 : 0xff0000);
    
    // Your stats (left side)
    const leftX = width * 0.25;
    const rightX = width * 0.75;
    const statsY = panelY + getResponsiveSpacing(40, height);
    const statsSpacing = getResponsiveSpacing(35, height);
    
    // Your label
    this.yourLabel = this.add.text(leftX, statsY, "YOU", {
      fontSize: getResponsiveFontSize(28, width, 22, 34),
      color: "#00ff00",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Your score
    this.yourScoreText = this.add.text(leftX, statsY + statsSpacing, 
      `Score: ${this.yourScore.toLocaleString()}`, {
      fontSize: getResponsiveFontSize(32, width, 24, 40),
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Your accuracy
    this.yourAccuracyText = this.add.text(leftX, statsY + statsSpacing * 2,
      `Accuracy: ${yourAccuracy}%`, {
      fontSize: getResponsiveFontSize(22, width, 18, 26),
      color: "#ffffff"
    }).setOrigin(0.5);
    
    // Your breakdown
    this.yourBreakdownText = this.add.text(leftX, statsY + statsSpacing * 3,
      `Perfect: ${this.yourPerfectCount} | Good: ${this.yourGoodCount} | Miss: ${this.yourMissCount}`, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      color: "#aaaaaa"
    }).setOrigin(0.5);
    
    // Your combo
    this.yourComboText = this.add.text(leftX, statsY + statsSpacing * 4,
      `Longest Combo: ${this.yourLongestStreak}x`, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      color: "#ffff00"
    }).setOrigin(0.5);
    
    // VS text in center
    this.vsText = this.add.text(width / 2, statsY + statsSpacing * 2, "VS", {
      fontSize: getResponsiveFontSize(48, width, 36, 60),
      color: "#ffff00",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);
    
    // Opponent stats (right side)
    if (this.opponentDisconnected || this.opponentTotalNotes === 0) {
      // Opponent disconnected or no data
      this.opponentLabel = this.add.text(rightX, statsY, "OPPONENT", {
        fontSize: getResponsiveFontSize(28, width, 22, 34),
        color: "#666666",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      this.opponentScoreText = this.add.text(rightX, statsY + statsSpacing * 2,
        "Disconnected", {
        fontSize: getResponsiveFontSize(22, width, 18, 26),
        color: "#666666",
        fontStyle: "italic"
      }).setOrigin(0.5);
    } else {
      // Opponent completed the match
      this.opponentLabel = this.add.text(rightX, statsY, "OPPONENT", {
        fontSize: getResponsiveFontSize(28, width, 22, 34),
        color: "#ff0000",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      // Opponent score
      this.opponentScoreText = this.add.text(rightX, statsY + statsSpacing,
        `Score: ${this.opponentScore.toLocaleString()}`, {
        fontSize: getResponsiveFontSize(32, width, 24, 40),
        color: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      // Opponent accuracy
      this.opponentAccuracyText = this.add.text(rightX, statsY + statsSpacing * 2,
        `Accuracy: ${opponentAccuracy.toFixed(1)}%`, {
        fontSize: getResponsiveFontSize(22, width, 18, 26),
        color: "#ffffff"
      }).setOrigin(0.5);
      
      // Opponent combo
      if (this.opponentLongestStreak > 0) {
        this.opponentComboText = this.add.text(rightX, statsY + statsSpacing * 3,
          `Longest Combo: ${this.opponentLongestStreak}x`, {
          fontSize: getResponsiveFontSize(18, width, 14, 22),
          color: "#ff6666"
        }).setOrigin(0.5);
      }
    }
    
    // Score difference (only show if opponent completed)
    if (!this.opponentDisconnected && this.opponentTotalNotes > 0) {
      const scoreDiff = Math.abs(this.yourScore - this.opponentScore);
      if (scoreDiff > 0) {
        this.diffText = this.add.text(width / 2, statsY + statsSpacing * 5,
          `Difference: ${scoreDiff.toLocaleString()} points`, {
          fontSize: getResponsiveFontSize(20, width, 16, 24),
          color: this.isWinner ? "#00ff00" : "#ff0000",
          fontStyle: "bold"
        }).setOrigin(0.5);
      }
    }
    
    // Buttons
    const buttonY = panelY + panelHeight + getResponsiveSpacing(60, height);
    const buttonSpacing = getResponsiveSpacing(100, width);
    const buttonWidth = getResponsiveSpacing(150, width);
    const buttonHeight = getResponsiveSpacing(50, height);
    const buttonFontSize = getResponsiveFontSize(24, width, 18, 30);
    
    // Rematch button (if room still exists)
    if (this.roomId) {
      this.rematchButton = this.add.rectangle(
        width / 2 - buttonSpacing,
        buttonY,
        buttonWidth,
        buttonHeight,
        0x00aa00,
        1
      ).setInteractive();
      
      this.rematchText = this.add.text(width / 2 - buttonSpacing, buttonY, "Rematch", {
        fontSize: buttonFontSize,
        color: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      this.rematchButton.on("pointerdown", () => {
        // Go back to multiplayer lobby to create/join new room
        this.scene.start("MultiplayerLobbyScene");
      });
      
      this.rematchButton.on("pointerover", () => {
        if (this.rematchButton) {
          this.rematchButton.setFillStyle(0x00ff00, 1);
        }
      });
      
      this.rematchButton.on("pointerout", () => {
        if (this.rematchButton) {
          this.rematchButton.setFillStyle(0x00aa00, 1);
        }
      });
    }
    
    // Main Menu button
    this.menuButton = this.add.rectangle(
      width / 2 + (this.roomId ? buttonSpacing : 0),
      buttonY,
      buttonWidth,
      buttonHeight,
      0x555555,
      1
    ).setInteractive();
    
    this.menuText = this.add.text(width / 2 + (this.roomId ? buttonSpacing : 0), buttonY, "Main Menu", {
      fontSize: buttonFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    this.menuButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
    
    this.menuButton.on("pointerover", () => {
      if (this.menuButton) {
        this.menuButton.setFillStyle(0x666666, 1);
      }
    });
    
    this.menuButton.on("pointerout", () => {
      if (this.menuButton) {
        this.menuButton.setFillStyle(0x555555, 1);
      }
    });
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
    
    // Destroy old UI and recreate with new dimensions
    this.destroyUI();
    const yourAccuracy = parseFloat(((this.yourNotesHit / this.yourTotalNotes) * 100).toFixed(1));
    const opponentAccuracy = this.opponentAccuracy || 0;
    this.setupUI(yourAccuracy, opponentAccuracy);
  }
}

