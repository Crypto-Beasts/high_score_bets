import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HighScoreBets } from "../target/types/high_score_bets";
import { assert } from "chai";

describe("high_score_bets", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.HighScoreBets as Program<HighScoreBets>;

  // Generate Keypairs
  const admin = anchor.web3.Keypair.generate();
  const player1 = anchor.web3.Keypair.generate();
  const player2 = anchor.web3.Keypair.generate();
  const player3 = anchor.web3.Keypair.generate();

  // PDAs
  let leaderboardPDA;
  let potPDA;

  before(async () => {
    console.log("🚀 Setting up the test environment...");

    // Find PDAs
    [leaderboardPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("leaderboard"), admin.publicKey.toBuffer()],
      program.programId
    );

    [potPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pot"), admin.publicKey.toBuffer()],
      program.programId
    );

    console.log("🏆 Leaderboard PDA:", leaderboardPDA.toBase58());
    console.log("💰 Pot PDA:", potPDA.toBase58());

    // Airdrop SOL to admin and players for transactions
    for (const user of [admin, player1, player2, player3]) {
      console.log(`💸 Airdropping SOL to ${user.publicKey.toBase58()}...`);
      const txSignature = await provider.connection.requestAirdrop(
        user.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: txSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      console.log("✅ Airdrop confirmed:", user.publicKey.toBase58());
    }

    // Initialize Leaderboard
    console.log("📌 Initializing leaderboard account...");
    await program.methods.initializeLeaderboard()
      .accounts({
        leaderboard: leaderboardPDA,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    console.log("✅ Leaderboard initialized!");

    // ✅ Initialize Pot before using it
    console.log("📌 Initializing Pot account...");
    await program.methods.initializePot()
      .accounts({
        pot: potPDA,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    console.log("✅ Pot initialized!");
  });


  it("Player 1 submits a score", async () => {
    console.log("Player 1 submitting a score...");

    const [playerScorePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player_score"), player1.publicKey.toBuffer()],
      program.programId
    );

    console.log("Player 1 Score PDA:", playerScorePDA.toBase58());

    const actionHash = new Uint8Array(32).fill(0);
    const actionHashArray = Array.from(actionHash);
    const timestamp = new anchor.BN(Date.now() / 1000);

    console.log(actionHash);
    
    await program.methods
      .submitScore(new anchor.BN(500), actionHashArray, timestamp)
      .accounts({
        playerScore: playerScorePDA,
        initializer: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log("Score submitted!");

    const scoreAccount = await program.account.playerScore.fetch(playerScorePDA);
    console.log("Player 1 Best Score:", scoreAccount.bestScore.toNumber());
    assert.equal(scoreAccount.bestScore.toNumber(), 500, "Score should be 500");
  });

  it("Multiple players submit scores", async () => {
    console.log("Multiple players submitting scores...");

    const players = [
      { keypair: player2, score: 800 },
      { keypair: player3, score: 300 },
    ];

    for (const player of players) {
      console.log(`Player ${player.keypair.publicKey.toBase58()} submitting...`);

      const [playerScorePDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("player_score"), player.keypair.publicKey.toBuffer()],
        program.programId
      );

      const actionHash = new Uint8Array(32).fill(0);
      const actionHashArray = Array.from(actionHash);
      const timestamp = new anchor.BN(Date.now() / 1000);

      await program.methods
        .submitScore(new anchor.BN(player.score), actionHashArray, timestamp)
        .accounts({
          playerScore: playerScorePDA,
          initializer: player.keypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player.keypair])
        .rpc();

      console.log(`Player ${player.keypair.publicKey.toBase58()} submitted!`);

      const scoreAccount = await program.account.playerScore.fetch(playerScorePDA);
      console.log("Best Score:", scoreAccount.bestScore.toNumber());
      assert.equal(scoreAccount.bestScore.toNumber(), player.score, `Score should be ${player.score}`);
    }
  });

  it("Distribute rewards to top players", async () => {
    console.log("💰 Distributing rewards...");
    await program.methods
      .distributeRewards()
      .accounts({
        pot: potPDA,
        leaderboard: leaderboardPDA,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Rewards distributed!");
  });
  
  it("Admin resets leaderboard", async () => {
    console.log("Resetting leaderboard...");

    await program.methods
      .resetWeeklyLeaderboard()
      .accounts({
        leaderboard: leaderboardPDA,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Leaderboard reset!");
  });


});
