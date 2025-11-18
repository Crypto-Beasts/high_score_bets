import Phaser from "phaser";
import { getSongById } from "../../config/songs.js";
import { DIFFICULTY_CONFIG } from "../../utils/game/difficultyManager.js";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveButtonSize
} from "../../utils/ui/responsive.js";

export default class MultiplayerDebriefScene extends Phaser.Scene {
  constructor() {
    super({ key: "MultiplayerDebriefScene" });
  }

  init(data) {
    // Your stats
    this.yourScore = data.score || 0;
    this.yourTotalNotes = data.totalNotes || 1;
    this.yourNotesHit = data.notesHit || 0;
    this.yourLongestStreak = data.longestStreak || 0;
    this.yourAverageCombo = data.averageCombo || 0;
    this.yourPerfectCount = data.perfectCount || 0;
    this.yourGoodCount = data.goodCount || 0;
    this.yourMissCount = data.missCount || 0;
    this.yourFailed = data.failed || false;
    
    // Opponent stats
    this.opponentScore = data.opponentScore || 0;
    this.opponentAccuracy = data.opponentAccuracy || 0;
    this.opponentTotalNotes = data.opponentTotalNotes || 0;
    this.opponentNotesHit = data.opponentNotesHit || 0;
    this.opponentLongestStreak = data.opponentLongestStreak || 0;
    this.opponentDisconnected = data.opponentDisconnected || false;
    
    // Match info
    this.song = data.song || "Aguado_Menuet_Aminor";
    this.difficulty = data.difficulty || "normal";
    this.roomId = data.roomId || null;
    
    // Determine winner (if opponent disconnected, you win by default)
    if (this.opponentDisconnected || this.opponentTotalNotes === 0) {
      this.isWinner = true;
      this.isTie = false;
    } else {
      this.isWinner = this.yourScore > this.opponentScore;
      this.isTie = this.yourScore === this.opponentScore;
    }
  }

  create() {
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

  setupUI(yourAccuracy, opponentAccuracy) {
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
      fill: titleColor,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(3, Math.round(6 * (width / 1920)))
    }).setOrigin(0.5);
    
    // Song info
    const song = getSongById(this.song);
    const songName = song ? song.name : this.song;
    const difficultyConfig = DIFFICULTY_CONFIG[this.difficulty];
    
    this.songText = this.add.text(width / 2, getResponsiveSpacing(100, height), 
      `${songName} - ${difficultyConfig.name}`, {
      fontSize: getResponsiveFontSize(20, width, 16, 24),
      fill: "#aaaaaa"
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
      fill: "#00ff00",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Your score
    this.yourScoreText = this.add.text(leftX, statsY + statsSpacing, 
      `Score: ${this.yourScore.toLocaleString()}`, {
      fontSize: getResponsiveFontSize(32, width, 24, 40),
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Your accuracy
    this.yourAccuracyText = this.add.text(leftX, statsY + statsSpacing * 2,
      `Accuracy: ${yourAccuracy}%`, {
      fontSize: getResponsiveFontSize(22, width, 18, 26),
      fill: "#ffffff"
    }).setOrigin(0.5);
    
    // Your breakdown
    this.yourBreakdownText = this.add.text(leftX, statsY + statsSpacing * 3,
      `Perfect: ${this.yourPerfectCount} | Good: ${this.yourGoodCount} | Miss: ${this.yourMissCount}`, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      fill: "#aaaaaa"
    }).setOrigin(0.5);
    
    // Your combo
    this.yourComboText = this.add.text(leftX, statsY + statsSpacing * 4,
      `Longest Combo: ${this.yourLongestStreak}x`, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      fill: "#ffff00"
    }).setOrigin(0.5);
    
    // VS text in center
    this.vsText = this.add.text(width / 2, statsY + statsSpacing * 2, "VS", {
      fontSize: getResponsiveFontSize(48, width, 36, 60),
      fill: "#ffff00",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);
    
    // Opponent stats (right side)
    if (this.opponentDisconnected || this.opponentTotalNotes === 0) {
      // Opponent disconnected or no data
      this.opponentLabel = this.add.text(rightX, statsY, "OPPONENT", {
        fontSize: getResponsiveFontSize(28, width, 22, 34),
        fill: "#666666",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      this.opponentScoreText = this.add.text(rightX, statsY + statsSpacing * 2,
        "Disconnected", {
        fontSize: getResponsiveFontSize(22, width, 18, 26),
        fill: "#666666",
        fontStyle: "italic"
      }).setOrigin(0.5);
    } else {
      // Opponent completed the match
      this.opponentLabel = this.add.text(rightX, statsY, "OPPONENT", {
        fontSize: getResponsiveFontSize(28, width, 22, 34),
        fill: "#ff0000",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      // Opponent score
      this.opponentScoreText = this.add.text(rightX, statsY + statsSpacing,
        `Score: ${this.opponentScore.toLocaleString()}`, {
        fontSize: getResponsiveFontSize(32, width, 24, 40),
        fill: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      // Opponent accuracy
      this.opponentAccuracyText = this.add.text(rightX, statsY + statsSpacing * 2,
        `Accuracy: ${opponentAccuracy.toFixed(1)}%`, {
        fontSize: getResponsiveFontSize(22, width, 18, 26),
        fill: "#ffffff"
      }).setOrigin(0.5);
      
      // Opponent combo
      if (this.opponentLongestStreak > 0) {
        this.opponentComboText = this.add.text(rightX, statsY + statsSpacing * 3,
          `Longest Combo: ${this.opponentLongestStreak}x`, {
          fontSize: getResponsiveFontSize(18, width, 14, 22),
          fill: "#ff6666"
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
          fill: this.isWinner ? "#00ff00" : "#ff0000",
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
      const rematchButton = this.add.rectangle(
        width / 2 - buttonSpacing,
        buttonY,
        buttonWidth,
        buttonHeight,
        0x00aa00,
        1
      ).setInteractive();
      
      const rematchText = this.add.text(width / 2 - buttonSpacing, buttonY, "Rematch", {
        fontSize: buttonFontSize,
        fill: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      rematchButton.on("pointerdown", () => {
        // Go back to multiplayer lobby to create/join new room
        this.scene.start("MultiplayerLobbyScene");
      });
      
      rematchButton.on("pointerover", () => {
        rematchButton.setFillStyle(0x00ff00, 1);
      });
      
      rematchButton.on("pointerout", () => {
        rematchButton.setFillStyle(0x00aa00, 1);
      });
    }
    
    // Main Menu button
    const menuButton = this.add.rectangle(
      width / 2 + (this.roomId ? buttonSpacing : 0),
      buttonY,
      buttonWidth,
      buttonHeight,
      0x555555,
      1
    ).setInteractive();
    
    const menuText = this.add.text(width / 2 + (this.roomId ? buttonSpacing : 0), buttonY, "Main Menu", {
      fontSize: buttonFontSize,
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    menuButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
    
    menuButton.on("pointerover", () => {
      menuButton.setFillStyle(0x666666, 1);
    });
    
    menuButton.on("pointerout", () => {
      menuButton.setFillStyle(0x555555, 1);
    });
  }

  handleResize(gameSize) {
    // Recreate UI with new dimensions
    this.setupUI(
      parseFloat(((this.yourNotesHit / this.yourTotalNotes) * 100).toFixed(1)),
      this.opponentAccuracy || 0
    );
  }
}

