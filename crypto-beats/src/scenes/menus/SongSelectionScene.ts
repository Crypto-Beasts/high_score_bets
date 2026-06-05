import Phaser from "phaser";
import { DIFFICULTY_LEVELS, DIFFICULTY_CONFIG, DifficultyLevel } from "../../utils/game/difficultyManager";
import { getAllSongs, getSongById, Song } from "../../config/songs";
import { getAllAchievements, getAchievementProgress, AchievementWithStatus } from "../../utils/game/achievements";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveCardSize,
  getResponsiveSpacing,
  getResponsivePadding,
  getResponsiveFontSize,
  CardDimensions
} from "../../utils/ui/responsive";

interface BorderProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SongCard {
  background: Phaser.GameObjects.Rectangle | null;
  border: Phaser.GameObjects.Graphics | null;
  borderProps: BorderProps | null;
  cover: Phaser.GameObjects.Image | null;
  coverBg?: Phaser.GameObjects.Rectangle;
  musicIcon?: Phaser.GameObjects.Text;
  title: Phaser.GameObjects.Text | null;
  artist: Phaser.GameObjects.Text | null;
  info: Phaser.GameObjects.Text | null;
  bpm: Phaser.GameObjects.Text | null;
  difficultyIcons?: Phaser.GameObjects.Arc[];
  songId?: string;
}

// The achievements popup is a Container with cleanup handlers stashed on it.
type PopupContainer = Phaser.GameObjects.Container & {
  _popupWheelHandler?: (
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number,
    deltaZ: number
  ) => void;
  _popupDragHandler?: (pointer: Phaser.Input.Pointer) => void;
  _popupDragEndHandler?: () => void;
};

export default class SongSelectionScene extends Phaser.Scene {
  private selectedSong: string | null = null;
  private selectedMusic: Phaser.Sound.BaseSound | null = null;
  private selectedDifficulty: DifficultyLevel = DIFFICULTY_LEVELS.NORMAL;
  private songCards: SongCard[] = [];
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private songCountText?: Phaser.GameObjects.Text;
  private difficultyTitleText?: Phaser.GameObjects.Text;
  private easyButton?: Phaser.GameObjects.Text;
  private normalButton?: Phaser.GameObjects.Text;
  private hardButton?: Phaser.GameObjects.Text;
  private readyButton?: Phaser.GameObjects.Rectangle;
  private readyText?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Rectangle;
  private backText?: Phaser.GameObjects.Text;
  private achievementsButton?: Phaser.GameObjects.Rectangle;
  private achievementsText?: Phaser.GameObjects.Text;
  private achievementsPopup?: Phaser.GameObjects.Container;
  private popupBackground?: Phaser.GameObjects.Rectangle;
  private popupTitle?: Phaser.GameObjects.Text;
  private popupProgress?: Phaser.GameObjects.Text;
  private popupCloseButton?: Phaser.GameObjects.Rectangle;
  private popupCloseText?: Phaser.GameObjects.Text;
  private achievementCards: Phaser.GameObjects.Container[] = [];
  private achievementCardsScrollOffset: number = 0;
  private popupScrollbarBg?: Phaser.GameObjects.Rectangle;
  private popupScrollbarHandle?: Phaser.GameObjects.Rectangle;
  private popupScrollbarHandleHeight?: number;
  private popupScrollbarHandleYMin?: number;
  private popupScrollbarHandleYMax?: number;
  private scrollUpIndicator?: Phaser.GameObjects.Text;
  private scrollDownIndicator?: Phaser.GameObjects.Text;
  private scrollbarBg?: Phaser.GameObjects.Rectangle;
  private scrollbarHandle?: Phaser.GameObjects.Rectangle;
  private cardStartY?: number;
  private cardSize?: CardDimensions;
  private availableHeight?: number;
  private scrollbarHandleHeight?: number;
  private scrollbarHandleYMin?: number;
  private scrollbarHandleYMax?: number;

  constructor() {
    super({ key: "SongSelectionScene" });
  }

  create(): void {
    this.setupUI();
    // Listen for resize events - use both scene scale and game scale
    this.scale.on('resize', this.handleResize, this);
    // Also listen to game-level resize for better compatibility
    if (this.game.scale) {
      this.game.scale.on('resize', this.handleResize, this);
    }
  }

  private setupUI(): void {
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
    let backgroundImage: Phaser.GameObjects.Image | null = null;
    let backgroundRect: Phaser.GameObjects.Rectangle | null = null;
    
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
    const titleY = getResponsiveSpacing(50, height);
    const difficultyTitleY = getResponsiveSpacing(120, height);
    const difficultyY = getResponsiveSpacing(170, height);
    const difficultySpacing = getResponsiveSpacing(100, width);

    // Scene Title with better styling
    const title = this.add.text(width / 2, titleY, "Select a Song", {
      fontSize: titleSize,
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(2, Math.round(4 * (width / 1920)))
    }).setOrigin(0.5);
    
    // Song count display
    const songs = getAllSongs();
    const songCountText = this.add.text(width / 2, titleY + getResponsiveSpacing(35, height), 
      `${songs.length} ${songs.length === 1 ? 'song' : 'songs'} available`, {
      fontSize: getResponsiveFontSize(16, width, 12, 20),
      color: "#aaaaaa",
      fontStyle: "italic"
    }).setOrigin(0.5);
    this.songCountText = songCountText;

    // Difficulty Selection Section
    const difficultyTitle = this.add.text(width / 2, difficultyTitleY, "Difficulty", {
      fontSize: subtitleSize,
      color: "#000000",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Difficulty selection function
    const selectDifficulty = (difficulty: DifficultyLevel, button: Phaser.GameObjects.Text) => {
      this.selectedDifficulty = difficulty;
      // Reset all difficulty buttons
      if (this.easyButton) {
        this.easyButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color);
        this.easyButton.setColor("#000000");
      }
      if (this.normalButton) {
        this.normalButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color);
        this.normalButton.setColor("#000000");
      }
      if (this.hardButton) {
        this.hardButton.setBackgroundColor(DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color);
        this.hardButton.setColor("#ffffff");
      }
      // Highlight selected
      button.setBackgroundColor("#ffffff");
      button.setColor("#000000");
    };

    // Difficulty buttons with responsive sizing
    const difficultyPadding = getResponsivePadding(20, width, height);

    const easyButton = this.add.text(width / 2 - difficultySpacing, difficultyY, "Easy", {
      fontSize: bodySize,
      color: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.EASY].color,
      padding: difficultyPadding
    }).setOrigin(0.5).setInteractive();
    this.easyButton = easyButton;

    easyButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.EASY, easyButton);
    });

    // Hover effects for Easy button
    easyButton.on("pointerover", () => {
      this.tweens.killTweensOf(easyButton);
      this.tweens.add({
        targets: easyButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });

    easyButton.on("pointerout", () => {
      this.tweens.killTweensOf(easyButton);
      this.tweens.add({
        targets: easyButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    const normalButton = this.add.text(width / 2, difficultyY, "Normal", {
      fontSize: bodySize,
      color: "#000000",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL].color,
      padding: difficultyPadding
    }).setOrigin(0.5).setInteractive();
    this.normalButton = normalButton;

    normalButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);
    });

    // Hover effects for Normal button
    normalButton.on("pointerover", () => {
      this.tweens.killTweensOf(normalButton);
      this.tweens.add({
        targets: normalButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });

    normalButton.on("pointerout", () => {
      this.tweens.killTweensOf(normalButton);
      this.tweens.add({
        targets: normalButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    const hardButton = this.add.text(width / 2 + difficultySpacing, difficultyY, "Hard", {
      fontSize: bodySize,
      color: "#ffffff",
      backgroundColor: DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.HARD].color,
      padding: difficultyPadding
    }).setOrigin(0.5).setInteractive();
    this.hardButton = hardButton;

    hardButton.on("pointerdown", () => {
      selectDifficulty(DIFFICULTY_LEVELS.HARD, hardButton);
    });

    // Hover effects for Hard button
    hardButton.on("pointerover", () => {
      this.tweens.killTweensOf(hardButton);
      this.tweens.add({
        targets: hardButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });

    hardButton.on("pointerout", () => {
      this.tweens.killTweensOf(hardButton);
      this.tweens.add({
        targets: hardButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    // Highlight default (Normal)
    selectDifficulty(DIFFICULTY_LEVELS.NORMAL, normalButton);
    
    // Song selection function
    const selectSong = (songId: string, cardContainer: SongCard) => {
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
    this.cardSize = cardSize;
    const cardStartY = getResponsiveSpacing(320, height);
    this.cardStartY = cardStartY;
    
    // Calculate if scrolling is needed
    const totalCardsHeight = songs.length * cardSize.spacing;
    const availableHeight = height - cardStartY - getResponsiveSpacing(180, height); // Space for buttons
    this.availableHeight = availableHeight;
    const needsScrolling = totalCardsHeight > availableHeight;
    
    // Create scrollable container if needed
    let scrollOffset = 0;
    const maxScroll = Math.max(0, totalCardsHeight - availableHeight);
    
    // Add scroll indicators if needed
    let scrollUpIndicator: Phaser.GameObjects.Text | null = null;
    let scrollDownIndicator: Phaser.GameObjects.Text | null = null;
    let scrollbarBg: Phaser.GameObjects.Rectangle | null = null;
    let scrollbarHandle: Phaser.GameObjects.Rectangle | null = null;
    
    if (needsScrolling) {
      // Scroll up indicator (top)
      scrollUpIndicator = this.add.text(width / 2, cardStartY - getResponsiveSpacing(20, height), "▲", {
        fontSize: getResponsiveFontSize(24, width, 18, 30),
        color: "#ffffff"
      }).setOrigin(0.5).setVisible(false).setAlpha(0.5);
      
      // Scroll down indicator (bottom)
      const scrollIndicatorY = height - getResponsiveSpacing(150, height);
      scrollDownIndicator = this.add.text(width / 2, scrollIndicatorY, "▼", {
        fontSize: getResponsiveFontSize(24, width, 18, 30),
        color: "#ffffff"
      }).setOrigin(0.5).setAlpha(0.5);
      
      // Visual scrollbar
      const scrollbarWidth = getResponsiveSpacing(8, width);
      const scrollbarX = width / 2 + cardSize.width / 2 + getResponsiveSpacing(30, width);
      
      scrollbarBg = this.add.rectangle(
        scrollbarX, cardStartY + availableHeight / 2,
        scrollbarWidth, availableHeight,
        0x333333, 0.5
      );
      
      const handleHeight = Math.max(
        getResponsiveSpacing(30, height),
        (availableHeight / totalCardsHeight) * availableHeight
      );
      const handleYMin = cardStartY;
      const handleYMax = cardStartY + availableHeight - handleHeight;
      
      // Store handle bounds for use in updateScrollIndicators
      this.scrollbarHandleHeight = handleHeight;
      this.scrollbarHandleYMin = handleYMin;
      this.scrollbarHandleYMax = handleYMax;
      
      scrollbarHandle = this.add.rectangle(
        scrollbarX, handleYMin + handleHeight / 2,
        scrollbarWidth * 1.5, handleHeight,
        0x888888, 0.8
      ).setInteractive({ useHandCursor: true });
      
      // Store scrollbar elements
      this.scrollbarBg = scrollbarBg;
      this.scrollbarHandle = scrollbarHandle;
      
      // Scroll handler function
      const updateScroll = (newOffset: number) => {
        scrollOffset = Math.max(0, Math.min(maxScroll, newOffset));
        this.updateCardPositions(scrollOffset);
        this.updateScrollIndicators(scrollOffset, maxScroll);
        
        // Update scrollbar handle position
        if (scrollbarHandle && maxScroll > 0) {
          const handleY = handleYMin + (scrollOffset / maxScroll) * (handleYMax - handleYMin);
          scrollbarHandle.setY(handleY + handleHeight / 2);
        }
      };
      
      // Mouse wheel scrolling
      this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        updateScroll(scrollOffset - deltaY * 0.5);
      });
      
      // Click on scrollbar track to jump
      scrollbarBg.setInteractive({ useHandCursor: true });
      scrollbarBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const localY = pointer.y - cardStartY;
        const scrollRatio = localY / availableHeight;
        const newOffset = scrollRatio * maxScroll;
        updateScroll(newOffset);
      });
      
      // Drag scrollbar handle
      let isDragging = false;
      scrollbarHandle.on('pointerdown', () => {
        isDragging = true;
      });
      
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (isDragging && scrollbarHandle && pointer.isDown) {
          const localY = Phaser.Math.Clamp(
            pointer.y - cardStartY,
            handleHeight / 2,
            availableHeight - handleHeight / 2
          );
          scrollbarHandle.setY(cardStartY + localY);
          const scrollRatio = (localY - handleHeight / 2) / (availableHeight - handleHeight);
          updateScroll(scrollRatio * maxScroll);
        }
      });
      
      this.input.on('pointerup', () => {
        isDragging = false;
      });
    }
    
    songs.forEach((song, index) => {
      const cardX = width / 2;
      const cardY = cardStartY + (index * cardSize.spacing) - scrollOffset;
      
      // Create card container
      const cardContainer: SongCard = {
        background: null,
        border: null,
        borderProps: null,
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
        color: "#ffffff",
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
          color: "#ffffff",
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
          color: "#aaaaaa"
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
          color: "#888888"
        }
      );
      
      // Difficulty indicators - responsive
      const difficultyIcons: Phaser.GameObjects.Arc[] = [];
      const diffColors: Record<string, number> = {
        easy: 0x00ff00,
        normal: 0xffff00,
        hard: 0xff0000
      };
      
      const dotSize = Math.max(4, Math.round(5 * (width / 1920)));
      const dotSpacing = getResponsiveSpacing(20, width);
      const diffX = coverX + coverSize / 2 + titleOffset;
      Object.keys(song.difficulties).forEach((diff, i) => {
        if (song.difficulties[diff as keyof typeof song.difficulties]) {
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
        if (cardContainer.background) {
          cardContainer.background.setFillStyle(0x16213e, 0.9);
        }
      });
      
      cardContainer.background.on("pointerout", () => {
        if (this.selectedSong !== song.id && cardContainer.background) {
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
    this.readyButton = readyButton;
    
    const readyFontSize = getResponsiveFontSize(32, width, 24, 40);
    const readyText = this.add.text(width / 2, readyButtonY, "Ready", {
      fontSize: readyFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.readyText = readyText;

    // Achievements Button - below Ready button
    const achievementsButtonY = readyButtonY + readyButtonHeight / 2 + getResponsiveSpacing(20, height) + readyButtonHeight / 2;
    const achievementsButtonWidth = readyButtonWidth;
    const achievementsButtonHeight = getResponsiveSpacing(50, height);
    const achievementsButton = this.add.rectangle(
      width / 2, achievementsButtonY, achievementsButtonWidth, achievementsButtonHeight, 0x666666, 1
    ).setInteractive();
    this.achievementsButton = achievementsButton;
    
    const achievementsFontSize = getResponsiveFontSize(24, width, 18, 30);
    const achievementsText = this.add.text(width / 2, achievementsButtonY, "Achievements", {
      fontSize: achievementsFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.achievementsText = achievementsText;
    
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
      // Stop any existing tweens
      this.tweens.killTweensOf(readyButton);
      this.tweens.killTweensOf(readyText);
      
      // Animate scale only (no color change)
      this.tweens.add({
        targets: readyButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: readyText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });
    
    readyButton.on("pointerout", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(readyButton);
      this.tweens.killTweensOf(readyText);
      
      // Animate back to original
      this.tweens.add({
        targets: readyButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: readyText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    // Back Button - responsive
    const backButtonY = height - getResponsiveSpacing(60, height);
    const backButtonWidth = getResponsiveSpacing(150, width);
    const backButtonHeight = getResponsiveSpacing(50, height);
    
    const backButton = this.add.rectangle(
      width / 2, backButtonY, backButtonWidth, backButtonHeight, 0x555555, 1
    ).setInteractive();
    this.backButton = backButton;
    
    const backFontSize = getResponsiveFontSize(24, width, 18, 30);
    const backText = this.add.text(width / 2, backButtonY, "Back", {
      fontSize: backFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.backText = backText;
    
    backButton.on("pointerdown", () => {
      if (this.selectedMusic && this.selectedMusic.isPlaying) {
        this.selectedMusic.pause();
      }
      this.scene.start("MainMenuScene");
    });

    achievementsButton.on("pointerdown", () => {
      this.showAchievementsPopup();
    });
    
    backButton.on("pointerover", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(backButton);
      this.tweens.killTweensOf(backText);
      
      // Animate scale only (no color change)
      this.tweens.add({
        targets: backButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: backText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });
    
    backButton.on("pointerout", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(backButton);
      this.tweens.killTweensOf(backText);
      
      // Animate back to original
      this.tweens.add({
        targets: backButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: backText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    achievementsButton.on("pointerover", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(achievementsButton);
      this.tweens.killTweensOf(achievementsText);
      
      // Animate scale only (no color change)
      this.tweens.add({
        targets: achievementsButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: achievementsText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });
    
    achievementsButton.on("pointerout", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(achievementsButton);
      this.tweens.killTweensOf(achievementsText);
      
      // Animate back to original
      this.tweens.add({
        targets: achievementsButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: achievementsText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });
    
    // Store references for cleanup
    this.backgroundImage = backgroundImage || undefined;
    this.backgroundRect = backgroundRect || undefined;
    this.titleText = title;
    this.difficultyTitleText = difficultyTitle;
    this.scrollUpIndicator = scrollUpIndicator || undefined;
    this.scrollDownIndicator = scrollDownIndicator || undefined;
  }

  private clearUI(): void {
    // Clear background
    if (this.backgroundImage) {
      this.backgroundImage.destroy();
      this.backgroundImage = undefined;
    }
    if (this.backgroundRect) {
      this.backgroundRect.destroy();
      this.backgroundRect = undefined;
    }
    
    // Clear text elements
    if (this.titleText) this.titleText.destroy();
    if (this.songCountText) this.songCountText.destroy();
    if (this.difficultyTitleText) this.difficultyTitleText.destroy();
    if (this.easyButton) this.easyButton.destroy();
    if (this.normalButton) this.normalButton.destroy();
    if (this.hardButton) this.hardButton.destroy();
    if (this.readyButton) this.readyButton.destroy();
    if (this.readyText) this.readyText.destroy();
    if (this.backButton) this.backButton.destroy();
    if (this.backText) this.backText.destroy();
    if (this.achievementsButton) this.achievementsButton.destroy();
    if (this.achievementsText) this.achievementsText.destroy();
    
    // Clear scroll indicators and scrollbar
    if (this.scrollUpIndicator) this.scrollUpIndicator.destroy();
    if (this.scrollDownIndicator) this.scrollDownIndicator.destroy();
    if (this.scrollbarBg) this.scrollbarBg.destroy();
    if (this.scrollbarHandle) this.scrollbarHandle.destroy();
    
    // Clear achievements popup
    if (this.achievementsPopup) {
      // Remove handlers
      const popup = this.achievementsPopup as PopupContainer;
      const wheelHandler = popup._popupWheelHandler;
      const dragHandler = popup._popupDragHandler;
      const dragEndHandler = popup._popupDragEndHandler;

      if (wheelHandler) this.input.off('wheel', wheelHandler);
      if (dragHandler) this.input.off('pointermove', dragHandler);
      if (dragEndHandler) this.input.off('pointerup', dragEndHandler);
      
      this.achievementsPopup.destroy();
      this.achievementsPopup = undefined;
    }
    this.popupBackground = undefined;
    this.popupTitle = undefined;
    this.popupProgress = undefined;
    this.popupCloseButton = undefined;
    this.popupCloseText = undefined;
    this.popupScrollbarBg = undefined;
    this.popupScrollbarHandle = undefined;
    this.popupScrollbarHandleHeight = undefined;
    this.popupScrollbarHandleYMin = undefined;
    this.popupScrollbarHandleYMax = undefined;
    this.achievementCards.forEach(card => card.destroy());
    this.achievementCards = [];
    
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

  private updateCardPositions(scrollOffset: number): void {
    const { width, height } = this.scale;
    const cardStartY = this.cardStartY;
    const cardSize = this.cardSize;
    if (!cardStartY || !cardSize) return;

    this.songCards.forEach((card, index) => {
      const baseY = cardStartY + index * cardSize.spacing - scrollOffset;
      const cardY = baseY;

      // Update all card element positions
      if (card.background) {
        card.background.setY(cardY);
      }
      if (card.border && card.borderProps) {
        const newY = cardY - cardSize.height / 2;
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

  private updateScrollIndicators(scrollOffset: number, maxScroll: number): void {
    if (this.scrollUpIndicator) {
      this.scrollUpIndicator.setVisible(scrollOffset > 0);
    }
    if (this.scrollDownIndicator) {
      this.scrollDownIndicator.setVisible(scrollOffset < maxScroll);
    }
    
    // Update scrollbar handle position
    if (this.scrollbarHandle && this.scrollbarHandleHeight && 
        this.scrollbarHandleYMin !== undefined && this.scrollbarHandleYMax !== undefined && 
        maxScroll > 0) {
      const handleY = this.scrollbarHandleYMin + (scrollOffset / maxScroll) * (this.scrollbarHandleYMax - this.scrollbarHandleYMin);
      this.scrollbarHandle.setY(handleY + this.scrollbarHandleHeight / 2);
    }
  }

  private showAchievementsPopup(): void {
    const { width, height } = this.scale;
    
    // Close popup if already open
    if (this.achievementsPopup) {
      this.hideAchievementsPopup();
      return;
    }
    
    // Get achievements data and sort: unlocked first, then locked
    const achievements = getAllAchievements().sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0; // Maintain original order within same unlock status
    });
    const progress = getAchievementProgress();
    
    // Semi-transparent background overlay (non-interactive - only close button closes)
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    
    // Popup container
    const popupWidth = Math.min(getResponsiveSpacing(800, width), width * 0.9);
    const popupHeight = Math.min(getResponsiveSpacing(700, height), height * 0.85);
    
    const popupBg = this.add.rectangle(
      width / 2, height / 2,
      popupWidth, popupHeight,
      0x1a1a2e, 1
    );
    popupBg.setStrokeStyle(3, 0x444444);
    this.popupBackground = popupBg;
    
    // Title
    const titleSize = getResponsiveTitleSize(width);
    const title = this.add.text(width / 2, height / 2 - popupHeight / 2 + getResponsiveSpacing(40, height), "Achievements", {
      fontSize: titleSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.popupTitle = title;
    
    // Progress text
    const progressText = this.add.text(width / 2, height / 2 - popupHeight / 2 + getResponsiveSpacing(80, height),
      `Progress: ${progress}% (${achievements.filter(a => a.unlocked).length}/${achievements.length})`, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      color: "#aaaaaa"
    }).setOrigin(0.5);
    this.popupProgress = progressText;
    
    // Progress bar
    const progressBarWidth = getResponsiveSpacing(400, width);
    const progressBarHeight = getResponsiveSpacing(20, height);
    const progressBarBg = this.add.rectangle(
      width / 2,
      height / 2 - popupHeight / 2 + getResponsiveSpacing(110, height),
      progressBarWidth, progressBarHeight,
      0x333333, 1
    );
    
    const progressBar = this.add.rectangle(
      width / 2 - progressBarWidth / 2 + (progress / 100) * progressBarWidth / 2,
      height / 2 - popupHeight / 2 + getResponsiveSpacing(110, height),
      (progress / 100) * progressBarWidth,
      progressBarHeight,
      0x00ff00, 1
    );
    progressBar.setOrigin(0, 0.5);
    
    // Achievement cards container with scroll
    const cardSpacing = getResponsiveSpacing(15, height);
    const cardWidth = popupWidth * 0.9;
    const cardHeight = getResponsiveSpacing(90, height);
    const cardsContainerHeight = popupHeight - getResponsiveSpacing(250, height);
    // Position container Y so first card's top edge aligns with visible area top
    const cardsContainerY = height / 2 - popupHeight / 2 + getResponsiveSpacing(160, height) + cardHeight / 2;
    
    // Store cards for cleanup
    this.achievementCards = [];
    this.achievementCardsScrollOffset = 0;
    
    // Calculate total height and if scrolling is needed
    const totalCardsHeight = achievements.length * (cardHeight + cardSpacing) - cardSpacing;
    const needsScrolling = totalCardsHeight > cardsContainerHeight;
    
    achievements.forEach((achievement, index) => {
      const cardY = cardsContainerY + (cardHeight + cardSpacing) * index;
      
      // Create container at card position - elements will use relative positions
      const cardContainer = this.add.container(width / 2, cardY);
      
      // Card background (relative to container center)
      const cardBg = this.add.rectangle(
        0, 0, // Center of container
        cardWidth, cardHeight,
        achievement.unlocked ? 0x2a4a2a : 0x2a2a3e,
        achievement.unlocked ? 0.9 : 0.7
      );
      
      if (achievement.unlocked) {
        cardBg.setStrokeStyle(2, 0x00ff00);
      }
      
      // Achievement icon (relative to container)
      const iconText = this.add.text(
        -cardWidth / 2 + getResponsiveSpacing(50, width),
        0, // Relative Y
        achievement.icon,
        {
          fontSize: getResponsiveFontSize(40, width, 32, 48),
        }
      ).setOrigin(0.5).setAlpha(achievement.unlocked ? 1 : 0.3);
      
      // Achievement name (relative to container)
      const nameText = this.add.text(
        -cardWidth / 2 + getResponsiveSpacing(120, width),
        -getResponsiveSpacing(15, height), // Relative Y
        achievement.name,
        {
          fontSize: getResponsiveFontSize(20, width, 16, 24),
          color: achievement.unlocked ? "#ffffff" : "#888888",
          fontStyle: "bold"
        }
      ).setOrigin(0, 0.5);
      
      // Achievement description (relative to container)
      const descText = this.add.text(
        -cardWidth / 2 + getResponsiveSpacing(120, width),
        getResponsiveSpacing(15, height), // Relative Y
        achievement.description,
        {
          fontSize: getResponsiveFontSize(14, width, 12, 18),
          color: achievement.unlocked ? "#aaaaaa" : "#555555",
          wordWrap: { width: cardWidth - getResponsiveSpacing(200, width) }
        }
      ).setOrigin(0, 0.5);
      
      // Status indicator (relative to container)
      const statusText = this.add.text(
        cardWidth / 2 - getResponsiveSpacing(50, width),
        0, // Relative Y
        achievement.unlocked ? "✓" : "🔒",
        {
          fontSize: getResponsiveFontSize(28, width, 24, 32),
          color: achievement.unlocked ? "#00ff00" : "#666666"
        }
      ).setOrigin(0.5);
      
      // Add elements to container
      cardContainer.add([cardBg, iconText, nameText, descText, statusText]);
      this.achievementCards.push(cardContainer);
    });
    
    // Close button
    const closeButtonWidth = getResponsiveSpacing(150, width);
    const closeButtonHeight = getResponsiveSpacing(50, height);
    const closeButton = this.add.rectangle(
      width / 2,
      height / 2 + popupHeight / 2 - getResponsiveSpacing(40, height),
      closeButtonWidth, closeButtonHeight,
      0x555555, 1
    ).setInteractive();
    this.popupCloseButton = closeButton;
    
    const closeText = this.add.text(
      width / 2,
      height / 2 + popupHeight / 2 - getResponsiveSpacing(40, height),
      "Close",
      {
        fontSize: getResponsiveFontSize(24, width, 18, 30),
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);
    this.popupCloseText = closeText;
    
    closeButton.on("pointerdown", () => {
      this.hideAchievementsPopup();
    });
    
    closeButton.on("pointerover", () => {
      this.tweens.killTweensOf(closeButton);
      this.tweens.killTweensOf(closeText);
      this.tweens.add({
        targets: closeButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      this.tweens.add({
        targets: closeText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });
    
    closeButton.on("pointerout", () => {
      this.tweens.killTweensOf(closeButton);
      this.tweens.killTweensOf(closeText);
      this.tweens.add({
        targets: closeButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      this.tweens.add({
        targets: closeText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });
    
    // Create mask for achievement cards to prevent overflow
    // Mask should start at the top of the first card (cardsContainerY - cardHeight/2)
    const cardsMask = this.make.graphics();
    const maskStartY = cardsContainerY - cardHeight / 2;
    cardsMask.fillRect(
      width / 2 - popupWidth / 2 + getResponsiveSpacing(5, width),
      maskStartY,
      popupWidth * 0.9 - getResponsiveSpacing(30, width), // Account for scrollbar space
      cardsContainerHeight
    );
    
    const mask = cardsMask.createGeometryMask();
    
    // Apply mask to each achievement card
    this.achievementCards.forEach(card => {
      card.setMask(mask);
    });
    
    // Store popup elements in container
    const popupContainer = this.add.container(0, 0, [
      overlay, popupBg, title, progressText, progressBarBg, progressBar, closeButton, closeText, cardsMask
    ]);
    
    // Add achievement cards to container
    this.achievementCards.forEach(card => {
      popupContainer.add(card);
    });
    
    this.achievementsPopup = popupContainer;
    
    // Store scroll info for popup
    let popupWheelHandler: ((pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => void) | undefined;
    let popupScrollbarBg: Phaser.GameObjects.Rectangle | undefined;
    let popupScrollbarHandle: Phaser.GameObjects.Rectangle | undefined;
    
    if (needsScrolling) {
      const popupMaxScroll = Math.max(0, totalCardsHeight - cardsContainerHeight);
      
      // Visual scrollbar for popup
      const scrollbarWidth = getResponsiveSpacing(8, width);
      const scrollbarX = width / 2 + popupWidth / 2 - getResponsiveSpacing(20, width);
      const maskStartY = cardsContainerY - cardHeight / 2;
      const scrollbarY = maskStartY + cardsContainerHeight / 2;
      
      popupScrollbarBg = this.add.rectangle(
        scrollbarX, scrollbarY,
        scrollbarWidth, cardsContainerHeight,
        0x333333, 0.5
      ).setInteractive({ useHandCursor: true });
      this.popupScrollbarBg = popupScrollbarBg;
      
      const handleHeight = Math.max(
        getResponsiveSpacing(30, height),
        (cardsContainerHeight / totalCardsHeight) * cardsContainerHeight
      );
      const handleYMin = maskStartY;
      const handleYMax = maskStartY + cardsContainerHeight - handleHeight;
      
      // Store handle bounds
      this.popupScrollbarHandleHeight = handleHeight;
      this.popupScrollbarHandleYMin = handleYMin;
      this.popupScrollbarHandleYMax = handleYMax;
      
      popupScrollbarHandle = this.add.rectangle(
        scrollbarX, handleYMin + handleHeight / 2,
        scrollbarWidth * 1.5, handleHeight,
        0x888888, 0.8
      ).setInteractive({ useHandCursor: true });
      this.popupScrollbarHandle = popupScrollbarHandle;
      
      // Scroll handler function
      const updatePopupScroll = (newOffset: number) => {
        this.achievementCardsScrollOffset = Math.max(0, Math.min(popupMaxScroll, newOffset));
        this.updateAchievementCardsScroll();
        
        // Update scrollbar handle position
        if (popupScrollbarHandle && popupMaxScroll > 0) {
          const handleY = handleYMin + (this.achievementCardsScrollOffset / popupMaxScroll) * (handleYMax - handleYMin);
          popupScrollbarHandle.setY(handleY + handleHeight / 2);
        }
      };
      
      // Create a popup-specific wheel handler
      popupWheelHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        if (this.achievementsPopup && this.achievementsPopup.active) {
          updatePopupScroll(this.achievementCardsScrollOffset - deltaY * 0.5);
        }
      };
      
      // Add wheel handler that works when popup is active
      this.input.on('wheel', popupWheelHandler);
      
      // Click on scrollbar track to jump
      popupScrollbarBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const localY = pointer.y - maskStartY;
        const scrollRatio = localY / cardsContainerHeight;
        updatePopupScroll(scrollRatio * popupMaxScroll);
      });
      
      // Drag scrollbar handle
      let isDragging = false;
      popupScrollbarHandle.on('pointerdown', () => {
        isDragging = true;
      });
      
      const popupDragHandler = (pointer: Phaser.Input.Pointer) => {
        if (isDragging && popupScrollbarHandle && pointer.isDown) {
          const localY = Phaser.Math.Clamp(
            pointer.y - maskStartY,
            handleHeight / 2,
            cardsContainerHeight - handleHeight / 2
          );
          popupScrollbarHandle.setY(maskStartY + localY);
          const scrollRatio = (localY - handleHeight / 2) / (cardsContainerHeight - handleHeight);
          updatePopupScroll(scrollRatio * popupMaxScroll);
        }
      };
      
      const popupDragEndHandler = () => {
        isDragging = false;
      };
      
      this.input.on('pointermove', popupDragHandler);
      this.input.on('pointerup', popupDragEndHandler);
      
      // Store handlers for cleanup
      (popupContainer as PopupContainer)._popupWheelHandler = popupWheelHandler;
      (popupContainer as PopupContainer)._popupDragHandler = popupDragHandler;
      (popupContainer as PopupContainer)._popupDragEndHandler = popupDragEndHandler;
      
      // Add scrollbar to popup container
      popupContainer.add([popupScrollbarBg, popupScrollbarHandle]);
    }
    
    // Animate popup appearance
    popupContainer.setAlpha(0);
    popupContainer.setScale(0.8);
    this.tweens.add({
      targets: popupContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: "Back.easeOut"
    });
  }

  private hideAchievementsPopup(): void {
    if (!this.achievementsPopup) return;
    
    // Remove popup-specific handlers if they exist
    const popup = this.achievementsPopup as PopupContainer;
    const wheelHandler = popup._popupWheelHandler;
    const dragHandler = popup._popupDragHandler;
    const dragEndHandler = popup._popupDragEndHandler;
    
    if (wheelHandler) {
      this.input.off('wheel', wheelHandler);
    }
    if (dragHandler) {
      this.input.off('pointermove', dragHandler);
    }
    if (dragEndHandler) {
      this.input.off('pointerup', dragEndHandler);
    }
    
    // Animate popup disappearance
    this.tweens.add({
      targets: this.achievementsPopup,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 150,
      ease: "Power2",
      onComplete: () => {
        if (this.achievementsPopup) {
          this.achievementsPopup.destroy();
          this.achievementsPopup = undefined;
        }
        this.popupBackground = undefined;
        this.popupTitle = undefined;
        this.popupProgress = undefined;
        this.popupCloseButton = undefined;
        this.popupCloseText = undefined;
        this.popupScrollbarBg = undefined;
        this.popupScrollbarHandle = undefined;
        this.popupScrollbarHandleHeight = undefined;
        this.popupScrollbarHandleYMin = undefined;
        this.popupScrollbarHandleYMax = undefined;
        this.achievementCards.forEach(card => card.destroy());
        this.achievementCards = [];
        this.achievementCardsScrollOffset = 0;
      }
    });
  }

  private updateAchievementCardsScroll(): void {
    const { width, height } = this.scale;
    if (!this.achievementsPopup) return;
    
    const popupHeight = Math.min(getResponsiveSpacing(700, height), height * 0.85);
    const cardHeight = getResponsiveSpacing(90, height);
    const cardSpacing = getResponsiveSpacing(15, height);
    // Position container Y so first card's top edge aligns with visible area top
    const cardsContainerY = height / 2 - popupHeight / 2 + getResponsiveSpacing(160, height) + cardHeight / 2;
    
    this.achievementCards.forEach((card, index) => {
      const baseY = cardsContainerY + (cardHeight + cardSpacing) * index;
      // Update both X and Y to maintain container positioning
      card.setPosition(width / 2, baseY - this.achievementCardsScrollOffset);
    });
    
    // Update scrollbar handle position if it exists
    if (this.popupScrollbarHandle && this.popupScrollbarHandleYMin !== undefined && 
        this.popupScrollbarHandleYMax !== undefined && this.popupScrollbarHandleHeight !== undefined) {
      const cardsContainerHeight = popupHeight - getResponsiveSpacing(250, height);
      const totalCardsHeight = this.achievementCards.length * (cardHeight + cardSpacing) - cardSpacing;
      const popupMaxScroll = Math.max(0, totalCardsHeight - cardsContainerHeight);
      
      if (popupMaxScroll > 0) {
        const maskStartY = cardsContainerY - cardHeight / 2;
        const handleY = maskStartY + 
          (this.achievementCardsScrollOffset / popupMaxScroll) * 
          (cardsContainerHeight - this.popupScrollbarHandleHeight);
        this.popupScrollbarHandle.setY(handleY + this.popupScrollbarHandleHeight / 2);
      }
    }
  }

  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main || !this.scale) {
      console.warn("[SongSelectionScene] Scene not fully initialized, skipping handleResize");
      return;
    }
    
    // Handle different parameter formats
    let width: number, height: number;
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

