import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    this.songData = this.cache.json.get("songData");
    this.currentNoteIndex = 0;
    this.startTime = 0; // Track when the song starts

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

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

    //this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "24px", fill: "#fff" });

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
    this.music = this.sound.add("Aguado_Menuet_Aminor");

  // Get the first note's time from the JSON
  const firstNoteTime = this.songData.length > 0 ? this.songData[0].time : 0;

  // Convert time to milliseconds (Phaser works with milliseconds)
  const delayBeforeMusicStart = firstNoteTime * 1000; 

  // Delay the music start dynamically
  this.time.delayedCall(delayBeforeMusicStart, () => {
      this.music.play();
      this.startTime = this.time.now; // Record the precise start time
  });

  console.log(`Music will start after ${delayBeforeMusicStart} ms to match the first note.`);


    // Keyboard input
    this.input.keyboard.on("keydown", this.handlePlayerInput, this);
    this.input.keyboard.on("keyup", this.handleKeyRelease, this);
  }

  handleKeyRelease(event) {
    console.log("Key released:", event.key);
  }

  spawnKey(key, isHoldNote) {
    if (!key) {
      console.warn("Skipping a note with a null key.");
      return;
    }

    key = key.toUpperCase(); 
    const lane = this.keyLanes[key];

    if (!lane) {
      console.error(`Invalid key: ${key}`);
      return;
    }

    if (isHoldNote) {
      const holdBar = this.add.rectangle(lane.x, 30, 20, 100, 0xffffff);
      holdBar.keyType = key;
      holdBar.isHold = true;
      holdBar.held = false;
      this.fallingKeys.push(holdBar);
    } else {
      const keySprite = this.add.image(lane.x, 0, lane.sprite);
      keySprite.keyType = key;
      keySprite.isHold = false;
      keySprite.held = false;
      this.fallingKeys.push(keySprite);
    }
  }

  update(time, delta) {
    const judgmentY = this.scale.height - 100;
    const hitMargin = 30;

    // ✅ Ensure music has started before processing notes
    if (!this.music.isPlaying || this.startTime === 0) return;

    // ✅ Calculate accurate time elapsed
    let elapsedTime = (this.time.now - this.startTime) / 1000; 

    // ✅ Spawn notes only at the correct times
    while (
      this.currentNoteIndex < this.songData.length &&
      this.songData[this.currentNoteIndex].time <= elapsedTime
    ) {
      let noteData = this.songData[this.currentNoteIndex];
      this.spawnKey(noteData.key, noteData.hold);
      this.currentNoteIndex++; 
    }

    // ✅ Ensure keys move at the correct speed
    let noteSpeed = this.scale.height / (this.music.duration * 0.9);

    // ✅ Move falling notes
    for (let i = 0; i < this.fallingKeys.length; i++) {
      let key = this.fallingKeys[i];
      key.y += noteSpeed * delta / 16;
      if (key.isHold && key.holdBar) key.holdBar.y += noteSpeed * delta / 16;

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

    // ✅ Ensure Debrief Scene appears when the song ends
    if (!this.music.isPlaying || elapsedTime >= this.music.duration) {
      this.scene.start("DebriefScene", {
        score: this.score,
        totalNotes: this.totalNotes,
        notesHit: this.notesHit,
        longestStreak: this.longestStreak,
        failed: this.failed,
      });
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

  handlePlayerInput(event) {
    const keyPressed = event.key.toUpperCase();
    const judgmentY = this.scale.height - 100;
    const perfectMargin = 10;
    const goodMargin = 30;

    if (this.keyLanes[keyPressed]) {
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

          this.fallingKeys[i].destroy();
          this.fallingKeys.splice(i, 1);
          break;
        }
      }
    }
  }
}
