/**
 * Score Manager - Handles score calculation, combo tracking, multipliers, and milestones
 */

import Phaser from "phaser";
import { getResponsiveFontSize, getResponsiveSpacing } from "../ui/responsive";
import { ThemeColors } from "../ui/colorThemes";
import { checkAchievements, getAchievement } from "./achievements";
import { getAllSongs } from "../../config/songs";
import { DifficultyLevel } from "./difficultyManager";

export interface ScoreManagerConfig {
  scene: Phaser.Scene;
  themeColors: ThemeColors;
  scoreText?: Phaser.GameObjects.Text;
  comboText?: Phaser.GameObjects.Text;
  comboMultiplierText?: Phaser.GameObjects.Text;
  currentSongId: string;
  currentDifficulty: DifficultyLevel;
  onAchievementUnlocked?: (achievementId: string) => void;
}

export class ScoreManager {
  private scene: Phaser.Scene;
  private themeColors: ThemeColors;
  private scoreText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private comboMultiplierText?: Phaser.GameObjects.Text;
  private currentSongId: string;
  private currentDifficulty: DifficultyLevel;
  private onAchievementUnlocked?: (achievementId: string) => void;

  // Score state
  public score: number = 0;
  public longestStreak: number = 0;
  public currentStreak: number = 0;
  public notesHit: number = 0;
  public perfectCount: number = 0;
  public goodCount: number = 0;
  public missCount: number = 0;
  public comboHistory: number[] = [];
  public currentComboStart: number | null = null;
  public comboMasterUnlocked: boolean = false;
  public lastMilestone: number = 0;
  public lastScore: number = 0;
  public failed: boolean = false;

  constructor(config: ScoreManagerConfig) {
    this.scene = config.scene;
    this.themeColors = config.themeColors;
    this.scoreText = config.scoreText;
    this.comboText = config.comboText;
    this.comboMultiplierText = config.comboMultiplierText;
    this.currentSongId = config.currentSongId;
    this.currentDifficulty = config.currentDifficulty;
    this.onAchievementUnlocked = config.onAchievementUnlocked;
  }

  /**
   * Update score display and animate changes
   * @param newScore - New score value
   */
  updateScore(newScore: number): void {
    // Animate score change
    if (newScore !== this.lastScore) {
      const scoreDiff = newScore - this.lastScore;
      
      // Update text
      if (this.scoreText) {
        this.scoreText.setText("Score: " + newScore);
        
        // Animate score text (scale up then back)
        this.scene.tweens.add({
          targets: this.scoreText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 150,
          yoyo: true,
          ease: "Power2"
        });
      }
      
      // Show score gain indicator if significant
      if (scoreDiff > 0) {
        const { width, height } = this.scene.scale;
        const scoreX = getResponsiveSpacing(20, width);
        const scoreY = getResponsiveSpacing(20, height);
        const gainText = this.scene.add.text(scoreX + 150, scoreY, `+${scoreDiff}`, {
          fontSize: getResponsiveFontSize(28, width, 22, 34),
          color: Phaser.Display.Color.IntegerToColor(this.themeColors.perfect).rgba,
          fontStyle: "bold"
        });
        
        this.scene.tweens.add({
          targets: gainText,
          y: scoreY - 30,
          alpha: 0,
          duration: 800,
          ease: "Power2",
          onComplete: () => gainText.destroy()
        });
      }
      
      this.lastScore = newScore;
    }
  }

  /**
   * Update combo display with visual feedback
   * @param combo - Current combo count
   */
  updateComboDisplay(combo: number): void {
    if (!this.comboText || !this.comboMultiplierText) return;

    if (combo === 0) {
      // Hide combo display when combo is broken
      this.scene.tweens.add({
        targets: this.comboText,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        ease: "Power2"
      });
      this.scene.tweens.add({
        targets: this.comboMultiplierText,
        alpha: 0,
        duration: 300
      });
      return;
    }

    // Show combo display
    this.comboText.setText(`${combo}x COMBO`);
    this.comboText.setAlpha(1);

    // Calculate dynamic font size based on combo (grows with combo)
    const { width } = this.scene.scale;
    const baseSizeStr = getResponsiveFontSize(20, width, 16, 24);
    const maxSizeStr = getResponsiveFontSize(48, width, 36, 60);
    const baseSize = parseFloat(baseSizeStr);
    const maxSize = parseFloat(maxSizeStr);
    // Scale from baseSize to maxSize based on combo (capped at 100x for max size)
    const comboScale = Math.min(combo / 100, 1);
    const dynamicSize = baseSize + (maxSize - baseSize) * comboScale;
    this.comboText.setFontSize(dynamicSize);

    // Animate combo text (pulse effect)
    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: { from: 1.0, to: 1.2 },
      scaleY: { from: 1.0, to: 1.2 },
      duration: 150,
      yoyo: true,
      ease: "Power2"
    });

    // Update combo multiplier display
    const multiplier = this.getComboMultiplier(combo);
    if (multiplier > 1) {
      this.comboMultiplierText.setText(`${multiplier.toFixed(1)}x MULTIPLIER`);
      this.comboMultiplierText.setAlpha(1);
    } else {
      this.comboMultiplierText.setAlpha(0);
    }

    // Check for milestone combos (10x, 50x, 100x)
    this.checkMilestoneCombo(combo);
  }

  /**
   * Get combo multiplier based on combo count
   * @param combo - Current combo count
   * @returns Multiplier value
   */
  getComboMultiplier(combo: number): number {
    if (combo >= 100) return 2.5;
    if (combo >= 50) return 2.0;
    if (combo >= 10) return 1.5;
    return 1.0;
  }

  /**
   * Check and trigger milestone combo effects
   * @param combo - Current combo count
   */
  checkMilestoneCombo(combo: number): void {
    const milestones = [2, 5, 10];
    
    for (const milestone of milestones) {
      if (combo === milestone && this.lastMilestone < milestone) {
        this.lastMilestone = milestone;
        this.triggerMilestoneEffect(milestone);
        break; // Only trigger one milestone per combo increase
      }
    }
  }

  /**
   * Trigger visual effects for milestone combos
   * @param milestone - Milestone value (2, 5, or 10)
   */
  triggerMilestoneEffect(milestone: number): void {
    const { width, height } = this.scene.scale;
    
    // Screen flash effect
    const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0);
    flash.setDepth(999);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    
    // Flash animation
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.3 },
      duration: 100,
      yoyo: true,
      ease: "Power2",
      onComplete: () => flash.destroy()
    });

    // Screen shake effect (reduced intensity, faster)
    const shakeIntensity = milestone === 100 ? 5 : milestone === 50 ? 3 : 2;
    const shakeDuration = milestone === 100 ? 200 : milestone === 50 ? 150 : 100;
    
    this.scene.cameras.main.shake(shakeDuration, shakeIntensity / 100);

    // Milestone text popup
    const milestoneText = this.scene.add.text(width / 2, height / 2 - getResponsiveSpacing(100, height), 
      `${milestone}x COMBO!`, {
      fontSize: getResponsiveFontSize(64, width, 48, 80),
      color: "#ffff00",
      fontStyle: "bold",
      fontFamily: "'Orbitron', 'Arial', sans-serif",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000);

    // Animate milestone text
    milestoneText.setScale(0);
    this.scene.tweens.add({
      targets: milestoneText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: milestoneText,
          alpha: 0,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 500,
          delay: 1000,
          ease: "Power2",
          onComplete: () => milestoneText.destroy()
        });
      }
    });

    // Particle burst for milestone
    const particleCount = milestone === 100 ? 50 : milestone === 50 ? 30 : 20;
    const particles = this.scene.add.particles(width / 2, height / 2, 'noteTrail', {
      speed: { min: 100, max: 300 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: particleCount,
      tint: milestone === 100 ? 0xffd700 : milestone === 50 ? 0xff8800 : 0xffff00,
      blendMode: Phaser.BlendModes.ADD
    });

    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  /**
   * Check for achievement unlocks (specifically combo master)
   */
  checkComboMasterAchievement(): void {
    if (this.longestStreak === 100 && !this.comboMasterUnlocked) {
      const totalSongs = getAllSongs().length;
      const gameData = {
        accuracy: 0, // Not needed for combo check
        grade: '',
        difficulty: this.currentDifficulty,
        longestStreak: this.longestStreak,
        failed: false,
        song: this.currentSongId
      };
      const newlyUnlocked = checkAchievements(gameData, totalSongs);
      if (newlyUnlocked.includes('combo_master')) {
        this.comboMasterUnlocked = true;
        if (this.onAchievementUnlocked) {
          this.onAchievementUnlocked('combo_master');
        }
      }
    }
  }

  /**
   * Show achievement notification
   * @param achievementId - Achievement ID to show
   */
  showAchievementNotification(achievementId: string): void {
    const achievement = getAchievement(achievementId);
    if (!achievement) return;
    
    const { width, height } = this.scene.scale;
    
    // Create notification in top-right corner
    const notificationX = width - getResponsiveSpacing(220, width);
    const notificationY = getResponsiveSpacing(100, height);
    
    // Background
    const bg = this.scene.add.rectangle(
      notificationX,
      notificationY,
      getResponsiveSpacing(400, width),
      getResponsiveSpacing(100, height),
      0x1a1a2e,
      0.95
    );
    bg.setStrokeStyle(3, 0x00ff00);
    bg.setDepth(1000);
    
    // Icon
    const icon = this.scene.add.text(
      notificationX - getResponsiveSpacing(150, width),
      notificationY,
      achievement.icon,
      {
        fontSize: getResponsiveFontSize(40, width, 30, 50)
      }
    ).setOrigin(0.5).setDepth(1001);
    
    // Title
    const title = this.scene.add.text(
      notificationX,
      notificationY - getResponsiveSpacing(20, height),
      "Achievement!",
      {
        fontSize: getResponsiveFontSize(18, width, 14, 22),
        color: "#00ff00",
        fontStyle: "bold",
        fontFamily: "'Orbitron', 'Arial', sans-serif"
      }
    ).setOrigin(0.5).setDepth(1001);
    
    // Name
    const name = this.scene.add.text(
      notificationX,
      notificationY + getResponsiveSpacing(10, height),
      achievement.name,
      {
        fontSize: getResponsiveFontSize(16, width, 12, 20),
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5).setDepth(1001);
    
    // Animate in
    bg.setAlpha(0);
    icon.setAlpha(0);
    title.setAlpha(0);
    name.setAlpha(0);
    
    this.scene.tweens.add({
      targets: [bg, icon, title, name],
      alpha: 1,
      x: `-=${getResponsiveSpacing(20, width)}`,
      duration: 500,
      ease: "Back.easeOut"
    });
    
    // Animate out
    this.scene.tweens.add({
      targets: [bg, icon, title, name],
      alpha: 0,
      x: `+=${getResponsiveSpacing(20, width)}`,
      duration: 500,
      delay: 3000,
      ease: "Power2",
      onComplete: () => {
        bg.destroy();
        icon.destroy();
        title.destroy();
        name.destroy();
      }
    });
  }

  /**
   * Reset score state
   */
  reset(): void {
    this.score = 0;
    this.longestStreak = 0;
    this.currentStreak = 0;
    this.notesHit = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.comboHistory = [];
    this.currentComboStart = null;
    this.comboMasterUnlocked = false;
    this.lastMilestone = 0;
    this.lastScore = 0;
    this.failed = false;
  }

  /**
   * Update UI text references
   */
  updateUITexts(
    scoreText?: Phaser.GameObjects.Text,
    comboText?: Phaser.GameObjects.Text,
    comboMultiplierText?: Phaser.GameObjects.Text
  ): void {
    this.scoreText = scoreText;
    this.comboText = comboText;
    this.comboMultiplierText = comboMultiplierText;
  }
}

