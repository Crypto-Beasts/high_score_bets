import Phaser from "phaser";
import { DIFFICULTY_LEVELS, getDifficultyConfig, adjustSongDataForDifficulty, DifficultyLevel } from "../../utils/game/difficultyManager";
import { getSongById, getAllSongs, Song } from "../../config/songs";
import { validateSongData, audioExists, jsonExists, showError, logError, getFallbackSong, NoteData } from "../../utils/data/errorHandler";
import { getResponsiveFontSize, getResponsiveSpacing } from "../../utils/ui/responsive";
import { 
  getAudioOffset, 
  getAccurateGameTime, 
  isAudioReady, 
  waitForAudioReady,
  parseBPMChanges,
  getCurrentBPM,
  BPMChange
} from "../../utils/audio/audioSync";
import { getThemeColors, ThemeColors } from "../../utils/ui/colorThemes";
import { NoteManager, FallingNote, KeyLane, GameplayLayout } from "../../utils/game/noteManager";
import { HoldNoteSystem } from "../../utils/game/holdNoteSystem";
import { ScoreManager } from "../../utils/game/scoreManager";
import { InputHandler } from "../../utils/game/inputHandler";
import { VisualEffects } from "../../utils/game/visualEffects";
import { GameUpdateHandler } from "../../utils/game/gameUpdateHandler";
import { GameplayLayoutManager } from "../../utils/ui/gameplayLayout";
import { PauseMenu } from "../../utils/ui/pauseMenu";
import { checkAchievements } from "../../utils/game/achievements";
import { getAchievement } from "../../utils/game/achievements";

interface GameSceneData {
  song?: string;
  difficulty?: string;
  [key: string]: any;
}

export default class GameScene extends Phaser.Scene {
  // Game state
  protected currentSongId: string = "";
  protected currentDifficulty: DifficultyLevel = DIFFICULTY_LEVELS.NORMAL;
  protected songData: NoteData[] = [];
  protected currentNoteIndex: number = 0;
  protected startTime: number = 0;
  protected audioStartTime: number = 0;
  protected audioOffset: number = 0;
  protected bpmChanges: BPMChange[] = [];
  protected baseBPM: number = 120;
  protected themeColors: ThemeColors = getThemeColors();
  
  // Gameplay constants
  protected FALL_TIME: number = 2.0;
  protected PIXELS_PER_SECOND: number = 0;
  protected JUDGMENT_Y: number = 0;
  protected perfectMargin: number = 15;
  protected goodMargin: number = 40;
  
  // Layout
  protected keyLanes: Record<string, KeyLane> = {};
  protected gameplayLayout?: GameplayLayout;
  
  // Visual elements
  protected backgroundImage?: Phaser.GameObjects.Image;
  protected backgroundRect?: Phaser.GameObjects.Rectangle;
  protected dimOverlay?: Phaser.GameObjects.Rectangle;
  protected judgmentLine?: Phaser.GameObjects.Graphics;
  protected scoreText?: Phaser.GameObjects.Text;
  protected comboText?: Phaser.GameObjects.Text;
  protected comboMultiplierText?: Phaser.GameObjects.Text;
  protected feedbackText?: Phaser.GameObjects.Text;
  protected keyVisuals: Record<string, Phaser.GameObjects.Image> = {};
  protected keyGlows: Record<string, Phaser.GameObjects.Arc> = {};
  
  // Game state (backward compatibility - access via scoreManager)
  protected get score(): number {
    return this.scoreManager?.score || 0;
  }
  
  protected get longestStreak(): number {
    return this.scoreManager?.longestStreak || 0;
  }
  
  protected get currentStreak(): number {
    return this.scoreManager?.currentStreak || 0;
  }
  
  protected get totalNotes(): number {
    return this.noteManager?.totalNotes || 0;
  }
  
  protected get notesHit(): number {
    return this.scoreManager?.notesHit || 0;
  }
  
  protected get failed(): boolean {
    return this.scoreManager?.failed || false;
  }
  
  protected get perfectCount(): number {
    return this.scoreManager?.perfectCount || 0;
  }
  
  protected get goodCount(): number {
    return this.scoreManager?.goodCount || 0;
  }
  
  protected get missCount(): number {
    return this.scoreManager?.missCount || 0;
  }
  
  protected get comboHistory(): number[] {
    return this.scoreManager?.comboHistory || [];
  }
  
  protected get currentComboStart(): number | null {
    return this.scoreManager?.currentComboStart || null;
  }
  
  protected get comboMasterUnlocked(): boolean {
    return this.scoreManager?.comboMasterUnlocked || false;
  }
  
  protected get lastMilestone(): number {
    return this.scoreManager?.lastMilestone || 0;
  }
  
  // Managers (protected for MultiplayerGameScene access)
  protected noteManager?: NoteManager;
  protected holdNoteSystem?: HoldNoteSystem;
  protected scoreManager?: ScoreManager;
  protected inputHandler?: InputHandler;
  protected visualEffects?: VisualEffects;
  protected gameUpdateHandler?: GameUpdateHandler;
  protected gameplayLayoutManager?: GameplayLayoutManager;
  protected pauseMenuManager?: PauseMenu;
  
  // Backward compatibility - expose manager properties
  protected get fallingKeys(): FallingNote[] {
    return this.noteManager?.fallingKeys || [];
  }
  
  protected get keysPressed(): Record<string, boolean> {
    return this.inputHandler?.keysPressed || {};
  }
  
  protected get notePools() {
    return this.noteManager?.notePools || {};
  }
  
  protected get holdNotePool() {
    return this.noteManager?.holdNotePool;
  }
  
  // Audio
  protected music?: Phaser.Sound.BaseSound;
  protected audioReady: boolean = false;
  protected musicStarted: boolean = false;
  
  // Performance
  protected screenHeight: number = 0;
  protected cullMargin: number = 0;
  
  // Pause state (backward compatibility)
  protected get isPaused(): boolean {
    return this.pauseMenuManager?.isPaused || false;
  }
  
  protected get pauseMenu() {
    return this.pauseMenuManager?.pauseMenu || null;
  }
  
  protected get lastScore(): number {
    return this.scoreManager?.lastScore || 0;
  }

  constructor(config?: Phaser.Types.Scenes.SettingsConfig) {
    // Accept config parameter to allow child classes to override the key
    const sceneConfig = config || { key: "GameScene" };
    if (!sceneConfig.key) {
      sceneConfig.key = "GameScene";
    }
    super(sceneConfig);
  }

  create(data?: GameSceneData): void {
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
    this.currentDifficulty = difficulty as DifficultyLevel;

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
    
    // Initialize GameplayLayoutManager
    this.gameplayLayoutManager = new GameplayLayoutManager({
      scene: this,
      themeColors: this.themeColors,
      onLayoutChanged: (layout) => {
        this.keyLanes = layout.lanes;
        this.gameplayLayout = layout;
        if (this.noteManager) {
          this.noteManager.updateLayout(layout);
        }
      },
      onJudgmentYChanged: (judgmentY) => {
        this.JUDGMENT_Y = judgmentY;
        if (this.gameUpdateHandler) {
          const FALL_DISTANCE = judgmentY - 0;
          const pixelsPerSecond = FALL_DISTANCE / this.FALL_TIME;
          this.PIXELS_PER_SECOND = pixelsPerSecond;
          this.gameUpdateHandler.updateJudgmentY(judgmentY, pixelsPerSecond);
        }
        if (this.inputHandler) {
          this.inputHandler.updateJudgmentY(judgmentY);
        }
      },
      onMarginsChanged: (perfectMargin, goodMargin) => {
        this.perfectMargin = perfectMargin;
        this.goodMargin = goodMargin;
        if (this.inputHandler) {
          this.inputHandler.updateMargins(perfectMargin, goodMargin);
        }
        if (this.gameUpdateHandler) {
          this.gameUpdateHandler.updateMargins(perfectMargin, goodMargin);
        }
      }
    });

    // Calculate centered gameplay layout (once, reuse throughout)
    const layout = this.gameplayLayoutManager.calculateGameplayLayout(width, height);
    this.keyLanes = layout.lanes;
    this.gameplayLayout = layout;

    // Judgment Line - Use gameplay area boundaries with theme color
    this.judgmentLine = this.gameplayLayoutManager.createJudgmentLine();

    // Initialize ScoreManager
    // Responsive text sizing
    const scoreFontSize = getResponsiveFontSize(24, width, 18, 30);
    const feedbackFontSize = getResponsiveFontSize(32, width, 24, 40);
    const scoreX = getResponsiveSpacing(20, width);
    const scoreY = getResponsiveSpacing(20, height);

    this.scoreText = this.add.text(scoreX, scoreY, "Score: 0", { 
      fontSize: scoreFontSize, 
      color: "#fff" 
    });

    // Combo counter - positioned below score
    const comboY = scoreY + getResponsiveSpacing(35, height);
    this.comboText = this.add.text(scoreX, comboY, "", {
      fontSize: getResponsiveFontSize(20, width, 16, 24),
      color: "#ffff00",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif"
    }).setAlpha(0); // Hidden until combo starts

    // Combo multiplier text (shows multiplier when active)
    this.comboMultiplierText = this.add.text(scoreX, comboY + getResponsiveSpacing(30, height), "", {
      fontSize: getResponsiveFontSize(16, width, 12, 20),
      color: "#00ff00",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif"
    }).setAlpha(0);

    // Feedback Text (for "Perfect", "Good", "Miss")
    this.feedbackText = this.add.text(width / 2, height / 2, "", {
      fontSize: feedbackFontSize,
      color: "#fff",
      fontStyle: "bold",
    }).setOrigin(0.5).setAlpha(0);

    this.scoreManager = new ScoreManager({
      scene: this,
      themeColors: this.themeColors,
      scoreText: this.scoreText,
      comboText: this.comboText,
      comboMultiplierText: this.comboMultiplierText,
      currentSongId: this.currentSongId,
      currentDifficulty: this.currentDifficulty,
      onAchievementUnlocked: (achievementId) => {
        this.scoreManager?.showAchievementNotification(achievementId);
      }
    });

    // Initialize HoldNoteSystem
    this.holdNoteSystem = new HoldNoteSystem({
      scene: this,
      themeColors: this.themeColors,
      getCurrentAudioTime: () => this.getCurrentAudioTime()
    });

    // Initialize NoteManager
    this.noteManager = new NoteManager({
      scene: this,
      keyLanes: this.keyLanes,
      gameplayLayout: layout,
      themeColors: this.themeColors,
      judgmentY: this.JUDGMENT_Y,
      calculateTailHeight: (holdDuration) => this.holdNoteSystem!.calculateTailHeight(holdDuration)
    });

    // Static key visuals for feedback - Use gameplay layout sizing
    // Clean up any existing key visuals first (in case scene is being recreated)
    if (this.keyVisuals) {
      Object.keys(this.keyVisuals).forEach(key => {
        if (this.keyVisuals[key]) {
          this.tweens.killTweensOf(this.keyVisuals[key]);
          this.keyVisuals[key].destroy();
        }
      });
    }
    if (this.keyGlows) {
      Object.keys(this.keyGlows).forEach(key => {
        if (this.keyGlows[key]) {
          this.tweens.killTweensOf(this.keyGlows[key]);
          this.keyGlows[key].destroy();
        }
      });
    }
    
    this.keyVisuals = {};
    this.keyGlows = {}; // Store glow effects for each key
    const keyVisualSize = layout.keySize; // Use consistent key size from layout
    const keyVisualY = height - getResponsiveSpacing(50, height);
    for (let key in this.keyLanes) {
      const keyVisual = this.add.image(this.keyLanes[key].x, keyVisualY, this.keyLanes[key].sprite);
      keyVisual.setDisplaySize(keyVisualSize, keyVisualSize);
      keyVisual.setOrigin(0.5, 0.5);
      // Explicitly set scale to 1.0 to ensure keys start at normal size
      // Also kill any tweens that might be lingering
      this.tweens.killTweensOf(keyVisual);
      keyVisual.setScale(1.0, 1.0);
      keyVisual.clearTint(); // Ensure no tint from previous state
      this.keyVisuals[key] = keyVisual;
      
      // Create glow effect (circle behind key)
      const glow = this.add.circle(this.keyLanes[key].x, keyVisualY, keyVisualSize * 0.7, 0x00ff00, 0);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(keyVisual.depth - 1);
      glow.setVisible(false);
      // Explicitly set glow scale to 1.0 and kill any tweens
      this.tweens.killTweensOf(glow);
      glow.setScale(1.0, 1.0);
      this.keyGlows[key] = glow;
    }
    
    // Initialize VisualEffects
    this.visualEffects = new VisualEffects({
      scene: this,
      keyVisuals: this.keyVisuals,
      keyGlows: this.keyGlows,
      themeColors: this.themeColors,
      judgmentY: this.JUDGMENT_Y,
      keyLanes: this.keyLanes,
      fallingKeys: this.noteManager.fallingKeys
    });

    // Initialize InputHandler
    this.inputHandler = new InputHandler({
      scene: this,
      noteManager: this.noteManager,
      holdNoteSystem: this.holdNoteSystem,
      scoreManager: this.scoreManager,
      visualEffects: this.visualEffects,
      keyVisuals: this.keyVisuals,
      keyGlows: this.keyGlows,
      keyLanes: this.keyLanes,
      themeColors: this.themeColors,
      judgmentY: this.JUDGMENT_Y,
      perfectMargin: this.perfectMargin,
      goodMargin: this.goodMargin,
      getCurrentAudioTime: () => this.getCurrentAudioTime(),
      getCurrentTime: () => this.time.now
    });
    
    // Performance optimization: Cache values to reduce lookups
    this.screenHeight = height;
    this.cullMargin = getResponsiveSpacing(100, height); // Responsive cull margin

    // Initialize GameUpdateHandler
    this.gameUpdateHandler = new GameUpdateHandler({
      scene: this,
      noteManager: this.noteManager,
      holdNoteSystem: this.holdNoteSystem,
      scoreManager: this.scoreManager,
      inputHandler: this.inputHandler,
      visualEffects: this.visualEffects,
      themeColors: this.themeColors,
      songData: this.songData,
      music: this.music,
      audioStartTime: this.audioStartTime,
      audioOffset: this.audioOffset,
      judgmentY: this.JUDGMENT_Y,
      pixelsPerSecond: this.PIXELS_PER_SECOND,
      perfectMargin: this.perfectMargin,
      goodMargin: this.goodMargin,
      fallTime: this.FALL_TIME,
      currentSongId: this.currentSongId,
      currentDifficulty: this.currentDifficulty,
      screenHeight: this.screenHeight,
      cullMargin: this.cullMargin,
      getCurrentTime: () => this.time.now,
      getCurrentAudioTime: () => this.getCurrentAudioTime(),
      onGameEnd: (data) => {
        this.scene.start("DebriefScene", data);
      }
    });
    this.gameUpdateHandler.currentNoteIndex = 0;

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
            
            // Update pause menu with music state
            if (this.pauseMenuManager) {
              this.pauseMenuManager.updateMusic(this.music, this.musicStarted);
            }
            
            // Update GameUpdateHandler with audio start time
            if (this.gameUpdateHandler) {
              this.gameUpdateHandler.updateMusic(this.music);
              this.gameUpdateHandler.updateAudioStartTime(this.audioStartTime);
              this.gameUpdateHandler.currentNoteIndex = 0;
            }
            
            console.log(`[GameScene] Music started. First note at ${firstNoteTime}s, ${this.songData.length} total notes`);
            console.log(`[GameScene] Audio offset: ${this.audioOffset}ms, Variable BPM: ${this.bpmChanges.length > 0 ? 'Yes' : 'No'}`);
          }
        } catch (error) {
          console.error(`[GameScene] Error playing music:`, error);
          // Fallback: use scene time as start time
          this.audioStartTime = Date.now();
          this.musicStarted = true;
          
          // Update pause menu with music state
          if (this.pauseMenuManager) {
            this.pauseMenuManager.updateMusic(this.music, this.musicStarted);
          }
          
          // Update GameUpdateHandler with audio start time (fallback)
          if (this.gameUpdateHandler) {
            this.gameUpdateHandler.updateMusic(this.music);
            this.gameUpdateHandler.updateAudioStartTime(this.audioStartTime);
            this.gameUpdateHandler.currentNoteIndex = 0;
          }
          
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

    // Initialize PauseMenu
    this.pauseMenuManager = new PauseMenu({
      scene: this,
      music: this.music,
      musicStarted: this.musicStarted,
      onResume: () => {
        // Resume callback (if needed)
      },
      onQuit: () => {
        this.scene.start("MainMenuScene");
      }
    });

    // Keyboard input
    this.input.keyboard.on("keydown", this.handlePlayerInput, this);
    this.input.keyboard.on("keyup", this.handleKeyRelease, this);
    
    // Keyboard shortcut: Esc to pause/resume
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.pauseMenuManager?.isPaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    });

    // Listen for resize events - use both scene scale and game scale
    this.scale.on('resize', this.handleResize, this);
    // Also listen to game-level resize for better compatibility
    if (this.game.scale) {
      this.game.scale.on('resize', this.handleResize, this);
    }
  }
  
  pauseGame(): void {
    if (this.pauseMenuManager) {
      this.pauseMenuManager.updateMusic(this.music, this.musicStarted);
      this.pauseMenuManager.pauseGame();
    }
  }
  
  resumeGame(): void {
    if (this.pauseMenuManager) {
      this.pauseMenuManager.resumeGame();
    }
  }
  
  createPauseMenu(): void {
    if (this.pauseMenuManager) {
      this.pauseMenuManager.createPauseMenu();
    }
  }

  protected handleKeyRelease(event: KeyboardEvent): void {
    if (this.inputHandler) {
      this.inputHandler.handleKeyRelease(event);
    }
  }

  protected spawnKey(key: string, isHoldNote: boolean, duration: number = 0): void {
    if (this.noteManager) {
      this.noteManager.spawnKey(key, isHoldNote, duration);
    }
  }
  
  /**
   * Calculate tail height based on hold duration
   * Tail should be visually proportional to hold duration, not absolute pixel distance
   * @param {number} holdDuration - Hold duration in seconds
   * @returns {number} Tail height in pixels
   */
  protected calculateTailHeight(holdDuration: number): number {
    if (this.holdNoteSystem) {
      return this.holdNoteSystem.calculateTailHeight(holdDuration);
    }
    return 0;
  }

  /**
   * Get current audio time in seconds
   * @returns {number} Current audio time
   */
  protected getCurrentAudioTime(): number {
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
  protected transformToHoldBar(note: FallingNote, key: string): void {
    if (this.holdNoteSystem) {
      this.holdNoteSystem.transformToHoldBar(note, key);
    }
  }

  /**
   * Release a note back to its pool
   */
  protected releaseNote(note: FallingNote): void {
    if (this.noteManager) {
      this.noteManager.releaseNote(note);
    }
  }

  /**
   * Calculate centered gameplay layout with smart sizing
   * @param {number} width - Screen width
   * @param {number} height - Screen height
   * @returns {object} Layout object with gameplay area, key size, spacing, and lane positions
   */
  protected calculateGameplayLayout(width: number, height: number): GameplayLayout {
    if (this.gameplayLayoutManager) {
      return this.gameplayLayoutManager.calculateGameplayLayout(width, height);
    }
    // Fallback if manager not initialized
    return {
      gameplayWidth: 0,
      gameplayStartX: 0,
      gameplayEndX: 0,
      keySize: 50,
      spacing: 80,
      lanes: {}
    };
  }

  protected handleResize(gameSize?: Phaser.Structs.Size): void {
    if (!this.gameplayLayoutManager || !this.noteManager || !this.holdNoteSystem || !this.visualEffects) {
      return;
    }

    const { width, height } = this.scale;
    
    // Handle different parameter formats
    let resizeWidth, resizeHeight;
    if (gameSize && gameSize.width && gameSize.height) {
      resizeWidth = gameSize.width;
      resizeHeight = gameSize.height;
    } else {
      resizeWidth = width || window.innerWidth || 1920;
      resizeHeight = height || window.innerHeight || 1080;
    }
    
    // Resize background
    if (this.backgroundImage) {
      this.backgroundImage.setPosition(resizeWidth / 2, resizeHeight / 2);
      this.backgroundImage.setDisplaySize(resizeWidth, resizeHeight);
    }
    if (this.backgroundRect) {
      this.backgroundRect.setPosition(resizeWidth / 2, resizeHeight / 2);
      this.backgroundRect.setSize(resizeWidth, resizeHeight);
    }
    
    // Update score manager UI texts
    if (this.scoreManager) {
      const scoreX = getResponsiveSpacing(20, resizeWidth);
      const scoreY = getResponsiveSpacing(20, resizeHeight);
      const comboY = scoreY + getResponsiveSpacing(35, resizeHeight);
      
      if (this.scoreText) {
        this.scoreText.setPosition(scoreX, scoreY);
      }
      if (this.comboText) {
        this.comboText.setPosition(scoreX, comboY);
      }
      if (this.comboMultiplierText) {
        this.comboMultiplierText.setPosition(scoreX, comboY + getResponsiveSpacing(30, resizeHeight));
      }
    }
    
    // Use GameplayLayoutManager for resize
    const result = this.gameplayLayoutManager.handleResize(
      gameSize,
      {
        updateNotePositions: (fallingKeys, layout, keyLanes) => {
          // Update all falling notes' positions to match new lane positions
          fallingKeys.forEach(note => {
            if (note.keyType && keyLanes[note.keyType]) {
              // Update note x position to new lane position
              note.x = keyLanes[note.keyType].x;
              
              // Update note size if it's a sprite
              if (note.setDisplaySize) {
                note.setDisplaySize(layout.keySize, layout.keySize);
              }
              
              // Update hold bar tail if it exists
              if (note.isHold && note.holdBar && this.holdNoteSystem) {
                const holdBarWidth = getResponsiveSpacing(15, resizeWidth);
                if (note.held) {
                  // Being held: tail continues falling naturally - just update position
                  note.holdBar.setPosition(keyLanes[note.keyType].x, note.y);
                  note.holdBar.setFillStyle(this.themeColors.perfect, 1.0);
                } else {
                  // Falling: normal tail
                  const tailHeight = this.holdNoteSystem.calculateTailHeight(note.holdDuration || 0);
                  note.holdBar.setSize(holdBarWidth, tailHeight);
                  note.holdBar.setOrigin(0.5, 1);
                  note.holdBar.setPosition(keyLanes[note.keyType].x, note.y);
                  const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
                  note.holdBar.setFillStyle(tailColor.color, 0.7);
                }
              }
            }
          });
        },
        updateKeyVisuals: (keyVisuals, keyGlows, layout, keyLanes, height) => {
          // Update key visuals position and size
          const keyVisualY = height - getResponsiveSpacing(50, height);
          Object.keys(keyVisuals).forEach(key => {
            if (keyVisuals[key] && keyLanes[key]) {
              keyVisuals[key].setPosition(keyLanes[key].x, keyVisualY);
              keyVisuals[key].setDisplaySize(layout.keySize, layout.keySize);
            }
            if (keyGlows && keyGlows[key] && keyLanes[key]) {
              keyGlows[key].setPosition(keyLanes[key].x, keyVisualY);
              keyGlows[key].setRadius(layout.keySize * 0.7);
            }
          });
        },
        updateBackground: (width, height) => {
          // Already handled above
        },
        updateUITexts: (width, height) => {
          // Already handled above
        },
        calculateTailHeight: (holdDuration) => {
          return this.holdNoteSystem ? this.holdNoteSystem.calculateTailHeight(holdDuration) : 0;
        }
      },
      this.FALL_TIME
    );

    // Update judgment line
    if (this.judgmentLine) {
      this.judgmentLine = this.gameplayLayoutManager.createJudgmentLine(this.judgmentLine);
    }

    // Update screen height and cull margin cache
    this.screenHeight = resizeHeight;
    this.cullMargin = getResponsiveSpacing(100, resizeHeight);
    
    // Update managers
    if (this.gameUpdateHandler) {
      this.gameUpdateHandler.updateJudgmentY(result.judgmentY, result.pixelsPerSecond);
      this.gameUpdateHandler.updateScreenDimensions(this.screenHeight, this.cullMargin);
    }

    // Update note manager layout
    if (this.gameplayLayoutManager.gameplayLayout) {
      this.noteManager.updateLayout(this.gameplayLayoutManager.gameplayLayout);
    }

    // Update visual effects falling keys reference
    if (this.visualEffects) {
      this.visualEffects.updateFallingKeys(this.noteManager.fallingKeys);
    }
  }

  shutdown(): void {
    // Cleanup: Release all pooled objects when scene shuts down
    if (this.noteManager) {
      this.noteManager.shutdown();
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

  update(time: number, delta: number): void {
    if (this.gameUpdateHandler) {
      // Update music reference
      this.gameUpdateHandler.updateMusic(this.music);
      
      // Update visual effects falling keys reference
      if (this.visualEffects && this.noteManager) {
        this.visualEffects.updateFallingKeys(this.noteManager.fallingKeys);
      }
      
      // Delegate to update handler
      this.gameUpdateHandler.update(time, delta, this.musicStarted, this.isPaused);
      
      // Sync note index from handler
      this.currentNoteIndex = this.gameUpdateHandler.currentNoteIndex;
    }
  }

  /**
   * Animate key press with scale and color feedback
   * @param {string} key - The key that was pressed (W, A, S, D)
   * @param {string} quality - "perfect", "good", or "miss"
   * @param {boolean} isHold - Whether this is a hold note
   */

  protected animateKeyPress(key: string, quality: string = "good", isHold: boolean = false): void {
    if (this.visualEffects) {
      this.visualEffects.animateKeyPress(key, quality, isHold);
    }
  }

  /**
   * Animate key release (for hold notes)
   * @param {string} key - The key that was released
   */
  protected animateKeyRelease(key: string): void {
    if (this.visualEffects) {
      this.visualEffects.animateKeyRelease(key);
    }
  }

  /**
   * Stop pulsing animation for hold notes
   * @param {string} key - The key that was released
   */
  protected stopHoldPulse(key: string): void {
    if (this.visualEffects) {
      this.visualEffects.stopHoldPulse(key);
    }
  }

  protected updateScore(newScore: number): void {
    if (this.scoreManager) {
      this.scoreManager.updateScore(newScore);
    }
  }

  /**
   * Create particle effects for perfect hits
   * @param {string} key - The key that was pressed
   */
  protected createPerfectHitParticles(key: string): void {
    if (this.visualEffects) {
      this.visualEffects.createPerfectHitParticles(key);
    }
  }

  /**
   * Update combo display with visual feedback
   * @param {number} combo - Current combo count
   */
  protected updateComboDisplay(combo: number): void {
    if (this.scoreManager) {
      this.scoreManager.updateComboDisplay(combo);
    }
  }

  /**
   * Get combo multiplier based on combo count
   * @param {number} combo - Current combo count
   * @returns {number} Multiplier value
   */
  protected getComboMultiplier(combo: number): number {
    if (this.scoreManager) {
      return this.scoreManager.getComboMultiplier(combo);
    }
    return 1.0;
  }

  /**
   * Check and trigger milestone combo effects
   * @param {number} combo - Current combo count
   */
  protected checkMilestoneCombo(combo: number): void {
    if (this.scoreManager) {
      this.scoreManager.checkMilestoneCombo(combo);
    }
  }

  /**
   * Trigger visual effects for milestone combos
   * @param {number} milestone - Milestone value (10, 50, or 100)
   */
  protected triggerMilestoneEffect(milestone: number): void {
    if (this.scoreManager) {
      this.scoreManager.triggerMilestoneEffect(milestone);
    }
  }

  protected handlePlayerInput(event: KeyboardEvent): void {
    // Don't process game input when paused (ESC key is handled separately)
    if (this.isPaused) {
      return;
    }
    
    if (this.inputHandler) {
      this.inputHandler.handlePlayerInput(event);
    }
  }
  
  protected showAchievementNotification(achievementId: string): void {
    if (this.scoreManager) {
      this.scoreManager.showAchievementNotification(achievementId);
    }
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
