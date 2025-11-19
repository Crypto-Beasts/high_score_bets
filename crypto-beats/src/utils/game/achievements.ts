/**
 * Achievement System
 * Manages unlockable achievements and tracks player progress
 */

const STORAGE_KEY = 'cryptoBeats_achievements';
const PROGRESS_KEY = 'cryptoBeats_progress';

export interface GameData {
  accuracy?: number;
  difficulty?: string;
  failed?: boolean;
  longestStreak?: number;
  totalSongs?: number;
  progress?: PlayerProgress;
  [key: string]: any;
}

export interface PlayerProgress {
  songsPlayed: string[];
  sRanks: string[];
  maxCombo: number;
  songsCompleted: Record<string, Record<string, SongCompletion>>;
}

export interface SongCompletion {
  accuracy: number;
  grade: string;
  longestStreak: number;
  timestamp: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (progress: PlayerProgress, gameData: GameData) => boolean;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlockedAt: number | null;
}

export interface UnlockedAchievements {
  [achievementId: string]: number; // timestamp
}

/**
 * Achievement definitions
 */
export const ACHIEVEMENTS: Record<string, Achievement> = {
  // Easy achievements - beginner friendly
  FIRST_SONG: {
    id: 'first_song',
    name: 'First Steps',
    description: 'Complete your first song',
    icon: '🎉',
    check: (progress, gameData) => {
      return (progress.songsPlayed || []).length >= 1 && !gameData.failed;
    }
  },
  SMALL_COMBO: {
    id: 'small_combo',
    name: 'Building Momentum',
    description: 'Reach a 5x combo',
    icon: '✨',
    check: (progress, gameData) => {
      return (gameData.longestStreak ?? 0) >= 5;
    }
  },
  EASY_WIN: {
    id: 'easy_win',
    name: 'Getting Started',
    description: 'Complete a song on easy difficulty',
    icon: '👶',
    check: (progress, gameData) => {
      return gameData.difficulty === 'easy' && !gameData.failed;
    }
  },
  PASSING_GRADE: {
    id: 'passing_grade',
    name: 'Not Bad!',
    description: 'Get at least 50% accuracy',
    icon: '👍',
    check: (progress, gameData) => {
      return (gameData.accuracy ?? 0) >= 50;
    }
  },
  CLEAR_SUCCESS: {
    id: 'clear_success',
    name: 'Survivor',
    description: 'Complete any song without failing',
    icon: '✅',
    check: (progress, gameData) => {
      return !gameData.failed && gameData.accuracy !== undefined;
    }
  },
  GOOD_COMBO: {
    id: 'good_combo',
    name: 'On A Roll',
    description: 'Reach a 10x combo',
    icon: '🎊',
    check: (progress, gameData) => {
      return (gameData.longestStreak ?? 0) >= 10;
    }
  },
  TWO_SONGS: {
    id: 'two_songs',
    name: 'Double Play',
    description: 'Complete 2 different songs',
    icon: '🎵',
    check: (progress, gameData) => {
      return (progress.songsPlayed || []).length >= 2;
    }
  },
  DECENT_SCORE: {
    id: 'decent_score',
    name: 'Getting Better',
    description: 'Get at least 70% accuracy',
    icon: '📈',
    check: (progress, gameData) => {
      return (gameData.accuracy ?? 0) >= 70;
    }
  },
  C_GRADE: {
    id: 'c_grade',
    name: 'Average Player',
    description: 'Get a C grade or better',
    icon: '📊',
    check: (progress, gameData) => {
      const grade = gameData.grade;
      if (!grade) return false;
      const gradeOrder = ['S', 'A', 'B', 'C'];
      return gradeOrder.includes(grade.toUpperCase());
    }
  },
  
  // Medium difficulty achievements
  COMBO_CHAMP: {
    id: 'combo_champ',
    name: 'Combo Champion',
    description: 'Reach a 25x combo',
    icon: '🔥',
    check: (progress, gameData) => {
      return (gameData.longestStreak ?? 0) >= 25;
    }
  },
  NORMAL_WIN: {
    id: 'normal_win',
    name: 'Stepping Up',
    description: 'Complete a song on normal difficulty',
    icon: '🎯',
    check: (progress, gameData) => {
      return gameData.difficulty === 'normal' && !gameData.failed;
    }
  },
  GREAT_SCORE: {
    id: 'great_score',
    name: 'Great Performance',
    description: 'Get at least 85% accuracy',
    icon: '🌟',
    check: (progress, gameData) => {
      return (gameData.accuracy ?? 0) >= 85;
    }
  },
  B_GRADE: {
    id: 'b_grade',
    name: 'Above Average',
    description: 'Get a B grade or better',
    icon: '💫',
    check: (progress, gameData) => {
      const grade = gameData.grade;
      if (!grade) return false;
      const gradeOrder = ['S', 'A', 'B'];
      return gradeOrder.includes(grade.toUpperCase());
    }
  },
  
  // Hard achievements - original ones
  FIRST_PERFECT: {
    id: 'first_perfect',
    name: 'First Perfect',
    description: 'Get 100% accuracy on any song',
    icon: '🎯',
    check: (progress, gameData) => {
      // Check if any song has 100% accuracy
      return (gameData.accuracy ?? 0) >= 100;
    }
  },
  COMBO_MASTER: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Reach 100x combo',
    icon: '🔥',
    check: (progress, gameData) => {
      // Check if longest streak reached 100
      return (gameData.longestStreak ?? 0) >= 100;
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
 * @returns Object with achievement IDs as keys and unlock timestamps as values
 */
export function getUnlockedAchievements(): UnlockedAchievements {
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
 * @param achievementId - Achievement ID to unlock
 * @returns True if newly unlocked, false if already unlocked
 */
export function unlockAchievement(achievementId: string): boolean {
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
 * @param achievementId - Achievement ID to check
 * @returns True if unlocked
 */
export function isAchievementUnlocked(achievementId: string): boolean {
  const unlocked = getUnlockedAchievements();
  return !!unlocked[achievementId];
}

/**
 * Get player progress from localStorage
 * @returns Progress object
 */
export function getPlayerProgress(): PlayerProgress {
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
 * @param update - Progress update object
 */
export function updatePlayerProgress(update: Partial<PlayerProgress>): void {
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
 * @param songId - Song ID
 * @param difficulty - Difficulty level
 * @param accuracy - Accuracy percentage
 * @param grade - Grade (S, A, B, C, D, F)
 * @param longestStreak - Longest combo streak
 */
export function recordSongCompletion(
  songId: string,
  difficulty: string,
  accuracy: number,
  grade: string,
  longestStreak: number
): void {
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
 * @param gameData - Game result data
 * @param totalSongs - Total number of songs available
 * @returns Array of newly unlocked achievement IDs
 */
export function checkAchievements(gameData: GameData, totalSongs: number = 0): string[] {
  const progress = getPlayerProgress();
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: string[] = [];
  
  // Prepare game data with progress info
  const fullGameData: GameData = {
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
 * @param achievementId - Achievement ID
 * @returns Achievement object or null
 */
export function getAchievement(achievementId: string): Achievement | null {
  return ACHIEVEMENTS[achievementId] || Object.values(ACHIEVEMENTS).find(a => a.id === achievementId) || null;
}

/**
 * Get all achievements with unlock status
 * @returns Array of achievement objects with unlock status
 */
export function getAllAchievements(): AchievementWithStatus[] {
  const unlocked = getUnlockedAchievements();
  
  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: !!unlocked[achievement.id],
    unlockedAt: unlocked[achievement.id] || null
  }));
}

/**
 * Get achievement progress percentage
 * @returns Percentage of achievements unlocked (0-100)
 */
export function getAchievementProgress(): number {
  const unlocked = getUnlockedAchievements();
  const total = Object.keys(ACHIEVEMENTS).length;
  const unlockedCount = Object.keys(unlocked).length;
  
  return total > 0 ? Math.round((unlockedCount / total) * 100) : 0;
}

