// Client-side types matching server GameRoomState
// These should match the server schema

export interface PlayerSchema {
  sessionId: string;
  score: number;
  combo: number;
  finished: boolean;
  finalScore: number;
  accuracy: number;
  totalNotes: number;
  notesHit: number;
  longestStreak: number;
  ready: boolean;
  song: string;
  difficulty: string;
}

export interface GameRoomState {
  players: { [sessionId: string]: PlayerSchema };
  status: string; // waiting, starting, playing, finished
  song: string;
  difficulty: string;
  startTime: number;
  roomId: string;
}

