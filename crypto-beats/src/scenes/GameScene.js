import Phaser from "phaser";
import { DIFFICULTY_LEVELS, getDifficultyConfig, adjustSongDataForDifficulty } from "../utils/difficultyManager.js";
import { getSongById, getAllSongs } from "../config/songs.js";
import { validateSongData, audioExists, jsonExists, showError, logError, getFallbackSong } from "../utils/errorHandler.js";
import { createNotePool, createHoldNotePool } from "../utils/objectPool.js";
import { getResponsiveFontSize, getResponsiveSpacing } from "../utils/responsive.js";

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
    // Responsive judgment line position - scales with screen height but maintains minimum distance from bottom
    const JUDGMENT_Y = height - getResponsiveSpacing(100, height);
    const FALL_DISTANCE = JUDGMENT_Y - SPAWN_Y; // Distance notes must travel
    const PIXELS_PER_SECOND = FALL_DISTANCE / FALL_TIME; // Speed calculation

    // Store constants for use in update()
    this.FALL_TIME = FALL_TIME;
    this.PIXELS_PER_SECOND = PIXELS_PER_SECOND;
    this.JUDGMENT_Y = JUDGMENT_Y;
    // Responsive margins - scale with screen size
    const basePerfectMargin = difficultyConfig.perfectMargin || 15;
    const baseGoodMargin = difficultyConfig.goodMargin || 40;
    this.perfectMargin = getResponsiveSpacing(basePerfectMargin, height);
    this.goodMargin = getResponsiveSpacing(baseGoodMargin, height);

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
    
    // Background fills screen - store reference for resize
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
    } else {
      // Fallback: solid color background if image doesn't load
      this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }
    
    // Listen for resize events - use both scene scale and game scale
    this.scale.on('resize', this.handleResize, this);
    // Also listen to game-level resize for better compatibility
    if (this.game.scale) {
      this.game.scale.on('resize', this.handleResize, this);
    }

    // Calculate centered gameplay layout (once, reuse throughout)
    const layout = this.calculateGameplayLayout(width, height);
    this.keyLanes = layout.lanes;
    this.gameplayLayout = layout; // Store for resize updates

    // Judgment Line - Use gameplay area boundaries
    this.judgmentLine = this.add.graphics();
    this.judgmentLine.lineStyle(4, 0xffffff, 1);
    this.judgmentLine.beginPath();
    const marginX = Math.max(50, layout.gameplayStartX);
    const endX = Math.min(width - 50, layout.gameplayEndX);
    this.judgmentLine.moveTo(marginX, JUDGMENT_Y);
    this.judgmentLine.lineTo(endX, JUDGMENT_Y);
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

    // Responsive text sizing
    const scoreFontSize = getResponsiveFontSize(24, width, 18, 30);
    const feedbackFontSize = getResponsiveFontSize(32, width, 24, 40);
    const scoreX = getResponsiveSpacing(20, width);
    const scoreY = getResponsiveSpacing(20, height);

    this.scoreText = this.add.text(scoreX, scoreY, "Score: 0", { 
      fontSize: scoreFontSize, 
      fill: "#fff" 
    });

    // Feedback Text (for "Perfect", "Good", "Miss")
    this.feedbackText = this.add.text(width / 2, height / 2, "", {
      fontSize: feedbackFontSize,
      fill: "#fff",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0);

    // Layout already calculated above, reuse it
    this.fallingKeys = [];

    // Object pools for performance optimization
    this.notePools = {};
    this.holdNotePool = createHoldNotePool(this, 20);
    
    // Create pools for each key type
    for (let key in this.keyLanes) {
      this.notePools[key] = createNotePool(this, this.keyLanes[key].sprite, 15);
    }

    // Static key visuals for feedback - Use gameplay layout sizing
    this.keyVisuals = {};
    this.keyGlows = {}; // Store glow effects for each key
    const keyVisualSize = layout.keySize; // Use consistent key size from layout
    const keyVisualY = height - getResponsiveSpacing(50, height);
    for (let key in this.keyLanes) {
      const keyVisual = this.add.image(this.keyLanes[key].x, keyVisualY, this.keyLanes[key].sprite);
      keyVisual.setDisplaySize(keyVisualSize, keyVisualSize);
      keyVisual.setOrigin(0.5, 0.5);
      this.keyVisuals[key] = keyVisual;
      
      // Create glow effect (circle behind key)
      const glow = this.add.circle(this.keyLanes[key].x, keyVisualY, keyVisualSize * 0.7, 0x00ff00, 0);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(keyVisual.depth - 1);
      glow.setVisible(false);
      this.keyGlows[key] = glow;
    }
    
    // Performance optimization: Cache values to reduce lookups
    this.screenHeight = height;
    this.cullMargin = getResponsiveSpacing(100, height); // Responsive cull margin

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
            
            // Stop hold pulse and animate release
            this.stopHoldPulse(keyReleased);
            this.animateKeyRelease(keyReleased);
            
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
            
            // Stop hold pulse and animate release with miss feedback
            this.stopHoldPulse(keyReleased);
            this.animateKeyPress(keyReleased, "miss", false);
            
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

    // Use gameplay layout for consistent note sizing
    const { width, height } = this.scale;
    const noteSize = this.gameplayLayout ? this.gameplayLayout.keySize : this.calculateGameplayLayout(width, height).keySize;
    const holdBarWidth = getResponsiveSpacing(20, width);
    const holdBarHeight = getResponsiveSpacing(100, height);

    if (isHoldNote) {
      // Use object pool for hold notes
      const holdBar = this.holdNotePool.acquire();
      holdBar.setPosition(lane.x, 0);
      holdBar.setSize(holdBarWidth, holdBarHeight);
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
      keySprite.setDisplaySize(noteSize, noteSize); // Responsive note size
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

  /**
   * Calculate centered gameplay layout with smart sizing
   * @param {number} width - Screen width
   * @param {number} height - Screen height
   * @returns {object} Layout object with gameplay area, key size, spacing, and lane positions
   */
  calculateGameplayLayout(width, height) {
    // Define gameplay area constraints
    const maxGameplayWidth = 800; // Maximum width for gameplay area
    const minGameplayWidth = 400; // Minimum width for very small screens
    const gameplayWidthPercent = 0.7; // Use 70% of screen width
    
    // Calculate gameplay width (centered, with min/max constraints)
    let gameplayWidth = Math.min(maxGameplayWidth, width * gameplayWidthPercent);
    gameplayWidth = Math.max(minGameplayWidth, gameplayWidth);
    
    // Center the gameplay area
    const gameplayStartX = (width - gameplayWidth) / 2;
    
    // Key sizing: responsive but with min/max constraints
    const baseKeySize = 50;
    const minKeySize = 40;
    const maxKeySize = 60;
    const sizeScale = gameplayWidth / maxGameplayWidth;
    let keySize = baseKeySize * sizeScale;
    keySize = Math.max(minKeySize, Math.min(maxKeySize, keySize));
    
    // Spacing: adaptive with minimum constraint
    const minSpacing = 80; // Minimum spacing between keys
    const spacing = Math.max(minSpacing, gameplayWidth / 5);
    
    // Calculate lane positions (centered within gameplay area)
    const lanes = {
      W: { 
        x: gameplayStartX + spacing, 
        sprite: "key_w" 
      },
      A: { 
        x: gameplayStartX + spacing * 2, 
        sprite: "key_a" 
      },
      S: { 
        x: gameplayStartX + spacing * 3, 
        sprite: "key_s" 
      },
      D: { 
        x: gameplayStartX + spacing * 4, 
        sprite: "key_d" 
      },
    };
    
    return {
      gameplayWidth,
      gameplayStartX,
      gameplayEndX: gameplayStartX + gameplayWidth,
      keySize,
      spacing,
      lanes
    };
  }

  handleResize(gameSize) {
    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main || !this.scale) {
      console.warn("[GameScene] Scene not fully initialized, skipping handleResize");
      return;
    }
    
    // Safety check: ensure game has started (keyLanes must exist)
    if (!this.keyLanes) {
      // Scene might be in early initialization, skip resize
      return;
    }
    
    // Handle different parameter formats
    let width, height;
    if (gameSize && gameSize.width && gameSize.height) {
      width = gameSize.width;
      height = gameSize.height;
    } else {
      // Fallback to current scale dimensions or window size
      width = this.scale.width || window.innerWidth || 1920;
      height = this.scale.height || window.innerHeight || 1080;
    }
    
    // Ensure we have valid dimensions
    if (!width || !height || width === 0 || height === 0) {
      width = window.innerWidth || 1920;
      height = window.innerHeight || 1080;
    }
    
    // Update scale if needed (for Phaser internal consistency)
    if (this.scale.width !== width || this.scale.height !== height) {
      this.scale.setGameSize(width, height);
    }
    
    // Resize background
    if (this.backgroundImage) {
      this.backgroundImage.setPosition(width / 2, height / 2);
      this.backgroundImage.setDisplaySize(width, height);
    }
    if (this.backgroundRect) {
      this.backgroundRect.setPosition(width / 2, height / 2);
      this.backgroundRect.setSize(width, height);
    }
    
    // Update score text position (responsive)
    if (this.scoreText) {
      const scoreX = getResponsiveSpacing(20, width);
      const scoreY = getResponsiveSpacing(20, height);
      this.scoreText.setPosition(scoreX, scoreY);
    }
    
    // Recalculate judgment line position (responsive)
    const newJudgmentY = height - getResponsiveSpacing(100, height);
    this.JUDGMENT_Y = newJudgmentY;
    
    // Recalculate note speed based on new judgment line position
    const FALL_DISTANCE = newJudgmentY - 0; // SPAWN_Y is always 0
    this.PIXELS_PER_SECOND = FALL_DISTANCE / this.FALL_TIME;
    
    // Recalculate responsive margins
    const basePerfectMargin = 15; // Base margin from difficulty config
    const baseGoodMargin = 40;
    this.perfectMargin = getResponsiveSpacing(basePerfectMargin, height);
    this.goodMargin = getResponsiveSpacing(baseGoodMargin, height);
    
    // Recalculate gameplay layout FIRST (needed for judgment line)
    const layout = this.calculateGameplayLayout(width, height);
    this.keyLanes = layout.lanes;
    this.gameplayLayout = layout;
    
    // Update judgment line position to match gameplay area
    if (this.judgmentLine) {
      this.judgmentLine.clear();
      this.judgmentLine.lineStyle(4, 0xffffff, 1);
      this.judgmentLine.beginPath();
      // Use gameplay area boundaries instead of screen edges
      const marginX = Math.max(50, layout.gameplayStartX);
      const endX = Math.min(width - 50, layout.gameplayEndX);
      this.judgmentLine.moveTo(marginX, this.JUDGMENT_Y);
      this.judgmentLine.lineTo(endX, this.JUDGMENT_Y);
      this.judgmentLine.strokePath();
    }
    
    // Update all falling notes' positions to match new lane positions
    if (this.fallingKeys && this.fallingKeys.length > 0) {
      this.fallingKeys.forEach(note => {
        if (note.keyType && this.keyLanes[note.keyType]) {
          // Update note x position to new lane position
          note.x = this.keyLanes[note.keyType].x;
          
          // Update note size if it's a sprite (regular note)
          if (note.setDisplaySize && !note.isHold) {
            note.setDisplaySize(layout.keySize, layout.keySize);
          }
          
          // Update hold note bar width if it's a hold note
          if (note.isHold && note.setSize) {
            const holdBarWidth = getResponsiveSpacing(20, width);
            const currentHeight = note.height || getResponsiveSpacing(100, height);
            note.setSize(holdBarWidth, currentHeight);
          }
          
          // Update hold bar position if it exists
          if (note.holdBar && note.holdBar.setPosition) {
            note.holdBar.setPosition(this.keyLanes[note.keyType].x, note.holdBar.y);
          }
        }
      });
    }
    
    // Update key visuals position and size
    if (this.keyVisuals) {
      const keyVisualY = height - getResponsiveSpacing(50, height);
      Object.keys(this.keyVisuals).forEach(key => {
        if (this.keyVisuals[key] && this.keyLanes[key]) {
          this.keyVisuals[key].setPosition(this.keyLanes[key].x, keyVisualY);
          // Use layout keySize for consistent sizing
          this.keyVisuals[key].setDisplaySize(layout.keySize, layout.keySize);
        }
        // Update glow position and size
        if (this.keyGlows && this.keyGlows[key] && this.keyLanes[key]) {
          this.keyGlows[key].setPosition(this.keyLanes[key].x, keyVisualY);
          this.keyGlows[key].setRadius(layout.keySize * 0.7);
        }
      });
    }
    
    // Update screen height and cull margin cache
    this.screenHeight = height;
    this.cullMargin = getResponsiveSpacing(100, height);
  }

  shutdown() {
    // Cleanup: Release all pooled objects when scene shuts down
    if (this.holdNotePool) {
      this.holdNotePool.releaseAll();
    }
    if (this.notePools) {
      Object.values(this.notePools).forEach(pool => pool.releaseAll());
    }
    
    // Cleanup: Stop all key animations
    if (this.keyVisuals) {
      Object.keys(this.keyVisuals).forEach(key => {
        this.tweens.killTweensOf(this.keyVisuals[key]);
      });
    }
    if (this.keyGlows) {
      Object.keys(this.keyGlows).forEach(key => {
        this.tweens.killTweensOf(this.keyGlows[key]);
      });
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
          this.stopHoldPulse(key.keyType);
          this.animateKeyPress(key.keyType, "miss", false);
        } else {
          this.showFeedback("Miss", "#ff0000", key.keyType);
          this.animateKeyPress(key.keyType, "miss", false);
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

  /**
   * Animate key press with scale and color feedback
   * @param {string} key - The key that was pressed (W, A, S, D)
   * @param {string} quality - "perfect", "good", or "miss"
   * @param {boolean} isHold - Whether this is a hold note
   */
  animateKeyPress(key, quality = "good", isHold = false) {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Determine color and scale based on quality
    let tintColor, glowColor, scaleAmount;
    switch(quality) {
      case "perfect":
        tintColor = 0x00ff00; // Bright green
        glowColor = 0x00ff00;
        scaleAmount = 1.25; // Larger scale for perfect
        break;
      case "good":
        tintColor = 0xffff00; // Yellow
        glowColor = 0xffff00;
        scaleAmount = 1.15; // Medium scale for good
        break;
      case "miss":
        tintColor = 0xff0000; // Red
        glowColor = 0xff0000;
        scaleAmount = 1.1; // Smaller scale for miss
        break;
      default:
        tintColor = 0xffffff; // White for general press
        glowColor = 0x00aaff; // Blue glow
        scaleAmount = 1.2;
    }
    
    // Stop any existing tweens on this key
    this.tweens.killTweensOf(keyVisual);
    if (glow) this.tweens.killTweensOf(glow);
    
    // Apply tint
    keyVisual.setTint(tintColor);
    
    // Scale up animation with bounce
    this.tweens.add({
      targets: keyVisual,
      scaleX: scaleAmount,
      scaleY: scaleAmount,
      duration: 100,
      ease: "Back.easeOut",
      yoyo: false,
    });
    
    // Glow effect - fade in then out
    if (glow) {
      glow.setFillStyle(glowColor, 0.6);
      glow.setVisible(true);
      this.tweens.add({
        targets: glow,
        alpha: 0.8,
        scale: 1.3,
        duration: 100,
        ease: "Power2",
        yoyo: true,
        onComplete: () => {
          glow.setVisible(false);
          glow.setAlpha(0);
          glow.setScale(1);
        }
      });
    }
    
    // If not a hold note, scale back down after a delay
    if (!isHold) {
      this.tweens.add({
        targets: keyVisual,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        delay: 100,
        ease: "Power2",
        onComplete: () => {
          keyVisual.clearTint();
        }
      });
    }
  }
  
  /**
   * Animate key release (for hold notes)
   * @param {string} key - The key that was released
   */
  animateKeyRelease(key) {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Stop any pulsing animations
    this.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.tweens.killTweensOf(glow);
      glow.setVisible(false);
    }
    
    // Scale back down smoothly
    this.tweens.add({
      targets: keyVisual,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        keyVisual.clearTint();
      }
    });
  }
  
  /**
   * Start pulsing animation for hold notes
   * @param {string} key - The key being held
   */
  startHoldPulse(key) {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Continuous pulsing scale
    this.tweens.add({
      targets: keyVisual,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1 // Infinite repeat
    });
    
    // Pulsing glow
    if (glow) {
      glow.setFillStyle(0x00ff00, 0.4);
      glow.setVisible(true);
      this.tweens.add({
        targets: glow,
        alpha: 0.6,
        scale: 1.2,
        duration: 300,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1
      });
    }
  }
  
  /**
   * Stop pulsing animation for hold notes
   * @param {string} key - The key that was released
   */
  stopHoldPulse(key) {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Kill pulsing tweens
    this.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.tweens.killTweensOf(glow);
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
  
    // Determine quality from color
    let quality = "good";
    if (color === "#00ff00") quality = "perfect";
    else if (color === "#ff0000") quality = "miss";
    
    // Use new animation system
    this.animateKeyPress(key, quality, false);
  }

  handlePlayerInput(event) {
    const keyPressed = event.key.toUpperCase();
    const perfectMargin = this.perfectMargin || 15;
    const goodMargin = this.goodMargin || 40;
    let noteHit = false;

    if (this.keyLanes[keyPressed]) {
      for (let i = 0; i < this.fallingKeys.length; i++) {
        const note = this.fallingKeys[i];
        
        if (note.keyType === keyPressed) {
          const distance = Math.abs(note.y - this.JUDGMENT_Y);
          noteHit = true;

          // Check if this is a hold note
          if (note.isHold) {
            // Start holding the note
            if (distance < goodMargin && !note.held) {
              note.held = true;
              note.holdStartTime = this.time.now;
              
              // Visual feedback: change color to green
              note.setFillStyle(0x00ff00);
              
              // Show feedback for starting the hold
              let quality = distance < perfectMargin ? "perfect" : "good";
              if (distance < perfectMargin) {
                this.showFeedback("Hold Start!", "#00ff00", keyPressed);
              } else {
                this.showFeedback("Hold Start", "#ffff00", keyPressed);
              }
              
              // Animate key press and start hold pulse
              this.animateKeyPress(keyPressed, quality, true);
              this.startHoldPulse(keyPressed);
            }
            // Don't break - allow checking other notes, but hold notes need to be held
            continue;
          } else {
            // Regular note handling
            let quality = "good";
            if (distance < perfectMargin) {
              this.showFeedback("Perfect!", "#00ff00", keyPressed);
              this.score += 20;
              this.perfectCount++;
              quality = "perfect";
            } else if (distance < goodMargin) {
              this.showFeedback("Good", "#ffff00", keyPressed);
              this.score += 10;
              this.goodCount++;
              quality = "good";
            } else {
              continue;
            }
            
            // Animate key press with quality-based feedback
            this.animateKeyPress(keyPressed, quality, false);

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
      
      // If no note was hit, still provide visual feedback (but smaller/miss style)
      if (!noteHit) {
        this.animateKeyPress(keyPressed, "miss", false);
      }
    }
  }
}
