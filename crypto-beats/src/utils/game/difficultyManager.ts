/**
 * Difficulty Manager - Adjusts game parameters and note data based on difficulty level
 */

import { NoteData } from "../data/errorHandler";

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard'
} as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

export interface DifficultyConfig {
  perfectMargin: number;
  goodMargin: number;
  noteFilterRatio: number;
  minNoteGap: number;
  name: string;
  color: string;
}

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyConfig> = {
  [DIFFICULTY_LEVELS.EASY]: {
    // New Easy: Even easier than the old Easy mode
    perfectMargin: 35,    // Very large timing window - very easy to hit perfect
    goodMargin: 80,       // Huge timing window - very easy to hit good
    noteFilterRatio: 0.25, // Keep only 25% of notes (remove ~75%) - much fewer notes
    minNoteGap: 1.0,      // Minimum 1.0s gap between notes - lots of breathing room
    name: 'Easy',
    color: '#00ff00'
  },
  [DIFFICULTY_LEVELS.NORMAL]: {
    // Normal: Uses old Easy settings
    perfectMargin: 25,    // Larger timing window (66% larger than old normal) - easier to hit perfect
    goodMargin: 60,       // Much larger timing window (50% larger than old normal) - easier to hit good
    noteFilterRatio: 0.35, // Keep only 35% of notes (remove ~65%) - fewer notes overall
    minNoteGap: 0.7,      // Minimum 0.7s gap between notes (55% more spacing) - more breathing room
    name: 'Normal',
    color: '#ffff00'
  },
  [DIFFICULTY_LEVELS.HARD]: {
    // Hard: Uses old Normal settings
    perfectMargin: 15,    // Standard timing window
    goodMargin: 40,       // Standard timing window
    noteFilterRatio: 0.75, // Keep 75% of notes (remove ~25%)
    minNoteGap: 0.275,    // Minimum 0.25-0.3s gap between notes
    name: 'Hard',
    color: '#ff0000'
  }
};

/**
 * Filter and modify song data based on difficulty
 * @param songData - Original song data
 * @param difficulty - Difficulty level (easy, normal, hard)
 * @returns Filtered and modified song data
 */
export function adjustSongDataForDifficulty(
  songData: NoteData[],
  difficulty: string
): NoteData[] {
  if (!songData || !Array.isArray(songData)) {
    return songData;
  }

  const config = DIFFICULTY_CONFIG[difficulty as DifficultyLevel];
  if (!config) {
    console.warn(`Unknown difficulty: ${difficulty}, using NORMAL`);
    return adjustSongDataForDifficulty(songData, DIFFICULTY_LEVELS.NORMAL);
  }

  let filteredData = [...songData];
  
  // Note: All hold notes are kept for all difficulties (no conversion/removal)

  // Filter notes based on ratio (keep every Nth note)
  // IMPORTANT: Hold notes are always preserved regardless of ratio
  if (config.noteFilterRatio < 1.0) {
    const keepEvery = Math.round(1 / config.noteFilterRatio);
    filteredData = filteredData.filter((note, index) => {
      // Always keep first note
      if (index === 0) return true;
      // Always keep hold notes
      if (note.hold === true) return true;
      // Keep notes based on ratio
      return index % keepEvery === 0;
    });
  }

  // Sort by time to ensure correct order after filtering
  filteredData.sort((a, b) => a.time - b.time);

  // Remove notes that are too close together (enforce minimum gap)
  // IMPORTANT: Hold notes are always preserved even if they violate minNoteGap
  if (config.minNoteGap > 0) {
    const result: NoteData[] = [];
    for (let i = 0; i < filteredData.length; i++) {
      if (i === 0) {
        result.push(filteredData[i]); // Always keep first note
      } else {
        const isHoldNote = filteredData[i].hold === true;
        const timeGap = filteredData[i].time - result[result.length - 1].time;
        // Always keep hold notes, or keep if gap is sufficient
        if (isHoldNote || timeGap >= config.minNoteGap) {
          result.push(filteredData[i]);
        }
      }
    }
    filteredData = result;
  }

  console.log(`[DifficultyManager] Adjusted song data: ${songData.length} → ${filteredData.length} notes (${difficulty})`);
  
  return filteredData;
}

/**
 * Get difficulty configuration
 * @param difficulty - Difficulty level
 * @returns Difficulty configuration
 */
export function getDifficultyConfig(difficulty: string): DifficultyConfig {
  return DIFFICULTY_CONFIG[difficulty as DifficultyLevel] || DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL];
}

