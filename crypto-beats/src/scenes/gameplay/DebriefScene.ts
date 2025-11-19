import Phaser from "phaser";
import { getSongById, getAllSongs } from "../../config/songs";
import { DIFFICULTY_CONFIG } from "../../utils/game/difficultyManager";
import { 
  getResponsiveTitleSize, 
  getResponsiveSubtitleSize, 
  getResponsiveBodySize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveButtonSize
} from "../../utils/ui/responsive";
import { 
  checkAchievements, 
  recordSongCompletion, 
  getAchievement,
  getAllAchievements 
} from "../../utils/game/achievements";

interface DebriefData {
  score?: number;
  totalNotes?: number;
  notesHit?: number;
  longestStreak?: number;
  averageCombo?: number;
  perfectCount?: number;
  goodCount?: number;
  missCount?: number;
  failed?: boolean;
  song?: string;
  difficulty?: string;
}

export default class DebriefScene extends Phaser.Scene {
  private score: number = 0;
  private totalNotes: number = 1;
  private notesHit: number = 0;
  private longestStreak: number = 0;
  private averageCombo: number = 0;
  private perfectCount: number = 0;
  private goodCount: number = 0;
  private missCount: number = 0;
  private failed: boolean = false;
  private song: string = "Aguado_Menuet_Aminor";
  private difficulty: string = "normal";
  private newlyUnlockedAchievements: string[] = [];
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundRect?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "DebriefScene" });
  }

  init(data: DebriefData): void {
    this.score = data.score || 0;
    this.totalNotes = data.totalNotes || 1; // Avoid division by zero
    this.notesHit = data.notesHit || 0;
    this.longestStreak = data.longestStreak || 0;
    this.averageCombo = data.averageCombo || 0;
    this.perfectCount = data.perfectCount || 0;
    this.goodCount = data.goodCount || 0;
    this.missCount = data.missCount || 0;
    this.failed = data.failed || false;
    this.song = data.song || "Aguado_Menuet_Aminor";
    this.difficulty = data.difficulty || "normal";
  }

  create(): void {
    // Record song completion for achievements
    const percentageHit = parseFloat(((this.notesHit / this.totalNotes) * 100).toFixed(1));
    const grade = this.calculateGrade(percentageHit);
    
    recordSongCompletion(
      this.song,
      this.difficulty,
      percentageHit,
      grade,
      this.longestStreak
    );
    
    // Check for achievements
    const totalSongs = getAllSongs().length;
    const gameData = {
      accuracy: percentageHit,
      grade: grade,
      difficulty: this.difficulty,
      longestStreak: this.longestStreak,
      failed: this.failed,
      song: this.song
    };
    
    const newlyUnlocked = checkAchievements(gameData, totalSongs);
    
    // Store newly unlocked achievements for notification
    this.newlyUnlockedAchievements = newlyUnlocked;
    
    this.setupUI();
    
    // Show achievement notifications after a short delay
    if (newlyUnlocked.length > 0) {
      this.time.delayedCall(1000, () => {
        this.showAchievementNotifications(newlyUnlocked);
      });
    }
    
    // Listen for resize events
    this.scale.on('resize', this.handleResize, this);
  }

  private setupUI(): void {
    const { width, height } = this.scale;
    
    // Safety check: ensure scene is fully initialized
    if (!this.cameras || !this.cameras.main) {
      console.warn("[DebriefScene] Scene not fully initialized, skipping setupUI");
      return;
    }
    
    // Clear existing UI if recreating - destroy all children except background
    const childrenToDestroy: Phaser.GameObjects.GameObject[] = [];
    this.children.list.forEach(child => {
      if (child !== this.backgroundImage && child !== this.backgroundRect) {
        childrenToDestroy.push(child);
      }
    });
    childrenToDestroy.forEach(child => child.destroy());
    
    if (this.backgroundImage) this.backgroundImage.destroy();
    if (this.backgroundRect) this.backgroundRect.destroy();
    
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

    const percentageHit = ((this.notesHit / this.totalNotes) * 100).toFixed(1);
    const grade = this.calculateGrade(parseFloat(percentageHit));
    const stars = this.calculateStars(parseFloat(percentageHit));

    // Responsive sizing
    const gradeSize = getResponsiveFontSize(96, width, 64, 128); // Made larger since it's the hero element
    const subtitleSize = getResponsiveSubtitleSize(width);
    const bodySize = getResponsiveBodySize(width);
    const smallSize = getResponsiveFontSize(18, width, 14, 22); // For general small text
    const sectionLabelSize = getResponsiveFontSize(26, width, 22, 30); // Larger for section titles
    const gradeY = getResponsiveSpacing(100, height); // More space from top
    const scoreY = gradeY + getResponsiveSpacing(120, height); // Positioned below large grade

    // Grade Display (Large, Hero Element) - Animated entrance
    const gradeText = this.add.text(width / 2, gradeY, grade, {
      fontSize: gradeSize,
      color: this.getGradeColor(grade),
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: Math.max(4, Math.round(8 * (width / 1920)))
    }).setOrigin(0.5);
    
    // Animate grade appearance
    gradeText.setAlpha(0);
    gradeText.setScale(0.5);
    this.tweens.add({
      targets: gradeText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: "Back.easeOut"
    });

    // Score Section - positioned below grade with animation (larger font)
    const scoreSize = getResponsiveFontSize(48, width, 36, 60); // Bigger than subtitleSize
    const scoreText = this.add.text(width / 2, scoreY, `Score: 0`, {
      fontSize: scoreSize,
      color: "#000000",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Animate score text appearance
    scoreText.setAlpha(0);
    this.tweens.add({
      targets: scoreText,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: "Power2",
      onComplete: () => {
        // Animate score counting up after text appears
        this.tweens.addCounter({
          from: 0,
          to: this.score,
          duration: 1000,
          ease: "Power1",
          onUpdate: (tween) => {
            const value = Math.floor(tween.getValue());
            scoreText.setText(`Score: ${value.toLocaleString()}`);
          }
        });
      }
    });

    // Accuracy with percentage bar
    const accuracyY = scoreY + getResponsiveSpacing(50, height);
    const accuracyLabelX = width / 2 - getResponsiveSpacing(120, width);
    const accuracyText = this.add.text(accuracyLabelX, accuracyY, `Accuracy: 0%`, {
      fontSize: bodySize,
      color: "#000000"
    }).setOrigin(0.5, 0.5);
    
    // Accuracy bar - responsive with animation, narrower than stats container
    const statsContainerWidth = getResponsiveSpacing(320, width);
    const barWidth = getResponsiveSpacing(200, width); // Much narrower than container
    const barHeight = getResponsiveSpacing(20, height);
    const barX = width / 2 + getResponsiveSpacing(50, width); // Positioned to the right of text, moved left further
    const accuracyBarBg = this.add.rectangle(barX, accuracyY, barWidth, barHeight, 0x333333, 1);
    const accuracyPercent = parseFloat(percentageHit);
    const accuracyBar = this.add.rectangle(
      barX - barWidth / 2,
      accuracyY,
      0, // Start at 0 width
      barHeight,
      this.getAccuracyColor(accuracyPercent),
      1
    );
    accuracyBar.setOrigin(0, 0.5);
    
    // Animate accuracy text and bar appearance
    accuracyText.setAlpha(0);
    accuracyBarBg.setAlpha(0);
    accuracyBar.setAlpha(0);
    this.tweens.add({
      targets: [accuracyText, accuracyBarBg, accuracyBar],
      alpha: 1,
      duration: 400,
      delay: 600,
      ease: "Power2",
      onComplete: () => {
        // Calculate the left edge once (where bar starts and stays)
        const barLeftEdge = barX - barWidth / 2;
        
        // Animate accuracy bar and text counting up
        this.tweens.addCounter({
          from: 0,
          to: accuracyPercent,
          duration: 800,
          ease: "Power2",
          onUpdate: (tween) => {
            const value = tween.getValue();
            accuracyText.setText(`Accuracy: ${value.toFixed(1)}%`);
            
            // Update bar width only - x position stays constant at left edge
            const barProgress = value / 100;
            accuracyBar.width = barWidth * barProgress;
            accuracyBar.x = barLeftEdge; // Keep x position constant
          },
          onComplete: () => {
            // Ensure final values are set exactly after animation completes
            accuracyText.setText(`Accuracy: ${accuracyPercent.toFixed(1)}%`);
            const finalProgress = accuracyPercent / 100;
            accuracyBar.width = barWidth * finalProgress;
            accuracyBar.x = barLeftEdge; // Ensure x position is correct
          }
        });
      }
    });

    // Stars - display actual star symbols, positioned below accuracy
    const starsY = accuracyY + getResponsiveSpacing(50, height);
    const starsSize = getResponsiveFontSize(36, width, 28, 48);
    // Create star display: filled stars for achieved, empty star for not achieved
    const starDisplay = "⭐".repeat(stars) + "☆".repeat(5 - stars);
    const starsText = this.add.text(width / 2, starsY, starDisplay, {
      fontSize: starsSize,
      color: "#ffcc00",
      fontStyle: "bold"
    }).setOrigin(0.5);
    
    // Animate stars appearance
    starsText.setAlpha(0);
    this.tweens.add({
      targets: starsText,
      alpha: 1,
      duration: 400,
      delay: 1200,
      ease: "Power2"
    });

    // Statistics Grid - spacious layout, width matches accuracy bar
    const statsY = starsY + getResponsiveSpacing(40, height); // Positioned below stars
    // Content offset - move contents down a bit from container top
    const contentOffsetY = getResponsiveSpacing(15, height);
    // Use same container width as defined earlier for accuracy bar
    // statsContainerWidth already defined above
    const statsLeftX = width / 2 - statsContainerWidth / 2 + getResponsiveSpacing(30, width); // Left edge with padding
    const statsRightX = width / 2 + statsContainerWidth / 2 - getResponsiveSpacing(30, width); // Right edge with padding
    const statsSpacing = getResponsiveSpacing(38, height); // Increased from 20 to 38 for more space
    const statValueSize = getResponsiveFontSize(27, width, 22, 32); // Increased from 20 to 27 for better visibility

    // Stats container background for visual grouping - larger with rounded corners
    const statsContainerHeight = statsSpacing * 4 + getResponsiveSpacing(30, height); // Increased from 3 rows to 4 rows + 30
    // Center container on the content (accounting for contentOffsetY)
    const containerCenterX = width / 2;
    const containerCenterY = statsY + contentOffsetY + statsSpacing * 1.5 + getResponsiveSpacing(15, height);
    const cornerRadius = getResponsiveSpacing(12, width); // Rounded corners
    
    // Create rounded rectangle using graphics for rounded corners
    const statsContainerBg = this.add.graphics();
    statsContainerBg.fillStyle(0x000000, 0.3);
    statsContainerBg.fillRoundedRect(
      containerCenterX - statsContainerWidth / 2,
      containerCenterY - statsContainerHeight / 2,
      statsContainerWidth,
      statsContainerHeight,
      cornerRadius
    );
    statsContainerBg.lineStyle(2, 0x444444, 1);
    statsContainerBg.strokeRoundedRect(
      containerCenterX - statsContainerWidth / 2,
      containerCenterY - statsContainerHeight / 2,
      statsContainerWidth,
      statsContainerHeight,
      cornerRadius
    );
    
    // Add subtle glow to container border (matching grade color)
    const gradeColor = this.getGradeColor(grade);
    const containerGlow = this.add.graphics();
    containerGlow.lineStyle(1, Phaser.Display.Color.HexStringToColor(gradeColor).color, 0.5);
    containerGlow.strokeRoundedRect(
      containerCenterX - statsContainerWidth / 2 - 1,
      containerCenterY - statsContainerHeight / 2 - 1,
      statsContainerWidth + 2,
      statsContainerHeight + 2,
      cornerRadius + 1
    );
    containerGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Animate stats container appearance
    statsContainerBg.setAlpha(0);
    containerGlow.setAlpha(0);
    this.tweens.add({
      targets: [statsContainerBg, containerGlow],
      alpha: 1,
      duration: 400,
      delay: 1400,
      ease: "Power2"
    });

    // Left column - Hit Breakdown (4 items: Label, Perfect, Good, Miss)
    const hitBreakdownLabel = this.add.text(statsLeftX, statsY + contentOffsetY, "Hit Breakdown:", {
      fontSize: sectionLabelSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);
    
    const perfectText = this.add.text(statsLeftX, statsY + contentOffsetY + statsSpacing, `Perfect: ${this.perfectCount}`, {
      fontSize: statValueSize,
      color: "#00ff00"
    }).setOrigin(0, 0.5);

    const goodText = this.add.text(statsLeftX, statsY + contentOffsetY + statsSpacing * 2, `Good: ${this.goodCount}`, {
      fontSize: statValueSize,
      color: "#ffff00"
    }).setOrigin(0, 0.5);

    const missText = this.add.text(statsLeftX, statsY + contentOffsetY + statsSpacing * 3, `Miss: ${this.missCount}`, {
      fontSize: statValueSize,
      color: "#ff0000"
    }).setOrigin(0, 0.5);
    
    // Animate left column stats
    [hitBreakdownLabel, perfectText, goodText, missText].forEach((text, index) => {
      text.setAlpha(0);
      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 300,
        delay: 1600 + (index * 100),
        ease: "Power2"
      });
    });

    // Right column - Combo Stats (4 items: Label, Longest, Average, Total)
    const comboStatsLabel = this.add.text(statsRightX, statsY + contentOffsetY, "Combo Stats:", {
      fontSize: sectionLabelSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(1, 0.5);

    const longestText = this.add.text(statsRightX, statsY + contentOffsetY + statsSpacing, `Longest: ${this.longestStreak}x`, {
      fontSize: statValueSize,
      color: "#ffffff"
    }).setOrigin(1, 0.5);

    const averageText = this.add.text(statsRightX, statsY + contentOffsetY + statsSpacing * 2, `Average: ${this.averageCombo}x`, {
      fontSize: statValueSize,
      color: "#ffffff"
    }).setOrigin(1, 0.5);

    const totalText = this.add.text(statsRightX, statsY + contentOffsetY + statsSpacing * 3, `Total Notes: ${this.totalNotes}`, {
      fontSize: statValueSize,
      color: "#ffffff"
    }).setOrigin(1, 0.5);
    
    // Animate right column stats
    [comboStatsLabel, longestText, averageText, totalText].forEach((text, index) => {
      text.setAlpha(0);
      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 300,
        delay: 1600 + (index * 100),
        ease: "Power2"
      });
    });

    // Buttons - responsive (stacked vertically like main menu)
    // Spacing adjusted to position buttons higher
    const buttonY = containerCenterY + statsContainerHeight / 2 + getResponsiveSpacing(80, height);
    
    // Animate buttons appearance
    const animateButtonIn = (button: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, delay: number) => {
      button.setAlpha(0);
      text.setAlpha(0);
      button.setScale(0.8);
      text.setScale(0.8);
      this.tweens.add({
        targets: [button, text],
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        delay: delay,
        ease: "Back.easeOut"
      });
    };
    const buttonSpacing = getResponsiveSpacing(70, height);
    const buttonWidth = getResponsiveSpacing(200, width);
    const buttonHeight = getResponsiveSpacing(50, height);
    const buttonFontSize = getResponsiveFontSize(24, width, 18, 30);

    // Retry Button
    const retryButton = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00aa00,
      1
    ).setInteractive();

    const retryText = this.add.text(width / 2, buttonY, "Retry", {
      fontSize: buttonFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    retryButton.on("pointerdown", () => {
      this.scene.start("GameScene", {
        song: this.song,
        difficulty: this.difficulty
      });
    });
    
    animateButtonIn(retryButton, retryText, 2000);

    retryButton.on("pointerover", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(retryButton);
      this.tweens.killTweensOf(retryText);
      
      // Animate scale only (no color change)
      this.tweens.add({
        targets: retryButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: retryText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });

    retryButton.on("pointerout", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(retryButton);
      this.tweens.killTweensOf(retryText);
      
      // Animate back to original
      this.tweens.add({
        targets: retryButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: retryText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    // Share Button
    const shareButton = this.add.rectangle(
      width / 2,
      buttonY + buttonSpacing,
      buttonWidth,
      buttonHeight,
      0x0088cc,
      1
    ).setInteractive();

    const shareText = this.add.text(width / 2, buttonY + buttonSpacing, "Share", {
      fontSize: buttonFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    shareButton.on("pointerdown", () => {
      this.shareScore();
    });
    
    animateButtonIn(shareButton, shareText, 2100);

    shareButton.on("pointerover", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(shareButton);
      this.tweens.killTweensOf(shareText);
      
      // Animate scale only (no color change)
      this.tweens.add({
        targets: shareButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: shareText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });

    shareButton.on("pointerout", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(shareButton);
      this.tweens.killTweensOf(shareText);
      
      // Animate back to original
      this.tweens.add({
        targets: shareButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: shareText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });

    // Menu Button
    const menuButton = this.add.rectangle(
      width / 2,
      buttonY + buttonSpacing * 2,
      buttonWidth,
      buttonHeight,
      0x555555,
      1
    ).setInteractive();

    const menuText = this.add.text(width / 2, buttonY + buttonSpacing * 2, "Menu", {
      fontSize: buttonFontSize,
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    menuButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
    
    animateButtonIn(menuButton, menuText, 2200);

    menuButton.on("pointerover", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(menuButton);
      this.tweens.killTweensOf(menuText);
      
      // Animate scale only (no color change)
      this.tweens.add({
        targets: menuButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: menuText,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: "Power2"
      });
    });

    menuButton.on("pointerout", () => {
      // Stop any existing tweens
      this.tweens.killTweensOf(menuButton);
      this.tweens.killTweensOf(menuText);
      
      // Animate back to original
      this.tweens.add({
        targets: menuButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
      
      this.tweens.add({
        targets: menuText,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: "Power2"
      });
    });
  }

  private handleResize = (gameSize?: Phaser.Structs.Size): void => {
    // Recreate UI with new dimensions
    this.setupUI();
  }

  private calculateGrade(accuracy: number): string {
    if (accuracy >= 95) return "S";
    if (accuracy >= 90) return "A";
    if (accuracy >= 80) return "B";
    if (accuracy >= 70) return "C";
    if (accuracy >= 60) return "D";
    return "F";
  }

  private getGradeColor(grade: string): string {
    const colors: Record<string, string> = {
      "S": "#ff00ff",
      "A": "#00ff00",
      "B": "#00aaff",
      "C": "#ffff00",
      "D": "#ff8800",
      "F": "#ff0000"
    };
    return colors[grade] || "#ffffff";
  }

  private getAccuracyColor(percentage: number): number {
    if (percentage >= 90) return 0x00ff00;
    if (percentage >= 70) return 0xffff00;
    if (percentage >= 50) return 0xff8800;
    return 0xff0000;
  }

  private calculateStars(accuracy: number): number {
    if (accuracy >= 95) return 5;
    if (accuracy >= 80) return 4;
    if (accuracy >= 60) return 3;
    if (accuracy >= 40) return 2;
    if (accuracy >= 20) return 1;
    return 0;
  }

  private showAchievementNotifications(achievementIds: string[]): void {
    const { width, height } = this.scale;
    
    achievementIds.forEach((achievementId, index) => {
      const achievement = getAchievement(achievementId);
      if (!achievement) return;
      
      // Delay each notification slightly
      this.time.delayedCall(500 * index, () => {
        // Create notification background
        const notificationBg = this.add.rectangle(
          width / 2, 
          height / 2 - getResponsiveSpacing(100, height) + (index * getResponsiveSpacing(80, height)),
          getResponsiveSpacing(400, width),
          getResponsiveSpacing(80, height),
          0x1a1a2e,
          0.95
        );
        notificationBg.setStrokeStyle(3, 0x00ff00);
        
        // Achievement icon
        const iconText = this.add.text(
          width / 2 - getResponsiveSpacing(150, width),
          height / 2 - getResponsiveSpacing(100, height) + (index * getResponsiveSpacing(80, height)),
          achievement.icon,
          {
            fontSize: getResponsiveFontSize(48, width, 36, 60),
          }
        ).setOrigin(0.5);
        
        // Achievement title
        const titleText = this.add.text(
          width / 2,
          height / 2 - getResponsiveSpacing(120, height) + (index * getResponsiveSpacing(80, height)),
          `Achievement Unlocked!`,
          {
            fontSize: getResponsiveFontSize(24, width, 18, 30),
            color: "#00ff00",
            fontStyle: "bold",
            fontFamily: "'Orbitron', 'Arial', sans-serif"
          }
        ).setOrigin(0.5);
        
        // Achievement name
        const nameText = this.add.text(
          width / 2,
          height / 2 - getResponsiveSpacing(90, height) + (index * getResponsiveSpacing(80, height)),
          achievement.name,
          {
            fontSize: getResponsiveFontSize(20, width, 16, 24),
            color: "#ffffff",
            fontStyle: "bold"
          }
        ).setOrigin(0.5);
        
        // Achievement description
        const descText = this.add.text(
          width / 2,
          height / 2 - getResponsiveSpacing(70, height) + (index * getResponsiveSpacing(80, height)),
          achievement.description,
          {
            fontSize: getResponsiveFontSize(16, width, 12, 20),
            color: "#aaaaaa"
          }
        ).setOrigin(0.5);
        
        // Animate notification in
        notificationBg.setAlpha(0);
        iconText.setAlpha(0);
        titleText.setAlpha(0);
        nameText.setAlpha(0);
        descText.setAlpha(0);
        
        this.tweens.add({
          targets: [notificationBg, iconText, titleText, nameText, descText],
          alpha: 1,
          duration: 500,
          ease: "Power2"
        });
        
        // Animate notification out after delay
        this.tweens.add({
          targets: [notificationBg, iconText, titleText, nameText, descText],
          alpha: 0,
          y: `-=${getResponsiveSpacing(50, height)}`,
          duration: 500,
          delay: 3000,
          ease: "Power2",
          onComplete: () => {
            notificationBg.destroy();
            iconText.destroy();
            titleText.destroy();
            nameText.destroy();
            descText.destroy();
          }
        });
      });
    });
  }

  private getCrowdReaction(accuracy: number): string {
    if (accuracy >= 95) return "🌟 Perfect performance! The crowd goes wild! 🌟";
    if (accuracy >= 90) return "🎉 Amazing! The audience is ecstatic!";
    if (accuracy >= 80) return "👏 Great job! The crowd is impressed!";
    if (accuracy >= 70) return "👍 Good performance! The audience enjoyed it!";
    if (accuracy >= 50) return "😐 Decent effort. A few cheers, a few boos.";
    if (accuracy >= 30) return "😕 Not great. The audience is unimpressed.";
    return "😢 The audience is disappointed...";
  }

  private shareScore(): void {
    const shareText = `🎵 Crypto Beats Score 🎵
Score: ${this.score.toLocaleString()}
Accuracy: ${((this.notesHit / this.totalNotes) * 100).toFixed(1)}%
Grade: ${this.calculateGrade((this.notesHit / this.totalNotes) * 100)}
Perfect: ${this.perfectCount} | Good: ${this.goodCount} | Miss: ${this.missCount}
Longest Combo: ${this.longestStreak}x

Play Crypto Beats!`;

    if (navigator.share) {
      navigator.share({
        title: "Crypto Beats Score",
        text: shareText
      }).catch(() => {
        this.copyToClipboard(shareText);
      });
    } else {
      this.copyToClipboard(shareText);
    }
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Score copied to clipboard!");
      }).catch(() => {
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }

  private fallbackCopy(text: string): void {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Score copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    document.body.removeChild(textArea);
  }
}

