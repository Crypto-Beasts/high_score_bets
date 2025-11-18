import Phaser from "phaser";
import { getAudioOffset, setAudioOffset, resetAudioOffset } from "../../utils/audio/audioSync";
import { getResponsiveTitleSize, getResponsiveButtonSize, getResponsiveSpacing, getResponsiveFontSize } from "../../utils/ui/responsive";

export default class AudioCalibrationScene extends Phaser.Scene {
  private backgroundImage?: Phaser.GameObjects.Image;
  private title?: Phaser.GameObjects.Text;
  private instructions?: Phaser.GameObjects.Text;
  private offsetLabel?: Phaser.GameObjects.Text;
  private offsetValueText?: Phaser.GameObjects.Text;
  private decrease10?: Phaser.GameObjects.Text;
  private decrease1?: Phaser.GameObjects.Text;
  private increase1?: Phaser.GameObjects.Text;
  private increase10?: Phaser.GameObjects.Text;
  private resetButton?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "AudioCalibrationScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    
    // Set background color
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Background image if available
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
      this.backgroundImage.setAlpha(0.5);
    }
    
    // Get current offset
    let currentOffset = getAudioOffset();
    
    // Title
    const titleSize = getResponsiveTitleSize(width);
    const title = this.add.text(width / 2, getResponsiveSpacing(80, height), "Audio Calibration", {
      fontSize: titleSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.title = title;
    
    // Instructions
    const bodySize = getResponsiveFontSize(18, width, 14, 22);
    const instructions = this.add.text(width / 2, getResponsiveSpacing(180, height), 
      "Adjust the audio offset to sync notes with music.\n" +
      "If notes appear too early, increase the offset.\n" +
      "If notes appear too late, decrease the offset.", {
      fontSize: bodySize,
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);
    this.instructions = instructions;
    
    // Current offset display
    const offsetY = getResponsiveSpacing(280, height);
    const offsetLabel = this.add.text(width / 2, offsetY, "Current Offset:", {
      fontSize: bodySize,
      color: "#ffffff"
    }).setOrigin(0.5);
    this.offsetLabel = offsetLabel;
    
    this.offsetValueText = this.add.text(width / 2, offsetY + getResponsiveSpacing(40, height), 
      `${currentOffset} ms`, {
      fontSize: getResponsiveFontSize(32, width, 24, 40),
      color: "#00ff00",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Adjustment buttons
    const buttonSize = getResponsiveButtonSize(width, height);
    const buttonSpacing = getResponsiveSpacing(60, width);
    const buttonY = offsetY + getResponsiveSpacing(120, height);
    
    // Decrease buttons
    const decrease10 = this.add.text(width / 2 - buttonSpacing * 2, buttonY, "-10ms", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#ff4444",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.decrease10 = decrease10;
    
    const decrease1 = this.add.text(width / 2 - buttonSpacing, buttonY, "-1ms", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#ff6666",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.decrease1 = decrease1;
    
    // Increase buttons
    const increase1 = this.add.text(width / 2 + buttonSpacing, buttonY, "+1ms", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#66ff66",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.increase1 = increase1;
    
    const increase10 = this.add.text(width / 2 + buttonSpacing * 2, buttonY, "+10ms", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#44ff44",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.increase10 = increase10;
    
    // Reset button
    const resetY = buttonY + getResponsiveSpacing(80, height);
    const resetButton = this.add.text(width / 2, resetY, "Reset to Default (0ms)", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#666666",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.resetButton = resetButton;
    
    // Back button
    const backY = resetY + getResponsiveSpacing(80, height);
    const backButton = this.add.text(width / 2, backY, "Back to Menu", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#008CBA",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.backButton = backButton;
    
    // Button handlers
    const updateOffset = (delta: number) => {
      currentOffset = setAudioOffset(currentOffset + delta);
      if (this.offsetValueText) {
        this.offsetValueText.setText(`${currentOffset} ms`);
        
        // Visual feedback
        this.offsetValueText.setColor(currentOffset === 0 ? "#00ff00" : 
                                     currentOffset > 0 ? "#44ff44" : "#ff4444");
      }
    };
    
    decrease10.on("pointerdown", () => updateOffset(-10));
    decrease1.on("pointerdown", () => updateOffset(-1));
    increase1.on("pointerdown", () => updateOffset(1));
    increase10.on("pointerdown", () => updateOffset(10));
    
    resetButton.on("pointerdown", () => {
      resetAudioOffset();
      currentOffset = 0;
      if (this.offsetValueText) {
        this.offsetValueText.setText("0 ms");
        this.offsetValueText.setColor("#00ff00");
      }
    });
    
    backButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
    
    // Hover effects
    [decrease10, decrease1, increase1, increase10, resetButton, backButton].forEach(button => {
      button.on("pointerover", () => button.setAlpha(0.8));
      button.on("pointerout", () => button.setAlpha(1));
    });
  }
  
  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Recreate UI on resize
    this.create();
  }
}

