// Client-side types matching server GameRoomState
// These should match the server schema

// Minimal structural type for the Colyseus MapSchema we receive at runtime.
// The schema is iterable and exposes Map-like accessors, so model just what we use.
export interface ColyseusMap<T> {
  get(key: string): T | undefined;
  values(): IterableIterator<T>;
  forEach(callback: (value: T, key: string) => void): void;
  readonly size: number;
  [Symbol.iterator](): IterableIterator<[string, T]>;
  // Colyseus schema change listeners (present at runtime on MapSchema).
  onAdd?(callback: (item: T, key: string) => void, triggerAll?: boolean): void;
  onChange?(callback: (item: T, key: string) => void): void;
  onRemove?(callback: (item: T, key: string) => void): void;
}

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
  players: ColyseusMap<PlayerSchema>;
  status: string; // waiting, starting, playing, finished
  song: string;
  difficulty: string;
  startTime: number;
  roomId: string;
}

