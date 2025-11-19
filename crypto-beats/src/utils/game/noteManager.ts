/**
 * Note Manager - Handles note spawning, pooling, and lifecycle management
 */

import Phaser from "phaser";
import { ObjectPool, createNotePool, createHoldNotePool } from "./objectPool";
import { getResponsiveSpacing } from "../ui/responsive";
import { ThemeColors } from "../ui/colorThemes";

export interface KeyLane {
  x: number;
  sprite: string;
}

export interface GameplayLayout {
  lanes: Record<string, KeyLane>;
  gameplayStartX: number;
  gameplayEndX: number;
  gameplayWidth: number;
  keySize: number;
  spacing: number;
}

export interface FallingNote extends Phaser.GameObjects.Image {
  keyType: string;
  isHold: boolean;
  held?: boolean;
  holdStartTime?: number | null;
  holdStartAudioTime?: number;
  holdDuration?: number;
  missTriggered?: boolean;
  holdBar?: Phaser.GameObjects.Rectangle;
  spawnTime?: number;
  trail?: any; // Phaser.GameObjects.Particles.ParticleEmitterManager
  keySpriteHidden?: boolean;
  keyRemoved?: boolean;
  pooled?: boolean;
  originalColor?: number;
  holdBarStartY?: number;
  requiredHoldEndTime?: number;
}

export interface NoteManagerConfig {
  scene: Phaser.Scene;
  keyLanes: Record<string, KeyLane>;
  gameplayLayout?: GameplayLayout;
  themeColors: ThemeColors;
  judgmentY: number;
  calculateTailHeight: (holdDuration: number) => number;
}

export class NoteManager {
  private scene: Phaser.Scene;
  private keyLanes: Record<string, KeyLane>;
  private gameplayLayout?: GameplayLayout;
  private themeColors: ThemeColors;
  private judgmentY: number;
  private calculateTailHeight: (holdDuration: number) => number;
  
  public notePools: Record<string, ObjectPool<Phaser.GameObjects.Image>> = {};
  public holdNotePool?: ObjectPool<Phaser.GameObjects.Rectangle>;
  public fallingKeys: FallingNote[] = [];
  public totalNotes: number = 0;

  constructor(config: NoteManagerConfig) {
    this.scene = config.scene;
    this.keyLanes = config.keyLanes;
    this.gameplayLayout = config.gameplayLayout;
    this.themeColors = config.themeColors;
    this.judgmentY = config.judgmentY;
    this.calculateTailHeight = config.calculateTailHeight;

    // Initialize object pools
    this.holdNotePool = createHoldNotePool(this.scene, 20);
    
    // Create pools for each key type
    for (let key in this.keyLanes) {
      this.notePools[key] = createNotePool(this.scene, this.keyLanes[key].sprite, 15);
    }
  }

  /**
   * Spawn a note (regular or hold)
   * @param key - Key type (W, A, S, D)
   * @param isHoldNote - Whether this is a hold note
   * @param duration - Hold duration in seconds (for hold notes)
   */
  spawnKey(key: string, isHoldNote: boolean, duration: number = 0): void {
    if (!key) {
      return; // Skip notes with null key
    }

    key = key.toUpperCase(); 
    const lane = this.keyLanes[key];

    if (!lane) {
      console.warn(`[NoteManager] Invalid key: ${key}`);
      return; // Skip invalid keys
    }

    // Increment total notes when spawning
    this.totalNotes++;

    // Use gameplay layout for consistent note sizing
    const { width, height } = this.scene.scale;
    const noteSize = this.gameplayLayout ? this.gameplayLayout.keySize : 50; // Fallback size

    if (isHoldNote) {
      // Hold notes: key sprite at top + tail bar connecting to judgment line
      const keySprite = this.notePools[key].acquire() as FallingNote;
      keySprite.setPosition(lane.x, 0);
      keySprite.setDisplaySize(noteSize, noteSize); // Responsive note size
      keySprite.setOrigin(0.5, 0.5);
      keySprite.setDepth(10);
      keySprite.setVisible(true);
      keySprite.setActive(true);
      
      // Store note properties
      keySprite.keyType = key;
      keySprite.isHold = true;
      keySprite.held = false;
      keySprite.holdDuration = duration;
      keySprite.holdStartTime = null;
      keySprite.originalColor = this.themeColors.note;
      keySprite.pooled = true; // Mark as pooled for cleanup
      
      // Apply theme color tint to note sprite
      keySprite.setTint(this.themeColors.note);
      
      // Create trail effect (same as regular notes)
      keySprite.trail = this.scene.add.particles(lane.x, 0, 'noteTrail', {
        speed: { min: 20, max: 40 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 50,
        tint: this.themeColors.trail
      });
      keySprite.trail.setDepth(9); // Just behind the note
      
      // Create hold bar tail - extends UPWARD from key sprite
      // IMPORTANT: Tail must be behind the key sprite (like Rock Band - key in front, line behind)
      // Tail height is based on hold duration - longer holds = longer tails
      if (this.holdNotePool) {
        const holdBar = this.holdNotePool.acquire();
        const holdBarWidth = getResponsiveSpacing(15, width);
        const tailHeight = this.calculateTailHeight(duration);
        
        // Position tail so it extends upward from the key sprite
        holdBar.setPosition(lane.x, 0); // Position at key sprite (spawn position)
        holdBar.setSize(holdBarWidth, tailHeight);
        const tailColor = Phaser.Display.Color.IntegerToColor(this.themeColors.note);
        tailColor.alpha = 0.7;
        holdBar.setFillStyle(tailColor.color, tailColor.alpha);
        holdBar.setOrigin(0.5, 1); // Anchor at BOTTOM - extends UPWARD
        holdBar.setDepth(3);
        holdBar.setVisible(true);
        holdBar.setActive(true);
        
        keySprite.holdBar = holdBar;
        keySprite.holdBarStartY = this.judgmentY;
      }
      
      this.fallingKeys.push(keySprite);
    } else {
      // Use object pool for regular notes
      const keySprite = this.notePools[key].acquire() as FallingNote;
      keySprite.setPosition(lane.x, 0);
      keySprite.setDisplaySize(noteSize, noteSize); // Responsive note size
      keySprite.setOrigin(0.5, 0.5);
      keySprite.setDepth(10);
      keySprite.setVisible(true);
      keySprite.setActive(true);
      
      // Store note properties
      keySprite.keyType = key;
      keySprite.isHold = false;
      keySprite.held = false;
      keySprite.pooled = true; // Mark as pooled for cleanup
      
      // Create trail effect for regular notes with theme colors
      // Note: Particle emitters don't have a follow() method in Phaser 3
      // We'll update the emitter position manually in the update loop
      keySprite.trail = this.scene.add.particles(lane.x, 0, 'noteTrail', {
        speed: { min: 20, max: 40 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 300,
        frequency: 50,
        tint: this.themeColors.trail
      });
      keySprite.trail.setDepth(9); // Just behind the note
      
      // Apply theme color tint to note sprite
      keySprite.setTint(this.themeColors.note);
      
      this.fallingKeys.push(keySprite);
    }
  }

  /**
   * Release a note back to its pool
   * @param note - The note to release
   */
  releaseNote(note: FallingNote): void {
    // Clean up trail effect if it exists
    if (note.trail) {
      note.trail.destroy();
      note.trail = null;
    }
    
    // Clean up hold bar if it exists (for hold notes)
    if (note.isHold && note.holdBar && this.holdNotePool) {
      this.holdNotePool.release(note.holdBar);
      note.holdBar = null;
    }
    
    // Reset flags before releasing to pool
    note.keyRemoved = false;
    note.keySpriteHidden = false;
    note.missTriggered = false;
    
    if (note.pooled) {
      // Hold notes now use regular note pools (they start as key sprites)
      // So we always release to note pool, not hold note pool
      this.notePools[note.keyType]?.release(note);
    } else {
      // Fallback for non-pooled notes (shouldn't happen, but safety check)
      note.destroy();
    }
  }

  /**
   * Update gameplay layout (called on resize)
   * @param gameplayLayout - New gameplay layout
   */
  updateLayout(gameplayLayout: GameplayLayout): void {
    this.gameplayLayout = gameplayLayout;
  }

  /**
   * Cleanup all pools
   */
  shutdown(): void {
    if (this.holdNotePool) {
      this.holdNotePool.releaseAll();
    }
    if (this.notePools) {
      Object.values(this.notePools).forEach(pool => pool.releaseAll());
    }
  }
}

