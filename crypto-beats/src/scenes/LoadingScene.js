import Phaser from "phaser";

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
  }

  preload() {
    const { width, height } = this.scale;

    let progressBar = this.add.graphics();
    let progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    let loadingText = this.add.text(width / 2, height / 2 - 50, "Loading...", {
      fontSize: "24px",
      fill: "#ffffff",
    }).setOrigin(0.5);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      this.scene.start("MainMenuScene");
    });

    // Load assets
    this.load.image("background", "/public/background.png");
    this.load.image("key_w", "/public/key_w.png");
    this.load.image("key_a", "/public/key_a.png");
    this.load.image("key_s", "/public/key_s.png");
    this.load.image("key_d", "/public/key_d.png");
    this.load.image("fullscreen", "/public/fullscreen.png");
    this.load.image("playButton", "/public/play.png");
    this.load.audio("music", "/public/Aguado_Menuet_Aminor.mp3");  // here should be the list of all the music

    // Load JSON song data
    this.load.json("songData", "/public/music.json");
  }
}
