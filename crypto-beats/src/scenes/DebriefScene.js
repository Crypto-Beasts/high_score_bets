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
    this.failed = data.failed || false;
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    const percentageHit = ((this.notesHit / this.totalNotes) * 100).toFixed(1);
    const stars = this.calculateStars(percentageHit);
    const crowdReaction = this.getCrowdReaction(percentageHit);

    this.add.text(width / 2, height / 6, "Song Complete!", {
        fontSize: "36px",
        fill: "#fff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 3, `Final Score: ${this.score}`, {
        fontSize: "28px",
        fill: "#fff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2.5, `Accuracy: ${percentageHit}%`, {
        fontSize: "28px",
        fill: "#fff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2.2, `Longest Streak: ${this.longestStreak}`, {
        fontSize: "28px",
        fill: "#fff",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `⭐ Stars: ${"⭐".repeat(stars)}`, {
        fontSize: "32px",
        fill: "#ffcc00",
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 1.8, crowdReaction, {
        fontSize: "28px",
        fill: "#fff",
    }).setOrigin(0.5);
    
    // Buttons
    let retryButton = this.add.text(width / 2, height / 1.5, "Retry", {
      fontSize: "24px",
      fill: "#0f0",
    }).setOrigin(0.5).setInteractive();

    let menuButton = this.add.text(width / 2, height / 1.3, "Main Menu", {
      fontSize: "24px",
      fill: "#f00",
    }).setOrigin(0.5).setInteractive();

    retryButton.on("pointerdown", () => {
      this.scene.start("GameScene");
    });

    menuButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
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
    if (accuracy >= 90) return "The crowd goes wild!";
    if (accuracy >= 70) return "The audience is impressed!";
    if (accuracy >= 50) return "A few cheers, a few boos.";
    return "The audience is disappointed...";
  }
}
