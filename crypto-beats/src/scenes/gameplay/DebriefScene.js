import Phaser from "phaser";
import { getSongById, getAllSongs } from "../../config/songs.js";
import { DIFFICULTY_CONFIG } from "../../utils/game/difficultyManager.js";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveButtonSize
} from "../../utils/ui/responsive.js";
import { 
  checkAchievements, 
  recordSongCompletion, 
  getAchievement,
  getAllAchievements 
} from "../../utils/game/achievements.js";

export default class DebriefScene extends Phaser.Scene {
  constructor() {
    super({ key: "DebriefScene" });
  }

  init(data) {
    this.score = data.score || 0;
    this.totalNotes = data.totalNotes || 1; // Avoid division by zero
    this.notesHit = data.notesHit || 0;
    this.longestStreak = data.longestStreak || 0;
    this.averageCombo = data.averageCombo || 0;
    this.perfectCount = data.perfectCount || 0;
    this.goodCount = data.goodCount || 0;
    this.missCount = data.missCount || 0;
    this.failed = data.failed || false;
    this.song = data.song || "Aguado_Menuet_Aminor";
    this.difficulty = data.difficulty || "normal";
  }

      create() {
        // Record song completion for achievements
        const percentageHit = parseFloat(((this.notesHit / this.totalNotes) * 100).toFixed(1));
        const grade = this.calculateGrade(percentageHit);
        
        recordSongCompletion(
          this.song,
          this.difficulty,
          percentageHit,
          grade,
          this.longestStreak
        );
        
        // Check for achievements
        const totalSongs = getAllSongs().length;
        const gameData = {
          accuracy: percentageHit,
          grade: grade,
          difficulty: this.difficulty,
          longestStreak: this.longestStreak,
          failed: this.failed,
          song: this.song
        };
        
        const newlyUnlocked = checkAchievements(gameData, totalSongs);
        
        // Store newly unlocked achievements for notification
        this.newlyUnlockedAchievements = newlyUnlocked;
        
        this.setupUI();
        
        // Show achievement notifications after a short delay
        if (newlyUnlocked.length > 0) {
          this.time.delayedCall(1000, () => {
            this.showAchievementNotifications(newlyUnlocked);
          });
        }
        
        // Listen for resize events
        this.scale.on('resize', this.handleResize, this);
      }

      setupUI() {
        const { width, height } = this.scale;
        
        // Safety check: ensure scene is fully initialized
        if (!this.cameras || !this.cameras.main) {
          console.warn("[DebriefScene] Scene not fully initialized, skipping setupUI");
          return;
        }
        
        // Clear existing UI if recreating - destroy all children except background
        const childrenToDestroy = [];
        this.children.list.forEach(child => {
          if (child !== this.backgroundImage && child !== this.backgroundRect) {
            childrenToDestroy.push(child);
          }
        });
        childrenToDestroy.forEach(child => child.destroy());
        
        if (this.backgroundImage) this.backgroundImage.destroy();
        if (this.backgroundRect) this.backgroundRect.destroy();
        
        // Set background color as fallback
        this.cameras.main.setBackgroundColor(0x000000);
        
        // Background fills screen
        if (this.textures.exists("background")) {
          this.backgroundImage = this.add.image(width / 2, height / 2, "background");
          this.backgroundImage.setDisplaySize(width, height);
        } else {
          // Fallback: solid color background if image doesn't load
          this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        }

    const percentageHit = ((this.notesHit / this.totalNotes) * 100).toFixed(1);
    const grade = this.calculateGrade(percentageHit);
    const stars = this.calculateStars(percentageHit);
    const crowdReaction = this.getCrowdReaction(percentageHit);

    // Responsive sizing
    const titleSize = getResponsiveTitleSize(width);
    const gradeSize = getResponsiveFontSize(72, width, 48, 96);
    const subtitleSize = getResponsiveSubtitleSize(width);
    const bodySize = getResponsiveBodySize(width);
    const smallSize = getResponsiveFontSize(20, width, 16, 24);
    const titleY = getResponsiveSpacing(60, height);
    const gradeY = getResponsiveSpacing(120, height);
    const scoreY = getResponsiveSpacing(200, height);

    // Title
    const title = this.add.text(width / 2, titleY, "Song Complete!", {
      fontSize: titleSize,
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(2, Math.round(4 * (width / 1920)))
    }).setOrigin(0.5);

    // Grade Display (Large)
    const gradeText = this.add.text(width / 2, gradeY, grade, {
      fontSize: gradeSize,
      fill: this.getGradeColor(grade),
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(3, Math.round(6 * (width / 1920)))
    }).setOrigin(0.5);

    // Score Section
    this.add.text(width / 2, scoreY, `Final Score: ${this.score.toLocaleString()}`, {
      fontSize: subtitleSize,
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Accuracy with percentage bar
    const accuracyY = scoreY + getResponsiveSpacing(50, height);
    const accuracyLabelX = width / 2 - getResponsiveSpacing(100, width);
    this.add.text(accuracyLabelX, accuracyY, `Accuracy: ${percentageHit}%`, {
      fontSize: bodySize,
      fill: "#ffffff"
    }).setOrigin(0.5, 0.5);
    
    // Accuracy bar - responsive
    const barWidth = getResponsiveSpacing(300, width);
    const barHeight = getResponsiveSpacing(20, height);
    const barX = width / 2 + getResponsiveSpacing(50, width);
    const accuracyBarBg = this.add.rectangle(barX, accuracyY, barWidth, barHeight, 0x333333, 1);
    const accuracyBar = this.add.rectangle(
      barX - barWidth / 2 + (barWidth * (percentageHit / 100)) / 2,
      accuracyY,
      barWidth * (percentageHit / 100),
      barHeight,
      this.getAccuracyColor(percentageHit),
      1
    );

    // Statistics Grid - responsive
    const statsY = accuracyY + getResponsiveSpacing(60, height);
    const statsLeftX = width / 2 - getResponsiveSpacing(200, width);
    const statsRightX = width / 2 + getResponsiveSpacing(200, width);
    const statsSpacing = getResponsiveSpacing(35, height);
    const statValueSize = getResponsiveFontSize(22, width, 18, 26);

    // Left column
    this.add.text(statsLeftX, statsY, "Hit Breakdown:", {
      fontSize: smallSize,
      fill: "#aaaaaa",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);

    this.add.text(statsLeftX, statsY + statsSpacing, `Perfect: ${this.perfectCount}`, {
      fontSize: statValueSize,
      fill: "#00ff00"
    }).setOrigin(0, 0.5);

    this.add.text(statsLeftX, statsY + statsSpacing * 2, `Good: ${this.goodCount}`, {
      fontSize: statValueSize,
      fill: "#ffff00"
    }).setOrigin(0, 0.5);

    this.add.text(statsLeftX, statsY + statsSpacing * 3, `Miss: ${this.missCount}`, {
      fontSize: statValueSize,
      fill: "#ff0000"
    }).setOrigin(0, 0.5);

    // Right column
    this.add.text(statsRightX, statsY, "Combo Stats:", {
      fontSize: smallSize,
      fill: "#aaaaaa",
      fontStyle: "bold"
    }).setOrigin(1, 0.5);

    this.add.text(statsRightX, statsY + statsSpacing, `Longest: ${this.longestStreak}x`, {
      fontSize: statValueSize,
      fill: "#ffffff"
    }).setOrigin(1, 0.5);

    this.add.text(statsRightX, statsY + statsSpacing * 2, `Average: ${this.averageCombo}x`, {
      fontSize: statValueSize,
      fill: "#ffffff"
    }).setOrigin(1, 0.5);

    this.add.text(statsRightX, statsY + statsSpacing * 3, `Total Notes: ${this.totalNotes}`, {
      fontSize: statValueSize,
      fill: "#ffffff"
    }).setOrigin(1, 0.5);

    // Stars - responsive
    const starsY = statsY + statsSpacing * 4 + getResponsiveSpacing(20, height);
    const starsSize = getResponsiveFontSize(36, width, 28, 48);
    this.add.text(width / 2, starsY, `⭐ Stars: ${"⭐".repeat(stars)}`, {
      fontSize: starsSize,
      fill: "#ffcc00",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Crowd reaction - responsive
    const reactionY = starsY + getResponsiveSpacing(50, height);
    this.add.text(width / 2, reactionY, crowdReaction, {
      fontSize: bodySize,
      fill: "#ffffff",
      fontStyle: "italic"
    }).setOrigin(0.5);

    // Buttons - responsive
    const buttonY = reactionY + getResponsiveSpacing(80, height);
    const buttonSpacing = getResponsiveSpacing(80, width);
    const buttonWidth = getResponsiveSpacing(150, width);
    const buttonHeight = getResponsiveSpacing(50, height);
    const buttonFontSize = getResponsiveFontSize(24, width, 18, 30);

    // Retry Button
    const retryButton = this.add.rectangle(
      width / 2 - buttonSpacing,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00aa00,
      1
    ).setInteractive();

    const retryText = this.add.text(width / 2 - buttonSpacing, buttonY, "Retry", {
      fontSize: buttonFontSize,
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    retryButton.on("pointerdown", () => {
      this.scene.start("GameScene", {
        song: this.song,
        difficulty: this.difficulty
      });
    });

    retryButton.on("pointerover", () => {
      retryButton.setFillStyle(0x00ff00, 1);
    });

    retryButton.on("pointerout", () => {
      retryButton.setFillStyle(0x00aa00, 1);
    });

    // Share Button
    const shareButton = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x0088cc,
      1
    ).setInteractive();

    const shareText = this.add.text(width / 2, buttonY, "Share", {
      fontSize: buttonFontSize,
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    shareButton.on("pointerdown", () => {
      this.shareScore();
    });

    shareButton.on("pointerover", () => {
      shareButton.setFillStyle(0x00aaff, 1);
    });

    shareButton.on("pointerout", () => {
      shareButton.setFillStyle(0x0088cc, 1);
    });

    // Menu Button
    const menuButton = this.add.rectangle(
      width / 2 + buttonSpacing,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x555555,
      1
    ).setInteractive();

    const menuText = this.add.text(width / 2 + buttonSpacing, buttonY, "Menu", {
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
    this.setupUI();
  }

  calculateGrade(accuracy) {
    if (accuracy >= 95) return "S";
    if (accuracy >= 90) return "A";
    if (accuracy >= 80) return "B";
    if (accuracy >= 70) return "C";
    if (accuracy >= 60) return "D";
    return "F";
  }

  getGradeColor(grade) {
    const colors = {
      "S": "#ff00ff",
      "A": "#00ff00",
      "B": "#00aaff",
      "C": "#ffff00",
      "D": "#ff8800",
      "F": "#ff0000"
    };
    return colors[grade] || "#ffffff";
  }

  getAccuracyColor(percentage) {
    if (percentage >= 90) return 0x00ff00;
    if (percentage >= 70) return 0xffff00;
    if (percentage >= 50) return 0xff8800;
    return 0xff0000;
  }

  calculateStars(accuracy) {
    if (accuracy >= 95) return 5;
    if (accuracy >= 80) return 4;
    if (accuracy >= 60) return 3;
    if (accuracy >= 40) return 2;
    if (accuracy >= 20) return 1;
    return 0;
  }

  showAchievementNotifications(achievementIds) {
    const { width, height } = this.scale;
    
    achievementIds.forEach((achievementId, index) => {
      const achievement = getAchievement(achievementId);
      if (!achievement) return;
      
      // Delay each notification slightly
      this.time.delayedCall(500 * index, () => {
        // Create notification background
        const notificationBg = this.add.rectangle(
          width / 2, 
          height / 2 - getResponsiveSpacing(100, height) + (index * getResponsiveSpacing(80, height)),
          getResponsiveSpacing(400, width),
          getResponsiveSpacing(80, height),
          0x1a1a2e,
          0.95
        );
        notificationBg.setStrokeStyle(3, 0x00ff00);
        
        // Achievement icon
        const iconText = this.add.text(
          width / 2 - getResponsiveSpacing(150, width),
          height / 2 - getResponsiveSpacing(100, height) + (index * getResponsiveSpacing(80, height)),
          achievement.icon,
          {
            fontSize: getResponsiveFontSize(48, width, 36, 60),
          }
        ).setOrigin(0.5);
        
        // Achievement title
        const titleText = this.add.text(
          width / 2,
          height / 2 - getResponsiveSpacing(120, height) + (index * getResponsiveSpacing(80, height)),
          `Achievement Unlocked!`,
          {
            fontSize: getResponsiveFontSize(24, width, 18, 30),
            fill: "#00ff00",
            fontStyle: "bold",
            fontFamily: "'Orbitron', 'Arial', sans-serif"
          }
        ).setOrigin(0.5);
        
        // Achievement name
        const nameText = this.add.text(
          width / 2,
          height / 2 - getResponsiveSpacing(90, height) + (index * getResponsiveSpacing(80, height)),
          achievement.name,
          {
            fontSize: getResponsiveFontSize(20, width, 16, 24),
            fill: "#ffffff",
            fontStyle: "bold"
          }
        ).setOrigin(0.5);
        
        // Achievement description
        const descText = this.add.text(
          width / 2,
          height / 2 - getResponsiveSpacing(70, height) + (index * getResponsiveSpacing(80, height)),
          achievement.description,
          {
            fontSize: getResponsiveFontSize(16, width, 12, 20),
            fill: "#aaaaaa"
          }
        ).setOrigin(0.5);
        
        // Animate notification in
        notificationBg.setAlpha(0);
        iconText.setAlpha(0);
        titleText.setAlpha(0);
        nameText.setAlpha(0);
        descText.setAlpha(0);
        
        this.tweens.add({
          targets: [notificationBg, iconText, titleText, nameText, descText],
          alpha: 1,
          duration: 500,
          ease: "Power2"
        });
        
        // Animate notification out after delay
        this.tweens.add({
          targets: [notificationBg, iconText, titleText, nameText, descText],
          alpha: 0,
          y: `-=${getResponsiveSpacing(50, height)}`,
          duration: 500,
          delay: 3000,
          ease: "Power2",
          onComplete: () => {
            notificationBg.destroy();
            iconText.destroy();
            titleText.destroy();
            nameText.destroy();
            descText.destroy();
          }
        });
      });
    });
  }

  getCrowdReaction(accuracy) {
    if (accuracy >= 95) return "🌟 Perfect performance! The crowd goes wild! 🌟";
    if (accuracy >= 90) return "🎉 Amazing! The audience is ecstatic!";
    if (accuracy >= 80) return "👏 Great job! The crowd is impressed!";
    if (accuracy >= 70) return "👍 Good performance! The audience enjoyed it!";
    if (accuracy >= 50) return "😐 Decent effort. A few cheers, a few boos.";
    if (accuracy >= 30) return "😕 Not great. The audience is unimpressed.";
    return "😢 The audience is disappointed...";
  }

  shareScore() {
    const shareText = `🎵 Crypto Beats Score 🎵
Score: ${this.score.toLocaleString()}
Accuracy: ${((this.notesHit / this.totalNotes) * 100).toFixed(1)}%
Grade: ${this.calculateGrade((this.notesHit / this.totalNotes) * 100)}
Perfect: ${this.perfectCount} | Good: ${this.goodCount} | Miss: ${this.missCount}
Longest Combo: ${this.longestStreak}x

Play Crypto Beats!`;

    if (navigator.share) {
      navigator.share({
        title: "Crypto Beats Score",
        text: shareText
      }).catch(() => {
        this.copyToClipboard(shareText);
      });
    } else {
      this.copyToClipboard(shareText);
    }
  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Score copied to clipboard!");
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Score copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    document.body.removeChild(textArea);
  }
}
