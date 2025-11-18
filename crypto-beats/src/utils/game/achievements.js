/**
 * Achievement System
 * Manages unlockable achievements and tracks player progress
 */

const STORAGE_KEY = 'cryptoBeats_achievements';
const PROGRESS_KEY = 'cryptoBeats_progress';

/**
 * Achievement definitions
 */
export const ACHIEVEMENTS = {
  FIRST_PERFECT: {
    id: 'first_perfect',
    name: 'First Perfect',
    description: 'Get 100% accuracy on any song',
    icon: '🎯',
    check: (progress, gameData) => {
      // Check if any song has 100% accuracy
      return gameData.accuracy >= 100;
    }
  },
  COMBO_MASTER: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Reach 100x combo',
    icon: '🔥',
    check: (progress, gameData) => {
      // Check if longest streak reached 100
      return gameData.longestStreak >= 100;
    }
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete hard difficulty',
    icon: '⚡',
    check: (progress, gameData) => {
      // Check if completed on hard difficulty
      return gameData.difficulty === 'hard' && !gameData.failed;
    }
  },
  COMPLETIONIST: {
    id: 'completionist',
    name: 'Completionist',
    description: 'Play all songs',
    icon: '🎵',
    check: (progress, gameData) => {
      // Check if all songs have been played
      const allSongs = progress.songsPlayed || [];
      const totalSongs = gameData.totalSongs || 0;
      return allSongs.length >= totalSongs && totalSongs > 0;
    }
  },
  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get S rank on all songs',
    icon: '⭐',
    check: (progress, gameData) => {
      // Check if all songs have S rank
      const sRanks = progress.sRanks || [];
      const totalSongs = gameData.totalSongs || 0;
      return sRanks.length >= totalSongs && totalSongs > 0;
    }
  }
};

/**
 * Get all unlocked achievements from localStorage
 * @returns {Object} Object with achievement IDs as keys and unlock timestamps as values
 */
export function getUnlockedAchievements() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[achievements] Error reading achievements from localStorage:', error);
  }
  return {};
}

/**
 * Unlock an achievement
 * @param {string} achievementId - Achievement ID to unlock
 * @returns {boolean} True if newly unlocked, false if already unlocked
 */
export function unlockAchievement(achievementId) {
  try {
    const unlocked = getUnlockedAchievements();
    
    // Check if already unlocked
    if (unlocked[achievementId]) {
      return false;
    }
    
    // Unlock achievement
    unlocked[achievementId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    return true;
  } catch (error) {
    console.warn('[achievements] Error unlocking achievement:', error);
    return false;
  }
}

/**
 * Check if an achievement is unlocked
 * @param {string} achievementId - Achievement ID to check
 * @returns {boolean} True if unlocked
 */
export function isAchievementUnlocked(achievementId) {
  const unlocked = getUnlockedAchievements();
  return !!unlocked[achievementId];
}

/**
 * Get player progress from localStorage
 * @returns {Object} Progress object
 */
export function getPlayerProgress() {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[achievements] Error reading progress from localStorage:', error);
  }
  return {
    songsPlayed: [],
    sRanks: [],
    maxCombo: 0,
    songsCompleted: {}
  };
}

/**
 * Update player progress
 * @param {Object} update - Progress update object
 */
export function updatePlayerProgress(update) {
  try {
    const progress = getPlayerProgress();
    
    // Merge updates
    Object.assign(progress, update);
    
    // Ensure arrays exist
    if (!progress.songsPlayed) progress.songsPlayed = [];
    if (!progress.sRanks) progress.sRanks = [];
    if (!progress.songsCompleted) progress.songsCompleted = {};
    
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('[achievements] Error updating progress:', error);
  }
}

/**
 * Record a song completion
 * @param {string} songId - Song ID
 * @param {string} difficulty - Difficulty level
 * @param {number} accuracy - Accuracy percentage
 * @param {string} grade - Grade (S, A, B, C, D, F)
 * @param {number} longestStreak - Longest combo streak
 */
export function recordSongCompletion(songId, difficulty, accuracy, grade, longestStreak) {
  const progress = getPlayerProgress();
  
  // Track songs played (unique)
  if (!progress.songsPlayed.includes(songId)) {
    progress.songsPlayed.push(songId);
  }
  
  // Track S ranks (unique)
  if (grade === 'S' && !progress.sRanks.includes(songId)) {
    progress.sRanks.push(songId);
  }
  
  // Track max combo
  if (longestStreak > (progress.maxCombo || 0)) {
    progress.maxCombo = longestStreak;
  }
  
  // Track song completion details
  if (!progress.songsCompleted[songId]) {
    progress.songsCompleted[songId] = {};
  }
  
  const songData = progress.songsCompleted[songId];
  if (!songData[difficulty] || accuracy > songData[difficulty].accuracy) {
    songData[difficulty] = {
      accuracy,
      grade,
      longestStreak,
      timestamp: Date.now()
    };
  }
  
  updatePlayerProgress(progress);
}

/**
 * Check achievements based on game data
 * @param {Object} gameData - Game result data
 * @param {number} totalSongs - Total number of songs available
 * @returns {Array} Array of newly unlocked achievement IDs
 */
export function checkAchievements(gameData, totalSongs = 0) {
  const progress = getPlayerProgress();
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked = [];
  
  // Prepare game data with progress info
  const fullGameData = {
    ...gameData,
    totalSongs,
    progress
  };
  
  // Check each achievement
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    // Skip if already unlocked
    if (unlocked[achievement.id]) {
      return;
    }
    
    // Check if achievement condition is met
    if (achievement.check(progress, fullGameData)) {
      if (unlockAchievement(achievement.id)) {
        newlyUnlocked.push(achievement.id);
      }
    }
  });
  
  return newlyUnlocked;
}

/**
 * Get achievement info by ID
 * @param {string} achievementId - Achievement ID
 * @returns {Object|null} Achievement object or null
 */
export function getAchievement(achievementId) {
  return ACHIEVEMENTS[achievementId] || Object.values(ACHIEVEMENTS).find(a => a.id === achievementId) || null;
}

/**
 * Get all achievements with unlock status
 * @returns {Array} Array of achievement objects with unlock status
 */
export function getAllAchievements() {
  const unlocked = getUnlockedAchievements();
  
  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: !!unlocked[achievement.id],
    unlockedAt: unlocked[achievement.id] || null
  }));
}

/**
 * Get achievement progress percentage
 * @returns {number} Percentage of achievements unlocked (0-100)
 */
export function getAchievementProgress() {
  const unlocked = getUnlockedAchievements();
  const total = Object.keys(ACHIEVEMENTS).length;
  const unlockedCount = Object.keys(unlocked).length;
  
  return total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
}

