/**
 * Gameplay Layout - Handles layout calculations and resize handling
 */

import Phaser from "phaser";
import { getResponsiveSpacing } from "./responsive";
import { ThemeColors } from "./colorThemes";
import { KeyLane, GameplayLayout, FallingNote } from "../game/noteManager";

export interface GameplayLayoutConfig {
  scene: Phaser.Scene;
  themeColors: ThemeColors;
  onLayoutChanged?: (layout: GameplayLayout) => void;
  onJudgmentYChanged?: (judgmentY: number) => void;
  onMarginsChanged?: (perfectMargin: number, goodMargin: number) => void;
}

export interface ResizeCallback {
  updateNotePositions?: (fallingKeys: FallingNote[], layout: GameplayLayout, keyLanes: Record<string, KeyLane>) => void;
  updateKeyVisuals?: (keyVisuals: Record<string, Phaser.GameObjects.Image>, keyGlows: Record<string, Phaser.GameObjects.Arc>, layout: GameplayLayout, keyLanes: Record<string, KeyLane>, height: number) => void;
  updateBackground?: (width: number, height: number, backgroundImage?: Phaser.GameObjects.Image, backgroundRect?: Phaser.GameObjects.Rectangle) => void;
  updateUITexts?: (width: number, height: number, scoreText?: Phaser.GameObjects.Text, comboText?: Phaser.GameObjects.Text, comboMultiplierText?: Phaser.GameObjects.Text) => void;
  calculateTailHeight?: (holdDuration: number) => number;
}

export class GameplayLayoutManager {
  private scene: Phaser.Scene;
  private themeColors: ThemeColors;
  private onLayoutChanged?: (layout: GameplayLayout) => void;
  private onJudgmentYChanged?: (judgmentY: number) => void;
  private onMarginsChanged?: (perfectMargin: number, goodMargin: number) => void;

  public keyLanes: Record<string, KeyLane> = {};
  public gameplayLayout?: GameplayLayout;
  public judgmentY: number = 0;
  public perfectMargin: number = 15;
  public goodMargin: number = 40;

  constructor(config: GameplayLayoutConfig) {
    this.scene = config.scene;
    this.themeColors = config.themeColors;
    this.onLayoutChanged = config.onLayoutChanged;
    this.onJudgmentYChanged = config.onJudgmentYChanged;
    this.onMarginsChanged = config.onMarginsChanged;
  }

  /**
   * Calculate centered gameplay layout with smart sizing
   * @param width - Screen width
   * @param height - Screen height
   * @returns Layout object with gameplay area, key size, spacing, and lane positions
   */
  calculateGameplayLayout(width: number, height: number): GameplayLayout {
    // Define gameplay area constraints
    const maxGameplayWidth = 800; // Maximum width for gameplay area
    const minGameplayWidth = 400; // Minimum width for very small screens
    const gameplayWidthPercent = 0.7; // Use 70% of screen width
    
    // Calculate gameplay width (centered, with min/max constraints)
    let gameplayWidth = Math.min(maxGameplayWidth, width * gameplayWidthPercent);
    gameplayWidth = Math.max(minGameplayWidth, gameplayWidth);
    
    // Center the gameplay area
    const gameplayStartX = (width - gameplayWidth) / 2;
    
    // Key sizing: responsive but with min/max constraints
    const baseKeySize = 50;
    const minKeySize = 40;
    const maxKeySize = 60;
    const sizeScale = gameplayWidth / maxGameplayWidth;
    let keySize = baseKeySize * sizeScale;
    keySize = Math.max(minKeySize, Math.min(maxKeySize, keySize));
    
    // Spacing: adaptive with minimum constraint
    const minSpacing = 80; // Minimum spacing between keys
    const spacing = Math.max(minSpacing, gameplayWidth / 5);
    
    // Calculate lane positions (centered within gameplay area)
    const lanes = {
      W: { 
        x: gameplayStartX + spacing * 2, // Swapped with A
        sprite: "key_w" 
      },
      A: { 
        x: gameplayStartX + spacing, // Swapped with W
        sprite: "key_a" 
      },
      S: { 
        x: gameplayStartX + spacing * 3, 
        sprite: "key_s" 
      },
      D: { 
        x: gameplayStartX + spacing * 4, 
        sprite: "key_d" 
      },
    };
    
    const layout = {
      gameplayWidth,
      gameplayStartX,
      gameplayEndX: gameplayStartX + gameplayWidth,
      keySize,
      spacing,
      lanes
    };

    this.keyLanes = layout.lanes;
    this.gameplayLayout = layout;

    // Calculate judgment line position (responsive)
    const newJudgmentY = height - getResponsiveSpacing(100, height);
    this.judgmentY = newJudgmentY;

    if (this.onJudgmentYChanged) {
      this.onJudgmentYChanged(newJudgmentY);
    }

    if (this.onLayoutChanged) {
      this.onLayoutChanged(layout);
    }

    return layout;
  }

  /**
   * Handle resize event
   * @param gameSize - New game size (optional)
   * @param callbacks - Callbacks for updating various elements
   * @param fallTime - Fall time constant (needed for pixel per second calculation)
   */
  handleResize(
    gameSize?: Phaser.Structs.Size,
    callbacks?: ResizeCallback,
    fallTime: number = 2.0
  ): { pixelsPerSecond: number; judgmentY: number; perfectMargin: number; goodMargin: number } {
    // Safety check: ensure scene is fully initialized
    if (!this.scene.cameras || !this.scene.cameras.main || !this.scene.scale) {
      console.warn("[GameplayLayout] Scene not fully initialized, skipping handleResize");
      return {
        pixelsPerSecond: 0,
        judgmentY: this.judgmentY,
        perfectMargin: this.perfectMargin,
        goodMargin: this.goodMargin
      };
    }
    
    // Safety check: ensure game has started (keyLanes must exist)
    if (!this.keyLanes || Object.keys(this.keyLanes).length === 0) {
      // Scene might be in early initialization, skip resize
      return {
        pixelsPerSecond: 0,
        judgmentY: this.judgmentY,
        perfectMargin: this.perfectMargin,
        goodMargin: this.goodMargin
      };
    }
    
    // Handle different parameter formats
    let width, height;
    if (gameSize && gameSize.width && gameSize.height) {
      width = gameSize.width;
      height = gameSize.height;
    } else {
      // Fallback to current scale dimensions or window size
      width = this.scene.scale.width || window.innerWidth || 1920;
      height = this.scene.scale.height || window.innerHeight || 1080;
    }
    
    // Ensure we have valid dimensions
    if (!width || !height || width === 0 || height === 0) {
      width = window.innerWidth || 1920;
      height = window.innerHeight || 1080;
    }
    
    // Update scale if needed (for Phaser internal consistency)
    if (this.scene.scale.width !== width || this.scene.scale.height !== height) {
      this.scene.scale.setGameSize(width, height);
    }
    
    // Update background if callback provided
    if (callbacks?.updateBackground) {
      callbacks.updateBackground(width, height);
    }
    
    // Update UI texts if callback provided
    if (callbacks?.updateUITexts) {
      callbacks.updateUITexts(width, height);
    }
    
    // Recalculate judgment line position (responsive)
    const newJudgmentY = height - getResponsiveSpacing(100, height);
    this.judgmentY = newJudgmentY;
    
    if (this.onJudgmentYChanged) {
      this.onJudgmentYChanged(newJudgmentY);
    }
    
    // Recalculate note speed based on new judgment line position
    const FALL_DISTANCE = newJudgmentY - 0; // SPAWN_Y is always 0
    const pixelsPerSecond = FALL_DISTANCE / fallTime;
    
    // Recalculate responsive margins
    const basePerfectMargin = 15; // Base margin from difficulty config
    const baseGoodMargin = 40;
    this.perfectMargin = getResponsiveSpacing(basePerfectMargin, height);
    this.goodMargin = getResponsiveSpacing(baseGoodMargin, height);
    
    if (this.onMarginsChanged) {
      this.onMarginsChanged(this.perfectMargin, this.goodMargin);
    }
    
    // Recalculate gameplay layout FIRST (needed for judgment line)
    const layout = this.calculateGameplayLayout(width, height);
    
    // Update judgment line position to match gameplay area (with theme color)
    if (this.scene.add && this.scene.scale) {
      // Judgment line rendering is handled by the scene, but we provide the layout info
    }
    
    // Update all falling notes' positions to match new lane positions
    if (callbacks?.updateNotePositions) {
      callbacks.updateNotePositions([], layout, this.keyLanes);
    }
    
    // Update key visuals position and size
    if (callbacks?.updateKeyVisuals) {
      callbacks.updateKeyVisuals({}, {}, layout, this.keyLanes, height);
    }
    
    return {
      pixelsPerSecond,
      judgmentY: this.judgmentY,
      perfectMargin: this.perfectMargin,
      goodMargin: this.goodMargin
    };
  }

  /**
   * Create or update judgment line graphics
   * @param judgmentLine - Existing judgment line graphics (optional)
   * @returns Judgment line graphics
   */
  createJudgmentLine(judgmentLine?: Phaser.GameObjects.Graphics): Phaser.GameObjects.Graphics {
    const { width, height } = this.scene.scale;
    const layout = this.gameplayLayout;
    
    if (!layout) {
      if (judgmentLine) {
        return judgmentLine;
      }
      return this.scene.add.graphics();
    }

    if (!judgmentLine) {
      judgmentLine = this.scene.add.graphics();
    }

    judgmentLine.clear();
    judgmentLine.lineStyle(4, this.themeColors.judgmentLine, 1);
    judgmentLine.beginPath();
    
    // Use gameplay area boundaries instead of screen edges
    const marginX = Math.max(50, layout.gameplayStartX);
    const endX = Math.min(width - 50, layout.gameplayEndX);
    judgmentLine.moveTo(marginX, this.judgmentY);
    judgmentLine.lineTo(endX, this.judgmentY);
    judgmentLine.strokePath();

    return judgmentLine;
  }
}

