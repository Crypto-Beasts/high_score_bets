/**
 * Object Pool for game objects to reduce memory allocations
 */

import Phaser from "phaser";

export interface PoolStats {
  pooled: number;
  active: number;
  total: number;
}

export class ObjectPool<T> {
  private createFn: () => T;
  private resetFn: ((obj: T) => void) | null;
  private pool: T[];
  private active: Set<T>;
  private initialSize: number;

  constructor(
    createFn: () => T,
    resetFn: ((obj: T) => void) | null = null,
    initialSize: number = 10
  ) {
    this.createFn = createFn; // Function to create new objects
    this.resetFn = resetFn; // Function to reset objects before reuse
    this.pool = [];
    this.active = new Set(); // Track active objects
    this.initialSize = initialSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * Get an object from the pool
   * @returns Pooled object
   */
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      // Pool exhausted, create new object
      obj = this.createFn();
    }
    
    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   * @param obj - Object to return
   */
  release(obj: T): void {
    if (!this.active.has(obj)) {
      return; // Already released or not from this pool
    }
    
    this.active.delete(obj);
    
    // Reset object state
    if (this.resetFn) {
      this.resetFn(obj);
    }
    
    // Return to pool
    this.pool.push(obj);
  }

  /**
   * Release all active objects
   */
  releaseAll(): void {
    const activeArray = Array.from(this.active);
    activeArray.forEach(obj => this.release(obj));
  }

  /**
   * Get pool statistics
   * @returns Pool statistics
   */
  getStats(): PoolStats {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool = [];
    this.active.clear();
  }
}

/**
 * Create a pool for note sprites
 * @param scene - The scene to create sprites in
 * @param spriteKey - The sprite key to use
 * @param initialSize - Initial pool size
 * @returns Object pool for note sprites
 */
export function createNotePool(
  scene: Phaser.Scene,
  spriteKey: string,
  initialSize: number = 20
): ObjectPool<Phaser.GameObjects.Image> {
  return new ObjectPool<Phaser.GameObjects.Image>(
    () => {
      // Create function - create a new sprite (not added to scene yet)
      const sprite = scene.add.image(0, 0, spriteKey);
      sprite.setVisible(false);
      sprite.setActive(false);
      return sprite;
    },
    (sprite) => {
      // Reset function - reset sprite state
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.clearTint();
      sprite.setScale(1);
      sprite.setAlpha(1);
      sprite.setRotation(0);
      sprite.x = 0;
      sprite.y = 0;
    },
    initialSize
  );
}

/**
 * Create a pool for hold note rectangles
 * @param scene - The scene to create rectangles in
 * @param initialSize - Initial pool size
 * @returns Object pool for hold note rectangles
 */
export function createHoldNotePool(
  scene: Phaser.Scene,
  initialSize: number = 10
): ObjectPool<Phaser.GameObjects.Rectangle> {
  return new ObjectPool<Phaser.GameObjects.Rectangle>(
    () => {
      // Create function - create a new rectangle (not added to scene yet)
      const rect = scene.add.rectangle(0, 0, 20, 100, 0xffffff);
      rect.setVisible(false);
      rect.setActive(false);
      return rect;
    },
    (rect) => {
      // Reset function - reset rectangle state
      rect.setVisible(false);
      rect.setActive(false);
      rect.setFillStyle(0xffffff);
      rect.setScale(1);
      rect.setAlpha(1);
      rect.setRotation(0);
      rect.x = 0;
      rect.y = 0;
    },
    initialSize
  );
}

