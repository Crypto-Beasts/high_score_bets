import Phaser from "phaser";
import { getAllThemes, getCurrentTheme, setTheme, ThemeWithKey } from "../../utils/ui/colorThemes";
import { getResponsiveTitleSize, getResponsiveButtonSize, getResponsiveSpacing, getResponsiveFontSize, getResponsiveCardSize } from "../../utils/ui/responsive";

interface ThemeCard {
  bg: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
  theme: ThemeWithKey;
  checkmark?: Phaser.GameObjects.Text;
}

export default class ThemeSelectionScene extends Phaser.Scene {
  private backgroundImage?: Phaser.GameObjects.Image;
  private themeCards: ThemeCard[] = [];
  private title?: Phaser.GameObjects.Text;
  private instructions?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "ThemeSelectionScene" });
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
    
    // Get current theme
    const currentThemeKey = getCurrentTheme();
    const themes = getAllThemes();
    
    // Title
    const titleSize = getResponsiveTitleSize(width);
    const title = this.add.text(width / 2, getResponsiveSpacing(60, height), "Color Themes", {
      fontSize: titleSize,
      color: "#ffffff",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif"
    }).setOrigin(0.5);
    this.title = title;
    
    // Instructions
    const bodySize = getResponsiveFontSize(16, width, 12, 20);
    const instructions = this.add.text(width / 2, getResponsiveSpacing(120, height), 
      "Select a color theme for notes and gameplay", {
      fontSize: bodySize,
      color: "#aaaaaa",
      align: "center"
    }).setOrigin(0.5);
    this.instructions = instructions;
    
    // Theme cards
    const cardSize = getResponsiveCardSize(width, height);
    const cardSpacing = getResponsiveSpacing(20, height);
    const startY = getResponsiveSpacing(180, height);
    const cardsPerRow = 2;
    const cardWidth = (width - cardSpacing * (cardsPerRow + 1)) / cardsPerRow;
    const cardHeight = getResponsiveSpacing(120, height);
    
    this.themeCards = [];
    
    themes.forEach((theme, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const cardX = cardSpacing + (cardWidth + cardSpacing) * col + cardWidth / 2;
      const cardY = startY + (cardHeight + cardSpacing) * row;
      
      const isSelected = theme.key === currentThemeKey;
      
      // Card background
      const cardBg = this.add.rectangle(cardX, cardY, cardWidth - 20, cardHeight, 
        isSelected ? 0x00aa00 : 0x2a2a3e, isSelected ? 0.9 : 0.8);
      cardBg.setInteractive();
      
      // Theme name
      const nameText = this.add.text(cardX, cardY - 30, theme.name, {
        fontSize: getResponsiveFontSize(20, width, 16, 24),
        color: "#ffffff",
        fontStyle: "bold",
        fontFamily: "'Orbitron', 'Arial', sans-serif"
      }).setOrigin(0.5);
      
      // Theme description
      const descText = this.add.text(cardX, cardY, theme.description, {
        fontSize: getResponsiveFontSize(14, width, 10, 18),
        color: "#cccccc",
        align: "center",
        wordWrap: { width: cardWidth - 40 }
      }).setOrigin(0.5);
      
      // Color preview circles
      const previewY = cardY + 35;
      const previewSpacing = 15;
      const previewStartX = cardX - (theme.colors.trail.length * previewSpacing) / 2;
      
      theme.colors.trail.forEach((color, i) => {
        this.add.circle(previewStartX + i * previewSpacing, previewY, 8, color, 1);
      });
      
      // Selected indicator
      let checkmark: Phaser.GameObjects.Text | undefined;
      if (isSelected) {
        checkmark = this.add.text(cardX + cardWidth / 2 - 30, cardY - cardHeight / 2 + 20, "✓", {
          fontSize: getResponsiveFontSize(24, width, 18, 30),
          color: "#00ff00",
          fontStyle: "bold"
        }).setOrigin(0.5);
      }
      
      // Click handler
      cardBg.on("pointerdown", () => {
        setTheme(theme.key);
        this.scene.restart(); // Restart to show updated selection
      });
      
      // Hover effects
      cardBg.on("pointerover", () => {
        if (!isSelected) {
          cardBg.setFillStyle(0x3a3a4e, 0.9);
        }
      });
      
      cardBg.on("pointerout", () => {
        if (!isSelected) {
          cardBg.setFillStyle(0x2a2a3e, 0.8);
        }
      });
      
      this.themeCards.push({
        bg: cardBg,
        name: nameText,
        desc: descText,
        theme: theme,
        checkmark: checkmark
      });
    });
    
    // Back button
    const buttonSize = getResponsiveButtonSize(width, height);
    const backY = startY + Math.ceil(themes.length / cardsPerRow) * (cardHeight + cardSpacing) + getResponsiveSpacing(40, height);
    const backButton = this.add.text(width / 2, backY, "Back to Menu", {
      fontSize: buttonSize.fontSize,
      color: "#ffffff",
      backgroundColor: "#008CBA",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    this.backButton = backButton;
    
    backButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
    
    // Hover effects
    backButton.on("pointerover", () => backButton.setAlpha(0.8));
    backButton.on("pointerout", () => backButton.setAlpha(1));
  }
  
  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Recreate UI on resize
    this.create();
  }
}

