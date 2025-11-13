import Phaser from "phaser";
import { 
  getResponsiveTitleSize, 
  getResponsiveBodySize,
  getResponsiveButtonSize,
  getResponsiveSpacing,
  getResponsiveFontSize
} from "../utils/responsive.js";

export default class AboutUsScene extends Phaser.Scene {
  constructor() {
    super({ key: "AboutUsScene" });
  }

  create() {
    this.setupUI();
    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);
  }

  setupUI() {
    const { width, height } = this.scale;

    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main) {
      console.warn("[AboutUsScene] Scene not fully initialized, skipping setupUI");
      return;
    }

    // Clear existing UI if recreating
    if (this.backgroundImage) this.backgroundImage.destroy();
    if (this.backgroundRect) this.backgroundRect.destroy();
    if (this.titleText) this.titleText.destroy();
    if (this.text1) this.text1.destroy();
    if (this.text2) this.text2.destroy();
    if (this.backButton) this.backButton.destroy();

    // Set background color as fallback
    this.cameras.main.setBackgroundColor(0x000000);
    
    // Background fills screen
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
    } else {
      // Fallback: solid color background if image doesn't load
      this.backgroundRect = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    }

    // Responsive sizing
    const titleSize = getResponsiveTitleSize(width);
    const bodySize = getResponsiveBodySize(width);
    const smallSize = getResponsiveFontSize(20, width, 16, 24);
    const buttonSize = getResponsiveButtonSize(width, height);
    const titleY = getResponsiveSpacing(height / 6, height);
    const textY1 = height / 2 - getResponsiveSpacing(50, height);
    const textY2 = height / 2 + getResponsiveSpacing(20, height);
    const backButtonY = height - getResponsiveSpacing(100, height);

    // Scene Title
    this.titleText = this.add.text(width / 2, titleY, "About Us", {
      fontSize: titleSize,
      fill: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // About Us Text
    this.text1 = this.add.text(width / 2, textY1, "Crypto Beats is a rhythm game where you play along with music!", {
      fontSize: bodySize,
      fill: "#ffffff",
      align: "center",
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

    this.text2 = this.add.text(width / 2, textY2, "Developed by passionate game creators.", {
      fontSize: smallSize,
      fill: "#ffffff",
      align: "center",
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

    // Back Button
    this.backButton = this.add.text(width / 2, backButtonY, "Back", {
      fontSize: buttonSize.fontSize,
      fill: "#ffffff",
      backgroundColor: "#555",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();

    this.backButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
  }

  handleResize(gameSize) {
    // Recreate UI with new dimensions
    this.setupUI();
  }
}
