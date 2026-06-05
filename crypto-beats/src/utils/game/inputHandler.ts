/**
 * Input Handler - Processes keyboard input and handles note hits
 */

import Phaser from "phaser";
import { NoteManager, FallingNote } from "./noteManager";
import { HoldNoteSystem } from "./holdNoteSystem";
import { ScoreManager } from "./scoreManager";
import { VisualEffects } from "./visualEffects";
import { ThemeColors } from "../ui/colorThemes";

export interface InputHandlerConfig {
  scene: Phaser.Scene;
  noteManager: NoteManager;
  holdNoteSystem: HoldNoteSystem;
  scoreManager: ScoreManager;
  visualEffects: VisualEffects;
  keyVisuals: Record<string, Phaser.GameObjects.Image>;
  keyGlows: Record<string, Phaser.GameObjects.Arc>;
  keyLanes: Record<string, { x: number; sprite: string }>;
  themeColors: ThemeColors;
  judgmentY: number;
  perfectMargin: number;
  goodMargin: number;
  getCurrentAudioTime: () => number;
  getCurrentTime: () => number;
}

export class InputHandler {
  private scene: Phaser.Scene;
  private noteManager: NoteManager;
  private holdNoteSystem: HoldNoteSystem;
  private scoreManager: ScoreManager;
  private visualEffects: VisualEffects;
  private keyVisuals: Record<string, Phaser.GameObjects.Image>;
  private keyGlows: Record<string, Phaser.GameObjects.Arc>;
  private keyLanes: Record<string, { x: number; sprite: string }>;
  private themeColors: ThemeColors;
  private judgmentY: number;
  private perfectMargin: number;
  private goodMargin: number;
  private getCurrentAudioTime: () => number;
  private getCurrentTime: () => number;

  public keysPressed: Record<string, boolean> = {};

  constructor(config: InputHandlerConfig) {
    this.scene = config.scene;
    this.noteManager = config.noteManager;
    this.holdNoteSystem = config.holdNoteSystem;
    this.scoreManager = config.scoreManager;
    this.visualEffects = config.visualEffects;
    this.keyVisuals = config.keyVisuals;
    this.keyGlows = config.keyGlows;
    this.keyLanes = config.keyLanes;
    this.themeColors = config.themeColors;
    this.judgmentY = config.judgmentY;
    this.perfectMargin = config.perfectMargin;
    this.goodMargin = config.goodMargin;
    this.getCurrentAudioTime = config.getCurrentAudioTime;
    this.getCurrentTime = config.getCurrentTime;
  }

  /**
   * Update margins (called on resize)
   */
  updateMargins(perfectMargin: number, goodMargin: number): void {
    this.perfectMargin = perfectMargin;
    this.goodMargin = goodMargin;
  }

  /**
   * Update judgment Y (called on resize)
   */
  updateJudgmentY(judgmentY: number): void {
    this.judgmentY = judgmentY;
  }

  /**
   * Handle player keyboard input
   * @param event - Keyboard event
   */
  handlePlayerInput(event: KeyboardEvent): void {
    const keyPressed = event.key.toUpperCase();
    const perfectMargin = this.perfectMargin || 15;
    const goodMargin = this.goodMargin || 40;
    let noteHit = false;

    if (this.keyLanes[keyPressed]) {
      // Check if this is a fresh key press (not a key repeat)
      const wasAlreadyPressed = this.keysPressed[keyPressed] || false;
      
      // Only process if this is a fresh press (key transitioning from not pressed to pressed)
      if (wasAlreadyPressed) {
        // Key is already held - don't process hold note activation
        // This prevents activating holds when key was pressed before note reached the line
        return;
      }
      
      // Mark key as pressed
      this.keysPressed[keyPressed] = true;
      
      for (let i = 0; i < this.noteManager.fallingKeys.length; i++) {
        const note = this.noteManager.fallingKeys[i];
        
        if (note.keyType === keyPressed) {
          const distance = Math.abs(note.y - this.judgmentY);

          if (note.isHold) {
            // Start holding the note
            // Only activate if the note's tail (key sprite) is at or near the judgment line
            // AND this is a fresh key press (not a key repeat)
            const noteHasReachedLine = note.y >= this.judgmentY - goodMargin;
            const noteHasntPassedTooFar = note.y <= this.judgmentY + goodMargin;
            
            if (noteHasReachedLine && noteHasntPassedTooFar && !note.held) {
              noteHit = true;
              note.held = true;
              note.holdStartTime = this.getCurrentTime();
              
              // Guard: Make sure we haven't already set this to pressed state
              const keyVisual = this.keyVisuals[keyPressed];
              if (keyVisual && keyVisual.scaleX >= 1.0) {
                // Stop any existing animations FIRST
                this.scene.tweens.killTweensOf(keyVisual);
                
                // Determine color based on quality
                const quality = distance < perfectMargin ? "perfect" : "good";
                const tintColor = quality === "perfect" ? this.themeColors.perfect : this.themeColors.good;
                
                // Immediately set to pressed state (no animation)
                keyVisual.setScale(0.85, 0.85);
                keyVisual.setTint(tintColor);
                
                // Show static glow (no pulsing, no animation)
                const glow = this.keyGlows[keyPressed];
                if (glow) {
                  this.scene.tweens.killTweensOf(glow);
                  glow.setFillStyle(tintColor, 0.4);
                  glow.setVisible(true);
                  glow.setAlpha(0.6);
                  glow.setScale(1.0);
                }
              }
              
              // Transform key sprite into hold bar
              this.holdNoteSystem.transformToHoldBar(note, keyPressed);
            }
            continue;
          } else {
            // Regular note handling
            let quality = "good";
            let baseScore = 0;
            if (distance < perfectMargin) {
              baseScore = 20;
              this.scoreManager.perfectCount++;
              quality = "perfect";
            } else if (distance < goodMargin) {
              baseScore = 10;
              this.scoreManager.goodCount++;
              quality = "good";
            } else {
              continue;
            }
            
            noteHit = true;
            
            // Apply combo multiplier to score
            const comboMultiplier = this.scoreManager.getComboMultiplier(this.scoreManager.currentStreak);
            const multipliedScore = Math.floor(baseScore * comboMultiplier);
            
            // Animate key press with quality-based feedback
            this.visualEffects.animateKeyPress(keyPressed, quality, false);

            this.scoreManager.notesHit++;
            this.scoreManager.currentStreak++;
            if (this.scoreManager.currentStreak > this.scoreManager.longestStreak) {
              this.scoreManager.longestStreak = this.scoreManager.currentStreak;
              
              // Check for Combo Master achievement
              this.scoreManager.checkComboMasterAchievement();
            }
            
            // Track combo start
            if (this.scoreManager.currentStreak === 1) {
              this.scoreManager.currentComboStart = this.getCurrentTime();
            }

            // Update combo display
            this.scoreManager.updateComboDisplay(this.scoreManager.currentStreak);
            
            this.scoreManager.score += multipliedScore;
            this.scoreManager.updateScore(this.scoreManager.score);

            // Return to pool instead of destroying
            this.noteManager.releaseNote(note);
            this.noteManager.fallingKeys.splice(i, 1);
            break;
          }
        }
      }
      
      // If no note was hit, still provide visual feedback (but smaller/miss style)
      if (!noteHit) {
        this.visualEffects.animateKeyPress(keyPressed, "miss", false);
      }
    }
  }

  /**
   * Handle key release event
   * @param event - Keyboard event
   */
  handleKeyRelease(event: KeyboardEvent): void {
    const keyReleased = event.key.toUpperCase();
    
    // Mark key as released
    this.keysPressed[keyReleased] = false;
    
    const perfectMargin = this.perfectMargin || 15;
    const goodMargin = this.goodMargin || 40;

    if (this.keyLanes[keyReleased]) {
      let handledHoldNote = false;
      
      // Find hold notes that are currently being held for this key
      for (let i = 0; i < this.noteManager.fallingKeys.length; i++) {
        const note = this.noteManager.fallingKeys[i];
        
        if (note.keyType === keyReleased && note.isHold && note.held && note.holdStartTime) {
          handledHoldNote = true;
          // Use audio time for accurate hold duration calculation
          const currentAudioTime = this.getCurrentAudioTime();
          const holdStartAudioTime = note.holdStartAudioTime ?? currentAudioTime;
          const requiredDuration = note.holdDuration || 0;
          const expectedEndTime = holdStartAudioTime + requiredDuration;
          
          // Check if hold was completed successfully using audio time
          const durationTolerance = 0.1; // 100ms tolerance
          const distance = Math.abs(note.y - this.judgmentY);
          
          // Determine completion quality based on audio time
          let score = 30; // Hold notes worth more points
          
          if (currentAudioTime >= expectedEndTime - durationTolerance) {
            // Successfully completed - check timing precision
            if (distance < perfectMargin && currentAudioTime >= expectedEndTime) {
              score = 40;
            } else if (currentAudioTime >= expectedEndTime * 0.7) {
              // At least 70% completion
              score = 30;
            } else {
              score = 20;
            }
            
            // Apply combo multiplier to score
            const comboMultiplier = this.scoreManager.getComboMultiplier(this.scoreManager.currentStreak);
            const multipliedScore = Math.floor(score * comboMultiplier);
            
            this.scoreManager.score += multipliedScore;
            this.scoreManager.notesHit++;
            this.scoreManager.currentStreak++;
            if (this.scoreManager.currentStreak > this.scoreManager.longestStreak) {
              this.scoreManager.longestStreak = this.scoreManager.currentStreak;
              
              // Check for Combo Master achievement
              this.scoreManager.checkComboMasterAchievement();
            }
            
            // Update combo display
            this.scoreManager.updateComboDisplay(this.scoreManager.currentStreak);
            
            this.scoreManager.updateScore(this.scoreManager.score);
            
            // Stop hold pulse (clean up any tweens, but keep key in pressed state)
            this.visualEffects.stopHoldPulse(keyReleased);
            
            // Clean up hold bar
            if (note.holdBar && this.noteManager.holdNotePool) {
              note.holdBar.setVisible(false);
              this.noteManager.holdNotePool.release(note.holdBar);
              note.holdBar = null;
            }
            
            // Clean up - return to pool instead of destroying
            this.noteManager.releaseNote(note);
            this.noteManager.fallingKeys.splice(i, 1);
            
            // Now reset the key visual since the key is being released
            const keyVisual = this.keyVisuals[keyReleased];
            const glow = this.keyGlows[keyReleased];
            if (keyVisual) {
              this.scene.tweens.killTweensOf(keyVisual);
              keyVisual.setScale(1.0, 1.0);
              keyVisual.clearTint();
            }
            if (glow) {
              this.scene.tweens.killTweensOf(glow);
              glow.setVisible(false);
              glow.setAlpha(0);
              glow.setScale(1);
            }
            
            break;
          } else {
            // Hold was released too early (before 70% completion)
            note.held = false;
            note.holdStartTime = null;
            note.holdStartAudioTime = null;
            
            // Revert tail to normal color - it will continue falling
            if (note.holdBar) {
              const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
              note.holdBar.setFillStyle(tailColor.color, 0.7); // 70% opacity, normal color
            }
            
            // Key sprite stays hidden - it doesn't reappear
            note.setVisible(false);
            note.keySpriteHidden = true; // Ensure it stays hidden
            if (note.trail) {
              note.trail.setVisible(false);
            }
            
            // Reset key state (no animation)
            this.visualEffects.stopHoldPulse(keyReleased);
            // Reset key visual immediately without animation
            const keyVisual = this.keyVisuals[keyReleased];
            const glow = this.keyGlows[keyReleased];
            if (keyVisual) {
              this.scene.tweens.killTweensOf(keyVisual);
              keyVisual.setScale(1.0, 1.0);
              keyVisual.clearTint();
            }
            if (glow) {
              this.scene.tweens.killTweensOf(glow);
              glow.setVisible(false);
              glow.setAlpha(0);
              glow.setScale(1);
            }

            this.scoreManager.currentStreak = 0;
            this.scoreManager.lastMilestone = 0;
            this.scoreManager.failed = true;
            
            // Update combo display (will hide it)
            this.scoreManager.updateComboDisplay(0);
            
            // DON'T remove from fallingKeys - let it continue falling until it goes off screen
            // The note will be cleaned up when it passes off-screen in the update loop
            break;
          }
        }
      }
      
      // If it's not a hold note, check if key is in pressed state and return it to normal
      if (!handledHoldNote) {
        const keyVisual = this.keyVisuals[keyReleased];
        if (keyVisual) {
          const currentScale = keyVisual.scaleX || 1.0;
          // If key is in pressed state (scaled down), animate it back to normal
          if (currentScale < 1.0) {
            // Check if this key is currently being held for a hold note
            let isKeyCurrentlyHeld = false;
            for (let i = 0; i < this.noteManager.fallingKeys.length; i++) {
              const note = this.noteManager.fallingKeys[i];
              if (note.keyType === keyReleased && note.isHold && note.held && note.holdStartTime) {
                isKeyCurrentlyHeld = true;
                break;
              }
            }
            
            // Only release if it's not being held for a hold note
            if (!isKeyCurrentlyHeld) {
              // Reset key visual immediately without animation
              this.scene.tweens.killTweensOf(keyVisual);
              keyVisual.setScale(1.0, 1.0);
              keyVisual.clearTint();
              const glow = this.keyGlows[keyReleased];
              if (glow) {
                this.scene.tweens.killTweensOf(glow);
                glow.setVisible(false);
                glow.setAlpha(0);
                glow.setScale(1);
              }
            }
          }
        }
      }
    }
  }
}

