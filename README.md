# High Score Bets

A rhythm game with an on-chain high-score leaderboard. The repo has two parts:

- **[`crypto-beats/`](crypto-beats/)** — the game: a 4-lane rhythm game built with Phaser 3 + TypeScript, with real-time multiplayer via Colyseus. **Start here** — see the [game README](crypto-beats/README.md) to play.
- **[`programs/high_score_bets/`](programs/high_score_bets/)** — a [Solana](https://solana.com/) [Anchor](https://www.anchor-lang.com/) program for an on-chain leaderboard, score submission, and a reward pot.

## Status

⚠️ **The on-chain program is a prototype (devnet only).** It is not audited and is not safe to use with real funds — scores are not verified on-chain, and several instructions lack authority checks. See the game first; the contract is a work in progress.

## Quick start (game)

```bash
cd crypto-beats
npm install
npm run dev
```

Full instructions — including multiplayer — are in [`crypto-beats/README.md`](crypto-beats/README.md).

## The Anchor program

```bash
# Requires the Solana CLI + Anchor toolchain
anchor build
anchor test
```

Program ID (localnet): `2r9LfxQ588QkQUgSfqojY5k2pJptHdhys3y7nC92hwUP`

## License

MIT — see [LICENSE](LICENSE).
