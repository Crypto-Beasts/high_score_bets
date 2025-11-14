import Phaser from "phaser";
import { getAllSongs } from "../../config/songs.js";
import { logError, validateSongData } from "../../utils/data/errorHandler.js";

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoadingScene" });
    this.loadErrors = [];
  }

  preload() {
    const { width, height } = this.scale;
    
    // Set background color for loading scene
    this.cameras.main.setBackgroundColor(0x000000);

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

    // Handle file load errors
    this.load.on("fileerror", (key, type, file) => {
      const errorMsg = `Failed to load ${type}: ${key} (${file.src || file.url || 'unknown'})`;
      this.loadErrors.push(errorMsg);
      logError("LoadingScene", errorMsg);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      
      // Validate loaded song data
      const songs = getAllSongs();
      const validationErrors = [];
      
      songs.forEach(song => {
        const songDataKey = song.id + "_data";
        if (this.cache.json.exists(songDataKey)) {
          const songData = this.cache.json.get(songDataKey);
          const validation = validateSongData(songData, song.id);
          
          if (!validation.valid) {
            validationErrors.push(validation.error);
            logError("LoadingScene", validation.error);
          }
        } else {
          const errorMsg = `Song data not found for ${song.id}`;
          validationErrors.push(errorMsg);
          logError("LoadingScene", errorMsg);
        }
      });
      
      // Store validation info in cache
      this.cache.json.add("load_errors", this.loadErrors);
      this.cache.json.add("validation_errors", validationErrors);
      
      // Continue to menu even if there are errors (graceful degradation)
      if (this.loadErrors.length > 0 || validationErrors.length > 0) {
        console.warn("Some assets failed to load. Game will continue with available assets.");
      }
      
      this.scene.start("MainMenuScene");
      this.scene.launch("UIOverlayScene");
    });

    // Load static assets from organized structure
    try {
      this.load.image("background", "/images/background.png");
      this.load.image("key_w", "/images/key_w.png");
      this.load.image("key_a", "/images/key_a.png");
      this.load.image("key_s", "/images/key_s.png");
      this.load.image("key_d", "/images/key_d.png");
      this.load.image("fullscreen", "/images/fullscreenButton.png");
      this.load.audio("menuMusic", "/sounds/generalMusic.mp3");
      
      // Create simple particle texture for note trails (white circle)
      const graphics = this.add.graphics();
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('noteTrail', 8, 8);
      graphics.destroy();
      
      // Load hit sounds (optional - game works without them)
      // Only load if files exist - gracefully handle missing files
      // Note: These files don't exist yet, so we skip loading them
      // The game will work fine without hit sounds (they're already handled gracefully in GameScene)
      // Uncomment when sound files are added:
      // this.load.audio("hitPerfect", "/sounds/hitPerfect.mp3");
      // this.load.audio("hitGood", "/sounds/hitGood.mp3");
      // this.load.audio("hitMiss", "/sounds/hitMiss.mp3");
    } catch (error) {
      logError("LoadingScene", error);
      this.loadErrors.push("Failed to load static assets");
    }
    
    // Dynamically load all songs from config
    try {
      const songs = getAllSongs();
      
      if (songs.length === 0) {
        logError("LoadingScene", "No songs found in configuration");
        this.loadErrors.push("No songs configured");
      }
      
      songs.forEach(song => {
        try {
          // Load audio file
          this.load.audio(song.id, song.audioFile);
          
          // Load JSON file for each song
          this.load.json(song.id + "_data", song.jsonFile);
        } catch (error) {
          logError("LoadingScene", `Error loading song ${song.id}: ${error.message}`);
          this.loadErrors.push(`Failed to load song: ${song.name}`);
        }
      });
      
      // Store songs config in cache for use in other scenes
      this.cache.json.add("songs_config", songs);
    } catch (error) {
      logError("LoadingScene", error);
      this.loadErrors.push("Failed to load song configuration");
    }
  }
}
