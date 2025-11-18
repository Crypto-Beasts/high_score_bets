import Phaser from "phaser";
import { getResponsiveTitleSize, getResponsiveButtonSize, getResponsiveSpacing } from "../../utils/ui/responsive";

export default class MainMenuScene extends Phaser.Scene {
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;
  private aboutButton?: Phaser.GameObjects.Text;
  private settingsButton?: Phaser.GameObjects.Text;
  private themesButton?: Phaser.GameObjects.Text;
  private multiplayerButton?: Phaser.GameObjects.Text;
  private achievementsButton?: Phaser.GameObjects.Text;
  private menuMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    this.setupUI();
    
    // Resume music if it's paused, otherwise play it
    const existingMusic = this.sound.get("menuMusic");
    if (existingMusic) {
        this.menuMusic = existingMusic;
        if (this.menuMusic.isPaused) {
            this.menuMusic.resume();
        }
    } else {
        this.menuMusic = this.sound.add("menuMusic", { loop: true, volume: 0.5 });
        this.menuMusic.play();
    }

    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);
  }

  private setupUI(): void {
    const { width, height } = this.scale;
    
    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main) {
      console.warn("[MainMenuScene] Scene not fully initialized, skipping setupUI");
      return;
    }
    
    // Clear existing UI if recreating
    if (this.backgroundImage) this.backgroundImage.destroy();
    if (this.backgroundRect) this.backgroundRect.destroy();
    if (this.titleText) this.titleText.destroy();
    if (this.startButton) this.startButton.destroy();
    if (this.aboutButton) this.aboutButton.destroy();
    if (this.settingsButton) this.settingsButton.destroy();
    if (this.themesButton) this.themesButton.destroy();
    if (this.multiplayerButton) this.multiplayerButton.destroy();
    if (this.achievementsButton) this.achievementsButton.destroy();
    
    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);

    // Try to load background image, with fallback
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
    } else {
      // Fallback: solid color background if image doesn't load
      this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }

    // Responsive title
    const titleSize = getResponsiveTitleSize(width);
    this.titleText = this.add.text(width / 2, height / 4, "Crypto Beats", {
        fontSize: titleSize,
        color: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    // Responsive button sizing
    const buttonSize = getResponsiveButtonSize(width, height);
    const buttonSpacing = getResponsiveSpacing(80, height);

    this.startButton = this.add.text(width / 2, height / 2, "Start Game", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#008CBA",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.startButton.on("pointerdown", () => {
        this.scene.start("SongSelectionScene");
        if (this.menuMusic) {
          this.menuMusic.pause(); // Pause instead of stopping
        }
    });

    this.aboutButton = this.add.text(width / 2, height / 2 + buttonSpacing, "About Us", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#555",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.aboutButton.on("pointerdown", () => {
        this.scene.start("AboutUsScene");
    });

    // Settings button for audio calibration
    this.settingsButton = this.add.text(width / 2, height / 2 + buttonSpacing * 2, "Audio Calibration", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#666",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.settingsButton.on("pointerdown", () => {
        this.scene.start("AudioCalibrationScene");
    });

    // Color themes button
    this.themesButton = this.add.text(width / 2, height / 2 + buttonSpacing * 3, "Color Themes", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#666",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.themesButton.on("pointerdown", () => {
        this.scene.start("ThemeSelectionScene");
    });

    // Multiplayer button
    this.multiplayerButton = this.add.text(width / 2, height / 2 + buttonSpacing * 4, "Multiplayer", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#00aa00",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.multiplayerButton.on("pointerdown", () => {
        this.scene.start("MultiplayerLobbyScene");
    });

    // Achievements button
    this.achievementsButton = this.add.text(width / 2, height / 2 + buttonSpacing * 5, "Achievements", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#666",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.achievementsButton.on("pointerdown", () => {
        this.scene.start("AchievementsScene");
    });
  }

  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Recreate UI with new dimensions
    this.setupUI();
  }
}

