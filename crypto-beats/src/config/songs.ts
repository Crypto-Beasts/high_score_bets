/**
 * Song configuration for Crypto Beats
 * Add new songs here after converting MIDI files to JSON
 */

export interface SongDifficulties {
  easy: boolean;
  normal: boolean;
  hard: boolean;
}

export interface Song {
  id: string;
  name: string;
  artist: string;
  audioFile: string;
  jsonFile: string;
  coverImage: string | null;
  bpm: number;
  duration: number | null;
  difficulties: SongDifficulties;
  description: string;
}

export const SONGS: Song[] = [
  {
    id: "Aguado_Menuet_Aminor",
    name: "Aguado Menuet (A Minor)",
    artist: "Classical",
    audioFile: "/songs/Aguado_Menuet_Aminor/audio.mp3",
    jsonFile: "/songs/Aguado_Menuet_Aminor/notes.json",
    coverImage: null, // Optional: "/songs/Aguado_Menuet_Aminor/cover.png"
    bpm: 125,
    duration: null, // Will be calculated from JSON if available
    difficulties: {
      easy: true,
      normal: true,
      hard: true
    },
    description: "A beautiful classical guitar piece"
  },
  {
    id: "Windy_Summer",
    name: "Windy Summer",
    artist: "ANRI",
    audioFile: "/songs/Windy_Summer/audio.mp3",
    jsonFile: "/songs/Windy_Summer/notes.json",
    coverImage: null,
    bpm: 120,
    duration: null,
    difficulties: {
      easy: true,
      normal: true,
      hard: true
    },
    description: "A smooth jazz fusion track"
  }
];

/**
 * Get song by ID
 */
export function getSongById(songId: string): Song {
  return SONGS.find(song => song.id === songId) || SONGS[0]; // Fallback to first song
}

/**
 * Get all available songs
 */
export function getAllSongs(): Song[] {
  return SONGS;
}

/**
 * Check if a song supports a specific difficulty
 */
export function songSupportsDifficulty(songId: string, difficulty: string): boolean {
  const song = getSongById(songId);
  if (!song) return false;
  
  const difficultyMap: Record<string, keyof SongDifficulties> = {
    'easy': 'easy',
    'normal': 'normal',
    'hard': 'hard'
  };
  
  const diffKey = difficultyMap[difficulty] || 'normal';
  return song.difficulties[diffKey] === true;
}

