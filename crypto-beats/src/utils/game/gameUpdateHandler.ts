/**
 * Game Update Handler - Handles main update loop logic, note movement, miss detection, spawn timing
 */

import Phaser from "phaser";
import { getResponsiveSpacing } from "../ui/responsive";
import { NoteManager, FallingNote } from "./noteManager";
import { HoldNoteSystem } from "./holdNoteSystem";
import { ScoreManager } from "./scoreManager";
import { InputHandler } from "./inputHandler";
import { VisualEffects } from "./visualEffects";
import { ThemeColors } from "../ui/colorThemes";
import { NoteData } from "../data/errorHandler";
import { getAccurateGameTime } from "../audio/audioSync";
import { DifficultyLevel } from "./difficultyManager";

export interface GameUpdateHandlerConfig {
  scene: Phaser.Scene;
  noteManager: NoteManager;
  holdNoteSystem: HoldNoteSystem;
  scoreManager: ScoreManager;
  inputHandler: InputHandler;
  visualEffects: VisualEffects;
  themeColors: ThemeColors;
  songData: NoteData[];
  music?: Phaser.Sound.BaseSound;
  audioStartTime: number;
  audioOffset: number;
  judgmentY: number;
  pixelsPerSecond: number;
  perfectMargin: number;
  goodMargin: number;
  fallTime: number;
  currentSongId: string;
  currentDifficulty: DifficultyLevel;
  screenHeight: number;
  cullMargin: number;
  getCurrentTime: () => number;
  getCurrentAudioTime: () => number;
  onGameEnd?: (data: {
    score: number;
    totalNotes: number;
    notesHit: number;
    longestStreak: number;
    averageCombo: number;
    perfectCount: number;
    goodCount: number;
    missCount: number;
    failed: boolean;
    song: string;
    difficulty: DifficultyLevel;
  }) => void;
}

export class GameUpdateHandler {
  private scene: Phaser.Scene;
  private noteManager: NoteManager;
  private holdNoteSystem: HoldNoteSystem;
  private scoreManager: ScoreManager;
  private inputHandler: InputHandler;
  private visualEffects: VisualEffects;
  private themeColors: ThemeColors;
  private songData: NoteData[];
  private music?: Phaser.Sound.BaseSound;
  private audioStartTime: number;
  private audioOffset: number;
  private judgmentY: number;
  private pixelsPerSecond: number;
  private perfectMargin: number;
  private goodMargin: number;
  private fallTime: number;
  private currentSongId: string;
  private currentDifficulty: DifficultyLevel;
  private screenHeight: number;
  private cullMargin: number;
  private getCurrentTime: () => number;
  private getCurrentAudioTime: () => number;
  private onGameEnd?: (data: {
    score: number;
    totalNotes: number;
    notesHit: number;
    longestStreak: number;
    averageCombo: number;
    perfectCount: number;
    goodCount: number;
    missCount: number;
    failed: boolean;
    song: string;
    difficulty: DifficultyLevel;
  }) => void;

  public currentNoteIndex: number = 0;

  constructor(config: GameUpdateHandlerConfig) {
    this.scene = config.scene;
    this.noteManager = config.noteManager;
    this.holdNoteSystem = config.holdNoteSystem;
    this.scoreManager = config.scoreManager;
    this.inputHandler = config.inputHandler;
    this.visualEffects = config.visualEffects;
    this.themeColors = config.themeColors;
    this.songData = config.songData;
    this.music = config.music;
    this.audioStartTime = config.audioStartTime;
    this.audioOffset = config.audioOffset;
    this.judgmentY = config.judgmentY;
    this.pixelsPerSecond = config.pixelsPerSecond;
    this.perfectMargin = config.perfectMargin;
    this.goodMargin = config.goodMargin;
    this.fallTime = config.fallTime;
    this.currentSongId = config.currentSongId;
    this.currentDifficulty = config.currentDifficulty;
    this.screenHeight = config.screenHeight;
    this.cullMargin = config.cullMargin;
    this.getCurrentTime = config.getCurrentTime;
    this.getCurrentAudioTime = config.getCurrentAudioTime;
    this.onGameEnd = config.onGameEnd;
  }

  /**
   * Update judgment Y and pixels per second (called on resize)
   */
  updateJudgmentY(judgmentY: number, pixelsPerSecond: number): void {
    this.judgmentY = judgmentY;
    this.pixelsPerSecond = pixelsPerSecond;
  }

  /**
   * Update margins (called on resize)
   */
  updateMargins(perfectMargin: number, goodMargin: number): void {
    this.perfectMargin = perfectMargin;
    this.goodMargin = goodMargin;
  }

  /**
   * Update screen dimensions (called on resize)
   */
  updateScreenDimensions(screenHeight: number, cullMargin: number): void {
    this.screenHeight = screenHeight;
    this.cullMargin = cullMargin;
  }

  /**
   * Update music reference
   */
  updateMusic(music?: Phaser.Sound.BaseSound): void {
    this.music = music;
  }

  /**
   * Update audio start time
   */
  updateAudioStartTime(audioStartTime: number): void {
    this.audioStartTime = audioStartTime;
  }

  /**
   * Main update loop
   * @param time - Current time
   * @param delta - Delta time in milliseconds
   * @param musicStarted - Whether music has started
   * @param isPaused - Whether game is paused
   */
  update(time: number, delta: number, musicStarted: boolean, isPaused: boolean): void {
    // Don't update if music hasn't started yet or if paused
    if (!musicStarted || isPaused) {
      return;
    }

    // Calculate accurate game time using audio.currentTime when available
    // This provides better synchronization than scene time alone
    const elapsedTime = getAccurateGameTime(
      this.music,
      time, // Current scene time (for reference, but not used in fallback)
      this.audioStartTime, // Date.now() timestamp when audio started
      this.audioOffset
    ); 

    // Spawn notes when their spawn time arrives
    // Performance optimization: Cache songData and FALL_TIME
    const songData = this.songData;
    const fallTime = this.fallTime;
    
    if (!songData || !Array.isArray(songData)) {
      // Log error occasionally (not every frame)
      if (time % 2000 < delta) { // Log every ~2 seconds
        console.error(`[GameUpdateHandler] songData is invalid in update loop!`, songData);
      }
      return;
    }
    
    // Spawn notes - optimized loop
    const songDataLength = songData.length;
    let spawnedThisFrame = 0;
    
    while (
      this.currentNoteIndex < songDataLength &&
      (songData[this.currentNoteIndex].time - fallTime) <= elapsedTime
    ) {
      const noteData = songData[this.currentNoteIndex];
      this.noteManager.spawnKey(noteData.key, noteData.hold || false, noteData.duration || 0);
      this.currentNoteIndex++;
      spawnedThisFrame++;
    }
    
    // Debug: Log spawning activity (only first few times to avoid spam)
    if (spawnedThisFrame > 0) {
      console.log(`[GameUpdateHandler] Spawned ${spawnedThisFrame} note(s) at elapsedTime=${elapsedTime.toFixed(3)}s, currentIndex=${this.currentNoteIndex}/${this.songData.length}`);
    }
    
    // Debug: Log if we're not spawning when we should (only in debug mode)
    if (this.currentNoteIndex < songDataLength && spawnedThisFrame === 0) {
      const nextNoteTime = songData[this.currentNoteIndex].time;
      const nextSpawnTime = nextNoteTime - fallTime;
      // Only log occasionally to avoid spam (check every ~2 seconds)
      if (time % 2000 < delta) {
        console.log(`[GameUpdateHandler] Waiting to spawn note ${this.currentNoteIndex}: nextSpawnTime=${nextSpawnTime.toFixed(3)}s, elapsedTime=${elapsedTime.toFixed(3)}s, diff=${(nextSpawnTime - elapsedTime).toFixed(3)}s`);
      }
    }

    // Move falling notes using time-based movement (frame-rate independent)
    // Performance optimization: Cache values to reduce property lookups
    const { width, height } = this.scene.scale;
    const pixelsPerSecond = this.pixelsPerSecond;
    const screenHeight = this.screenHeight;
    const cullMargin = this.cullMargin;
    const judgmentY = this.judgmentY;
    
    // Pre-calculate movement delta once
    const deltaSeconds = delta / 1000;
    const movementDelta = pixelsPerSecond * deltaSeconds;
    
    // Use reverse iteration for safe removal during loop
    for (let i = this.noteManager.fallingKeys.length - 1; i >= 0; i--) {
      const key = this.noteManager.fallingKeys[i];
      
      // Update position for all notes (needed for collision detection)
      // Hold notes continue scrolling even when held - the tail "unravels" as it passes the line
      key.y += movementDelta;
      
      // Update particle trail position if it exists (Phaser 3 doesn't have follow method)
      // Particle emitters have x and y properties that can be set directly
      if (key.trail) {
        key.trail.x = key.x;
        key.trail.y = key.y;
      }
      
      // Handle hold bar tail for ALL hold notes (both held and not held)
      if (key.isHold && key.holdBar) {
        const originalTailHeight = this.holdNoteSystem.calculateTailHeight(key.holdDuration || 0);
        const holdBarWidth = getResponsiveSpacing(15, width);
        
        // Always hide key sprite for held notes
        if (key.held) {
          key.setVisible(false);
          if (key.trail) {
            key.trail.setVisible(false);
          }
        }
        
        // Check if the key sprite (bottom of tail) has passed the judgment line
        if (key.y > judgmentY) {
          // Key has passed judgment line - apply cut-off logic
          
          // Calculate the top of the tail
          const tailTop = key.y - originalTailHeight;
          
          // Check if any part of the tail is above the judgment line
          if (tailTop < judgmentY) {
            // Part of the tail is above the judgment line - calculate visible height
            const visibleHeight = judgmentY - tailTop;
            const clippedHeight = Math.min(visibleHeight, originalTailHeight);
            
            if (clippedHeight > 0) {
              // Resize tail to show only the portion above judgment line
              key.holdBar.setSize(holdBarWidth, clippedHeight);
              key.holdBar.setOrigin(0.5, 1);
              // Position tail so its bottom is at the judgment line
              key.holdBar.setPosition(key.x, judgmentY);
              key.holdBar.setVisible(true);
              
              // Set color based on whether note is held or not
              if (key.held) {
                // Pulse effect for held notes
                const holdElapsed = (time - (key.holdStartTime || 0)) / 1000;
                const pulse = Math.sin(holdElapsed * 10) * 0.2 + 0.8;
                const greenIntensity = Math.floor(255 * pulse);
                key.holdBar.setFillStyle(Phaser.Display.Color.GetColor(0, greenIntensity, 0), 1.0);
              } else {
                // Normal color for non-held notes
                const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
                key.holdBar.setFillStyle(tailColor.color, 0.7);
                
                // Trigger miss animation if not already triggered
                if (!key.missTriggered) {
                  key.missTriggered = true;
                  
                  // Check if this key is currently being held for another note
                  let isKeyCurrentlyHeld = false;
                  for (let j = 0; j < this.noteManager.fallingKeys.length; j++) {
                    const otherNote = this.noteManager.fallingKeys[j];
                    if (otherNote.keyType === key.keyType && otherNote.isHold && otherNote.held && otherNote.holdStartTime) {
                      isKeyCurrentlyHeld = true;
                      break;
                    }
                  }
                  
                  // No animation when note crosses judgment line - only track miss
                  
                  // Track miss
                  this.scoreManager.missCount++;
                  
                  // End current combo and record it
                  if (this.scoreManager.currentStreak > 0 && this.scoreManager.currentComboStart) {
                    this.scoreManager.comboHistory.push(this.scoreManager.currentStreak);
                    this.scoreManager.currentComboStart = null;
                  }
                  
                  this.scoreManager.currentStreak = 0;
                  this.scoreManager.lastMilestone = 0;
                  this.scoreManager.failed = true;
                  
                  // Update combo display (will hide it)
                  this.scoreManager.updateComboDisplay(0);
                }
                
                // Note continues scrolling naturally - no hiding or removal
              }
            } else {
              // No visible portion - hide the tail
              key.holdBar.setVisible(false);
            }
          } else {
            // Entire tail is below the judgment line - note continues scrolling naturally
            
            // If this is a held note that passed the line, check if it was released too early
            // Only mark as miss if the hold duration wasn't completed
            // The key visual should remain in pressed state until user releases the key
            if (key.held && !key.missTriggered) {
              // Check if hold was completed successfully using audio time
              const currentAudioTime = this.getCurrentAudioTime();
              const holdStartAudioTime = key.holdStartAudioTime;
              const requiredDuration = key.holdDuration || 0;
              const expectedEndTime = holdStartAudioTime + requiredDuration;
              const durationTolerance = 0.1; // 100ms tolerance
              
              // Check if hold duration has completed
              if (currentAudioTime >= expectedEndTime - durationTolerance) {
                // Hold completed successfully - auto-complete it
                // Check if key is still physically pressed
                if (this.inputHandler.keysPressed[key.keyType]) {
                  // Key is still pressed - keep visual pressed and auto-complete the hold
                  const distance = Math.abs(key.y - this.judgmentY);
                  const perfectMargin = this.perfectMargin || 15;
                  
                  let score = 30;
                  if (distance < perfectMargin && currentAudioTime >= expectedEndTime) {
                    score = 40;
                  } else if (currentAudioTime >= expectedEndTime * 0.7) {
                    score = 30;
                  } else {
                    score = 20;
                  }
                  
                  // Apply combo multiplier
                  const comboMultiplier = this.scoreManager.getComboMultiplier(this.scoreManager.currentStreak);
                  const multipliedScore = Math.floor(score * comboMultiplier);
                  
                  this.scoreManager.score += multipliedScore;
                  this.scoreManager.notesHit++;
                  this.scoreManager.currentStreak++;
                  if (this.scoreManager.currentStreak > this.scoreManager.longestStreak) {
                    this.scoreManager.longestStreak = this.scoreManager.currentStreak;
                    
                    this.scoreManager.checkComboMasterAchievement();
                  }
                  
                  if (this.scoreManager.currentStreak === 1) {
                    this.scoreManager.currentComboStart = this.getCurrentTime();
                  }
                  
                  this.scoreManager.updateComboDisplay(this.scoreManager.currentStreak);
                  this.scoreManager.updateScore(this.scoreManager.score);
                  
                  // Stop hold pulse but keep key visual pressed (since key is still held)
                  this.visualEffects.stopHoldPulse(key.keyType);
                  
                  // Clean up hold bar
                  if (key.holdBar && this.noteManager.holdNotePool) {
                    key.holdBar.setVisible(false);
                    this.noteManager.holdNotePool.release(key.holdBar);
                    key.holdBar = null;
                  }
                  
                  // Clean up note but keep key visual pressed
                  this.noteManager.releaseNote(key);
                  this.noteManager.fallingKeys.splice(i, 1);
                  
                  // Key visual stays pressed because this.keysPressed[key.keyType] is still true
                  // It will only reset when handleKeyRelease is called
                  continue; // Skip to next note
                } else {
                  // Hold completed but key was released - this should be handled in handleKeyRelease
                  // But if we're here, the note wasn't cleaned up yet, so mark it
                  key.missTriggered = true;
                }
              } else {
                // Hold duration hasn't completed yet - check if key is still pressed
                // Only mark as miss if key was released (not physically pressed)
                if (!this.inputHandler.keysPressed[key.keyType]) {
                  // Key was released too early - mark as miss
                  key.missTriggered = true;
                  this.visualEffects.stopHoldPulse(key.keyType);
                  
                  this.scoreManager.missCount++;
                  if (this.scoreManager.currentStreak > 0 && this.scoreManager.currentComboStart) {
                    this.scoreManager.comboHistory.push(this.scoreManager.currentStreak);
                    this.scoreManager.currentComboStart = null;
                  }
                  this.scoreManager.currentStreak = 0;
                  this.scoreManager.lastMilestone = 0;
                  this.scoreManager.failed = true;
                  this.scoreManager.updateComboDisplay(0);
                }
                // If key is still pressed, don't reset visual - keep it pressed
              }
              // If hold was completed successfully, key stays pressed until user releases
            }
            
            // Note continues scrolling - no removal
          }
        } else {
          // Key hasn't reached judgment line yet - show full tail
          key.holdBar.setSize(holdBarWidth, originalTailHeight);
          key.holdBar.setOrigin(0.5, 1);
          key.holdBar.setPosition(key.x, key.y);
          key.holdBar.setVisible(true);
          
          // Set color based on whether note is held or not
          if (key.held) {
            // Pulse effect for held notes
            const holdElapsed = (time - (key.holdStartTime || 0)) / 1000;
            const pulse = Math.sin(holdElapsed * 10) * 0.2 + 0.8;
            const greenIntensity = Math.floor(255 * pulse);
            key.holdBar.setFillStyle(Phaser.Display.Color.GetColor(0, greenIntensity, 0), 1.0);
          } else {
            // Normal color for non-held notes
            const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
            key.holdBar.setFillStyle(tailColor.color, 0.7);
          }
        }
      }
      
      // Culling: Hide notes that are far off-screen to reduce rendering
      const isOffScreen = key.y < -cullMargin || key.y > screenHeight + cullMargin;
      if (isOffScreen && key.visible) {
        key.setVisible(false);
        if (key.isHold && key.holdBar) {
          key.holdBar.setVisible(false);
        }
      } else if (!isOffScreen && !key.visible) {
        // Don't make visible if key sprite was hidden for hold or removed
        if (!key.keySpriteHidden && !key.keyRemoved && !key.held) {
          key.setVisible(true);
          if (key.isHold && key.holdBar && !key.held) {
            key.holdBar.setVisible(true);
          }
        }
      }

      // Miss detection for regular notes that have passed the judgment line (only trigger once)
      // Notes continue scrolling naturally - no automatic removal
      if (!key.isHold && key.y > judgmentY && !key.missTriggered) {
        key.missTriggered = true;
        
        // Check if this key is currently being held for another note
        let isKeyCurrentlyHeld = false;
        for (let j = 0; j < this.noteManager.fallingKeys.length; j++) {
          const otherNote = this.noteManager.fallingKeys[j];
          if (otherNote.keyType === key.keyType && otherNote.isHold && otherNote.held && otherNote.holdStartTime) {
            isKeyCurrentlyHeld = true;
            break;
          }
        }
        
        // Regular note miss
        // No animation when note crosses judgment line - only track miss
        
        // Track miss
        this.scoreManager.missCount++;
        
        // End current combo and record it
        if (this.scoreManager.currentStreak > 0 && this.scoreManager.currentComboStart) {
          this.scoreManager.comboHistory.push(this.scoreManager.currentStreak);
          this.scoreManager.currentComboStart = null;
        }
        
        this.scoreManager.currentStreak = 0;
        this.scoreManager.lastMilestone = 0; // Reset milestone tracking
        this.scoreManager.failed = true;
        
        // Update combo display (will hide it)
        this.scoreManager.updateComboDisplay(0);
        
        // Note continues scrolling naturally - no removal
      }
    }

    // Ensure Debrief Scene appears when the song ends
    if (this.music && (!this.music.isPlaying || elapsedTime >= this.music.duration)) {
      // Record final combo if still active
      if (this.scoreManager.currentStreak > 0 && this.scoreManager.currentComboStart) {
        this.scoreManager.comboHistory.push(this.scoreManager.currentStreak);
      }
      
      // Calculate average combo
      const averageCombo = this.scoreManager.comboHistory.length > 0
        ? this.scoreManager.comboHistory.reduce((a, b) => a + b, 0) / this.scoreManager.comboHistory.length
        : 0;
      
      if (this.onGameEnd) {
        this.onGameEnd({
          score: this.scoreManager.score,
          totalNotes: this.noteManager.totalNotes,
          notesHit: this.scoreManager.notesHit,
          longestStreak: this.scoreManager.longestStreak,
          averageCombo: Math.round(averageCombo * 10) / 10,
          perfectCount: this.scoreManager.perfectCount,
          goodCount: this.scoreManager.goodCount,
          missCount: this.scoreManager.missCount,
          failed: this.scoreManager.failed,
          song: this.currentSongId,
          difficulty: this.currentDifficulty,
        });
      }
    }
  }
}

