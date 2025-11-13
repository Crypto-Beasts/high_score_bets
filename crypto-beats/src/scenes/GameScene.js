import Phaser from "phaser";
import { DIFFICULTY_LEVELS, getDifficultyConfig, adjustSongDataForDifficulty } from "../utils/difficultyManager.js";
import { getSongById, getAllSongs } from "../config/songs.js";
import { validateSongData, audioExists, jsonExists, showError, logError, getFallbackSong } from "../utils/errorHandler.js";
import { createNotePool, createHoldNotePool } from "../utils/objectPool.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create(data) {
    const { width, height } = this.scale;

    // Get song ID from scene data or default to first song
    let songId = data?.song || "Aguado_Menuet_Aminor";
    let song = getSongById(songId);
    
    // Validate song exists and audio is available
    if (!song) {
      logError("GameScene", `Song not found: ${songId}`);
      const allSongs = getAllSongs();
      const fallbackId = getFallbackSong(allSongs);
      if (fallbackId) {
        songId = fallbackId;
        song = getSongById(songId);
        console.warn(`[GameScene] Using fallback song: ${songId}`);
      } else {
        showError(this, "No songs available. Please check your song configuration.", () => {
          this.scene.start("MainMenuScene");
        });
        return;
      }
    }
    
    // Check if audio exists
    if (!audioExists(this, songId)) {
      logError("GameScene", `Audio file not found for song: ${songId}`);
      showError(this, `Audio file not found for ${song.name}. Please check file: ${song.audioFile}`, () => {
        this.scene.start("SongSelectionScene");
      });
      return;
    }
    
    // Get difficulty from scene data or default to NORMAL
    const difficulty = data?.difficulty || DIFFICULTY_LEVELS.NORMAL;
    const difficultyConfig = getDifficultyConfig(difficulty);
    
    console.log(`[GameScene] Starting song: ${song.name}, difficulty: ${difficultyConfig.name}`);

    // Store song info for debrief scene
    this.currentSongId = songId;
    this.currentDifficulty = difficulty;

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

    // Get song-specific JSON data from cache
    const songDataKey = songId + "_data";
    let originalSongData = null;
    
    // Check if JSON exists in cache
    if (!jsonExists(this, songDataKey)) {
      logError("GameScene", `Song data not found in cache: ${songDataKey}`);
      
      // Try fallback to old cache key
      if (jsonExists(this, "songData")) {
        console.warn(`[GameScene] Using fallback songData cache key`);
        originalSongData = this.cache.json.get("songData");
      } else {
        showError(this, `Song data not found for ${song.name}. Please check file: ${song.jsonFile}`, () => {
          this.scene.start("SongSelectionScene");
        });
        return;
      }
    } else {
      originalSongData = this.cache.json.get(songDataKey);
    }
    
    // Validate song data structure
    const validation = validateSongData(originalSongData, songId);
    
    if (!validation.valid) {
      logError("GameScene", validation.error);
      showError(this, `Invalid song data for ${song.name}:\n${validation.error}`, () => {
        this.scene.start("SongSelectionScene");
      });
      return;
    }
    
    // Handle both old format (array) and new format (with metadata)
    let notesData = validation.notes;
    if (originalSongData && originalSongData.notes) {
      // New format with metadata - use validated notes
      notesData = validation.notes;
    }
    
    if (!notesData || notesData.length === 0) {
      showError(this, `No notes found in song data for ${song.name}`, () => {
        this.scene.start("SongSelectionScene");
      });
      return;
    }
    
    this.songData = adjustSongDataForDifficulty(notesData, difficulty);
    console.log(`[GameScene] Song data loaded: ${this.songData.length} notes`);
    this.currentNoteIndex = 0;
    this.startTime = 0; // Track when the song starts

    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);
    
    // Background fills screen
    if (this.textures.exists("background")) {
      this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);
    } else {
      // Fallback: solid color background if image doesn't load
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }

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
    
    // Detailed statistics
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.comboHistory = []; // Track all combos for average calculation
    this.currentComboStart = null;

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

    // Object pools for performance optimization
    this.notePools = {};
    this.holdNotePool = createHoldNotePool(this, 20);
    
    // Create pools for each key type
    for (let key in this.keyLanes) {
      this.notePools[key] = createNotePool(this, this.keyLanes[key].sprite, 15);
    }

    // Static key visuals for feedback
    this.keyVisuals = {};
    for (let key in this.keyLanes) {
      this.keyVisuals[key] = this.add.image(this.keyLanes[key].x, height - 50, this.keyLanes[key].sprite);
    }
    
    // Performance optimization: Cache values to reduce lookups
    this.screenHeight = height;
    this.cullMargin = 100; // Cull notes this many pixels off-screen

    // Music - use the selected song
    this.music = this.sound.add(songId);

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
            
            // Clean up - return to pool instead of destroying
            this.releaseNote(note);
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
      // Use object pool for hold notes
      const holdBar = this.holdNotePool.acquire();
      holdBar.setPosition(lane.x, 0);
      holdBar.setSize(20, 100);
      holdBar.setFillStyle(0xffffff);
      holdBar.setOrigin(0.5, 0);
      holdBar.setDepth(10);
      holdBar.setVisible(true);
      holdBar.setActive(true);
      
      // Store note properties
      holdBar.keyType = key;
      holdBar.isHold = true;
      holdBar.held = false;
      holdBar.holdDuration = duration;
      holdBar.holdStartTime = null;
      holdBar.originalColor = 0xffffff;
      holdBar.pooled = true; // Mark as pooled for cleanup
      
      this.fallingKeys.push(holdBar);
    } else {
      // Use object pool for regular notes
      const keySprite = this.notePools[key].acquire();
      keySprite.setPosition(lane.x, 0);
      keySprite.setOrigin(0.5, 0.5);
      keySprite.setDepth(10);
      keySprite.setVisible(true);
      keySprite.setActive(true);
      
      // Store note properties
      keySprite.keyType = key;
      keySprite.isHold = false;
      keySprite.held = false;
      keySprite.pooled = true; // Mark as pooled for cleanup
      
      this.fallingKeys.push(keySprite);
    }
  }
  
  /**
   * Release a note back to its pool
   */
  releaseNote(note) {
    if (note.pooled) {
      if (note.isHold) {
        this.holdNotePool.release(note);
      } else {
        this.notePools[note.keyType]?.release(note);
      }
    } else {
      // Fallback for non-pooled notes (shouldn't happen, but safety check)
      note.destroy();
    }
  }

  shutdown() {
    // Cleanup: Release all pooled objects when scene shuts down
    if (this.holdNotePool) {
      this.holdNotePool.releaseAll();
    }
    if (this.notePools) {
      Object.values(this.notePools).forEach(pool => pool.releaseAll());
    }
  }

  update(time, delta) {
    // Ensure we have a valid startTime
    if (this.startTime === 0 || this.startTime === undefined) {
      // Use current time as fallback
      this.startTime = this.time.now;
      console.log(`[GameScene] startTime was 0, setting to: ${this.startTime}`);
    }

    // Calculate accurate time elapsed (in seconds) - cache calculation
    const currentTime = this.time.now;
    const elapsedTime = (currentTime - this.startTime) / 1000; 

    // Spawn notes when their spawn time arrives
    // Performance optimization: Cache songData and FALL_TIME
    const songData = this.songData;
    const fallTime = this.FALL_TIME;
    
    if (!songData || !Array.isArray(songData)) {
      if (currentTime % 2000 < delta) { // Log every ~2 seconds
        console.error(`[GameScene] songData is invalid in update loop!`, songData);
      }
      return;
    }
    
    // Spawn notes - optimized loop
    const songDataLength = songData.length;
    let spawnedThisFrame = 0;
    
    while (
      this.currentNoteIndex < songDataLength &&
      (songData[this.currentNoteIndex].time - fallTime) <= elapsedTime
    ) {
      const noteData = songData[this.currentNoteIndex];
      this.spawnKey(noteData.key, noteData.hold, noteData.duration || 0);
      this.currentNoteIndex++;
      spawnedThisFrame++;
    }
    
    // Debug: Log spawning activity (only first few times to avoid spam)
    if (spawnedThisFrame > 0) {
      console.log(`[GameScene] Spawned ${spawnedThisFrame} note(s) at elapsedTime=${elapsedTime.toFixed(3)}s, currentIndex=${this.currentNoteIndex}/${this.songData.length}`);
    }
    
    // Debug: Log if we're not spawning when we should (only in debug mode)
    if (this.currentNoteIndex < songDataLength && spawnedThisFrame === 0) {
      const nextNoteTime = songData[this.currentNoteIndex].time;
      const nextSpawnTime = nextNoteTime - fallTime;
      if (currentTime % 2000 < delta) { // Log every ~2 seconds
        console.log(`[GameScene] Waiting to spawn note ${this.currentNoteIndex}: nextSpawnTime=${nextSpawnTime.toFixed(3)}s, elapsedTime=${elapsedTime.toFixed(3)}s, diff=${(nextSpawnTime - elapsedTime).toFixed(3)}s`);
      }
    }

    // Move falling notes using time-based movement (frame-rate independent)
    // Performance optimization: Cache values to reduce property lookups
    const pixelsPerSecond = this.PIXELS_PER_SECOND;
    const screenHeight = this.screenHeight;
    const cullMargin = this.cullMargin;
    const judgmentY = this.JUDGMENT_Y;
    
    // Pre-calculate movement delta once
    const deltaSeconds = delta / 1000;
    const movementDelta = pixelsPerSecond * deltaSeconds;
    
    // Use reverse iteration for safe removal during loop
    for (let i = this.fallingKeys.length - 1; i >= 0; i--) {
      const key = this.fallingKeys[i];
      
      // Update position for all notes (needed for collision detection)
      key.y += movementDelta;
      
      // Update hold bar if it exists
      if (key.isHold && key.holdBar) {
        key.holdBar.y += movementDelta;
      }
      
      // Culling: Hide notes that are far off-screen to reduce rendering
      const isOffScreen = key.y < -cullMargin || key.y > screenHeight + cullMargin;
      if (isOffScreen && key.visible) {
        key.setVisible(false);
        if (key.isHold && key.holdBar) {
          key.holdBar.setVisible(false);
        }
      } else if (!isOffScreen && !key.visible) {
        key.setVisible(true);
        if (key.isHold && key.holdBar) {
          key.holdBar.setVisible(true);
        }
      }
      
      // Visual feedback for held notes - pulse effect while holding (only if visible)
      if (!isOffScreen && key.isHold && key.held && key.holdStartTime) {
        const holdProgress = (currentTime - key.holdStartTime) / 1000;
        const progressRatio = Math.min(holdProgress / key.holdDuration, 1.0);
        
        // Pulse effect: oscillate between bright green and slightly dimmer
        const pulse = Math.sin(holdProgress * 10) * 0.3 + 0.7;
        const greenIntensity = Math.floor(255 * pulse);
        key.setFillStyle(Phaser.Display.Color.GetColor(0, greenIntensity, 0));
        
        // Scale effect to show progress
        const scaleY = 1.0 + (progressRatio * 0.2);
        key.setScale(1.0, scaleY);
      }

      // Remove notes that have passed the bottom of the screen
      if (key.y > screenHeight) {
        // If it's a hold note that was being held, it's a miss
        if (key.isHold && key.held) {
          this.showFeedback("Hold Miss", "#ff0000", key.keyType);
          if (this.keyVisuals[key.keyType]) {
            this.keyVisuals[key.keyType].clearTint();
          }
        } else {
          this.showFeedback("Miss", "#ff0000", key.keyType);
        }
        
        // Track miss
        this.missCount++;
        
        // End current combo and record it
        if (this.currentStreak > 0 && this.currentComboStart) {
          this.comboHistory.push(this.currentStreak);
          this.currentComboStart = null;
        }
        
        // Clean up - return to pool instead of destroying
        if (key.isHold && key.holdBar) {
          this.holdNotePool.release(key.holdBar);
        }
        this.releaseNote(key);
        this.fallingKeys.splice(i, 1);
        this.currentStreak = 0;
        this.failed = true;
      }
    }

    // Ensure Debrief Scene appears when the song ends
    if (!this.music.isPlaying || elapsedTime >= this.music.duration) {
      // Record final combo if still active
      if (this.currentStreak > 0 && this.currentComboStart) {
        this.comboHistory.push(this.currentStreak);
      }
      
      // Calculate average combo
      const averageCombo = this.comboHistory.length > 0
        ? this.comboHistory.reduce((a, b) => a + b, 0) / this.comboHistory.length
        : 0;
      
      this.scene.start("DebriefScene", {
        score: this.score,
        totalNotes: this.totalNotes,
        notesHit: this.notesHit,
        longestStreak: this.longestStreak,
        averageCombo: Math.round(averageCombo * 10) / 10,
        perfectCount: this.perfectCount,
        goodCount: this.goodCount,
        missCount: this.missCount,
        failed: this.failed,
        song: this.currentSongId,
        difficulty: this.currentDifficulty,
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
              this.perfectCount++;
            } else if (distance < goodMargin) {
              this.showFeedback("Good", "#ffff00", keyPressed);
              this.score += 10;
              this.goodCount++;
            } else {
              continue;
            }

            this.notesHit++;
            this.currentStreak++;
            if (this.currentStreak > this.longestStreak) this.longestStreak = this.currentStreak;
            
            // Track combo start
            if (this.currentStreak === 1) {
              this.currentComboStart = this.time.now;
            }

            this.scoreText.setText("Score: " + this.score);

            // Return to pool instead of destroying
            this.releaseNote(note);
            this.fallingKeys.splice(i, 1);
            break;
          }
        }
      }
    }
  }
}
