/**
 * Hybrid Note Generator
 * Combines pre-defined JSON patterns with procedural variations
 * 
 * This approach:
 * - Uses JSON as base pattern (ensures quality)
 * - Adds real-time variations (makes it unpredictable)
 * - Server can validate against base + variation rules
 */

export class HybridNoteGenerator {
  constructor(baseNotes, variationConfig = {}) {
    this.baseNotes = baseNotes; // Original JSON notes
    this.variationConfig = {
      // Timing variance (milliseconds)
      timingJitter: variationConfig.timingJitter || 10,
      
      // Key variation probability (0-1)
      keyVariationChance: variationConfig.keyVariationChance || 0.05,
      
      // Note density modifier (0.8-1.2)
      densityModifier: variationConfig.densityModifier || 1.0,
      
      // Hold note variation
      holdDurationVariance: variationConfig.holdDurationVariance || 0.1,
      
      // Random seed for reproducibility (optional)
      seed: variationConfig.seed || null
    };
    
    // Initialize random seed if provided
    if (this.variationConfig.seed) {
      this.seed = this.variationConfig.seed;
    } else {
      // Generate random seed for this session
      this.seed = Date.now() + Math.random() * 1000;
    }
    
    // Simple seeded random function
    this.random = this.seededRandom(this.seed);
    
    // Generate varied notes
    this.variedNotes = this.generateVariedNotes();
    
    // Store seed for server validation
    this.sessionSeed = this.seed;
  }
  
  /**
   * Seeded random number generator
   * Ensures same seed = same variations (for server validation)
   */
  seededRandom(seed) {
    let value = seed;
    return () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
  }
  
  /**
   * Generate varied notes from base pattern
   */
  generateVariedNotes() {
    const varied = [];
    let noteIndex = 0;
    
    for (const baseNote of this.baseNotes) {
      // Apply density modifier (skip some notes if density < 1.0)
      if (this.random() > this.variationConfig.densityModifier) {
        continue; // Skip this note
      }
      
      // Add timing jitter
      const timingJitter = (this.random() - 0.5) * 2 * this.variationConfig.timingJitter / 1000;
      const variedTime = baseNote.time + timingJitter;
      
      // Key variation (small chance to change key)
      let variedKey = baseNote.key;
      if (this.random() < this.variationConfig.keyVariationChance) {
        const keys = ['W', 'A', 'S', 'D'];
        const currentKeyIndex = keys.indexOf(baseNote.key);
        // Pick adjacent key or random
        if (this.random() < 0.5 && currentKeyIndex >= 0) {
          // Adjacent key
          const direction = this.random() < 0.5 ? -1 : 1;
          const newIndex = Math.max(0, Math.min(3, currentKeyIndex + direction));
          variedKey = keys[newIndex];
        } else {
          // Random key
          variedKey = keys[Math.floor(this.random() * 4)];
        }
      }
      
      // Hold note duration variation
      let variedDuration = baseNote.duration || 0;
      if (baseNote.hold) {
        const durationVariance = (this.random() - 0.5) * 2 * this.variationConfig.holdDurationVariance;
        variedDuration = Math.max(0.1, baseNote.duration + durationVariance);
      }
      
      // Create varied note
      const variedNote = {
        ...baseNote,
        time: variedTime,
        key: variedKey,
        duration: variedDuration,
        baseTime: baseNote.time, // Keep original for validation
        baseKey: baseNote.key,   // Keep original for validation
        variationSeed: this.seed, // For server validation
        noteIndex: noteIndex++
      };
      
      varied.push(variedNote);
    }
    
    // Sort by time (jitter may have changed order)
    varied.sort((a, b) => a.time - b.time);
    
    return varied;
  }
  
  /**
   * Get notes that should spawn at current time
   * @param {number} currentTime - Current game time
   * @param {number} lookAhead - How far ahead to look (seconds)
   * @returns {Array} Notes to spawn
   */
  getNotesToSpawn(currentTime, lookAhead = 2.0) {
    return this.variedNotes.filter(note => {
      const spawnTime = note.time - 2.0; // Notes spawn 2 seconds before hit time
      return spawnTime >= currentTime && spawnTime <= currentTime + lookAhead;
    });
  }
  
  /**
   * Get all notes (for debugging/validation)
   */
  getAllNotes() {
    return this.variedNotes;
  }
  
  /**
   * Get session seed (for server validation)
   */
  getSessionSeed() {
    return this.sessionSeed;
  }
}

/**
 * Create hybrid generator from JSON notes
 * @param {Array} jsonNotes - Notes from JSON file
 * @param {Object} variationConfig - Variation configuration
 * @returns {HybridNoteGenerator} Generator instance
 */
export function createHybridGenerator(jsonNotes, variationConfig = {}) {
  return new HybridNoteGenerator(jsonNotes, variationConfig);
}

/**
 * Server-side validation function
 * Validates that client inputs match expected variations
 * 
 * @param {Array} clientInputs - Inputs from client [{time, key, ...}]
 * @param {Array} baseNotes - Original JSON notes
 * @param {number} sessionSeed - Seed used for variations
 * @param {Object} variationConfig - Same config used by client
 * @returns {Object} Validation result {valid: boolean, score: number, issues: Array}
 */
export function validateClientInputs(clientInputs, baseNotes, sessionSeed, variationConfig) {
  // Recreate generator with same seed
  const generator = new HybridNoteGenerator(baseNotes, {
    ...variationConfig,
    seed: sessionSeed
  });
  
  const expectedNotes = generator.getAllNotes();
  const issues = [];
  let matchCount = 0;
  let totalExpected = expectedNotes.length;
  
  // Validate each client input
  for (const input of clientInputs) {
    // Find matching expected note
    const expected = expectedNotes.find(note => {
      const timeDiff = Math.abs(note.time - input.time);
      const timeTolerance = variationConfig.timingJitter / 1000 + 0.05; // Jitter + 50ms tolerance
      return timeDiff < timeTolerance && note.key === input.key;
    });
    
    if (expected) {
      matchCount++;
    } else {
      issues.push({
        input,
        reason: 'No matching expected note found'
      });
    }
  }
  
  // Check for missing inputs
  const inputTimes = clientInputs.map(i => i.time);
  const missing = expectedNotes.filter(note => {
    const hasMatch = inputTimes.some(time => Math.abs(time - note.time) < 0.1);
    return !hasMatch;
  });
  
  if (missing.length > 0) {
    issues.push({
      reason: 'Missing expected inputs',
      count: missing.length,
      notes: missing.slice(0, 5) // Show first 5
    });
  }
  
  const accuracy = totalExpected > 0 ? matchCount / totalExpected : 0;
  const valid = accuracy > 0.8 && issues.length < totalExpected * 0.2; // 80% accuracy, <20% issues
  
  return {
    valid,
    accuracy,
    matchCount,
    totalExpected,
    issues: issues.slice(0, 10), // Limit issues reported
    score: accuracy * 100
  };
}

