/**
 * Procedural Note Generator
 * Generates notes in real-time based on audio analysis
 * This makes each playthrough unique and unpredictable for bots
 */

export class ProceduralNoteGenerator {
  constructor(scene, audioContext, audioSource, difficulty = 'normal') {
    this.scene = scene;
    this.audioContext = audioContext;
    this.audioSource = audioSource;
    this.difficulty = difficulty;
    
    // Audio analysis setup
    this.analyser = null;
    this.dataArray = null;
    this.bufferLength = 0;
    
    // Beat detection
    this.beatThreshold = 0.3; // Adjust based on music
    this.lastBeatTime = 0;
    this.beatHistory = [];
    this.energyHistory = [];
    
    // Note generation
    this.generatedNotes = [];
    this.lastNoteTime = 0;
    this.noteSpawnInterval = 0.2; // Minimum time between notes (seconds)
    
    // Frequency bands for key mapping
    this.frequencyBands = {
      bass: { min: 0, max: 250 },      // W key
      midLow: { min: 250, max: 500 },   // A key
      midHigh: { min: 500, max: 2000 }, // S key
      treble: { min: 2000, max: 20000 } // D key
    };
    
    // Difficulty modifiers
    this.difficultyModifiers = {
      easy: { noteDensity: 0.6, timingVariance: 20, keyVariation: 0.1 },
      normal: { noteDensity: 1.0, timingVariance: 10, keyVariation: 0.05 },
      hard: { noteDensity: 1.4, timingVariance: 5, keyVariation: 0.02 },
      expert: { noteDensity: 2.0, timingVariance: 2, keyVariation: 0.01 }
    };
    
    this.modifier = this.difficultyModifiers[difficulty] || this.difficultyModifiers.normal;
    
    // Initialize audio analysis
    this.initializeAudioAnalysis();
  }
  
  /**
   * Initialize Web Audio API analysis
   */
  initializeAudioAnalysis() {
    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // Higher = more frequency resolution
    this.analyser.smoothingTimeConstant = 0.8; // Smoothing factor
    
    // Connect audio source to analyser
    if (this.audioSource) {
      this.audioSource.connect(this.analyser);
    }
    
    // Create data arrays
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    console.log('[ProceduralGenerator] Audio analysis initialized');
  }
  
  /**
   * Get current audio features
   * @returns {Object} Audio features (frequencies, energy, etc.)
   */
  getAudioFeatures() {
    if (!this.analyser) return null;
    
    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate energy in each frequency band
    const bands = {
      bass: 0,
      midLow: 0,
      midHigh: 0,
      treble: 0,
      total: 0
    };
    
    const nyquist = this.audioContext.sampleRate / 2;
    const binSize = nyquist / this.bufferLength;
    
    for (let i = 0; i < this.bufferLength; i++) {
      const frequency = i * binSize;
      const amplitude = this.dataArray[i] / 255.0;
      
      bands.total += amplitude;
      
      if (frequency < 250) {
        bands.bass += amplitude;
      } else if (frequency < 500) {
        bands.midLow += amplitude;
      } else if (frequency < 2000) {
        bands.midHigh += amplitude;
      } else {
        bands.treble += amplitude;
      }
    }
    
    // Normalize
    bands.bass /= this.bufferLength;
    bands.midLow /= this.bufferLength;
    bands.midHigh /= this.bufferLength;
    bands.treble /= this.bufferLength;
    bands.total /= this.bufferLength;
    
    return bands;
  }
  
  /**
   * Detect beats using energy-based algorithm
   * @param {number} currentTime - Current audio time
   * @returns {boolean} True if beat detected
   */
  detectBeat(currentTime) {
    const features = this.getAudioFeatures();
    if (!features) return false;
    
    const energy = features.total;
    
    // Calculate average energy over recent history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > 43) { // ~1 second at 60fps
      this.energyHistory.shift();
    }
    
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((sum, val) => sum + Math.pow(val - avgEnergy, 2), 0) / this.energyHistory.length;
    const threshold = avgEnergy + (variance * this.beatThreshold);
    
    // Beat detected if energy exceeds threshold and enough time has passed
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const minBeatInterval = 0.2; // Minimum 200ms between beats
    
    if (energy > threshold && timeSinceLastBeat > minBeatInterval) {
      this.lastBeatTime = currentTime;
      this.beatHistory.push(currentTime);
      if (this.beatHistory.length > 10) {
        this.beatHistory.shift();
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Map frequency bands to game keys
   * @param {Object} bands - Frequency band energies
   * @returns {string} Key to press (W, A, S, D)
   */
  mapFrequencyToKey(bands) {
    // Find dominant frequency band
    const bandValues = [
      { key: 'W', value: bands.bass },
      { key: 'A', value: bands.midLow },
      { key: 'S', value: bands.midHigh },
      { key: 'D', value: bands.treble }
    ];
    
    // Sort by energy
    bandValues.sort((a, b) => b.value - a.value);
    
    // Select key based on dominant band, with some variation
    let selectedKey = bandValues[0].key;
    
    // Add randomization based on difficulty
    if (Math.random() < this.modifier.keyVariation) {
      // Occasionally pick a different key for variety
      const randomIndex = Math.floor(Math.random() * 4);
      selectedKey = ['W', 'A', 'S', 'D'][randomIndex];
    }
    
    return selectedKey;
  }
  
  /**
   * Generate a note based on current audio state
   * @param {number} currentTime - Current audio time
   * @returns {Object|null} Note object or null if no note should spawn
   */
  generateNote(currentTime) {
    // Check if enough time has passed since last note
    if (currentTime - this.lastNoteTime < this.noteSpawnInterval * this.modifier.noteDensity) {
      return null;
    }
    
    const features = this.getAudioFeatures();
    if (!features) return null;
    
    // Detect beat
    const beatDetected = this.detectBeat(currentTime);
    
    // Generate note if:
    // 1. Beat detected, OR
    // 2. Energy is high enough (loud section)
    const shouldSpawn = beatDetected || features.total > 0.3;
    
    if (!shouldSpawn) {
      return null;
    }
    
    // Map frequency to key
    const key = this.mapFrequencyToKey(features);
    
    // Determine if it's a hold note (sustained frequency)
    const isHold = features.total > 0.5 && Math.random() < 0.3; // 30% chance if energy is high
    const holdDuration = isHold ? 0.5 + Math.random() * 1.0 : 0; // 0.5-1.5 seconds
    
    // Add timing variance (makes it unpredictable)
    const timingVariance = (Math.random() - 0.5) * this.modifier.timingVariance / 1000; // Convert to seconds
    const spawnTime = currentTime + timingVariance;
    
    // Create note object
    const note = {
      time: spawnTime,
      key: key,
      duration: holdDuration,
      hold: isHold,
      generated: true, // Mark as procedurally generated
      audioFeatures: {
        energy: features.total,
        beatDetected: beatDetected
      }
    };
    
    this.lastNoteTime = currentTime;
    this.generatedNotes.push(note);
    
    return note;
  }
  
  /**
   * Get all notes that should spawn up to a given time
   * @param {number} currentTime - Current audio time
   * @param {number} lookAhead - How far ahead to generate (seconds)
   * @returns {Array} Array of notes to spawn
   */
  getNotesToSpawn(currentTime, lookAhead = 2.0) {
    const notesToSpawn = [];
    const endTime = currentTime + lookAhead;
    
    // Generate notes up to lookAhead time
    while (this.lastNoteTime < endTime) {
      const note = this.generateNote(this.lastNoteTime + 0.1); // Check every 100ms
      if (note && note.time <= endTime) {
        notesToSpawn.push(note);
      }
      
      // Safety: prevent infinite loop
      if (this.lastNoteTime >= endTime) break;
    }
    
    // Filter notes that should spawn now
    return notesToSpawn.filter(note => 
      note.time >= currentTime && 
      note.time <= currentTime + lookAhead
    );
  }
  
  /**
   * Reset generator for new song
   */
  reset() {
    this.generatedNotes = [];
    this.lastNoteTime = 0;
    this.lastBeatTime = 0;
    this.beatHistory = [];
    this.energyHistory = [];
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.dataArray = null;
  }
}

/**
 * Create procedural note generator from Phaser audio
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {Phaser.Sound.BaseSound} phaserAudio - Phaser audio object
 * @param {string} difficulty - Difficulty level
 * @returns {ProceduralNoteGenerator|null} Generator instance or null if Web Audio API not available
 */
export function createProceduralGenerator(scene, phaserAudio, difficulty = 'normal') {
  // Check if Web Audio API is available
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
    console.warn('[ProceduralGenerator] Web Audio API not available');
    return null;
  }
  
  try {
    // Create AudioContext
    const AudioContextClass = AudioContext || webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Get audio element from Phaser (if available)
    // Note: This requires accessing Phaser's internal audio system
    // May need to use HTML5 audio element directly instead
    
    // For now, return null - would need to refactor audio loading
    // to use Web Audio API directly instead of Phaser's audio system
    console.warn('[ProceduralGenerator] Direct Phaser integration not yet implemented');
    return null;
    
    // Future implementation:
    // const audioSource = audioContext.createMediaElementSource(audioElement);
    // return new ProceduralNoteGenerator(scene, audioContext, audioSource, difficulty);
  } catch (error) {
    console.error('[ProceduralGenerator] Error creating generator:', error);
    return null;
  }
}

