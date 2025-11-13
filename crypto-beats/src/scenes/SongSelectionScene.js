import Phaser from "phaser";
import { DIFFICULTY_LEVELS, DIFFICULTY_CONFIG } from "../utils/difficultyManager.js";
import { getAllSongs, getSongById } from "../config/songs.js";

export default class SongSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "SongSelectionScene" });
    this.selectedSong = null;
    this.selectedMusic = null;
    this.selectedDifficulty = DIFFICULTY_LEVELS.NORMAL;
    this.songCards = []; // Store song card containers
  }

  create() {
    const { width, height } = this.scale;
    
    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);

    // Background fills screen
    if (this.textures.exists("background")) {
      this.add.image(width / 2, height / 2, "background").setDisplaySize(width, height);
    } else {
      // Fallback: solid color background if image doesn't load
      this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }

    // Scene Title with better styling
    const title = this.add.text(width / 2, 60, "Select a Song", {
      fontSize: "48px",
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    // Difficulty Selection Section
    const difficultyTitle = this.add.text(width / 2, 120, "Difficulty", {
      fontSize: "28px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Difficulty selection function
    const selectDifficulty = (difficulty, button) => {
      this.selectedDifficulty = difficulty;
      // Reset all difficulty buttons
      easyButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color);
      easyButton.setColor("#000000");
      normalButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color);
      normalButton.setColor("#000000");
      hardButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color);
      hardButton.setColor("#ffffff");
      // Highlight selected
      button.setBackgroundColor("#ffffff");
      button.setColor("#000000");
    };

    // Difficulty buttons
    const difficultyY = 170;
    const difficultySpacing = 100;

    let easyButton = this.add.text(width / 2 - difficultySpacing, difficultyY, "Easy", {
      fontSize: "24px",
      fill: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    easyButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.EASY, easyButton);
    });

    let normalButton = this.add.text(width / 2, difficultyY, "Normal", {
      fontSize: "24px",
      fill: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    normalButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);
    });

    let hardButton = this.add.text(width / 2 + difficultySpacing, difficultyY, "Hard", {
      fontSize: "24px",
      fill: "#ffffff",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color,
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    hardButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.HARD, hardButton);
    });

    // Highlight default (Normal)
    selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);

    // Get all available songs from config
    const songs = getAllSongs();
    
    // Song selection function
    const selectSong = (songId, cardContainer) => {
      if (this.selectedMusic) {
        this.selectedMusic.stop();
      }
      this.selectedMusic = this.sound.add(songId, { loop: true, volume: 0.5 });
      this.selectedMusic.play();
      this.selectedSong = songId;

      // Reset all cards and highlight the selected one
      this.songCards.forEach(card => {
        if (card.background) {
          card.background.setFillStyle(0x1a1a2e, 0.8);
        }
        if (card.border && card.borderProps) {
          // Redraw border with default style
          card.border.clear();
          card.border.lineStyle(2, 0x4a4a6a, 1);
          card.border.strokeRect(
            card.borderProps.x,
            card.borderProps.y,
            card.borderProps.width,
            card.borderProps.height
          );
        }
      });
      
      // Highlight selected card
      if (cardContainer.background) {
        cardContainer.background.setFillStyle(0x16213e, 0.9);
      }
      if (cardContainer.border && cardContainer.borderProps) {
        // Redraw border with highlight style
        cardContainer.border.clear();
        cardContainer.border.lineStyle(3, 0x00ff00, 1);
        cardContainer.border.strokeRect(
          cardContainer.borderProps.x,
          cardContainer.borderProps.y,
          cardContainer.borderProps.width,
          cardContainer.borderProps.height
        );
      }
    };

    // Create song cards with better UI
    const cardStartY = 250;
    const cardSpacing = 180;
    const cardWidth = Math.min(600, width * 0.7);
    const cardHeight = 150;
    
    songs.forEach((song, index) => {
      const cardX = width / 2;
      const cardY = cardStartY + (index * cardSpacing);
      
      // Create card container
      const cardContainer = {
        background: null,
        border: null,
        borderProps: null, // Store border properties for redrawing
        cover: null,
        title: null,
        artist: null,
        info: null,
        bpm: null
      };
      
      // Card background
      cardContainer.background = this.add.rectangle(
        cardX, cardY, cardWidth, cardHeight, 0x1a1a2e, 0.8
      ).setInteractive();
      
      // Card border (Graphics object - needs to be redrawn to change)
      cardContainer.border = this.add.graphics();
      // Store border properties for redrawing
      cardContainer.borderProps = {
        x: cardX - cardWidth / 2,
        y: cardY - cardHeight / 2,
        width: cardWidth,
        height: cardHeight
      };
      // Draw initial border
      cardContainer.border.lineStyle(2, 0x4a4a6a, 1);
      cardContainer.border.strokeRect(
        cardContainer.borderProps.x,
        cardContainer.borderProps.y,
        cardContainer.borderProps.width,
        cardContainer.borderProps.height
      );
      
      // Cover art placeholder (rectangle with gradient effect)
      const coverSize = cardHeight - 20;
      const coverX = cardX - cardWidth / 2 + coverSize / 2 + 10;
      const coverY = cardY;
      
      // Create a gradient-like effect for cover
      const coverBg = this.add.rectangle(
        coverX, coverY, coverSize, coverSize, 0x2d3561, 1
      );
      
      // Add a music note icon (using text as placeholder)
      const musicIcon = this.add.text(coverX, coverY, "♪", {
        fontSize: "48px",
        fill: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
      
      // Song title
      cardContainer.title = this.add.text(
        coverX + coverSize / 2 + 20, cardY - 30,
        song.name,
        {
          fontSize: "28px",
          fill: "#ffffff",
          fontStyle: "bold"
        }
      );
      
      // Artist name
      cardContainer.artist = this.add.text(
        coverX + coverSize / 2 + 20, cardY - 5,
        song.artist || "Unknown Artist",
        {
          fontSize: "18px",
          fill: "#aaaaaa"
        }
      );
      
      // Song info (BPM, duration)
      const infoText = `BPM: ${song.bpm || "N/A"}`;
      cardContainer.bpm = this.add.text(
        coverX + coverSize / 2 + 20, cardY + 20,
        infoText,
        {
          fontSize: "16px",
          fill: "#888888"
        }
      );
      
      // Difficulty indicators
      const difficultyIcons = [];
      const diffColors = {
        easy: 0x00ff00,
        normal: 0xffff00,
        hard: 0xff0000
      };
      
      let diffX = coverX + coverSize / 2 + 20;
      Object.keys(song.difficulties).forEach((diff, i) => {
        if (song.difficulties[diff]) {
          const dot = this.add.circle(diffX + (i * 20), cardY + 45, 5, diffColors[diff]);
          difficultyIcons.push(dot);
        }
      });
      
      // Make entire card clickable
      cardContainer.background.on("pointerdown", () => {
        selectSong(song.id, cardContainer);
      });
      
      // Hover effect
      cardContainer.background.on("pointerover", () => {
        cardContainer.background.setFillStyle(0x16213e, 0.9);
      });
      
      cardContainer.background.on("pointerout", () => {
        if (this.selectedSong !== song.id) {
          cardContainer.background.setFillStyle(0x1a1a2e, 0.8);
        }
      });
      
      this.songCards.push(cardContainer);
    });
    
    // Auto-select first song
    if (songs.length > 0 && this.songCards.length > 0) {
      selectSong(songs[0].id, this.songCards[0]);
    }

    // Ready Button - styled better
    const readyButtonY = cardStartY + (songs.length * cardSpacing) + 30;
    const readyButton = this.add.rectangle(
      width / 2, readyButtonY, 200, 60, 0x00aa00, 1
    ).setInteractive();
    
    const readyText = this.add.text(width / 2, readyButtonY, "Ready", {
      fontSize: "32px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    readyButton.on("pointerdown", () => {
      if (this.selectedMusic) {
        this.selectedMusic.stop();
      }
      if (this.selectedSong) {
        this.scene.start("GameScene", { 
          song: this.selectedSong,
          difficulty: this.selectedDifficulty 
        });
      }
    });
    
    readyButton.on("pointerover", () => {
      readyButton.setFillStyle(0x00ff00, 1);
    });
    
    readyButton.on("pointerout", () => {
      readyButton.setFillStyle(0x00aa00, 1);
    });

    // Back Button
    const backButton = this.add.rectangle(
      width / 2, height - 60, 150, 50, 0x555555, 1
    ).setInteractive();
    
    const backText = this.add.text(width / 2, height - 60, "Back", {
      fontSize: "24px",
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    backButton.on("pointerdown", () => {
      if (this.selectedMusic && this.selectedMusic.isPlaying) {
        this.selectedMusic.pause();
      }
      this.scene.start("MainMenuScene");
    });
    
    backButton.on("pointerover", () => {
      backButton.setFillStyle(0x666666, 1);
    });
    
    backButton.on("pointerout", () => {
      backButton.setFillStyle(0x555555, 1);
    });
  }
}
