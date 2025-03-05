import Phaser from "phaser";

export default class AboutUsScene extends Phaser.Scene {
  constructor() {
    super({ key: "AboutUsScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Scene Title
    this.add.text(width / 2, height / 6, "About Us", {
      fontSize: "40px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // About Us Text
    this.add.text(width / 2, height / 2 - 50, "Crypto Beats is a rhythm game where you play along with music!", {
      fontSize: "24px",
      fill: "#ffffff",
      align: "center",
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, "Developed by passionate game creators.", {
      fontSize: "20px",
      fill: "#ffffff",
      align: "center",
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

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
