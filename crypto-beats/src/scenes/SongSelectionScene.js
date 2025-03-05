import Phaser from "phaser";

export default class SongSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "SongSelectionScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Scene Title
    this.add.text(width / 2, height / 6, "Select a Song", {
      fontSize: "40px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Placeholder Song Option
    let songButton = this.add.text(width / 2, height / 2, "Aguado Menuet (A Minor)", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    songButton.on("pointerdown", () => {
      this.scene.start("GameScene", { song: "music" });
    });

    // Back Button
    let backButton = this.add.text(width / 2, height - 100, "Back", {
      fontSize: "28px",
      fill: "#ffffff",
      backgroundColor: "#555",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    backButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
  }
}
