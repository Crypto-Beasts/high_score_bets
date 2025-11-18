import Phaser from "phaser";
import { getAllAchievements, getAchievementProgress } from "../../utils/game/achievements.js";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveButtonSize,
  getResponsiveCardSize
} from "../../utils/ui/responsive.js";

export default class AchievementsScene extends Phaser.Scene {
  constructor() {
    super({ key: "AchievementsScene" });
  }

  create() {
    const { width, height } = this.scale;
    
    // Set background color
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    
    // Background image if available
    if (this.textures.exists("background")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "background");
      this.backgroundImage.setDisplaySize(width, height);
      this.backgroundImage.setAlpha(0.5);
    }
    
    // Get all achievements
    const achievements = getAllAchievements();
    const progress = getAchievementProgress();
    
    // Title
    const titleSize = getResponsiveTitleSize(width);
    const title = this.add.text(width / 2, getResponsiveSpacing(60, height), "Achievements", {
      fontSize: titleSize,
      fill: "#ffffff",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif"
    }).setOrigin(0.5);
    
    // Progress indicator
    const progressText = this.add.text(width / 2, getResponsiveSpacing(120, height), 
      `Progress: ${progress}% (${achievements.filter(a => a.unlocked).length}/${achievements.length})`, {
      fontSize: getResponsiveFontSize(18, width, 14, 22),
      fill: "#aaaaaa"
    }).setOrigin(0.5);
    
    // Progress bar
    const progressBarBg = this.add.rectangle(
      width / 2,
      getResponsiveSpacing(150, height),
      getResponsiveSpacing(400, width),
      getResponsiveSpacing(20, height),
      0x333333,
      1
    );
    
    const progressBar = this.add.rectangle(
      width / 2 - getResponsiveSpacing(200, width) + (progress / 100) * getResponsiveSpacing(400, width) / 2,
      getResponsiveSpacing(150, height),
      (progress / 100) * getResponsiveSpacing(400, width),
      getResponsiveSpacing(20, height),
      0x00ff00,
      1
    );
    progressBar.setOrigin(0, 0.5);
    
    // Achievement cards
    const cardSize = getResponsiveCardSize(width, height);
    const cardSpacing = getResponsiveSpacing(20, height);
    const startY = getResponsiveSpacing(200, height);
    const cardWidth = getResponsiveSpacing(600, width);
    const cardHeight = getResponsiveSpacing(100, height);
    
    this.achievementCards = [];
    
    achievements.forEach((achievement, index) => {
      const cardY = startY + (cardHeight + cardSpacing) * index;
      
      // Card background (different color if unlocked)
      const cardBg = this.add.rectangle(
        width / 2,
        cardY,
        cardWidth,
        cardHeight,
        achievement.unlocked ? 0x2a4a2a : 0x2a2a3e,
        achievement.unlocked ? 0.9 : 0.7
      );
      
      if (achievement.unlocked) {
        cardBg.setStrokeStyle(2, 0x00ff00);
      }
      
      // Achievement icon
      const iconText = this.add.text(
        width / 2 - getResponsiveSpacing(250, width),
        cardY,
        achievement.icon,
        {
          fontSize: getResponsiveFontSize(48, width, 36, 60),
          alpha: achievement.unlocked ? 1 : 0.3
        }
      ).setOrigin(0.5);
      
      // Achievement name
      const nameText = this.add.text(
        width / 2 - getResponsiveSpacing(100, width),
        cardY - getResponsiveSpacing(20, height),
        achievement.name,
        {
          fontSize: getResponsiveFontSize(22, width, 18, 26),
          fill: achievement.unlocked ? "#ffffff" : "#888888",
          fontStyle: "bold",
          fontFamily: "'Orbitron', 'Arial', sans-serif"
        }
      ).setOrigin(0, 0.5);
      
      // Achievement description
      const descText = this.add.text(
        width / 2 - getResponsiveSpacing(100, width),
        cardY + getResponsiveSpacing(15, height),
        achievement.description,
        {
          fontSize: getResponsiveFontSize(16, width, 12, 20),
          fill: achievement.unlocked ? "#aaaaaa" : "#555555",
          wordWrap: { width: cardWidth - getResponsiveSpacing(200, width) }
        }
      ).setOrigin(0, 0.5);
      
      // Locked/Unlocked indicator
      const statusText = this.add.text(
        width / 2 + getResponsiveSpacing(250, width),
        cardY,
        achievement.unlocked ? "✓" : "🔒",
        {
          fontSize: getResponsiveFontSize(32, width, 24, 40),
          fill: achievement.unlocked ? "#00ff00" : "#666666"
        }
      ).setOrigin(0.5);
      
      // Unlock date if available
      if (achievement.unlocked && achievement.unlockedAt) {
        const date = new Date(achievement.unlockedAt);
        const dateText = this.add.text(
          width / 2 + getResponsiveSpacing(250, width),
          cardY + getResponsiveSpacing(25, height),
          date.toLocaleDateString(),
          {
            fontSize: getResponsiveFontSize(12, width, 10, 14),
            fill: "#666666"
          }
        ).setOrigin(0.5);
        this.achievementCards.push({ dateText });
      }
      
      this.achievementCards.push({
        bg: cardBg,
        icon: iconText,
        name: nameText,
        desc: descText,
        status: statusText
      });
    });
    
    // Back button
    const buttonSize = getResponsiveButtonSize(width, height);
    const backY = startY + achievements.length * (cardHeight + cardSpacing) + getResponsiveSpacing(40, height);
    const backButton = this.add.text(width / 2, backY, "Back to Menu", {
      fontSize: buttonSize.fontSize,
      fill: "#ffffff",
      backgroundColor: "#008CBA",
      padding: buttonSize.padding
    }).setOrigin(0.5).setInteractive();
    
    backButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
    
    // Hover effects
    backButton.on("pointerover", () => backButton.setAlpha(0.8));
    backButton.on("pointerout", () => backButton.setAlpha(1));
    
    // Store references
    this.title = title;
    this.progressText = progressText;
    this.progressBarBg = progressBarBg;
    this.progressBar = progressBar;
    this.backButton = backButton;
  }
  
  handleResize(gameSize) {
    // Recreate UI on resize
    this.create();
  }
}

