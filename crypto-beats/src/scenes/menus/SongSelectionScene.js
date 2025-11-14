import Phaser from "phaser";
import { DIFFICULTY_LEVELS, DIFFICULTY_CONFIG } from "../../utils/game/difficultyManager.js";
import { getAllSongs, getSongById } from "../../config/songs.js";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveCardSize,
  getResponsiveSpacing,
  getResponsivePadding,
  getResponsiveFontSize
} from "../../utils/ui/responsive.js";

export default class SongSelectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "SongSelectionScene" });
    this.selectedSong = null;
    this.selectedMusic = null;
    this.selectedDifficulty = DIFFICULTY_LEVELS.NORMAL;
    this.songCards = []; // Store song card containers
  }

  create() {
    this.setupUI();
    // Listen for resize events - use both scene scale and game scale
    this.scale.on('resize', this.handleResize, this);
    // Also listen to game-level resize for better compatibility
    if (this.game.scale) {
      this.game.scale.on('resize', this.handleResize, this);
    }
  }

  setupUI() {
    const { width, height } = this.scale;
    
    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main) {
      console.warn("[SongSelectionScene] Scene not fully initialized, skipping setupUI");
      return;
    }
    
    // Clear existing UI elements
    this.clearUI();
    
    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);

    // Background fills screen
    let backgroundImage = null;
    let backgroundRect = null;
    
    // Safety check: ensure textures exist and are valid before using them
    if (this.textures && this.textures.exists && this.textures.exists("background")) {
      try {
        const texture = this.textures.get("background");
        if (texture && texture.key) {
          backgroundImage = this.add.image(width / 2, height / 2, "background");
          if (backgroundImage && backgroundImage.setDisplaySize) {
            backgroundImage.setDisplaySize(width, height);
          }
        }
      } catch (error) {
        console.warn("[SongSelectionScene] Error creating background image:", error);
        backgroundImage = null;
      }
    }
    
    // Fallback: solid color background if image doesn't load or fails
    if (!backgroundImage) {
      try {
        backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
      } catch (error) {
        console.warn("[SongSelectionScene] Error creating background rectangle:", error);
      }
    }

    // Responsive sizing
    const titleSize = getResponsiveTitleSize(width);
    const subtitleSize = getResponsiveSubtitleSize(width);
    const bodySize = getResponsiveBodySize(width);
    const titleY = getResponsiveSpacing(60, height);
    const difficultyTitleY = getResponsiveSpacing(120, height);
    const difficultyY = getResponsiveSpacing(170, height);
    const difficultySpacing = getResponsiveSpacing(100, width);

    // Scene Title with better styling
    const title = this.add.text(width / 2, titleY, "Select a Song", {
      fontSize: titleSize,
      fill: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(2, Math.round(4 * (width / 1920)))
    }).setOrigin(0.5);
    
    // Song count display
    const songs = getAllSongs();
    const songCountText = this.add.text(width / 2, titleY + getResponsiveSpacing(40, height), 
      `${songs.length} ${songs.length === 1 ? 'song' : 'songs'} available`, {
      fontSize: getResponsiveFontSize(16, width, 12, 20),
      fill: "#aaaaaa",
      fontStyle: "italic"
    }).setOrigin(0.5);
    this.songCountText = songCountText;

    // Difficulty Selection Section
    const difficultyTitle = this.add.text(width / 2, difficultyTitleY, "Difficulty", {
      fontSize: subtitleSize,
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

    // Difficulty buttons with responsive sizing
    const difficultyPadding = getResponsivePadding(20, width, height);

    let easyButton = this.add.text(width / 2 - difficultySpacing, difficultyY, "Easy", {
      fontSize: bodySize,
      fill: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color,
      padding: difficultyPadding
    }).setOrigin(0.5).setInteractive();

    easyButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.EASY, easyButton);
    });

    let normalButton = this.add.text(width / 2, difficultyY, "Normal", {
      fontSize: bodySize,
      fill: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color,
      padding: difficultyPadding
    }).setOrigin(0.5).setInteractive();

    normalButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);
    });

    let hardButton = this.add.text(width / 2 + difficultySpacing, difficultyY, "Hard", {
      fontSize: bodySize,
      fill: "#ffffff",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color,
      padding: difficultyPadding
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

    // Create song cards with responsive sizing
    const cardSize = getResponsiveCardSize(width, height);
    const cardStartY = getResponsiveSpacing(250, height);
    
    // Calculate if scrolling is needed
    const totalCardsHeight = songs.length * cardSize.spacing;
    const availableHeight = height - cardStartY - getResponsiveSpacing(200, height); // Space for buttons
    const needsScrolling = totalCardsHeight > availableHeight;
    
    // Create scrollable container if needed
    let scrollOffset = 0;
    const maxScroll = Math.max(0, totalCardsHeight - availableHeight);
    
    // Add scroll indicators if needed
    let scrollUpIndicator = null;
    let scrollDownIndicator = null;
    if (needsScrolling) {
      // Scroll up indicator (top)
      scrollUpIndicator = this.add.text(width / 2, cardStartY - getResponsiveSpacing(20, height), "▲", {
        fontSize: getResponsiveFontSize(24, width, 18, 30),
        fill: "#ffffff",
        alpha: 0.5
      }).setOrigin(0.5).setVisible(false);
      
      // Scroll down indicator (bottom)
      const scrollIndicatorY = height - getResponsiveSpacing(150, height);
      scrollDownIndicator = this.add.text(width / 2, scrollIndicatorY, "▼", {
        fontSize: getResponsiveFontSize(24, width, 18, 30),
        fill: "#ffffff",
        alpha: 0.5
      }).setOrigin(0.5);
      
      // Add scroll handlers
      this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        scrollOffset = Math.max(0, Math.min(maxScroll, scrollOffset - deltaY * 0.5));
        this.updateCardPositions(scrollOffset);
        this.updateScrollIndicators(scrollOffset, maxScroll);
      });
    }
    
    songs.forEach((song, index) => {
      const cardX = width / 2;
      const cardY = cardStartY + (index * cardSize.spacing) - scrollOffset;
      
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
      
      // Card background with responsive sizing
      cardContainer.background = this.add.rectangle(
        cardX, cardY, cardSize.width, cardSize.height, 0x1a1a2e, 0.8
      ).setInteractive();
      
      // Card border (Graphics object - needs to be redrawn to change)
      cardContainer.border = this.add.graphics();
      // Store border properties for redrawing
      cardContainer.borderProps = {
        x: cardX - cardSize.width / 2,
        y: cardY - cardSize.height / 2,
        width: cardSize.width,
        height: cardSize.height
      };
      // Draw initial border
      cardContainer.border.lineStyle(2, 0x4a4a6a, 1);
      cardContainer.border.strokeRect(
        cardContainer.borderProps.x,
        cardContainer.borderProps.y,
        cardContainer.borderProps.width,
        cardContainer.borderProps.height
      );
      
      // Cover art placeholder (rectangle with gradient effect) - responsive
      const coverSize = cardSize.height - getResponsiveSpacing(20, height);
      const coverX = cardX - cardSize.width / 2 + coverSize / 2 + getResponsiveSpacing(10, width);
      const coverY = cardY;
      
      // Create a gradient-like effect for cover
      const coverBg = this.add.rectangle(
        coverX, coverY, coverSize, coverSize, 0x2d3561, 1
      );
      cardContainer.coverBg = coverBg;
      
      // Add a music note icon (using text as placeholder) - responsive
      const iconSize = getResponsiveFontSize(48, width, 32, 64);
      const musicIcon = this.add.text(coverX, coverY, "♪", {
        fontSize: iconSize,
        fill: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
      cardContainer.musicIcon = musicIcon;
      
      // Song title - responsive
      const titleFontSize = getResponsiveFontSize(28, width, 20, 36);
      const titleOffset = getResponsiveSpacing(20, width);
      const titleYOffset = getResponsiveSpacing(30, height);
      cardContainer.title = this.add.text(
        coverX + coverSize / 2 + titleOffset, cardY - titleYOffset,
        song.name,
        {
          fontSize: titleFontSize,
          fill: "#ffffff",
          fontStyle: "bold"
        }
      );
      
      // Artist name - responsive
      const artistFontSize = getResponsiveFontSize(18, width, 14, 24);
      cardContainer.artist = this.add.text(
        coverX + coverSize / 2 + titleOffset, cardY - getResponsiveSpacing(5, height),
        song.artist || "Unknown Artist",
        {
          fontSize: artistFontSize,
          fill: "#aaaaaa"
        }
      );
      
      // Song info (BPM, duration) - responsive
      const infoFontSize = getResponsiveFontSize(16, width, 12, 20);
      const infoText = `BPM: ${song.bpm || "N/A"}`;
      cardContainer.bpm = this.add.text(
        coverX + coverSize / 2 + titleOffset, cardY + getResponsiveSpacing(20, height),
        infoText,
        {
          fontSize: infoFontSize,
          fill: "#888888"
        }
      );
      
      // Difficulty indicators - responsive
      const difficultyIcons = [];
      const diffColors = {
        easy: 0x00ff00,
        normal: 0xffff00,
        hard: 0xff0000
      };
      
      const dotSize = Math.max(4, Math.round(5 * (width / 1920)));
      const dotSpacing = getResponsiveSpacing(20, width);
      let diffX = coverX + coverSize / 2 + titleOffset;
      Object.keys(song.difficulties).forEach((diff, i) => {
        if (song.difficulties[diff]) {
          const dot = this.add.circle(diffX + (i * dotSpacing), cardY + getResponsiveSpacing(45, height), dotSize, diffColors[diff]);
          difficultyIcons.push(dot);
        }
      });
      cardContainer.difficultyIcons = difficultyIcons;
      cardContainer.songId = song.id; // Store song ID for resize restoration
      
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

    // Ready Button - responsive
    const readyButtonY = cardStartY + (songs.length * cardSize.spacing) + getResponsiveSpacing(30, height);
    const readyButtonWidth = getResponsiveSpacing(200, width);
    const readyButtonHeight = getResponsiveSpacing(60, height);
    const readyButton = this.add.rectangle(
      width / 2, readyButtonY, readyButtonWidth, readyButtonHeight, 0x00aa00, 1
    ).setInteractive();
    
    const readyFontSize = getResponsiveFontSize(32, width, 24, 40);
    const readyText = this.add.text(width / 2, readyButtonY, "Ready", {
      fontSize: readyFontSize,
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

    // Back Button - responsive
    const backButtonY = height - getResponsiveSpacing(60, height);
    const backButtonWidth = getResponsiveSpacing(150, width);
    const backButtonHeight = getResponsiveSpacing(50, height);
    const backButton = this.add.rectangle(
      width / 2, backButtonY, backButtonWidth, backButtonHeight, 0x555555, 1
    ).setInteractive();
    
    const backFontSize = getResponsiveFontSize(24, width, 18, 30);
    const backText = this.add.text(width / 2, backButtonY, "Back", {
      fontSize: backFontSize,
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
    
    // Store references for cleanup
    this.backgroundImage = backgroundImage;
    this.backgroundRect = backgroundRect;
    this.titleText = title;
    this.difficultyTitleText = difficultyTitle;
    this.easyButton = easyButton;
    this.normalButton = normalButton;
    this.hardButton = hardButton;
    this.readyButton = readyButton;
    this.readyText = readyText;
    this.backButton = backButton;
    this.backText = backText;
    this.scrollUpIndicator = scrollUpIndicator;
    this.scrollDownIndicator = scrollDownIndicator;
  }

  clearUI() {
    // Clear background
    if (this.backgroundImage) {
      this.backgroundImage.destroy();
      this.backgroundImage = null;
    }
    if (this.backgroundRect) {
      this.backgroundRect.destroy();
      this.backgroundRect = null;
    }
    
    // Clear text elements
    if (this.titleText) this.titleText.destroy();
    if (this.difficultyTitleText) this.difficultyTitleText.destroy();
    if (this.easyButton) this.easyButton.destroy();
    if (this.normalButton) this.normalButton.destroy();
    if (this.hardButton) this.hardButton.destroy();
    if (this.readyButton) this.readyButton.destroy();
    if (this.readyText) this.readyText.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.backText) this.backText.destroy();
    
    // Clear scroll indicators
    if (this.scrollUpIndicator) this.scrollUpIndicator.destroy();
    if (this.scrollDownIndicator) this.scrollDownIndicator.destroy();
    
    // Clear song cards
    this.songCards.forEach(card => {
      if (card.background) card.background.destroy();
      if (card.border) card.border.destroy();
      if (card.title) card.title.destroy();
      if (card.artist) card.artist.destroy();
      if (card.bpm) card.bpm.destroy();
      // Destroy cover elements if stored
      if (card.coverBg) card.coverBg.destroy();
      if (card.musicIcon) card.musicIcon.destroy();
      if (card.difficultyIcons) {
        card.difficultyIcons.forEach(icon => icon.destroy());
      }
    });
    this.songCards = [];
  }

  updateCardPositions(scrollOffset) {
    const { width, height } = this.scale;
    this.songCards.forEach((card, index) => {
      const baseY = this.cardStartY + (index * this.cardSize.spacing) - scrollOffset;
      const cardY = baseY;
      
      // Update all card element positions
      if (card.background) {
        card.background.setY(cardY);
      }
      if (card.border && card.borderProps) {
        const newY = cardY - this.cardSize.height / 2;
        card.borderProps.y = newY;
        // Redraw border at new position
        card.border.clear();
        card.border.lineStyle(2, 0x4a4a6a, 1);
        card.border.strokeRect(
          card.borderProps.x,
          card.borderProps.y,
          card.borderProps.width,
          card.borderProps.height
        );
      }
      if (card.coverBg) card.coverBg.setY(cardY);
      if (card.musicIcon) card.musicIcon.setY(cardY);
      if (card.title) {
        const titleY = cardY - getResponsiveSpacing(30, height);
        card.title.setY(titleY);
      }
      if (card.artist) {
        const artistY = cardY - getResponsiveSpacing(5, height);
        card.artist.setY(artistY);
      }
      if (card.bpm) {
        const bpmY = cardY + getResponsiveSpacing(20, height);
        card.bpm.setY(bpmY);
      }
      if (card.difficultyIcons) {
        card.difficultyIcons.forEach((icon, i) => {
          icon.setY(cardY + getResponsiveSpacing(45, height));
        });
      }
    });
  }

  updateScrollIndicators(scrollOffset, maxScroll) {
    if (this.scrollUpIndicator) {
      this.scrollUpIndicator.setVisible(scrollOffset > 0);
    }
    if (this.scrollDownIndicator) {
      this.scrollDownIndicator.setVisible(scrollOffset < maxScroll);
    }
  }

  handleResize(gameSize) {
    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main || !this.scale) {
      console.warn("[SongSelectionScene] Scene not fully initialized, skipping handleResize");
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
    
    // Preserve selected song and difficulty
    const selectedSongId = this.selectedSong;
    const selectedDifficulty = this.selectedDifficulty;
    
    // Recreate UI with new dimensions (only if scene is ready)
    try {
      this.setupUI();
    } catch (error) {
      console.warn("[SongSelectionScene] Error in setupUI during resize:", error);
      return; // Don't continue if setupUI fails
    }
    
    // Restore selection
    if (selectedSongId && this.songCards.length > 0) {
      const selectedCard = this.songCards.find(card => card.songId === selectedSongId);
      if (selectedCard) {
        // Re-select the song using the selectSong function from setupUI
        // We need to access it, so we'll recreate the selection logic
        if (this.selectedMusic) {
          this.selectedMusic.stop();
        }
        this.selectedMusic = this.sound.add(selectedSongId, { loop: true, volume: 0.5 });
        this.selectedMusic.play();
        this.selectedSong = selectedSongId;
        
        // Reset all cards
        this.songCards.forEach(card => {
          if (card.background) {
            card.background.setFillStyle(0x1a1a2e, 0.8);
          }
          if (card.border && card.borderProps) {
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
        if (selectedCard.background) {
          selectedCard.background.setFillStyle(0x16213e, 0.9);
        }
        if (selectedCard.border && selectedCard.borderProps) {
          selectedCard.border.clear();
          selectedCard.border.lineStyle(3, 0x00ff00, 1);
          selectedCard.border.strokeRect(
            selectedCard.borderProps.x,
            selectedCard.borderProps.y,
            selectedCard.borderProps.width,
            selectedCard.borderProps.height
          );
        }
      }
    }
    
    // Restore difficulty selection (with safety checks)
    this.selectedDifficulty = selectedDifficulty;
    try {
      if (selectedDifficulty === DIFFICULTY_LEVELS.EASY && this.easyButton && this.easyButton.setBackgroundColor) {
        this.easyButton.setBackgroundColor("#ffffff");
        this.easyButton.setColor("#000000");
        if (this.normalButton && this.normalButton.setBackgroundColor) {
          this.normalButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color);
          this.normalButton.setColor("#000000");
        }
        if (this.hardButton && this.hardButton.setBackgroundColor) {
          this.hardButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color);
          this.hardButton.setColor("#ffffff");
        }
      } else if (selectedDifficulty === DIFFICULTY_LEVELS.NORMAL && this.normalButton && this.normalButton.setBackgroundColor) {
        this.normalButton.setBackgroundColor("#ffffff");
        this.normalButton.setColor("#000000");
        if (this.easyButton && this.easyButton.setBackgroundColor) {
          this.easyButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color);
          this.easyButton.setColor("#000000");
        }
        if (this.hardButton && this.hardButton.setBackgroundColor) {
          this.hardButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color);
          this.hardButton.setColor("#ffffff");
        }
      } else if (selectedDifficulty === DIFFICULTY_LEVELS.HARD && this.hardButton && this.hardButton.setBackgroundColor) {
        this.hardButton.setBackgroundColor("#ffffff");
        this.hardButton.setColor("#000000");
        if (this.easyButton && this.easyButton.setBackgroundColor) {
          this.easyButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color);
          this.easyButton.setColor("#000000");
        }
        if (this.normalButton && this.normalButton.setBackgroundColor) {
          this.normalButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color);
          this.normalButton.setColor("#000000");
        }
      }
    } catch (error) {
      console.warn("[SongSelectionScene] Error restoring difficulty selection:", error);
    }
  }
}
