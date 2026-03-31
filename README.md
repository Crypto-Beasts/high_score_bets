# High Score Bets — Crypto Beats

A blockchain-powered rhythm game where players compete for real SOL prizes. Hit notes in sync with music, climb the weekly leaderboard, and earn a share of the prize pool.

## How It Works

1. Players pay an entry fee to submit scores to the Solana smart contract
2. Scores are ranked on a weekly leaderboard (top 10)
3. At the end of each week, the prize pool is distributed automatically:
   - 1st place — 50%
   - 2nd place — 30%
   - 3rd place — 20%

## Gameplay

- Press **W / A / S / D** to hit falling notes in sync with the music
- Track your score, streak, and accuracy in real time
- Multiple songs available (converted from MIDI)
- Single-player and multiplayer modes (via Colyseus)

## Tech Stack

| Layer | Technology |
|---|---|
| Game Frontend | Phaser 3, TypeScript, Vite |
| Audio | Howler.js |
| Multiplayer | Colyseus (Node.js) |
| Blockchain | Solana, Anchor Framework (Rust) |
| Song Tooling | Python (MIDI → JSON converter) |

## Project Structure

```
crypto-beats/          # Frontend game (Phaser + TypeScript)
  src/                 # Game scenes: menu, gameplay, debrief, settings
  server/              # Colyseus multiplayer server
  public/              # Songs, images, sounds
scripts/               # MIDI to JSON conversion utility
programs/
  high_score_bets/     # Solana smart contract (Rust/Anchor)
tests/                 # Smart contract test suite
```

## Getting Started

```bash
# Install dependencies
yarn install

# Start the game (dev)
cd crypto-beats && yarn dev

# Convert a MIDI file to game note data
yarn midi-convert

# Run smart contract tests
anchor test
```

## Smart Contract

The on-chain program manages:
- Weekly leaderboard with top 10 rankings
- Automatic prize distribution to top 3 players
- Role-based access (admin / player)
- Weekly reset after payout

Built with [Anchor](https://www.anchor-lang.com/) on Solana.
