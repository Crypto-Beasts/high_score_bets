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
  constructor(config) {
    // Accept config parameter to allow child classes to override the key
    const sceneConfig = config || { key: "GameScene" };
    if (!sceneConfig.key) {
      sceneConfig.key = "GameScene";
    }
    super(sceneConfig);
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

    // Combo counter - positioned below score
    const comboY = scoreY + getResponsiveSpacing(35, height);
    this.comboText = this.add.text(scoreX, comboY, "", {
      fontSize: getResponsiveFontSize(20, width, 16, 24),
      fill: "#ffff00",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif"
    }).setAlpha(0); // Hidden until combo starts

    // Combo multiplier text (shows multiplier when active)
    this.comboMultiplierText = this.add.text(scoreX, comboY + getResponsiveSpacing(30, height), "", {
      fontSize: getResponsiveFontSize(16, width, 12, 20),
      fill: "#00ff00",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif"
    }).setAlpha(0);

    // Track last milestone reached to avoid duplicate effects
    this.lastMilestone = 0;

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
      let handledHoldNote = false;
      
      // Find hold notes that are currently being held for this key
      for (let i = 0; i < this.fallingKeys.length; i++) {
        const note = this.fallingKeys[i];
        
        if (note.keyType === keyReleased && note.isHold && note.held && note.holdStartTime) {
          handledHoldNote = true;
          // Use audio time for accurate hold duration calculation
          const currentAudioTime = this.getCurrentAudioTime();
          const holdStartAudioTime = note.holdStartAudioTime;
          const holdElapsed = currentAudioTime - holdStartAudioTime;
          const requiredDuration = note.holdDuration || 0;
          const expectedEndTime = holdStartAudioTime + requiredDuration;
          
          // Check if hold was completed successfully using audio time
          const durationTolerance = 0.1; // 100ms tolerance
          const distance = Math.abs(note.y - this.JUDGMENT_Y);
          
          // Determine completion quality based on audio time
          let feedbackText = "Hold Complete!";
          let feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
          let score = 30; // Hold notes worth more points
          
          if (currentAudioTime >= expectedEndTime - durationTolerance) {
            // Successfully completed - check timing precision
            if (distance < perfectMargin && currentAudioTime >= expectedEndTime) {
              feedbackText = "Perfect Hold!";
              feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
              score = 40;
            } else if (currentAudioTime >= expectedEndTime * 0.7) {
              // At least 70% completion
              feedbackText = "Hold Complete!";
              feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.good).rgba;
              score = 30;
            } else {
              feedbackText = "Hold Too Short";
              feedbackColor = Phaser.Display.Color.IntegerToColor(this.themeColors.good).rgba;
              score = 20;
            }
            
            
            // Apply combo multiplier to score
            const comboMultiplier = this.getComboMultiplier(this.currentStreak);
            const baseScore = score;
            const multipliedScore = Math.floor(baseScore * comboMultiplier);
            
            this.score += multipliedScore;
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
            
            // Update combo display
            this.updateComboDisplay(this.currentStreak);
            
            this.updateScore(this.score);
            
            // Stop hold pulse (clean up any tweens, but keep key in pressed state)
            this.stopHoldPulse(keyReleased);
            // Key visual remains in pressed state until user physically releases the key
            // Reset will happen in handleKeyRelease when key is actually released (lines 613-646)
            
            // Clean up hold bar
            if (note.holdBar) {
              note.holdBar.setVisible(false); // Changed from key.holdBar to note.holdBar
              this.holdNotePool.release(note.holdBar);
              note.holdBar = null;
            }
            
            // Clean up - return to pool instead of destroying
            this.releaseNote(note);
            this.fallingKeys.splice(i, 1);
            break;
          } else {
            // Hold was released too early (before 70% completion)
            const missColor = Phaser.Display.Color.IntegerToColor(this.themeColors.miss).rgba;
            note.held = false;
            note.holdStartTime = null;
            note.holdStartAudioTime = null;
            
            // Revert tail to normal color - it will continue falling
            if (note.holdBar) {
              const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
              note.holdBar.setFillStyle(tailColor.color, 0.7); // 70% opacity, normal color
            }
            
            // Key sprite stays hidden - it doesn't reappear
            note.setVisible(false);
            note.keySpriteHidden = true; // Ensure it stays hidden
            if (note.trail) {
              note.trail.setVisible(false);
            }
            
            // Reset key state (no animation)
            this.stopHoldPulse(keyReleased);
            // Reset key visual immediately without animation
            const keyVisual = this.keyVisuals[keyReleased];
            const glow = this.keyGlows[keyReleased];
            if (keyVisual) {
              this.tweens.killTweensOf(keyVisual);
              keyVisual.setScale(1.0, 1.0);
              keyVisual.clearTint();
            }
            if (glow) {
              this.tweens.killTweensOf(glow);
              glow.setVisible(false);
              glow.setAlpha(0);
              glow.setScale(1);
            }

            this.currentStreak = 0;
            this.lastMilestone = 0;
            this.failed = true;
            
            // Update combo display (will hide it)
            this.updateComboDisplay(0);
            
            // DON'T remove from fallingKeys - let it continue falling until it goes off screen
            // The note will be cleaned up when it passes off-screen in the update loop
            break;
          }
        }
      }
      
      // If it's not a hold note, check if key is in pressed state and return it to normal
      if (!handledHoldNote) {
        const keyVisual = this.keyVisuals[keyReleased];
        if (keyVisual) {
          const currentScale = keyVisual.scaleX || 1.0;
          // If key is in pressed state (scaled down), animate it back to normal
          if (currentScale < 1.0) {
            // Check if this key is currently being held for a hold note
            let isKeyCurrentlyHeld = false;
            for (let i = 0; i < this.fallingKeys.length; i++) {
              const note = this.fallingKeys[i];
              if (note.keyType === keyReleased && note.isHold && note.held && note.holdStartTime) {
                isKeyCurrentlyHeld = true;
                break;
              }
            }
            
            // Only release if it's not being held for a hold note
            if (!isKeyCurrentlyHeld) {
              // Reset key visual immediately without animation
              this.tweens.killTweensOf(keyVisual);
              keyVisual.setScale(1.0, 1.0);
              keyVisual.clearTint();
              const glow = this.keyGlows[keyReleased];
              if (glow) {
                this.tweens.killTweensOf(glow);
                glow.setVisible(false);
                glow.setAlpha(0);
                glow.setScale(1);
              }
            }
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
      // Hold notes: key sprite at top + tail bar connecting to judgment line
      const keySprite = this.notePools[key].acquire();
      keySprite.setPosition(lane.x, 0);
      keySprite.setDisplaySize(noteSize, noteSize); // Responsive note size
      keySprite.setOrigin(0.5, 0.5);
      keySprite.setDepth(10);
      keySprite.setVisible(true);
      keySprite.setActive(true);
      
      // Store note properties
      keySprite.keyType = key;
      keySprite.isHold = true;
      keySprite.held = false;
      keySprite.holdDuration = duration;
      keySprite.holdStartTime = null;
      keySprite.originalColor = this.themeColors.note;
      keySprite.pooled = true; // Mark as pooled for cleanup
      
      // Apply theme color tint to note sprite
      keySprite.setTint(this.themeColors.note);
      
      // Create trail effect (same as regular notes)
      keySprite.trail = this.add.particles(lane.x, 0, 'noteTrail', {
        speed: { min: 20, max: 40 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 50,
        tint: this.themeColors.trail
      });
      keySprite.trail.setDepth(9); // Just behind the note
      
      // Create hold bar tail - extends UPWARD from key sprite
      // IMPORTANT: Tail must be behind the key sprite (like Rock Band - key in front, line behind)
      // Tail height is based on hold duration - longer holds = longer tails
      const holdBar = this.holdNotePool.acquire();
      const holdBarWidth = getResponsiveSpacing(15, width);
      const tailHeight = this.calculateTailHeight(duration);
      
      // Position tail so it extends upward from the key sprite
      holdBar.setPosition(lane.x, 0); // Position at key sprite (spawn position)
      holdBar.setSize(holdBarWidth, tailHeight);
      const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
      tailColor.alpha = 0.7;
      holdBar.setFillStyle(tailColor.color, tailColor.alpha);
      holdBar.setOrigin(0.5, 1); // Anchor at BOTTOM - extends UPWARD
      holdBar.setDepth(3);
      holdBar.setVisible(true);
      holdBar.setActive(true);
      
      keySprite.holdBar = holdBar;
      keySprite.holdBarStartY = this.JUDGMENT_Y;
      
      this.fallingKeys.push(keySprite);
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
      // Note: Particle emitters don't have a follow() method in Phaser 3
      // We'll update the emitter position manually in the update loop
      keySprite.trail = this.add.particles(lane.x, 0, 'noteTrail', {
        speed: { min: 20, max: 40 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 50,
        tint: this.themeColors.trail
      });
      keySprite.trail.setDepth(9); // Just behind the note
      
      // Apply theme color tint to note sprite
      keySprite.setTint(this.themeColors.note);
      
      this.fallingKeys.push(keySprite);
    }
  }
  
  /**
   * Calculate tail height based on hold duration
   * Tail should be visually proportional to hold duration, not absolute pixel distance
   * @param {number} holdDuration - Hold duration in seconds
   * @returns {number} Tail height in pixels
   */
  calculateTailHeight(holdDuration) {
    // Use a reasonable maximum tail height and scale accordingly
    const { height } = this.scale;
    const MAX_TAIL_HEIGHT = getResponsiveSpacing(200, height); // Maximum tail height
    const MAX_HOLD_DURATION = 3.0; // Maximum expected hold duration in seconds (cap at 3 seconds)
    
    // Scale tail height based on hold duration, capped at maximum
    const proportion = Math.min(holdDuration / MAX_HOLD_DURATION, 1.0);
    return MAX_TAIL_HEIGHT * proportion;
  }

  /**
   * Get current audio time in seconds
   * @returns {number} Current audio time
   */
  getCurrentAudioTime() {
    return getAccurateGameTime(
      this.music,
      this.time.now,
      this.audioStartTime,
      this.audioOffset
    );
  }

  /**
   * Transform hold bar tail when player starts holding
   * @param {Object} note - The note object (key sprite)
   * @param {string} key - The key being held
   */
  transformToHoldBar(note, key) {
    if (!note || !note.isHold || !note.holdBar) return;
    
    // Hide key sprite when pressed - it doesn't reappear
    note.setVisible(false);
    note.keySpriteHidden = true; // Flag to prevent culling from making it visible again
    if (note.trail) {
      note.trail.setVisible(false);
    }
    
    // Store timing info (don't overwrite if already set)
    if (!note.holdStartTime) {
      note.holdStartTime = this.time.now;
    }
    if (!note.holdStartAudioTime) {
      note.holdStartAudioTime = this.getCurrentAudioTime();
      note.requiredHoldEndTime = note.holdStartAudioTime + (note.holdDuration || 0);
    }
    
    // Ensure holdBar is visible and positioned correctly
    const originalTailHeight = this.calculateTailHeight(note.holdDuration || 0);
    const holdBarWidth = getResponsiveSpacing(15, this.scale.width);
    note.holdBar.setSize(holdBarWidth, originalTailHeight);
    note.holdBar.setOrigin(0.5, 1); // Anchor at bottom - extends upward
    note.holdBar.setPosition(note.x, note.y); // Position at key sprite
    note.holdBar.setVisible(true);
    
    // Change to active color (glowing green while held)
    note.holdBar.setFillStyle(this.themeColors.perfect, 1.0);
    
    // Tail continues falling naturally - update loop will handle cut-off and pulse
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
    
    // Clean up hold bar if it exists (for hold notes)
    if (note.isHold && note.holdBar) {
      this.holdNotePool.release(note.holdBar);
      note.holdBar = null;
    }
    
    // Reset flags before releasing to pool
    note.keyRemoved = false;
    note.keySpriteHidden = false;
    note.missTriggered = false;
    
    if (note.pooled) {
      // Hold notes now use regular note pools (they start as key sprites)
      // So we always release to note pool, not hold note pool
      this.notePools[note.keyType]?.release(note);
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
        x: gameplayStartX + spacing * 2, // Swapped with A
        sprite: "key_w" 
      },
      A: { 
        x: gameplayStartX + spacing, // Swapped with W
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
    
    // Update combo text position (responsive)
    if (this.comboText) {
      const scoreX = getResponsiveSpacing(20, width);
      const scoreY = getResponsiveSpacing(20, height) + getResponsiveSpacing(35, height);
      this.comboText.setPosition(scoreX, scoreY);
    }
    
    // Update combo multiplier text position (responsive)
    if (this.comboMultiplierText) {
      const scoreX = getResponsiveSpacing(20, width);
      const scoreY = getResponsiveSpacing(20, height) + getResponsiveSpacing(65, height);
      this.comboMultiplierText.setPosition(scoreX, scoreY);
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
          
          // Update note size if it's a sprite (both regular and hold notes start as sprites)
          if (note.setDisplaySize) {
            note.setDisplaySize(layout.keySize, layout.keySize);
          }
          
          // Update hold bar tail if it exists
          if (note.isHold && note.holdBar) {
            const holdBarWidth = getResponsiveSpacing(15, width);
            if (note.held) {
              // Being held: tail continues falling naturally - just update position
              note.holdBar.setPosition(this.keyLanes[note.keyType].x, note.y);
              note.holdBar.setFillStyle(this.themeColors.perfect, 1.0);
            } else {
              // Falling: normal tail
              const tailHeight = this.calculateTailHeight(note.holdDuration || 0);
              note.holdBar.setSize(holdBarWidth, tailHeight);
              note.holdBar.setOrigin(0.5, 1);
              note.holdBar.setPosition(this.keyLanes[note.keyType].x, note.y);
              const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
              note.holdBar.setFillStyle(tailColor.color, 0.7);
            }
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
      // Log error occasionally (not every frame)
      if (this.time.now % 2000 < delta) { // Log every ~2 seconds
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
      // Only log occasionally to avoid spam (check every ~2 seconds)
      if (this.time.now % 2000 < delta) {
        console.log(`[GameScene] Waiting to spawn note ${this.currentNoteIndex}: nextSpawnTime=${nextSpawnTime.toFixed(3)}s, elapsedTime=${elapsedTime.toFixed(3)}s, diff=${(nextSpawnTime - elapsedTime).toFixed(3)}s`);
      }
    }

    // Move falling notes using time-based movement (frame-rate independent)
    // Performance optimization: Cache values to reduce property lookups
    const { width, height } = this.scale;
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
      // Hold notes continue scrolling even when held - the tail "unravels" as it passes the line
      key.y += movementDelta;
      
      // Update particle trail position if it exists (Phaser 3 doesn't have follow method)
      // Particle emitters have x and y properties that can be set directly
      if (key.trail) {
        key.trail.x = key.x;
        key.trail.y = key.y;
      }
      
      // Handle hold bar tail for ALL hold notes (both held and not held)
      if (key.isHold && key.holdBar) {
        const originalTailHeight = this.calculateTailHeight(key.holdDuration || 0);
        const holdBarWidth = getResponsiveSpacing(15, width);
        
        // Always hide key sprite for held notes
        if (key.held) {
          key.setVisible(false);
          if (key.trail) {
            key.trail.setVisible(false);
          }
        }
        
        // Check if the key sprite (bottom of tail) has passed the judgment line
        if (key.y > judgmentY) {
          // Key has passed judgment line - apply cut-off logic
          
          // Calculate the top of the tail
          const tailTop = key.y - originalTailHeight;
          
          // Check if any part of the tail is above the judgment line
          if (tailTop < judgmentY) {
            // Part of the tail is above the judgment line - calculate visible height
            const visibleHeight = judgmentY - tailTop;
            const clippedHeight = Math.min(visibleHeight, originalTailHeight);
            
            if (clippedHeight > 0) {
              // Resize tail to show only the portion above judgment line
              key.holdBar.setSize(holdBarWidth, clippedHeight);
              key.holdBar.setOrigin(0.5, 1);
              // Position tail so its bottom is at the judgment line
              key.holdBar.setPosition(key.x, judgmentY);
              key.holdBar.setVisible(true);
              
              // Set color based on whether note is held or not
              if (key.held) {
                // Pulse effect for held notes
                const holdElapsed = (this.time.now - key.holdStartTime) / 1000;
                const pulse = Math.sin(holdElapsed * 10) * 0.2 + 0.8;
                const greenIntensity = Math.floor(255 * pulse);
                key.holdBar.setFillStyle(Phaser.Display.Color.GetColor(0, greenIntensity, 0), 1.0);
              } else {
                // Normal color for non-held notes
                const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
                key.holdBar.setFillStyle(tailColor.color, 0.7);
                
                // Trigger miss animation if not already triggered
                if (!key.missTriggered) {
                  key.missTriggered = true;
                  const missColor = Phaser.Display.Color.IntegerToColor(this.themeColors.miss).rgba;
                  
                  // Check if this key is currently being held for another note
                  let isKeyCurrentlyHeld = false;
                  for (let j = 0; j < this.fallingKeys.length; j++) {
                    const otherNote = this.fallingKeys[j];
                    if (otherNote.keyType === key.keyType && otherNote.isHold && otherNote.held && otherNote.holdStartTime) {
                      isKeyCurrentlyHeld = true;
                      break;
                    }
                  }
                  
                  // No animation when note crosses judgment line - only track miss
                  
                  // Track miss
                  this.missCount++;
                  
                  // End current combo and record it
                  if (this.currentStreak > 0 && this.currentComboStart) {
                    this.comboHistory.push(this.currentStreak);
                    this.currentComboStart = null;
                  }
                  
                  this.currentStreak = 0;
                  this.lastMilestone = 0;
                  this.failed = true;
                  
                  // Update combo display (will hide it)
                  this.updateComboDisplay(0);
                }
                
                // Note continues scrolling naturally - no hiding or removal
              }
            } else {
              // No visible portion - hide the tail
              key.holdBar.setVisible(false);
            }
          } else {
            // Entire tail is below the judgment line - note continues scrolling naturally
            
            // If this is a held note that passed the line, check if it was released too early
            // Only mark as miss if the hold duration wasn't completed
            // The key visual should remain in pressed state until user releases the key
            if (key.held && !key.missTriggered) {
              // Check if hold was completed successfully using audio time
              const currentAudioTime = this.getCurrentAudioTime();
              const holdStartAudioTime = key.holdStartAudioTime;
              const requiredDuration = key.holdDuration || 0;
              const expectedEndTime = holdStartAudioTime + requiredDuration;
              const durationTolerance = 0.1; // 100ms tolerance
              
              // Only mark as miss if hold wasn't completed (released too early)
              // If hold was completed, the note will be cleaned up in handleKeyRelease
              // and the key will remain pressed until user releases it
              if (currentAudioTime < expectedEndTime - durationTolerance) {
                key.missTriggered = true;
                const missColor = Phaser.Display.Color.IntegerToColor(this.themeColors.miss).rgba;
                this.stopHoldPulse(key.keyType);
                // Reset key visual immediately without animation
                const keyVisual = this.keyVisuals[key.keyType];
                const glow = this.keyGlows[key.keyType];
                if (keyVisual) {
                  this.tweens.killTweensOf(keyVisual);
                  keyVisual.setScale(1.0, 1.0);
                  keyVisual.clearTint();
                }
                if (glow) {
                  this.tweens.killTweensOf(glow);
                  glow.setVisible(false);
                  glow.setAlpha(0);
                  glow.setScale(1);
                }
                
                this.missCount++;
                if (this.currentStreak > 0 && this.currentComboStart) {
                  this.comboHistory.push(this.currentStreak);
                  this.currentComboStart = null;
                }
                this.currentStreak = 0;
                this.lastMilestone = 0;
                this.failed = true;
                this.updateComboDisplay(0);
              }
              // If hold was completed successfully, key stays pressed until user releases
            }
            
            // Note continues scrolling - no removal
          }
        } else {
          // Key hasn't reached judgment line yet - show full tail
          key.holdBar.setSize(holdBarWidth, originalTailHeight);
          key.holdBar.setOrigin(0.5, 1);
          key.holdBar.setPosition(key.x, key.y);
          key.holdBar.setVisible(true);
          
          // Set color based on whether note is held or not
          if (key.held) {
            // Pulse effect for held notes
            const holdElapsed = (this.time.now - key.holdStartTime) / 1000;
            const pulse = Math.sin(holdElapsed * 10) * 0.2 + 0.8;
            const greenIntensity = Math.floor(255 * pulse);
            key.holdBar.setFillStyle(Phaser.Display.Color.GetColor(0, greenIntensity, 0), 1.0);
          } else {
            // Normal color for non-held notes
            const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
            key.holdBar.setFillStyle(tailColor.color, 0.7);
          }
        }
      }
      
      // Culling: Hide notes that are far off-screen to reduce rendering
      const isOffScreen = key.y < -cullMargin || key.y > screenHeight + cullMargin;
      if (isOffScreen && key.visible) {
        key.setVisible(false);
        if (key.isHold && key.holdBar) {
          key.holdBar.setVisible(false);
        }
      } else if (!isOffScreen && !key.visible) {
        // Don't make visible if key sprite was hidden for hold or removed
        if (!key.keySpriteHidden && !key.keyRemoved && !key.held) {
          key.setVisible(true);
          if (key.isHold && key.holdBar && !key.held) {
            key.holdBar.setVisible(true);
          }
        }
      }


      // Miss detection for regular notes that have passed the judgment line (only trigger once)
      // Notes continue scrolling naturally - no automatic removal
      if (!key.isHold && key.y > judgmentY && !key.missTriggered) {
        key.missTriggered = true;
        
        // Check if this key is currently being held for another note
        let isKeyCurrentlyHeld = false;
        for (let j = 0; j < this.fallingKeys.length; j++) {
          const otherNote = this.fallingKeys[j];
          if (otherNote.keyType === key.keyType && otherNote.isHold && otherNote.held && otherNote.holdStartTime) {
            isKeyCurrentlyHeld = true;
            break;
          }
        }
        
        // Regular note miss
        const missColor = Phaser.Display.Color.IntegerToColor(this.themeColors.miss).rgba;
        // No animation when note crosses judgment line - only track miss
        
        // Track miss
        this.missCount++;
        
        // End current combo and record it
        if (this.currentStreak > 0 && this.currentComboStart) {
          this.comboHistory.push(this.currentStreak);
          this.currentComboStart = null;
        }
        
        this.currentStreak = 0;
        this.lastMilestone = 0; // Reset milestone tracking
        this.failed = true;
        
        // Update combo display (will hide it)
        this.updateComboDisplay(0);
        
        // Note continues scrolling naturally - no removal
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
    // Hold notes are handled separately - skip them here
    if (isHold) {
      return;
    }
    
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Check if key is currently in pressed state (being held for a hold note)
    const currentScale = keyVisual.scaleX || 1.0;
    if (currentScale < 1.0) {
      // Check if this key is currently being held for a hold note
      let isKeyCurrentlyHeld = false;
      for (let i = 0; i < this.fallingKeys.length; i++) {
        const note = this.fallingKeys[i];
        if (note.keyType === key && note.isHold && note.held && note.holdStartTime) {
          isKeyCurrentlyHeld = true;
          break;
        }
      }
      // If key is being held, don't animate (would interfere with pressed state)
      if (isKeyCurrentlyHeld) {
        return;
      }
    }
    
    // Stop any existing tweens on this key
    this.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.tweens.killTweensOf(glow);
    }
  
    // Determine color based on quality (use theme colors)
    let tintColor, glowColor;
    switch(quality) {
      case "perfect":
        tintColor = this.themeColors.perfect;
        glowColor = this.themeColors.perfect;
        break;
      case "good":
        tintColor = this.themeColors.good;
        glowColor = this.themeColors.good;
        break;
      case "miss":
        tintColor = this.themeColors.miss;
        glowColor = this.themeColors.miss;
        break;
      default:
        tintColor = this.themeColors.note;
        glowColor = 0x00aaff;
    }
    
    // Apply tint
    keyVisual.setTint(tintColor);
    
    // For ALL notes: scale DOWN to pressed state (0.85)
    this.tweens.add({
      targets: keyVisual,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 100,
      ease: "Linear",
      yoyo: false,
      // NO onComplete - key stays pressed until manually released
    });
    
    // Glow effect - fade in then out (remove yoyo)
    if (glow) {
      glow.setFillStyle(glowColor, 0.6);
      glow.setVisible(true);
      this.tweens.add({
        targets: glow,
        alpha: 0.8,
        scale: 1.3,
        duration: 100,
        ease: "Linear",
        yoyo: false, // Remove yoyo - just fade out
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
    
    // Stop any existing animations
    this.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.tweens.killTweensOf(glow);
    }
    
    // Smoothly return to normal size and clear tint
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
   
    // Fade out glow smoothly
    if (glow) {
      this.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          glow.setVisible(false);
        }
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

  /**
   * Create particle effects for perfect hits
   * @param {string} key - The key that was pressed
   */
  createPerfectHitParticles(key) {
    if (!this.keyLanes[key]) return;
    
    const { width, height } = this.scale;
    const lane = this.keyLanes[key];
    const particleY = this.JUDGMENT_Y;
    
    // Create burst of particles at judgment line
    const particles = this.add.particles(lane.x, particleY, 'noteTrail', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 15,
      tint: this.themeColors.perfect,
      blendMode: Phaser.BlendModes.ADD
    });
    
    // Destroy particles after animation
    this.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  /**
   * Update combo display with visual feedback
   * @param {number} combo - Current combo count
   */
  updateComboDisplay(combo) {
    if (combo === 0) {
      // Hide combo display when combo is broken
      this.tweens.add({
        targets: this.comboText,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        ease: "Power2"
      });
      this.tweens.add({
        targets: this.comboMultiplierText,
        alpha: 0,
        duration: 300
      });
      return;
    }

    // Show combo display
    this.comboText.setText(`${combo}x COMBO`);
    this.comboText.setAlpha(1);

    // Calculate dynamic font size based on combo (grows with combo)
    const { width } = this.scale;
    const baseSize = getResponsiveFontSize(20, width, 16, 24);
    const maxSize = getResponsiveFontSize(48, width, 36, 60);
    // Scale from baseSize to maxSize based on combo (capped at 100x for max size)
    const comboScale = Math.min(combo / 100, 1);
    const dynamicSize = baseSize + (maxSize - baseSize) * comboScale;
    this.comboText.setFontSize(dynamicSize);

    // Animate combo text (pulse effect)
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      ease: "Power2"
    });

    // Update combo multiplier display
    const multiplier = this.getComboMultiplier(combo);
    if (multiplier > 1) {
      this.comboMultiplierText.setText(`${multiplier.toFixed(1)}x MULTIPLIER`);
      this.comboMultiplierText.setAlpha(1);
    } else {
      this.comboMultiplierText.setAlpha(0);
    }

    // Check for milestone combos (10x, 50x, 100x)
    this.checkMilestoneCombo(combo);
  }

  /**
   * Get combo multiplier based on combo count
   * @param {number} combo - Current combo count
   * @returns {number} Multiplier value
   */
  getComboMultiplier(combo) {
    if (combo >= 100) return 2.5;
    if (combo >= 50) return 2.0;
    if (combo >= 10) return 1.5;
    return 1.0;
  }

  /**
   * Check and trigger milestone combo effects
   * @param {number} combo - Current combo count
   */
  checkMilestoneCombo(combo) {
    const milestones = [10, 50, 100];
    
    for (const milestone of milestones) {
      if (combo === milestone && this.lastMilestone < milestone) {
        this.lastMilestone = milestone;
        this.triggerMilestoneEffect(milestone);
        break; // Only trigger one milestone per combo increase
      }
    }
  }

  /**
   * Trigger visual effects for milestone combos
   * @param {number} milestone - Milestone value (10, 50, or 100)
   */
  triggerMilestoneEffect(milestone) {
    const { width, height } = this.scale;
    
    // Screen flash effect
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(999);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    
    // Flash animation
    this.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.3 },
      duration: 100,
      yoyo: true,
      ease: "Power2",
      onComplete: () => flash.destroy()
    });

    // Screen shake effect
    const shakeIntensity = milestone === 100 ? 20 : milestone === 50 ? 15 : 10;
    const shakeDuration = milestone === 100 ? 500 : milestone === 50 ? 400 : 300;
    
    this.cameras.main.shake(shakeDuration, shakeIntensity / 100);

    // Milestone text popup
    const milestoneText = this.add.text(width / 2, height / 2 - getResponsiveSpacing(100, height), 
      `${milestone}x COMBO!`, {
      fontSize: getResponsiveFontSize(64, width, 48, 80),
      fill: "#ffff00",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000);

    // Animate milestone text
    milestoneText.setScale(0);
    this.tweens.add({
      targets: milestoneText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: milestoneText,
          alpha: 0,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 500,
          delay: 1000,
          ease: "Power2",
          onComplete: () => milestoneText.destroy()
        });
      }
    });

    // Particle burst for milestone
    const particleCount = milestone === 100 ? 50 : milestone === 50 ? 30 : 20;
    const particles = this.add.particles(width / 2, height / 2, 'noteTrail', {
      speed: { min: 100, max: 300 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: particleCount,
      tint: milestone === 100 ? 0xffd700 : milestone === 50 ? 0xff8800 : 0xffff00,
      blendMode: Phaser.BlendModes.ADD
    });

    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
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

          if (note.isHold) {
            // Start holding the note
            if (distance < goodMargin && !note.held) {
              noteHit = true; // Only set noteHit when actually hitting the note
              note.held = true;
              note.holdStartTime = this.time.now;
              
              // Guard: Make sure we haven't already set this to pressed state
              const keyVisual = this.keyVisuals[keyPressed];
              if (keyVisual && keyVisual.scaleX >= 1.0) { // Only set if not already pressed
                // Stop any existing animations FIRST
                this.tweens.killTweensOf(keyVisual);
                
                // Determine color based on quality
                let quality = distance < perfectMargin ? "perfect" : "good";
                const tintColor = quality === "perfect" ? this.themeColors.perfect : this.themeColors.good;
                
                // Immediately set to pressed state (no animation)
                keyVisual.setScale(0.85, 0.85);
                keyVisual.setTint(tintColor);
                
                // Show static glow (no pulsing, no animation)
                const glow = this.keyGlows[keyPressed];
                if (glow) {
                  this.tweens.killTweensOf(glow);
                  glow.setFillStyle(tintColor, 0.4);
                  glow.setVisible(true);
                  glow.setAlpha(0.6);
                  glow.setScale(1.0);
                }
              }
              
              // Transform key sprite into hold bar
              this.transformToHoldBar(note, keyPressed);
            }
            continue;
          }else {
            // Regular note handling
            let quality = "good";
            let baseScore = 0;
            if (distance < perfectMargin) {
              const perfectColor = Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba;
              baseScore = 20;
              this.perfectCount++;
              quality = "perfect";
            } else if (distance < goodMargin) {
              const goodColor = Phaser.Display.Color.IntegerToColor(this.themeColors.good).rgba;
              baseScore = 10;
              this.goodCount++;
              quality = "good";
            } else {
              continue;
            }
            
            noteHit = true; // Only set noteHit when actually hitting the note
            
            // Apply combo multiplier to score
            const comboMultiplier = this.getComboMultiplier(this.currentStreak);
            const multipliedScore = Math.floor(baseScore * comboMultiplier);
            
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

            // Update combo display
            this.updateComboDisplay(this.currentStreak);
            
            this.score += multipliedScore;
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

  /**
   * Animate key for automatic miss feedback (when note passes without being hit)
   * This is separate from manual key presses - automatically returns to normal
   * @param {string} key - The key that missed
   */
  // COMMENTED OUT: No automatic animations when notes cross judgment line
  /*
  animateMissFeedback(key) {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Check if key is currently being held for a hold note
    let isKeyCurrentlyHeld = false;
    for (let i = 0; i < this.fallingKeys.length; i++) {
      const note = this.fallingKeys[i];
      if (note.keyType === key && note.isHold && note.held && note.holdStartTime) {
        isKeyCurrentlyHeld = true;
        break;
      }
    }
    
    // Don't animate if key is being held for a hold note
    if (isKeyCurrentlyHeld) {
      return;
    }
    
    // Stop any existing animations
    this.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.tweens.killTweensOf(glow);
    }
    
    const tintColor = this.themeColors.miss;
    const glowColor = this.themeColors.miss;
    
    // Apply tint
    keyVisual.setTint(tintColor);
    
    // Animate down to pressed state
    this.tweens.add({
      targets: keyVisual,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 150, // Increased from 100ms
      ease: "Linear",
      yoyo: false,
      onComplete: () => {
        // Automatically return to normal after a moment
        this.tweens.add({
          targets: keyVisual,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 200, // Increased from 150ms
          delay: 300, // Increased from 200ms
          ease: "Linear",
          onComplete: () => {
            keyVisual.clearTint();
          }
        });
      }
    });
    
    // Glow effect - fade in then out
    if (glow) {
      glow.setFillStyle(glowColor, 0.6);
      glow.setVisible(true);
      this.tweens.add({
        targets: glow,
        alpha: 0.8,
        scale: 1.3,
        duration: 150, // Increased from 100ms
        ease: "Linear",
        yoyo: false,
        onComplete: () => {
          glow.setVisible(false);
          glow.setAlpha(0);
          glow.setScale(1);
        }
      });
    }
  }
  */
}
