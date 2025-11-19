/**
 * Visual Effects - Handles animations, particles, and visual feedback
 */

import Phaser from "phaser";
import { ThemeColors } from "../ui/colorThemes";
import { FallingNote } from "./noteManager";

export interface VisualEffectsConfig {
  scene: Phaser.Scene;
  keyVisuals: Record<string, Phaser.GameObjects.Image>;
  keyGlows: Record<string, Phaser.GameObjects.Arc>;
  themeColors: ThemeColors;
  judgmentY: number;
  keyLanes: Record<string, { x: number; sprite: string }>;
  fallingKeys: FallingNote[];
}

export class VisualEffects {
  private scene: Phaser.Scene;
  private keyVisuals: Record<string, Phaser.GameObjects.Image>;
  private keyGlows: Record<string, Phaser.GameObjects.Arc>;
  private themeColors: ThemeColors;
  private judgmentY: number;
  private keyLanes: Record<string, { x: number; sprite: string }>;
  private fallingKeys: FallingNote[];

  constructor(config: VisualEffectsConfig) {
    this.scene = config.scene;
    this.keyVisuals = config.keyVisuals;
    this.keyGlows = config.keyGlows;
    this.themeColors = config.themeColors;
    this.judgmentY = config.judgmentY;
    this.keyLanes = config.keyLanes;
    this.fallingKeys = config.fallingKeys;
  }

  /**
   * Update falling keys reference (called when notes change)
   */
  updateFallingKeys(fallingKeys: FallingNote[]): void {
    this.fallingKeys = fallingKeys;
  }

  /**
   * Animate key press with scale and color feedback
   * @param key - The key that was pressed (W, A, S, D)
   * @param quality - "perfect", "good", or "miss"
   * @param isHold - Whether this is a hold note
   */
  animateKeyPress(key: string, quality: string = "good", isHold: boolean = false): void {
    // Hold notes are handled separately - skip them here
    if (isHold) {
      return;
    }
    
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Check if key is currently in pressed state (being held for a hold note)
    const currentScale = keyVisual.scaleX || 1.0;
    if (currentScale < 1.0) {
      // Check if this key is currently being held for a hold note
      let isKeyCurrentlyHeld = false;
      for (let i = 0; i < this.fallingKeys.length; i++) {
        const note = this.fallingKeys[i];
        if (note.keyType === key && note.isHold && note.held && note.holdStartTime) {
          isKeyCurrentlyHeld = true;
          break;
        }
      }
      // If key is being held, don't animate (would interfere with pressed state)
      if (isKeyCurrentlyHeld) {
        return;
      }
    }
    
    // Stop any existing tweens on this key
    this.scene.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.scene.tweens.killTweensOf(glow);
    }
  
    // Determine color based on quality (use theme colors)
    let tintColor, glowColor;
    switch(quality) {
      case "perfect":
        tintColor = this.themeColors.perfect;
        glowColor = this.themeColors.perfect;
        break;
      case "good":
        tintColor = this.themeColors.good;
        glowColor = this.themeColors.good;
        break;
      case "miss":
        tintColor = this.themeColors.miss;
        glowColor = this.themeColors.miss;
        break;
      default:
        tintColor = this.themeColors.note;
        glowColor = 0x00aaff;
    }
    
    // Apply tint
    keyVisual.setTint(tintColor);
    
    // For ALL notes: scale DOWN to pressed state (0.85)
    this.scene.tweens.add({
      targets: keyVisual,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 100,
      ease: "Linear",
      yoyo: false,
      // NO onComplete - key stays pressed until manually released
    });
    
    // Glow effect - fade in then out (remove yoyo)
    if (glow) {
      glow.setFillStyle(glowColor, 0.6);
      glow.setVisible(true);
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.8,
        scale: 1.3,
        duration: 100,
        ease: "Linear",
        yoyo: false, // Remove yoyo - just fade out
      });
    }
  }

  /**
   * Animate key release (for hold notes)
   * @param key - The key that was released
   */
  animateKeyRelease(key: string): void {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Stop any existing animations
    this.scene.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.scene.tweens.killTweensOf(glow);
    }
    
    // Smoothly return to normal size and clear tint
    this.scene.tweens.add({
      targets: keyVisual,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        keyVisual.clearTint();
      }
    });
   
    // Fade out glow smoothly
    if (glow) {
      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          glow.setVisible(false);
        }
      });
    }
  }

  /**
   * Stop pulsing animation for hold notes
   * @param key - The key that was released
   */
  stopHoldPulse(key: string): void {
    if (!this.keyVisuals[key]) return;
    
    const keyVisual = this.keyVisuals[key];
    const glow = this.keyGlows[key];
    
    // Kill pulsing tweens
    this.scene.tweens.killTweensOf(keyVisual);
    if (glow) {
      this.scene.tweens.killTweensOf(glow);
    }
  }

  /**
   * Create particle effects for perfect hits
   * @param key - The key that was pressed
   */
  createPerfectHitParticles(key: string): void {
    if (!this.keyLanes[key]) return;
    
    const { width, height } = this.scene.scale;
    const lane = this.keyLanes[key];
    const particleY = this.judgmentY;
    
    // Create burst of particles at judgment line
    const particles = this.scene.add.particles(lane.x, particleY, 'noteTrail', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 15,
      tint: this.themeColors.perfect,
      blendMode: Phaser.BlendModes.ADD
    });
    
    // Destroy particles after animation
    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }
}

