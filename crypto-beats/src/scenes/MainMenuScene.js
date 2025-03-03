import Phaser from "phaser";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    let playButton = this.add.image(width / 2, height / 2, "playButton").setInteractive();
    playButton.setScale(0.5);

    playButton.on("pointerdown", () => {
      this.scene.start("GameScene");
    });
  }
}
