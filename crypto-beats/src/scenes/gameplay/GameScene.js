import Phaser from "phaser";
import { DIFFICULTY_LEVELS, getDifficultyConfig, adjustSongDataForDifficulty } from "../../utils/game/difficultyManager.js";
import { getSongById, getAllSongs } from "../../config/songs.js";
import { validateSongData, audioExists, jsonExists, showError, logError, getFallbackSong } from "../../utils/data/errorHandler.js";
import { createNotePool, createHoldNotePool } from "../../utils/game/objectPool.js";
import { getResponsiveFontSize, getResponsiveSpacing } from "../../utils/ui/responsive.js";
import { 
  getAudioOffset, 
  getAccurateGameTime, 
  isAudioReady, 
  waitForAudioReady,
  parseBPMChanges,
  getCurrentBPM
} from "../../utils/audio/audioSync.js";
import { getThemeColors } from "../../utils/ui/colorThemes.js";
import { checkAchievements, getAchievement } from "../../utils/game/achievements.js";

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
    this.audioStartTime = 0; // Track when audio actually started playing
    
    // Get audio offset from user calibration
    this.audioOffset = getAudioOffset();
    if (this.audioOffset !== 0) {
      console.log(`[GameScene] Using audio offset: ${this.audioOffset}ms`);
    }
    
    // Parse BPM changes for variable BPM support
    this.bpmChanges = [];
    this.baseBPM = 120; // Default BPM
    if (originalSongData && originalSongData.metadata) {
      this.baseBPM = originalSongData.metadata.bpm || 120;
      this.bpmChanges = parseBPMChanges(originalSongData.metadata);
      if (this.bpmChanges.length > 0) {
        console.log(`[GameScene] Variable BPM detected: ${this.bpmChanges.length} BPM changes`);
      }
    }

    // Get theme colors
    this.themeColors = getThemeColors();
    
    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);
    
    // Background fills screen - store reference for resize
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
      this.backgroundImage.setAlpha(0.3); // Dim background for focus
    } else {
      // Fallback: solid color background if image doesn't load
      this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
      this.backgroundRect.setAlpha(0.3); // Dim background
    }
    
    // Add dark overlay for better focus on gameplay
    this.dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    this.dimOverlay.setDepth(0); // Behind everything
    
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

    // Judgment Line - Use gameplay area boundaries with theme color
    this.judgmentLine = this.add.graphics();
    this.judgmentLine.lineStyle(4, this.themeColors.judgmentLine, 1);
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
    
    // Achievement tracking
    this.comboMasterUnlocked = false; // Track if combo master was already unlocked this session

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
    
    // Initialize audio ready state
    this.audioReady = false;
    this.musicStarted = false;

    // Calculate when to start music
    // If first note is at time T, we need to start music at (T - FALL_TIME) so note arrives at time T
    const firstNoteTime = this.songData.length > 0 ? this.songData[0].time : 0;
    const musicStartTime = Math.max(0, firstNoteTime - FALL_TIME); // Don't start before 0
    const delayBeforeMusicStart = musicStartTime * 1000; // Convert to milliseconds

    // Wait for audio to be ready before starting
    const startMusicWhenReady = async () => {
      // Wait for audio to be ready (with timeout)
      const ready = await waitForAudioReady(this.music, this, 5000);
      
      if (!ready) {
        console.warn(`[GameScene] Audio not ready after timeout, starting anyway`);
      }
      
      // Set initial start time
      this.startTime = this.time.now;
      
      const playMusic = () => {
        try {
          if (this.music && !this.music.isPlaying) {
            this.music.play();
            // Record actual audio start time for accurate timing
            this.audioStartTime = Date.now();
            this.musicStarted = true;
            console.log(`[GameScene] Music started. First note at ${firstNoteTime}s, ${this.songData.length} total notes`);
            console.log(`[GameScene] Audio offset: ${this.audioOffset}ms, Variable BPM: ${this.bpmChanges.length > 0 ? 'Yes' : 'No'}`);
          }
        } catch (error) {
          console.error(`[GameScene] Error playing music:`, error);
          // Fallback: use scene time as start time
          this.audioStartTime = Date.now();
          this.musicStarted = true;
          console.log(`[GameScene] Using fallback audio start time`);
        }
      };
      
      if (delayBeforeMusicStart <= 0) {
        // Start immediately
        playMusic();
      } else {
        // Delay start
        this.time.delayedCall(delayBeforeMusicStart, playMusic);
      }
    };
    
    // Start the audio ready check
    startMusicWhenReady();

    // Keyboard input
    this.input.keyboard.on("keydown", this.handlePlayerInput, this);
    this.input.keyboard.on("keyup", this.handleKeyRelease, this);
    
    // Pause state
    this.isPaused = false;
    this.pauseMenu = null;
    
    // Keyboard shortcut: Esc to pause/resume
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.isPaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    });
  }
  
  pauseGame() {
    if (this.isPaused || !this.musicStarted) return;
    
    this.isPaused = true;
    if (this.music && this.music.isPlaying) {
      this.music.pause();
    }
    this.scene.pause();
    
    // Create pause menu overlay
    this.createPauseMenu();
  }
  
  resumeGame() {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    if (this.music && this.music.isPaused) {
      this.music.resume();
    }
    this.scene.resume();
    
    // Remove pause menu
    if (this.pauseMenu) {
      if (this.pauseMenu.overlay) this.pauseMenu.overlay.destroy();
      if (this.pauseMenu.title) this.pauseMenu.title.destroy();
      if (this.pauseMenu.resumeButton) this.pauseMenu.resumeButton.destroy();
      if (this.pauseMenu.quitButton) this.pauseMenu.quitButton.destroy();
      this.pauseMenu = null;
    }
  }
  
  createPauseMenu() {
    const { width, height } = this.scale;
    
    // Dark overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    
    // Pause title
    const titleSize = getResponsiveFontSize(48, width, 36, 60);
    const title = this.add.text(width / 2, height / 2 - getResponsiveSpacing(100, height), "PAUSED", {
      fontSize: titleSize,
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Resume button
    const buttonSize = getResponsiveFontSize(24, width, 18, 30);
    const resumeButton = this.add.text(width / 2, height / 2, "Resume (ESC)", {
      fontSize: buttonSize,
      fill: "#ffffff",
      backgroundColor: "#00aa00",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    resumeButton.on("pointerdown", () => {
      this.resumeGame();
    });
    
    // Quit button
    const quitButton = this.add.text(width / 2, height / 2 + getResponsiveSpacing(60, height), "Quit to Menu", {
      fontSize: buttonSize,
      fill: "#ffffff",
      backgroundColor: "#aa0000",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    quitButton.on("pointerdown", () => {
      if (this.music) {
        this.music.stop();
      }
      this.scene.start("MainMenuScene");
    });
    
    // Store references
    this.pauseMenu = {
      overlay,
      title,
      resumeButton,
      quitButton
    };
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
            let feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
            let score = 30; // Hold notes worth more points
            
            // Check timing precision
            if (distance < perfectMargin && holdDuration >= requiredDuration) {
              feedbackText = "Perfect Hold!";
              feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
              score = 40;
            } else if (holdDuration < requiredDuration) {
              feedbackText = "Hold Too Short";
              feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.good).rgba;
              score = 20;
            }
            
            this.showFeedback(feedbackText, feedbackColor, keyReleased);
            this.score += score;
            this.notesHit++;
            this.currentStreak++;
            if (this.currentStreak > this.longestStreak) {
              this.longestStreak = this.currentStreak;
              
              // Check for Combo Master achievement (100x combo) during gameplay
              if (this.longestStreak === 100 && !this.comboMasterUnlocked) {
                const totalSongs = getAllSongs().length;
                const gameData = {
                  accuracy: 0, // Not needed for combo check
                  grade: '',
                  difficulty: this.currentDifficulty,
                  longestStreak: this.longestStreak,
                  failed: false,
                  song: this.currentSongId
                };
                const newlyUnlocked = checkAchievements(gameData, totalSongs);
                if (newlyUnlocked.includes('combo_master')) {
                  this.comboMasterUnlocked = true;
                  this.showAchievementNotification('combo_master');
                }
              }
            }
            
            this.updateScore(this.score);
            
            // Stop hold pulse and animate release
            this.stopHoldPulse(keyReleased);
            this.animateKeyRelease(keyReleased);
            
            // Clean up - return to pool instead of destroying
            this.releaseNote(note);
            this.fallingKeys.splice(i, 1);
            break;
          } else {
            // Hold was released too early or at wrong position
            const missColor = Phaser.Display.Color.IntegerToColor(this.themeColors.miss).rgba;
            this.showFeedback("Hold Failed", missColor, keyReleased);
            note.held = false;
            note.holdStartTime = null;
            note.setFillStyle(note.originalColor || this.themeColors.note);
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
      holdBar.setFillStyle(this.themeColors.note);
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
      holdBar.originalColor = this.themeColors.note;
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
      
      // Create trail effect for regular notes with theme colors
      keySprite.trail = this.add.particles(lane.x, 0, 'noteTrail', {
        speed: { min: 20, max: 40 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 50,
        tint: this.themeColors.trail
      });
      keySprite.trail.setDepth(9); // Just behind the note
      keySprite.trail.follow(keySprite);
      
      // Apply theme color tint to note sprite
      keySprite.setTint(this.themeColors.note);
      
      this.fallingKeys.push(keySprite);
    }
  }
  
  /**
   * Release a note back to its pool
   */
  releaseNote(note) {
    // Clean up trail effect if it exists
    if (note.trail) {
      note.trail.destroy();
      note.trail = null;
    }
    
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
    
      // Update judgment line position to match gameplay area (with theme color)
      if (this.judgmentLine) {
        this.judgmentLine.clear();
        this.judgmentLine.lineStyle(4, this.themeColors.judgmentLine, 1);
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
    // Don't update if music hasn't started yet or if paused
    if (!this.musicStarted || this.isPaused) {
      return;
    }
    
    // Ensure we have a valid startTime
    if (this.startTime === 0 || this.startTime === undefined) {
      // Use current time as fallback
      this.startTime = this.time.now;
      console.log(`[GameScene] startTime was 0, setting to: ${this.startTime}`);
    }

    // Calculate accurate game time using audio.currentTime when available
    // This provides better synchronization than scene time alone
    const elapsedTime = getAccurateGameTime(
      this.music,
      this.time.now, // Current scene time (for reference, but not used in fallback)
      this.audioStartTime, // Date.now() timestamp when audio started
      this.audioOffset
    ); 

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
        const missColor = Phaser.Display.Color.IntegerToColor(this.themeColors.miss).rgba;
        if (key.isHold && key.held) {
          this.showFeedback("Hold Miss", missColor, key.keyType);
          this.stopHoldPulse(key.keyType);
          this.animateKeyPress(key.keyType, "miss", false);
        } else {
          this.showFeedback("Miss", missColor, key.keyType);
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
    
    // Determine color and scale based on quality (use theme colors)
    let tintColor, glowColor, scaleAmount;
    switch(quality) {
      case "perfect":
        tintColor = this.themeColors.perfect;
        glowColor = this.themeColors.perfect;
        scaleAmount = 1.25; // Larger scale for perfect
        break;
      case "good":
        tintColor = this.themeColors.good;
        glowColor = this.themeColors.good;
        scaleAmount = 1.15; // Medium scale for good
        break;
      case "miss":
        tintColor = this.themeColors.miss;
        glowColor = this.themeColors.miss;
        scaleAmount = 1.1; // Smaller scale for miss
        break;
      default:
        tintColor = this.themeColors.note; // Theme note color for general press
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

  updateScore(newScore) {
    // Animate score change
    if (newScore !== this.lastScore) {
      const scoreDiff = newScore - this.lastScore;
      
      // Update text
      this.scoreText.setText("Score: " + newScore);
      
      // Animate score text (scale up then back)
      this.tweens.add({
        targets: this.scoreText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        yoyo: true,
        ease: "Power2"
      });
      
      // Show score gain indicator if significant
      if (scoreDiff > 0) {
        const { width, height } = this.scale;
        const scoreX = getResponsiveSpacing(20, width);
        const scoreY = getResponsiveSpacing(20, height);
        const gainText = this.add.text(scoreX + 150, scoreY, `+${scoreDiff}`, {
          fontSize: getResponsiveFontSize(18, width, 14, 22),
          fill: Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba,
          fontStyle: "bold"
        });
        
        this.tweens.add({
          targets: gainText,
          y: scoreY - 30,
          alpha: 0,
          duration: 800,
          ease: "Power2",
          onComplete: () => gainText.destroy()
        });
      }
      
      this.lastScore = newScore;
    }
  }

  showFeedback(text, color, key) {
    // Text feedback
    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);
    
    // Play hit sound based on feedback type
    try {
      if (text.includes("Perfect")) {
        // Play perfect hit sound (high pitch beep)
        this.sound.play("hitPerfect", { volume: 0.3 });
      } else if (text.includes("Good")) {
        // Play good hit sound (medium pitch beep)
        this.sound.play("hitGood", { volume: 0.25 });
      } else if (text.includes("Miss")) {
        // Play miss sound (low pitch error sound)
        this.sound.play("hitMiss", { volume: 0.2 });
      }
    } catch (error) {
      // Sounds might not be loaded, ignore
    }
  
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      duration: 800,
      ease: "Power2",
    });
  
    // Determine quality from color (use theme colors)
    let quality = "good";
    const perfectColorHex = this.themeColors.perfect.toString(16).padStart(6, '0');
    const missColorHex = this.themeColors.miss.toString(16).padStart(6, '0');
    
    // Compare colors (check if color string contains theme color hex or matches common patterns)
    if (color.includes(perfectColorHex) || color.includes("00ff00") || color === "#00ff00") quality = "perfect";
    else if (color.includes(missColorHex) || color.includes("ff0000") || color === "#ff0000") quality = "miss";
    
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
              
              // Visual feedback: change color to theme perfect color
              note.setFillStyle(this.themeColors.perfect);
              
              // Show feedback for starting the hold
              let quality = distance < perfectMargin ? "perfect" : "good";
              if (distance < perfectMargin) {
                const perfectColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
                this.showFeedback("Hold Start!", perfectColor, keyPressed);
              } else {
                const goodColor = Phaser.Display.Color.IntegerToColor(this.themeColors.good).rgba;
                this.showFeedback("Hold Start", goodColor, keyPressed);
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
              const perfectColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
              this.showFeedback("Perfect!", perfectColor, keyPressed);
              this.score += 20;
              this.perfectCount++;
              quality = "perfect";
            } else if (distance < goodMargin) {
              const goodColor = Phaser.Display.Color.IntegerToColor(this.themeColors.good).rgba;
              this.showFeedback("Good", goodColor, keyPressed);
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
            if (this.currentStreak > this.longestStreak) {
              this.longestStreak = this.currentStreak;
              
              // Check for Combo Master achievement (100x combo) during gameplay
              if (this.longestStreak === 100 && !this.comboMasterUnlocked) {
                const totalSongs = getAllSongs().length;
                const gameData = {
                  accuracy: 0, // Not needed for combo check
                  grade: '',
                  difficulty: this.currentDifficulty,
                  longestStreak: this.longestStreak,
                  failed: false,
                  song: this.currentSongId
                };
                const newlyUnlocked = checkAchievements(gameData, totalSongs);
                if (newlyUnlocked.includes('combo_master')) {
                  this.comboMasterUnlocked = true;
                  this.showAchievementNotification('combo_master');
                }
              }
            }
            
            // Track combo start
            if (this.currentStreak === 1) {
              this.currentComboStart = this.time.now;
            }

            this.updateScore(this.score);

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
  
  showAchievementNotification(achievementId) {
    const achievement = getAchievement(achievementId);
    if (!achievement) return;
    
    const { width, height } = this.scale;
    
    // Create notification in top-right corner
    const notificationX = width - getResponsiveSpacing(220, width);
    const notificationY = getResponsiveSpacing(100, height);
    
    // Background
    const bg = this.add.rectangle(
      notificationX,
      notificationY,
      getResponsiveSpacing(400, width),
      getResponsiveSpacing(100, height),
      0x1a1a2e,
      0.95
    );
    bg.setStrokeStyle(3, 0x00ff00);
    bg.setDepth(1000);
    
    // Icon
    const icon = this.add.text(
      notificationX - getResponsiveSpacing(150, width),
      notificationY,
      achievement.icon,
      {
        fontSize: getResponsiveFontSize(40, width, 30, 50)
      }
    ).setOrigin(0.5).setDepth(1001);
    
    // Title
    const title = this.add.text(
      notificationX,
      notificationY - getResponsiveSpacing(20, height),
      "Achievement!",
      {
        fontSize: getResponsiveFontSize(18, width, 14, 22),
        fill: "#00ff00",
        fontStyle: "bold",
        fontFamily: "'Orbitron', 'Arial', sans-serif"
      }
    ).setOrigin(0.5).setDepth(1001);
    
    // Name
    const name = this.add.text(
      notificationX,
      notificationY + getResponsiveSpacing(10, height),
      achievement.name,
      {
        fontSize: getResponsiveFontSize(16, width, 12, 20),
        fill: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(1001);
    
    // Animate in
    bg.setAlpha(0);
    icon.setAlpha(0);
    title.setAlpha(0);
    name.setAlpha(0);
    
    this.tweens.add({
      targets: [bg, icon, title, name],
      alpha: 1,
      x: `-=${getResponsiveSpacing(20, width)}`,
      duration: 500,
      ease: "Back.easeOut"
    });
    
    // Animate out
    this.tweens.add({
      targets: [bg, icon, title, name],
      alpha: 0,
      x: `+=${getResponsiveSpacing(20, width)}`,
      duration: 500,
      delay: 3000,
      ease: "Power2",
      onComplete: () => {
        bg.destroy();
        icon.destroy();
        title.destroy();
        name.destroy();
      }
    });
  }
}
