import Phaser from "phaser";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Game Title
    this.add.text(width / 2, height / 4, "Crypto Beats", {
      fontSize: "48px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Play background music if not already playing
    if (!this.sound.get("menuMusic")) {
      this.menuMusic = this.sound.add("menuMusic", { loop: true, volume: 0.5 });
      this.menuMusic.play();
    }

    // Start Game Button
    let startButton = this.add.text(width / 2, height / 2, "Start Game", {
      fontSize: "32px",
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    startButton.on("pointerdown", () => {
      this.scene.start("SongSelectionScene");
      this.sound.get("menuMusic").stop(); // Stop menu music
    });

    // About Us Button
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
