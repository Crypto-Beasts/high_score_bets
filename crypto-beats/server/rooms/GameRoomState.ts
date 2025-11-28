import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string") sessionId: string = "";
  @type("number") score: number = 0;
  @type("number") combo: number = 0;
  @type("boolean") finished: boolean = false;
  @type("number") finalScore: number = 0;
  @type("number") accuracy: number = 0;
  @type("number") totalNotes: number = 0;
  @type("number") notesHit: number = 0;
  @type("number") longestStreak: number = 0;
  @type("boolean") ready: boolean = false;
  @type("string") song: string = "";
  @type("string") difficulty: string = "normal";
}

export class GameRoomState extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type("string") status: string = "waiting"; // waiting, starting, playing, finished
  @type("string") song: string = "Aguado_Menuet_Aminor";
  @type("string") difficulty: string = "normal";
  @type("number") startTime: number = 0;
  @type("string") roomId: string = "";
}

