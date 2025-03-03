import Phaser from "phaser";
import { Howl } from "howler";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Fullscreen button
    let fullScreenButton = this.add.image(width - 50, 50, "fullscreen").setInteractive();
    fullScreenButton.setScale(0.5);
    fullScreenButton.on("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    // Judgment Line
    this.judgmentLine = this.add.graphics();
    this.judgmentLine.lineStyle(4, 0xffffff, 1);
    const lineY = height - 100;
    this.judgmentLine.beginPath();
    this.judgmentLine.moveTo(50, lineY);
    this.judgmentLine.lineTo(width - 50, lineY);
    this.judgmentLine.strokePath();

    // Score Display
    this.score = 0;
    this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "24px", fill: "#fff" });

    // Set up lanes
    this.keyLanes = {
      W: width * 0.25,
      A: width * 0.40,
      S: width * 0.60,
      D: width * 0.75,
    };
    this.keyColors = {
      W: "key_w",
      A: "key_a",
      S: "key_s",
      D: "key_d",
    };

    this.fallingKeys = [];

    // Music setup
    this.music = new Howl({
      src: ["/public/music.mp3"],
      autoplay: true,
      loop: false,
      volume: 0.5,
      onplay: () => {
        this.scheduleKeyDrops();
      },
    });

    // Keyboard input
    this.input.keyboard.on("keydown", this.handlePlayerInput, this);
  }

  // Drop keys at the correct BPM timing
  scheduleKeyDrops() {
    const BPM = 107;
    const BEAT_INTERVAL = (60 / BPM) * 1000;

    this.time.addEvent({
      delay: BEAT_INTERVAL,
      callback: this.dropKey,
      callbackScope: this,
      loop: true,
    });
  }

  dropKey() {
    const keyList = ["W", "A", "S", "D"];
    const randomKey = keyList[Phaser.Math.Between(0, keyList.length - 1)];
    const xPosition = this.keyLanes[randomKey];
    const keySprite = this.keyColors[randomKey];

    const key = this.add.image(xPosition, 0, keySprite);
    key.keyType = randomKey;
    this.fallingKeys.push(key);
  }

  update() {
    const judgmentY = this.scale.height - 100;
    const hitMargin = 30;

    for (let i = 0; i < this.fallingKeys.length; i++) {
      let key = this.fallingKeys[i];
      key.y += 2;

      if (Math.abs(key.y - judgmentY) < hitMargin) {
        key.setTint(0x00ff00);
      } else {
        key.clearTint();
      }

      if (key.y > this.scale.height) {
        key.destroy();
        this.fallingKeys.splice(i, 1);
        i--;
      }
    }
  }

  handlePlayerInput(event) {
    const keyPressed = event.key.toUpperCase();
    const judgmentY = this.scale.height - 100;
    const hitMargin = 30;

    if (this.keyLanes[keyPressed]) {
      for (let i = 0; i < this.fallingKeys.length; i++) {
        if (
          this.fallingKeys[i].keyType === keyPressed &&
          Math.abs(this.fallingKeys[i].y - judgmentY) < hitMargin
        ) {
          this.fallingKeys[i].destroy();
          this.fallingKeys.splice(i, 1);
          this.score += 10;
          this.scoreText.setText("Score: " + this.score);
          break;
        }
      }
    }
  }
}
