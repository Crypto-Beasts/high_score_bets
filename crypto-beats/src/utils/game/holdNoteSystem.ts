/**
 * Hold Note System - Handles hold note mechanics and calculations
 */

import Phaser from "phaser";
import { getResponsiveSpacing } from "../ui/responsive";
import { ThemeColors } from "../ui/colorThemes";
import { FallingNote } from "./noteManager";

export interface HoldNoteSystemConfig {
  scene: Phaser.Scene;
  themeColors: ThemeColors;
  getCurrentAudioTime: () => number;
}

export class HoldNoteSystem {
  private scene: Phaser.Scene;
  private themeColors: ThemeColors;
  private getCurrentAudioTime: () => number;

  constructor(config: HoldNoteSystemConfig) {
    this.scene = config.scene;
    this.themeColors = config.themeColors;
    this.getCurrentAudioTime = config.getCurrentAudioTime;
  }

  /**
   * Calculate tail height based on hold duration
   * Tail should be visually proportional to hold duration, not absolute pixel distance
   * @param holdDuration - Hold duration in seconds
   * @returns Tail height in pixels
   */
  calculateTailHeight(holdDuration: number): number {
    // Use a reasonable maximum tail height and scale accordingly
    const { height } = this.scene.scale;
    const MAX_TAIL_HEIGHT = getResponsiveSpacing(200, height); // Maximum tail height
    const MAX_HOLD_DURATION = 3.0; // Maximum expected hold duration in seconds (cap at 3 seconds)
    
    // Scale tail height based on hold duration, capped at maximum
    const proportion = Math.min(holdDuration / MAX_HOLD_DURATION, 1.0);
    return MAX_TAIL_HEIGHT * proportion;
  }

  /**
   * Transform hold bar tail when player starts holding
   * @param note - The note object (key sprite)
   * @param key - The key being held
   */
  transformToHoldBar(note: FallingNote, key: string): void {
    if (!note || !note.isHold || !note.holdBar) return;
    
    // Hide key sprite when pressed - it doesn't reappear
    note.setVisible(false);
    note.keySpriteHidden = true; // Flag to prevent culling from making it visible again
    if (note.trail) {
      note.trail.setVisible(false);
    }
    
    // Store timing info (don't overwrite if already set)
    if (!note.holdStartTime) {
      note.holdStartTime = this.scene.time.now;
    }
    if (!note.holdStartAudioTime) {
      note.holdStartAudioTime = this.getCurrentAudioTime();
      note.requiredHoldEndTime = note.holdStartAudioTime + (note.holdDuration || 0);
    }
    
    // Ensure holdBar is visible and positioned correctly
    const originalTailHeight = this.calculateTailHeight(note.holdDuration || 0);
    const holdBarWidth = getResponsiveSpacing(15, this.scene.scale.width);
    note.holdBar.setSize(holdBarWidth, originalTailHeight);
    note.holdBar.setOrigin(0.5, 1); // Anchor at bottom - extends upward
    note.holdBar.setPosition(note.x, note.y); // Position at key sprite
    note.holdBar.setVisible(true);
    
    // Change to active color (glowing green while held)
    note.holdBar.setFillStyle(this.themeColors.perfect, 1.0);
    
    // Tail continues falling naturally - update loop will handle cut-off and pulse
  }
}

