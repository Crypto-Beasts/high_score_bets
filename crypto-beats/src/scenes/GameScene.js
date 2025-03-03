import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Fullscreen button
    let fullScreenButton = this.add.image(width - 50, 50, "fullscreen").setInteractive();
    fullScreenButton.setScale(0.5).setDepth(10);
    fullScreenButton.on("pointerdown", () => {
      this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen();
    });

    // Judgment Line
    this.judgmentLine = this.add.graphics();
    this.judgmentLine.lineStyle(4, 0xffffff, 1);
    const lineY = height - 100;
    this.judgmentLine.beginPath();
    this.judgmentLine.moveTo(50, lineY);
    this.judgmentLine.lineTo(width - 50, lineY);
    this.judgmentLine.strokePath();

    // Score & Streak
    this.score = 0;
    this.longestStreak = 0;
    this.currentStreak = 0;
    this.totalNotes = 0;
    this.notesHit = 0;
    this.failed = false;

    this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "24px", fill: "#fff" });

    // Feedback Text (for "Perfect", "Good", "Miss")
    this.feedbackText = this.add.text(width / 2, height / 2, "", {
      fontSize: "32px",
      fill: "#fff",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0);

    // Lanes & Keys
    this.keyLanes = {
      W: { x: width * 0.25, sprite: "key_w" },
      A: { x: width * 0.40, sprite: "key_a" },
      S: { x: width * 0.60, sprite: "key_s" },
      D: { x: width * 0.75, sprite: "key_d" },
    };

    this.fallingKeys = [];

    // Static key visuals for feedback
    this.keyVisuals = {};
    for (let key in this.keyLanes) {
      this.keyVisuals[key] = this.add.image(this.keyLanes[key].x, height - 50, this.keyLanes[key].sprite);
    }

    // Music
    this.music = this.sound.add("music");
    this.music.play();
    this.scheduleKeyDrops();

    // Keyboard input
    this.input.keyboard.on("keydown", this.handlePlayerInput, this);
    this.input.keyboard.on("keyup", this.handleKeyRelease, this);
  }

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
    const keys = Object.keys(this.keyLanes);
    const isDoublePress = Math.random() < 0.2;
    const isHoldNote = Math.random() < 0.2;

    if (isDoublePress) {
      const keyPair = Phaser.Utils.Array.Shuffle(keys).slice(0, 2);
      keyPair.forEach((key) => this.spawnKey(key, false));
    } else {
      const randomKey = keys[Phaser.Math.Between(0, keys.length - 1)];
      this.spawnKey(randomKey, isHoldNote);
    }

    this.totalNotes++;
  }

  spawnKey(key, isHoldNote) {
    const lane = this.keyLanes[key];
  
    if (isHoldNote) {
      // No key sprite, only the hold bar
      const holdBar = this.add.rectangle(lane.x, 30, 20, 100, 0xffffff);
      holdBar.keyType = key;
      holdBar.isHold = true;
      holdBar.held = false;
      this.fallingKeys.push(holdBar);
    } else {
      // Normal key
      const keySprite = this.add.image(lane.x, 0, lane.sprite);
      keySprite.keyType = key;
      keySprite.isHold = false;
      keySprite.held = false;
      this.fallingKeys.push(keySprite);
    }
  }
  

  showFeedback(text, color, key) {
    // Text feedback
    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);
  
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      duration: 800,
      ease: "Power2",
    });
  
    // Visual feedback on key icon
    if (this.keyVisuals[key]) {
      let tint = color === "#00ff00" ? 0x00ff00 : color === "#ffff00" ? 0xffa500 : 0xff0000;
      this.keyVisuals[key].setTint(tint);
  
      this.time.delayedCall(300, () => {
        this.keyVisuals[key].clearTint();
      });
    }
  }

  update() {
    const judgmentY = this.scale.height - 100;
    const hitMargin = 30;

    for (let i = 0; i < this.fallingKeys.length; i++) {
      let key = this.fallingKeys[i];
      key.y += 1;
      if (key.isHold && key.holdBar) key.holdBar.y += 3;

      if (key.y > this.scale.height) {
        this.showFeedback("Miss", "#ff0000", key.keyType);
        if (key.isHold && key.holdBar) key.holdBar.destroy();
        key.destroy();
        this.fallingKeys.splice(i, 1);
        i--;
        this.currentStreak = 0;
        this.failed = true;
      }
    }

    if (!this.music.isPlaying) {
      this.scene.start("DebriefScene", {
        score: this.score,
        totalNotes: this.totalNotes,
        notesHit: this.notesHit,
        longestStreak: this.longestStreak,
        failed: this.failed,
      });
    }
  }
  handlePlayerInput(event) {
    const keyPressed = event.key.toUpperCase();
    const judgmentY = this.scale.height - 100;
    const perfectMargin = 10;
    const goodMargin = 30;
  
    if (this.keyLanes[keyPressed]) {
      // Animate the key press
      if (this.keyVisuals[keyPressed]) {
        this.tweens.add({
          targets: this.keyVisuals[keyPressed],
          scale: 1.2, // Grow
          duration: 100,
          yoyo: true, // Shrink back
          ease: "Power2",
        });
      }
  
      for (let i = 0; i < this.fallingKeys.length; i++) {
        if (this.fallingKeys[i].keyType === keyPressed) {
          const distance = Math.abs(this.fallingKeys[i].y - judgmentY);
  
          if (distance < perfectMargin) {
            this.showFeedback("Perfect!", "#00ff00", keyPressed);
            this.score += 20;
          } else if (distance < goodMargin) {
            this.showFeedback("Good", "#ffff00", keyPressed);
            this.score += 10;
          } else {
            continue;
          }
  
          this.notesHit++;
          this.currentStreak++;
          if (this.currentStreak > this.longestStreak) this.longestStreak = this.currentStreak;
  
          this.scoreText.setText("Score: " + this.score);
  
          if (!this.fallingKeys[i].isHold) {
            this.fallingKeys[i].destroy();
            this.fallingKeys.splice(i, 1);
          } else {
            this.fallingKeys[i].held = true;
            this.fallingKeys[i].holdBar.setFillStyle(0x00ff00); // Change color to show it's held
          }
          break;
        }
      }
    }
  }
  
  handleKeyRelease(event) {
    const keyReleased = event.key.toUpperCase();
    this.fallingKeys = this.fallingKeys.filter((key) => {
      if (key.keyType === keyReleased && key.held) {
        key.destroy();
        return false;
      }
      return true;
    });
  }
}
