/**
 * Difficulty Manager - Adjusts game parameters and note data based on difficulty level
 */

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard'
};

export const DIFFICULTY_CONFIG = {
  [DIFFICULTY_LEVELS.EASY]: {
    perfectMargin: 25,    // Larger timing window (66% larger than normal) - easier to hit perfect
    goodMargin: 60,       // Much larger timing window (50% larger than normal) - easier to hit good
    noteFilterRatio: 0.35, // Keep only 35% of notes (remove ~65%) - fewer notes overall
    minNoteGap: 0.7,      // Minimum 0.7s gap between notes (55% more spacing) - more breathing room
    name: 'Easy',
    color: '#00ff00'
  },
  [DIFFICULTY_LEVELS.NORMAL]: {
    perfectMargin: 15,    // Configurable, set to normal for now
    goodMargin: 40,       // Configurable, set to normal for now
    noteFilterRatio: 0.75, // Keep 75% of notes (remove ~25%)
    minNoteGap: 0.275,    // Minimum 0.25-0.3s gap between notes
    name: 'Normal',
    color: '#ffff00'
  },
  [DIFFICULTY_LEVELS.HARD]: {
    perfectMargin: 15,    // Configurable, set to normal for now
    goodMargin: 40,        // Configurable, set to normal for now
    noteFilterRatio: 1.0,  // Keep 100% of notes
    minNoteGap: 0.1,       // Allow very close notes (0.1s or less)
    name: 'Hard',
    color: '#ff0000'
  }
};

/**
 * Filter and modify song data based on difficulty
 * @param {Array} songData - Original song data
 * @param {string} difficulty - Difficulty level (easy, normal, hard)
 * @returns {Array} Filtered and modified song data
 */
export function adjustSongDataForDifficulty(songData, difficulty) {
  if (!songData || !Array.isArray(songData)) {
    return songData;
  }

  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    console.warn(`Unknown difficulty: ${difficulty}, using NORMAL`);
    return adjustSongDataForDifficulty(songData, DIFFICULTY_LEVELS.NORMAL);
  }

  let filteredData = [...songData];
  
  // Note: All hold notes are kept for all difficulties (no conversion/removal)

  // Filter notes based on ratio (keep every Nth note)
  if (config.noteFilterRatio < 1.0) {
    const keepEvery = Math.round(1 / config.noteFilterRatio);
    filteredData = filteredData.filter((note, index) => {
      // Always keep first note
      if (index === 0) return true;
      // Keep notes based on ratio
      return index % keepEvery === 0;
    });
  }

  // Sort by time to ensure correct order after filtering
  filteredData.sort((a, b) => a.time - b.time);

  // Remove notes that are too close together (enforce minimum gap)
  if (config.minNoteGap > 0) {
    const result = [];
    for (let i = 0; i < filteredData.length; i++) {
      if (i === 0) {
        result.push(filteredData[i]); // Always keep first note
      } else {
        const timeGap = filteredData[i].time - result[result.length - 1].time;
        if (timeGap >= config.minNoteGap) {
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
 * @param {string} difficulty - Difficulty level
 * @returns {Object} Difficulty configuration
 */
export function getDifficultyConfig(difficulty) {
  return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL];
}
