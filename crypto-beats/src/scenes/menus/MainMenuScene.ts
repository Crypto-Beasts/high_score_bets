import Phaser from "phaser";
import { getResponsiveTitleSize, getResponsiveButtonSize, getResponsiveSpacing } from "../../utils/ui/responsive";

export default class MainMenuScene extends Phaser.Scene {
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundRect?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private startButton?: Phaser.GameObjects.Text;
  private singlePlayerButton?: Phaser.GameObjects.Text;
  private multiplayerButton?: Phaser.GameObjects.Text;
  private optionsButton?: Phaser.GameObjects.Text;
  private aboutButton?: Phaser.GameObjects.Text;
  private settingsButton?: Phaser.GameObjects.Text;
  private themesButton?: Phaser.GameObjects.Text;
  private testDebriefButton?: Phaser.GameObjects.Text;
  private menuMusic?: Phaser.Sound.BaseSound;
  private optionsExpanded: boolean = false;
  private gameModeExpanded: boolean = false;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  /** Wire up the shared scale/background-color hover animation for a button. */
  private addHoverEffect(
    button: Phaser.GameObjects.Text,
    baseColor: string,
    hoverColor: string
  ): void {
    button.on("pointerover", () => {
      this.tweens.killTweensOf(button);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        backgroundColor: hoverColor,
        duration: 150,
        ease: "Power2",
      });
    });

    button.on("pointerout", () => {
      this.tweens.killTweensOf(button);
      this.tweens.add({
        targets: button,
        scaleX: 1.0,
        scaleY: 1.0,
        backgroundColor: baseColor,
        duration: 150,
        ease: "Power2",
      });
    });
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
    if (this.singlePlayerButton) this.singlePlayerButton.destroy();
    if (this.multiplayerButton) this.multiplayerButton.destroy();
    if (this.optionsButton) this.optionsButton.destroy();
    if (this.aboutButton) this.aboutButton.destroy();
    if (this.settingsButton) this.settingsButton.destroy();
    if (this.themesButton) this.themesButton.destroy();
    if (this.testDebriefButton) this.testDebriefButton.destroy();
    
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

    // Responsive title - much bigger logo
    const titleSize = getResponsiveTitleSize(width);
    // Multiply the size to make it much bigger
    const logoSize = titleSize.replace('px', '');
    const biggerLogoSize = `${Math.round(parseInt(logoSize) * 2.5)}px`;
    this.titleText = this.add.text(width / 2, height / 4, "Crypto Beats", {
        fontSize: biggerLogoSize,
        color: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    // Responsive button sizing
    const buttonSize = getResponsiveButtonSize(width, height);
    const buttonSpacing = getResponsiveSpacing(80, height);

    // Start Game button (expandable to show game modes)
    this.startButton = this.add.text(width / 2, height / 2, "Start Game", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#008CBA",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.startButton.on("pointerdown", () => {
        this.toggleGameMode();
    });

    this.addHoverEffect(this.startButton, "#008CBA", "#00aadd");

    // Game mode sub-menu buttons (initially hidden)
    // Single Player
    this.singlePlayerButton = this.add.text(width / 2, height / 2 + buttonSpacing, "Single Player", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#0077aa",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive().setVisible(false);

    this.singlePlayerButton.on("pointerdown", () => {
        this.scene.start("SongSelectionScene");
        if (this.menuMusic) {
          this.menuMusic.pause(); // Pause instead of stopping
        }
    });

    this.addHoverEffect(this.singlePlayerButton, "#0077aa", "#0088cc");

    // Multiplayer
    this.multiplayerButton = this.add.text(width / 2, height / 2 + buttonSpacing * 2, "Multiplayer", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#00aa00",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive().setVisible(false);

    this.multiplayerButton.on("pointerdown", () => {
        this.scene.start("MultiplayerLobbyScene");
        if (this.menuMusic) {
          this.menuMusic.pause(); // Pause instead of stopping
        }
    });

    this.addHoverEffect(this.multiplayerButton, "#00aa00", "#00cc00");

    // Options button (expandable section) - placed below Start Game
    this.optionsButton = this.add.text(width / 2, height / 2 + buttonSpacing, "Options", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#555",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.optionsButton.on("pointerdown", () => {
        this.toggleOptions();
    });

    this.addHoverEffect(this.optionsButton, "#555", "#666666");

    // Options sub-menu buttons (initially hidden)
    // About Us
    this.aboutButton = this.add.text(width / 2, height / 2 + buttonSpacing * 2, "About Us", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#444",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive().setVisible(false);

    this.aboutButton.on("pointerdown", () => {
        this.scene.start("AboutUsScene");
    });

    this.addHoverEffect(this.aboutButton, "#444", "#555555");

    // Audio Calibration
    this.settingsButton = this.add.text(width / 2, height / 2 + buttonSpacing * 3, "Audio Calibration", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#444",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive().setVisible(false);

    this.settingsButton.on("pointerdown", () => {
        this.scene.start("AudioCalibrationScene");
    });

    this.addHoverEffect(this.settingsButton, "#444", "#555555");

    // Color Themes
    this.themesButton = this.add.text(width / 2, height / 2 + buttonSpacing * 4, "Color Themes", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#444",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive().setVisible(false);

    this.themesButton.on("pointerdown", () => {
        this.scene.start("ThemeSelectionScene");
    });

    this.addHoverEffect(this.themesButton, "#444", "#555555");

    // Test Debrief (Development tool - in Options section)
    this.testDebriefButton = this.add.text(width / 2, height / 2 + buttonSpacing * 5, "Test Debrief", {
        fontSize: buttonSize.fontSize,
        color: "#ffffff",
        backgroundColor: "#8844aa",
        padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive().setVisible(false);

    this.testDebriefButton.on("pointerdown", () => {
        // Launch DebriefScene with sample data for testing layout
        this.scene.start("DebriefScene", {
            score: 125000,
            totalNotes: 150,
            notesHit: 142,
            longestStreak: 45,
            averageCombo: 28,
            perfectCount: 120,
            goodCount: 22,
            missCount: 8,
            failed: false,
            song: "Aguado_Menuet_Aminor",
            difficulty: "normal"
        });
    });

    this.addHoverEffect(this.testDebriefButton, "#8844aa", "#9966bb");

    // Adjust positions if sections are expanded
    if (this.gameModeExpanded) {
        this.showGameMode();
    }
    if (this.optionsExpanded) {
        this.showOptions();
    }
  }

  private toggleGameMode(): void {
    this.gameModeExpanded = !this.gameModeExpanded;
    if (this.gameModeExpanded) {
        this.showGameMode();
    } else {
        this.hideGameMode();
    }
  }

  private showGameMode(): void {
    if (this.singlePlayerButton) this.singlePlayerButton.setVisible(true);
    if (this.multiplayerButton) this.multiplayerButton.setVisible(true);
    
    // Adjust positions of options button based on game mode expansion
    const buttonSpacing = getResponsiveSpacing(80, this.scale.height);
    const optionsOffset = 3; // Options is at position 3 when game mode is expanded
    
    if (this.optionsButton) {
        this.optionsButton.setY(this.scale.height / 2 + buttonSpacing * optionsOffset);
    }
    
    // Adjust options sub-buttons if expanded
    if (this.optionsExpanded) {
        this.showOptions();
    }
  }

  private hideGameMode(): void {
    if (this.singlePlayerButton) this.singlePlayerButton.setVisible(false);
    if (this.multiplayerButton) this.multiplayerButton.setVisible(false);
    
    // Reset positions of options button
    const buttonSpacing = getResponsiveSpacing(80, this.scale.height);
    
    if (this.optionsButton) {
        this.optionsButton.setY(this.scale.height / 2 + buttonSpacing);
    }
    
    // Adjust options sub-buttons if expanded
    if (this.optionsExpanded) {
        this.showOptions();
    }
  }

  private toggleOptions(): void {
    this.optionsExpanded = !this.optionsExpanded;
    if (this.optionsExpanded) {
        this.showOptions();
    } else {
        this.hideOptions();
    }
  }

  private showOptions(): void {
    if (this.aboutButton) this.aboutButton.setVisible(true);
    if (this.settingsButton) this.settingsButton.setVisible(true);
    if (this.themesButton) this.themesButton.setVisible(true);
    if (this.testDebriefButton) this.testDebriefButton.setVisible(true);
    
    // Options sub-buttons position based on Options button position
    const buttonSpacing = getResponsiveSpacing(80, this.scale.height);
    const optionsBaseOffset = this.gameModeExpanded ? 3 : 1; // Options button Y offset
    
    if (this.aboutButton) {
        this.aboutButton.setY(this.scale.height / 2 + buttonSpacing * (optionsBaseOffset + 1));
    }
    if (this.settingsButton) {
        this.settingsButton.setY(this.scale.height / 2 + buttonSpacing * (optionsBaseOffset + 2));
    }
    if (this.themesButton) {
        this.themesButton.setY(this.scale.height / 2 + buttonSpacing * (optionsBaseOffset + 3));
    }
    if (this.testDebriefButton) {
        this.testDebriefButton.setY(this.scale.height / 2 + buttonSpacing * (optionsBaseOffset + 4));
    }
  }

  private hideOptions(): void {
    if (this.aboutButton) this.aboutButton.setVisible(false);
    if (this.settingsButton) this.settingsButton.setVisible(false);
    if (this.themesButton) this.themesButton.setVisible(false);
    if (this.testDebriefButton) this.testDebriefButton.setVisible(false);
  }

  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Recreate UI with new dimensions
    this.setupUI();
  }
}

