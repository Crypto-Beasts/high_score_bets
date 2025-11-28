"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomState = exports.PlayerSchema = void 0;
const schema_1 = require("@colyseus/schema");
class PlayerSchema extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sessionId = "";
        this.score = 0;
        this.combo = 0;
        this.finished = false;
        this.finalScore = 0;
        this.accuracy = 0;
        this.totalNotes = 0;
        this.notesHit = 0;
        this.longestStreak = 0;
        this.ready = false;
        this.song = "";
        this.difficulty = "normal";
    }
}
exports.PlayerSchema = PlayerSchema;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerSchema.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "combo", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerSchema.prototype, "finished", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "finalScore", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "accuracy", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "totalNotes", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "notesHit", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], PlayerSchema.prototype, "longestStreak", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], PlayerSchema.prototype, "ready", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerSchema.prototype, "song", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], PlayerSchema.prototype, "difficulty", void 0);
class GameRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.status = "waiting"; // waiting, starting, playing, finished
        this.song = "Aguado_Menuet_Aminor";
        this.difficulty = "normal";
        this.startTime = 0;
        this.roomId = "";
    }
}
exports.GameRoomState = GameRoomState;
__decorate([
    (0, schema_1.type)({ map: PlayerSchema }),
    __metadata("design:type", Object)
], GameRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameRoomState.prototype, "status", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameRoomState.prototype, "song", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameRoomState.prototype, "difficulty", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameRoomState.prototype, "startTime", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameRoomState.prototype, "roomId", void 0);
//# sourceMappingURL=GameRoomState.js.map