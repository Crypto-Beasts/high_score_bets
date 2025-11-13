import Phaser from "phaser";

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
        const { width, height } = this.scale;
        
        // Set background color as fallback
        this.cameras.main.setBackgroundColor(0x000000);
        
        // Background fills screen
        if (this.textures.exists("background")) {
          this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);
        } else {
          // Fallback: solid color background if image doesn't load
          this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        }

    const percentageHit = ((this.notesHit / this.totalNotes) * 100).toFixed(1);
    const grade = this.calculateGrade(percentageHit);
    const stars = this.calculateStars(percentageHit);
    const crowdReaction = this.getCrowdReaction(percentageHit);

    // Title
    const title = this.add.text(width / 2, 60, "Song Complete!", {
      fontSize: "48px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    // Grade Display (Large)
    const gradeText = this.add.text(width / 2, 120, grade, {
      fontSize: "72px",
      fill: this.getGradeColor(grade),
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6
    }).setOrigin(0.5);

    // Score Section
    const scoreY = 200;
    this.add.text(width / 2, scoreY, `Final Score: ${this.score.toLocaleString()}`, {
      fontSize: "32px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Accuracy with percentage bar
    const accuracyY = scoreY + 50;
    this.add.text(width / 2 - 100, accuracyY, `Accuracy: ${percentageHit}%`, {
      fontSize: "24px",
      fill: "#ffffff"
    }).setOrigin(0.5, 0.5);
    
    // Accuracy bar
    const barWidth = 300;
    const barHeight = 20;
    const barX = width / 2 + 50;
    const accuracyBarBg = this.add.rectangle(barX, accuracyY, barWidth, barHeight, 0x333333, 1);
    const accuracyBar = this.add.rectangle(
      barX - barWidth / 2 + (barWidth * (percentageHit / 100)) / 2,
      accuracyY,
      barWidth * (percentageHit / 100),
      barHeight,
      this.getAccuracyColor(percentageHit),
      1
    );

    // Statistics Grid
    const statsY = accuracyY + 60;
    const statsLeftX = width / 2 - 200;
    const statsRightX = width / 2 + 200;
    const statsSpacing = 35;

    // Left column
    this.add.text(statsLeftX, statsY, "Hit Breakdown:", {
      fontSize: "20px",
      fill: "#aaaaaa",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);

    this.add.text(statsLeftX, statsY + statsSpacing, `Perfect: ${this.perfectCount}`, {
      fontSize: "22px",
      fill: "#00ff00"
    }).setOrigin(0, 0.5);

    this.add.text(statsLeftX, statsY + statsSpacing * 2, `Good: ${this.goodCount}`, {
      fontSize: "22px",
      fill: "#ffff00"
    }).setOrigin(0, 0.5);

    this.add.text(statsLeftX, statsY + statsSpacing * 3, `Miss: ${this.missCount}`, {
      fontSize: "22px",
      fill: "#ff0000"
    }).setOrigin(0, 0.5);

    // Right column
    this.add.text(statsRightX, statsY, "Combo Stats:", {
      fontSize: "20px",
      fill: "#aaaaaa",
      fontStyle: "bold"
    }).setOrigin(1, 0.5);

    this.add.text(statsRightX, statsY + statsSpacing, `Longest: ${this.longestStreak}x`, {
      fontSize: "22px",
      fill: "#ffffff"
    }).setOrigin(1, 0.5);

    this.add.text(statsRightX, statsY + statsSpacing * 2, `Average: ${this.averageCombo}x`, {
      fontSize: "22px",
      fill: "#ffffff"
    }).setOrigin(1, 0.5);

    this.add.text(statsRightX, statsY + statsSpacing * 3, `Total Notes: ${this.totalNotes}`, {
      fontSize: "22px",
      fill: "#ffffff"
    }).setOrigin(1, 0.5);

    // Stars
    const starsY = statsY + statsSpacing * 4 + 20;
    this.add.text(width / 2, starsY, `⭐ Stars: ${"⭐".repeat(stars)}`, {
      fontSize: "36px",
      fill: "#ffcc00",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Crowd reaction
    const reactionY = starsY + 50;
    this.add.text(width / 2, reactionY, crowdReaction, {
      fontSize: "24px",
      fill: "#ffffff",
      fontStyle: "italic"
    }).setOrigin(0.5);

    // Buttons
    const buttonY = reactionY + 80;
    const buttonSpacing = 80;

    // Retry Button
    const retryButton = this.add.rectangle(
      width / 2 - buttonSpacing,
      buttonY,
      150,
      50,
      0x00aa00,
      1
    ).setInteractive();

    const retryText = this.add.text(width / 2 - buttonSpacing, buttonY, "Retry", {
      fontSize: "24px",
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
      150,
      50,
      0x0088cc,
      1
    ).setInteractive();

    const shareText = this.add.text(width / 2, buttonY, "Share", {
      fontSize: "24px",
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
      150,
      50,
      0x555555,
      1
    ).setInteractive();

    const menuText = this.add.text(width / 2 + buttonSpacing, buttonY, "Menu", {
      fontSize: "24px",
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
