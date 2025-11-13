import Phaser from "phaser";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    
    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);

    // Try to load background image, with fallback
    if (this.textures.exists("background")) {
      this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);
    } else {
      // Fallback: solid color background if image doesn't load
      console.warn("Background image not found, using fallback color");
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }

    this.add.text(width / 2, height / 4, "Crypto Beats", {
        fontSize: "48px",
        fill: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    // Resume music if it's paused, otherwise play it
    if (this.sound.get("menuMusic")) {
        this.menuMusic = this.sound.get("menuMusic");
        if (this.menuMusic.isPaused) {
            this.menuMusic.resume();
        }
    } else {
        this.menuMusic = this.sound.add("menuMusic", { loop: true, volume: 0.5 });
        this.menuMusic.play();
    }

    let startButton = this.add.text(width / 2, height / 2, "Start Game", {
        fontSize: "32px",
        fill: "#ffffff",
        backgroundColor: "#008CBA",
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    startButton.on("pointerdown", () => {
        this.scene.start("SongSelectionScene");
        this.menuMusic.pause(); // Pause instead of stopping
    });

    let aboutButton = this.add.text(width / 2, height / 2 + 80, "About Us", {
        fontSize: "32px",
        fill: "#ffffff",
        backgroundColor: "#555",
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    aboutButton.on("pointerdown", () => {
        this.scene.start("AboutUsScene");
    });
  }
}
