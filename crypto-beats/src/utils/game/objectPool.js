/**
 * Object Pool for game objects to reduce memory allocations
 */

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
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
   * @returns {Object} Pooled object
   */
  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      // Pool exhausted, create new object
      obj = this.createFn();
    }
    
    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   * @param {Object} obj - Object to return
   */
  release(obj) {
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
  releaseAll() {
    const activeArray = Array.from(this.active);
    activeArray.forEach(obj => this.release(obj));
  }

  /**
   * Get pool statistics
   * @returns {{pooled: number, active: number, total: number}}
   */
  getStats() {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size
    };
  }

  /**
   * Clear the pool
   */
  clear() {
    this.pool = [];
    this.active.clear();
  }
}

/**
 * Create a pool for note sprites
 * @param {Phaser.Scene} scene - The scene to create sprites in
 * @param {string} spriteKey - The sprite key to use
 * @param {number} initialSize - Initial pool size
 * @returns {ObjectPool}
 */
export function createNotePool(scene, spriteKey, initialSize = 20) {
  return new ObjectPool(
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
 * @param {Phaser.Scene} scene - The scene to create rectangles in
 * @param {number} initialSize - Initial pool size
 * @returns {ObjectPool}
 */
export function createHoldNotePool(scene, initialSize = 10) {
  return new ObjectPool(
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

