/**
 * Audio Synchronization Utilities
 * Handles audio offset calibration, timing calculations, and variable BPM support
 */

import Phaser from "phaser";

const STORAGE_KEY = 'cryptoBeats_audioOffset';
const DEFAULT_OFFSET = 0; // milliseconds

export interface BPMChange {
  time: number;
  bpm: number;
}

export interface SongMetadata {
  bpm?: number;
  bpmChanges?: BPMChange[];
  [key: string]: any;
}

/**
 * Get audio offset from localStorage
 * @returns Audio offset in milliseconds
 */
export function getAudioOffset(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const offset = parseInt(stored, 10);
      if (!isNaN(offset) && offset >= -500 && offset <= 500) {
        return offset; // Clamp to reasonable range
      }
    }
  } catch (error) {
    console.warn('[audioSync] Error reading audio offset from localStorage:', error);
  }
  return DEFAULT_OFFSET;
}

/**
 * Set audio offset in localStorage
 * @param offset - Audio offset in milliseconds (-500 to 500)
 */
export function setAudioOffset(offset: number): number {
  try {
    const clampedOffset = Math.max(-500, Math.min(500, offset));
    localStorage.setItem(STORAGE_KEY, clampedOffset.toString());
    return clampedOffset;
  } catch (error) {
    console.warn('[audioSync] Error saving audio offset to localStorage:', error);
    return DEFAULT_OFFSET;
  }
}

/**
 * Reset audio offset to default
 */
export function resetAudioOffset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[audioSync] Error resetting audio offset:', error);
  }
}

/**
 * Calculate accurate game time using audio.currentTime when available
 * Falls back to scene time if audio is not available
 * @param audio - Phaser audio object
 * @param currentSceneTime - Current scene time (this.time.now)
 * @param audioStartTime - When audio actually started playing (Date.now() timestamp)
 * @param audioOffset - User-calibrated audio offset in milliseconds
 * @returns Accurate game time in seconds
 */
// WebAudio/HTML5 sounds expose extra fields not present on the BaseSound type.
export type TimedSound = Phaser.Sound.BaseSound & {
  currentTime?: number;
  isDecoded?: boolean;
};

export function getAccurateGameTime(
  audio: Phaser.Sound.BaseSound | null | undefined,
  currentSceneTime: number,
  audioStartTime: number,
  audioOffset: number = 0
): number {
  // Try to use audio.currentTime for most accurate timing
  const timed = audio as TimedSound | null | undefined;
  if (timed && timed.isPlaying && typeof timed.currentTime === "number" && timed.currentTime > 0) {
    // Use audio's internal time, adjusted for offset
    return timed.currentTime + audioOffset / 1000;
  }
  
  // Fallback to scene time calculation using Date.now() for consistency
  // audioStartTime is a Date.now() timestamp, so we compare with current Date.now()
  const currentTime = Date.now();
  const elapsed = (currentTime - audioStartTime) / 1000;
  return elapsed + (audioOffset / 1000);
}

/**
 * Check if audio is ready to play
 * @param audio - Phaser audio object
 * @returns True if audio is ready
 */
export function isAudioReady(audio: Phaser.Sound.BaseSound | null | undefined): boolean {
  if (!audio) return false;

  // Check if audio is loaded
  if (!audio.key || !(audio as TimedSound).isDecoded) {
    return false;
  }
  
  // Check if audio has duration (indicates it's loaded)
  if (audio.duration === undefined || audio.duration === 0) {
    return false;
  }
  
  return true;
}

/**
 * Wait for audio to be ready with timeout
 * @param audio - Phaser audio object
 * @param scene - Phaser scene for delayed calls
 * @param timeout - Maximum wait time in milliseconds (default: 5000)
 * @returns Promise that resolves to true if audio is ready, false if timeout
 */
export function waitForAudioReady(
  audio: Phaser.Sound.BaseSound | null | undefined,
  scene: Phaser.Scene,
  timeout: number = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    if (isAudioReady(audio)) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms
    
    const checkReady = () => {
      if (isAudioReady(audio)) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        console.warn('[audioSync] Audio ready timeout after', timeout, 'ms');
        resolve(false);
        return;
      }
      
      scene.time.delayedCall(checkInterval, checkReady);
    };
    
    checkReady();
  });
}

/**
 * Parse BPM change events from song metadata
 * @param songMetadata - Song metadata object
 * @returns Array of BPM change events
 */
export function parseBPMChanges(songMetadata: SongMetadata | null | undefined): BPMChange[] {
  if (!songMetadata || !songMetadata.bpmChanges) {
    return [];
  }
  
  // If bpmChanges is an array, return it
  if (Array.isArray(songMetadata.bpmChanges)) {
    return songMetadata.bpmChanges.map(change => ({
      time: change.time || 0,
      bpm: change.bpm || 120
    }));
  }
  
  return [];
}

/**
 * Get current BPM at a given time (for variable BPM songs)
 * @param currentTime - Current game time in seconds
 * @param defaultBPM - Default BPM if no changes
 * @param bpmChanges - Array of BPM change events
 * @returns Current BPM
 */
export function getCurrentBPM(
  currentTime: number,
  defaultBPM: number,
  bpmChanges: BPMChange[] = []
): number {
  if (!bpmChanges || bpmChanges.length === 0) {
    return defaultBPM || 120;
  }
  
  // Find the most recent BPM change before current time
  let currentBPM = defaultBPM || 120;
  
  for (let i = bpmChanges.length - 1; i >= 0; i--) {
    if (bpmChanges[i].time <= currentTime) {
      currentBPM = bpmChanges[i].bpm;
      break;
    }
  }
  
  return currentBPM;
}

/**
 * Adjust note timing for variable BPM
 * This converts absolute time to beat-based time accounting for BPM changes
 * @param absoluteTime - Absolute time in seconds
 * @param baseBPM - Base BPM of the song
 * @param bpmChanges - Array of BPM change events
 * @returns Adjusted time in seconds
 */
export function adjustTimeForVariableBPM(
  absoluteTime: number,
  baseBPM: number,
  bpmChanges: BPMChange[] = []
): number {
  if (!bpmChanges || bpmChanges.length === 0) {
    return absoluteTime; // No adjustment needed
  }
  
  // Sort BPM changes by time
  const sortedChanges = [...bpmChanges].sort((a, b) => a.time - b.time);
  
  let adjustedTime = 0;
  let lastTime = 0;
  let lastBPM = baseBPM;
  
  for (const change of sortedChanges) {
    if (change.time > absoluteTime) {
      // Current time is before this BPM change
      const segmentDuration = absoluteTime - lastTime;
      const bpmRatio = lastBPM / baseBPM;
      adjustedTime += segmentDuration * bpmRatio;
      break;
    } else {
      // Process segment up to this BPM change
      const segmentDuration = change.time - lastTime;
      const bpmRatio = lastBPM / baseBPM;
      adjustedTime += segmentDuration * bpmRatio;
      
      lastTime = change.time;
      lastBPM = change.bpm;
    }
  }
  
  // Handle remaining time after last BPM change
  if (lastTime < absoluteTime) {
    const segmentDuration = absoluteTime - lastTime;
    const bpmRatio = lastBPM / baseBPM;
    adjustedTime += segmentDuration * bpmRatio;
  }
  
  return adjustedTime;
}

