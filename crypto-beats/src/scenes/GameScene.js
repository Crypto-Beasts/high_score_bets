import Phaser from "phaser";
import { DIFFICULTY_LEVELS, getDifficultyConfig, adjustSongDataForDifficulty } from "../utils/difficultyManager.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create(data) {
    const { width, height } = this.scale;

    // Get difficulty from scene data or default to NORMAL
    const difficulty = data?.difficulty || DIFFICULTY_LEVELS.NORMAL;
    const difficultyConfig = getDifficultyConfig(difficulty);
    
    console.log(`[GameScene] Starting with difficulty: ${difficultyConfig.name}`);

    // Synchronization constants - FALL_TIME always stays 2.0s to maintain sync
    const FALL_TIME = 2.0; // seconds - time for notes to fall from top to judgment line (ALWAYS CONSTANT)
    const SPAWN_Y = 0; // Y position where notes spawn (top of screen)
    const JUDGMENT_Y = height - 100; // Y position of judgment line
    const FALL_DISTANCE = JUDGMENT_Y - SPAWN_Y; // Distance notes must travel
    const PIXELS_PER_SECOND = FALL_DISTANCE / FALL_TIME; // Speed calculation

    // Store constants for use in update()
    this.FALL_TIME = FALL_TIME;
    this.PIXELS_PER_SECOND = PIXELS_PER_SECOND;
    this.JUDGMENT_Y = JUDGMENT_Y;
    this.perfectMargin = difficultyConfig.perfectMargin;
    this.goodMargin = difficultyConfig.goodMargin;

    // Get original song data and adjust for difficulty (filtering, gaps, etc.)
    const originalSongData = this.cache.json.get("songData");
    this.songData = adjustSongDataForDifficulty(originalSongData, difficulty);
    console.log(`[GameScene] Song data loaded:`, this.songData ? `${this.songData.length} notes` : "NULL/UNDEFINED");
    if (!this.songData || !Array.isArray(this.songData)) {
      console.error(`[GameScene] ERROR: songData is not valid!`, this.songData);
    }
    this.currentNoteIndex = 0;
    this.startTime = 0; // Track when the song starts

    // Background fills screen
    this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);

    // Judgment Line
    this.judgmentLine = this.add.graphics();
    this.judgmentLine.lineStyle(4, 0xffffff, 1);
    this.judgmentLine.beginPath();
    this.judgmentLine.moveTo(50, JUDGMENT_Y);
    this.judgmentLine.lineTo(width - 50, JUDGMENT_Y);
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
    this.music = this.sound.add("Aguado_Menuet_Aminor");

    // Calculate when to start music
    // If first note is at time T, we need to start music at (T - FALL_TIME) so note arrives at time T
    const firstNoteTime = this.songData.length > 0 ? this.songData[0].time : 0;
    const musicStartTime = Math.max(0, firstNoteTime - FALL_TIME); // Don't start before 0
    const delayBeforeMusicStart = musicStartTime * 1000; // Convert to milliseconds

    // Start music immediately if delay is 0, otherwise use delayed call
    // Set startTime immediately to scene time, then adjust when music actually starts
    this.startTime = this.time.now;
    
    if (delayBeforeMusicStart <= 0) {
      try {
        this.music.play();
        // Update startTime to actual music start time
        this.startTime = this.time.now;
        console.log(`[GameScene] Music started immediately. First note at ${firstNoteTime}s, ${this.songData.length} total notes`);
        console.log(`[GameScene] Music isPlaying: ${this.music.isPlaying}, startTime: ${this.startTime}`);
      } catch (error) {
        console.error(`[GameScene] Error playing music:`, error);
        // Start anyway for testing - use scene time as start time
        this.startTime = this.time.now;
        console.log(`[GameScene] Using fallback startTime: ${this.startTime}`);
      }
    } else {
      this.time.delayedCall(delayBeforeMusicStart, () => {
        try {
          this.music.play();
          // Update startTime to actual music start time
          this.startTime = this.time.now;
          console.log(`[GameScene] Music started after ${delayBeforeMusicStart}ms delay. First note at ${firstNoteTime}s`);
          console.log(`[GameScene] Music isPlaying: ${this.music.isPlaying}, startTime: ${this.startTime}`);
        } catch (error) {
          console.error(`[GameScene] Error playing music:`, error);
          this.startTime = this.time.now;
          console.log(`[GameScene] Using fallback startTime: ${this.startTime}`);
        }
      });
    }

    // Keyboard input
    this.input.keyboard.on("keydown", this.handlePlayerInput, this);
    this.input.keyboard.on("keyup", this.handleKeyRelease, this);
  }

  handleKeyRelease(event) {
    const keyReleased = event.key.toUpperCase();
    const perfectMargin = this.perfectMargin || 15;
    const goodMargin = this.goodMargin || 40;

    if (this.keyLanes[keyReleased]) {
      // Find hold notes that are currently being held for this key
      for (let i = 0; i < this.fallingKeys.length; i++) {
        const note = this.fallingKeys[i];
        
        if (note.keyType === keyReleased && note.isHold && note.held && note.holdStartTime) {
          // Calculate how long the note was held
          const holdDuration = (this.time.now - note.holdStartTime) / 1000; // in seconds
          const requiredDuration = note.holdDuration || 0;
          
          // Check if held long enough (with some tolerance)
          const durationTolerance = 0.1; // 100ms tolerance
          const distance = Math.abs(note.y - this.JUDGMENT_Y);
          
          if (holdDuration >= (requiredDuration - durationTolerance) && distance < goodMargin) {
            // Successfully completed hold note
            let feedbackText = "Hold Complete!";
            let feedbackColor = "#00ff00";
            let score = 30; // Hold notes worth more points
            
            // Check timing precision
            if (distance < perfectMargin && holdDuration >= requiredDuration) {
              feedbackText = "Perfect Hold!";
              feedbackColor = "#00ff00";
              score = 40;
            } else if (holdDuration < requiredDuration) {
              feedbackText = "Hold Too Short";
              feedbackColor = "#ffff00";
              score = 20;
            }
            
            this.showFeedback(feedbackText, feedbackColor, keyReleased);
            this.score += score;
            this.notesHit++;
            this.currentStreak++;
            if (this.currentStreak > this.longestStreak) this.longestStreak = this.currentStreak;
            
            this.scoreText.setText("Score: " + this.score);
            
            // Clear key visual tint
            if (this.keyVisuals[keyReleased]) {
              this.keyVisuals[keyReleased].clearTint();
            }
            
            // Clean up
            note.destroy();
            this.fallingKeys.splice(i, 1);
            break;
          } else {
            // Hold was released too early or at wrong position
            this.showFeedback("Hold Failed", "#ff0000", keyReleased);
            note.held = false;
            note.holdStartTime = null;
            note.setFillStyle(note.originalColor || 0xffffff);
            note.setScale(1.0, 1.0);
            
            // Clear key visual tint
            if (this.keyVisuals[keyReleased]) {
              this.keyVisuals[keyReleased].clearTint();
            }
            
            this.currentStreak = 0;
            this.failed = true;
          }
        }
      }
    }
  }

  spawnKey(key, isHoldNote, duration = 0) {
    if (!key) {
      return; // Skip notes with null key
    }

    key = key.toUpperCase(); 
    const lane = this.keyLanes[key];

    if (!lane) {
      console.warn(`[GameScene] Invalid key: ${key}`);
      return; // Skip invalid keys
    }

    // Increment total notes when spawning
    this.totalNotes++;

    if (isHoldNote) {
      const holdBar = this.add.rectangle(lane.x, 0, 20, 100, 0xffffff);
      holdBar.keyType = key;
      holdBar.isHold = true;
      holdBar.held = false;
      holdBar.holdDuration = duration; // Store required hold duration
      holdBar.holdStartTime = null; // Will be set when player starts holding
      holdBar.originalColor = 0xffffff; // Store original color
      holdBar.setOrigin(0.5, 0); // Top center
      holdBar.setDepth(10); // Make sure it's on top
      this.fallingKeys.push(holdBar);
      if (this.totalNotes <= 5) {
        console.log(`[GameScene] Spawned HOLD note: ${key} (note #${this.totalNotes}) at x=${lane.x}, y=0, duration=${duration}s`);
        console.log(`[GameScene] HoldBar visible: ${holdBar.visible}, alpha: ${holdBar.alpha}`);
      }
    } else {
      const keySprite = this.add.image(lane.x, 0, lane.sprite);
      keySprite.keyType = key;
      keySprite.isHold = false;
      keySprite.held = false;
      keySprite.setOrigin(0.5, 0.5); // Center the sprite
      keySprite.setDepth(10); // Make sure it's on top
      this.fallingKeys.push(keySprite);
      if (this.totalNotes <= 5) {
        console.log(`[GameScene] Spawned note: ${key} (note #${this.totalNotes}) at x=${lane.x}, y=0`);
        console.log(`[GameScene] Sprite visible: ${keySprite.visible}, alpha: ${keySprite.alpha}, scale: ${keySprite.scaleX}`);
      }
    }
  }

  update(time, delta) {
    // Ensure we have a valid startTime
    if (this.startTime === 0 || this.startTime === undefined) {
      // Use current time as fallback
      this.startTime = this.time.now;
      console.log(`[GameScene] startTime was 0, setting to: ${this.startTime}`);
    }

    // Calculate accurate time elapsed (in seconds)
    let elapsedTime = (this.time.now - this.startTime) / 1000; 

    // Spawn notes when their spawn time arrives
    // Note spawn time = note hit time - FALL_TIME
    // This ensures notes arrive at judgment line at the correct time
    let spawnedThisFrame = 0;
    if (!this.songData || !Array.isArray(this.songData)) {
      if (this.time.now % 2000 < delta) { // Log every ~2 seconds
        console.error(`[GameScene] songData is invalid in update loop!`, this.songData);
      }
      return;
    }
    
    while (
      this.currentNoteIndex < this.songData.length &&
      (this.songData[this.currentNoteIndex].time - this.FALL_TIME) <= elapsedTime
    ) {
      let noteData = this.songData[this.currentNoteIndex];
      this.spawnKey(noteData.key, noteData.hold, noteData.duration || 0);
      this.currentNoteIndex++;
      spawnedThisFrame++;
    }
    
    // Debug: Log spawning activity (only first few times to avoid spam)
    if (spawnedThisFrame > 0) {
      console.log(`[GameScene] Spawned ${spawnedThisFrame} note(s) at elapsedTime=${elapsedTime.toFixed(3)}s, currentIndex=${this.currentNoteIndex}/${this.songData.length}`);
    }
    
    // Debug: Log if we're not spawning when we should
    if (this.currentNoteIndex < this.songData.length && spawnedThisFrame === 0) {
      const nextNoteTime = this.songData[this.currentNoteIndex].time;
      const nextSpawnTime = nextNoteTime - this.FALL_TIME;
      if (this.time.now % 2000 < delta) { // Log every ~2 seconds
        console.log(`[GameScene] Waiting to spawn note ${this.currentNoteIndex}: nextSpawnTime=${nextSpawnTime.toFixed(3)}s, elapsedTime=${elapsedTime.toFixed(3)}s, diff=${(nextSpawnTime - elapsedTime).toFixed(3)}s`);
      }
    }

    // Move falling notes using time-based movement (frame-rate independent)
    // delta is in milliseconds, convert to seconds: delta / 1000
    const deltaSeconds = delta / 1000;
    for (let i = 0; i < this.fallingKeys.length; i++) {
      let key = this.fallingKeys[i];
      const oldY = key.y;
      key.y += this.PIXELS_PER_SECOND * deltaSeconds;
      if (key.isHold && key.holdBar) {
        key.holdBar.y += this.PIXELS_PER_SECOND * deltaSeconds;
      }
      
      // Visual feedback for held notes - pulse effect while holding
      if (key.isHold && key.held && key.holdStartTime) {
        const holdProgress = (this.time.now - key.holdStartTime) / 1000; // seconds held
        const progressRatio = Math.min(holdProgress / key.holdDuration, 1.0);
        
        // Pulse effect: oscillate between bright green and slightly dimmer
        const pulse = Math.sin(holdProgress * 10) * 0.3 + 0.7; // Oscillates between 0.4 and 1.0
        const greenIntensity = Math.floor(255 * pulse);
        key.setFillStyle(Phaser.Display.Color.GetColor(0, greenIntensity, 0));
        
        // Scale effect to show progress
        const scaleY = 1.0 + (progressRatio * 0.2); // Grow slightly as held
        key.setScale(1.0, scaleY);
      }
      
      // Debug: Log movement for first note
      if (i === 0 && this.fallingKeys.length > 0 && this.time.now % 500 < delta) {
        console.log(`[GameScene] Note moving: y=${key.y.toFixed(1)} (was ${oldY.toFixed(1)}), speed=${this.PIXELS_PER_SECOND.toFixed(1)}px/s, delta=${deltaSeconds.toFixed(4)}s`);
      }

      // Remove notes that have passed the bottom of the screen
      if (key.y > this.scale.height) {
        // If it's a hold note that was being held, it's a miss
        if (key.isHold && key.held) {
          this.showFeedback("Hold Miss", "#ff0000", key.keyType);
          // Clear key visual tint if it was being held
          if (this.keyVisuals[key.keyType]) {
            this.keyVisuals[key.keyType].clearTint();
          }
        } else {
          this.showFeedback("Miss", "#ff0000", key.keyType);
        }
        if (key.isHold && key.holdBar) key.holdBar.destroy();
        key.destroy();
        this.fallingKeys.splice(i, 1);
        i--;
        this.currentStreak = 0;
        this.failed = true;
      }
    }

    // Ensure Debrief Scene appears when the song ends
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
    const perfectMargin = this.perfectMargin || 15;
    const goodMargin = this.goodMargin || 40;

    if (this.keyLanes[keyPressed]) {
      for (let i = 0; i < this.fallingKeys.length; i++) {
        const note = this.fallingKeys[i];
        
        if (note.keyType === keyPressed) {
          const distance = Math.abs(note.y - this.JUDGMENT_Y);

          // Check if this is a hold note
          if (note.isHold) {
            // Start holding the note
            if (distance < goodMargin && !note.held) {
              note.held = true;
              note.holdStartTime = this.time.now;
              
              // Visual feedback: change color to green
              note.setFillStyle(0x00ff00);
              
              // Show feedback for starting the hold
              if (distance < perfectMargin) {
                this.showFeedback("Hold Start!", "#00ff00", keyPressed);
              } else {
                this.showFeedback("Hold Start", "#ffff00", keyPressed);
              }
              
              // Visual feedback on key icon
              if (this.keyVisuals[keyPressed]) {
                this.keyVisuals[keyPressed].setTint(0x00ff00);
                // Keep tint while holding - will be cleared on release
              }
            }
            // Don't break - allow checking other notes, but hold notes need to be held
            continue;
          } else {
            // Regular note handling
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

            note.destroy();
            this.fallingKeys.splice(i, 1);
            break;
          }
        }
      }
    }
  }
}
