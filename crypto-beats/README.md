# Crypto Beats

A fast-paced 4-lane rhythm game built with [Phaser 3](https://phaser.io/) and TypeScript. Hit the notes in time with the music to build combos and chase high scores — solo, or head-to-head against another player in real-time multiplayer powered by [Colyseus](https://colyseus.io/).

<!-- TODO: add a gameplay GIF/screenshot here — e.g. ![Crypto Beats gameplay](docs/gameplay.gif) -->

## Features

- **4-lane rhythm gameplay** — notes fall down four lanes; hit them on the beat with `W`, `A`, `S`, `D`.
- **Real-time multiplayer** — challenge another player in a 1v1 race, with a live spectator view of your opponent's inputs.
- **Procedural note generation** — charts can be generated from a song's tempo/MIDI data, not just hand-authored.
- **Difficulty scaling** — adjustable difficulty that changes note density and speed.
- **Achievements** — unlockable in-game achievements.
- **Audio calibration** — tune input latency so hits register exactly when you press.
- **Theme selection** — multiple visual color themes.
- **Hold notes & combo scoring** — sustained notes and a combo-based scoring system.

## Tech stack

| Area | Tech |
|------|------|
| Game engine | Phaser 3 |
| Language | TypeScript |
| Bundler / dev server | Vite |
| Audio | Howler.js |
| Multiplayer | Colyseus (client + dedicated server) |
| Chart tooling | Python (MIDI → JSON conversion) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm
- (Optional) Python 3 — only needed to convert your own MIDI files into note charts

### Run the game (single-player)

```bash
cd crypto-beats
npm install
npm run dev
```

Then open the URL Vite prints (default: http://localhost:5174).

### Run multiplayer

Multiplayer needs the Colyseus server running alongside the client.

**Terminal 1 — server:**

```bash
cd crypto-beats/server
npm install
npm run dev          # starts on ws://localhost:2567
```

**Terminal 2 — client:**

```bash
cd crypto-beats
npm install
npm run dev
```

By default the client connects to `ws://localhost:2567`. To point it at a different
server, set `VITE_SERVER_URL` (see `.env.example`).

### Production build

```bash
# Client
npm run build        # outputs to dist/
npm run preview

# Server
cd server
npm run build        # compiles to dist/
npm start
```

## Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Hit the note in the corresponding lane |
| `Esc` | Pause |

## Project structure

```
crypto-beats/
├── src/
│   ├── scenes/
│   │   ├── gameplay/   # GameScene, MultiplayerGameScene, debrief screens
│   │   ├── menus/      # main menu, song selection, multiplayer lobby
│   │   ├── settings/   # achievements, audio calibration, themes
│   │   └── ui/         # shared UI overlay
│   ├── utils/
│   │   ├── audio/      # note generators, audio sync
│   │   ├── game/       # scoring, input, notes, difficulty, object pooling
│   │   ├── ui/         # layout, responsive helpers, themes
│   │   └── data/       # error handling
│   ├── config/         # song definitions
│   └── types/          # shared multiplayer types
├── server/             # Colyseus multiplayer server
│   └── rooms/          # GameRoom + room state schema
├── scripts/            # Python MIDI → JSON chart tools
└── public/             # static assets (images, sounds, charts)
```

## Converting your own songs

Charts are JSON note maps. You can generate one from a MIDI file:

```bash
npm run convert-midi:custom path/to/song.mid public/your_song.json
npm run validate-json
```

Then register it in `src/config/songs.ts`.

## Known limitations

- Scores reported to the multiplayer server are currently trusted from the client;
  there is no server-side anti-cheat validation yet.

## License

MIT — see [LICENSE](../LICENSE).
