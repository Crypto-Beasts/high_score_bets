import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HighScoreBets } from "../target/types/high_score_bets";
import { assert } from "chai";

describe("high_score_bets", () => {
  // Set up provider and program
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.HighScoreBets as Program<HighScoreBets>;

  // Generate Keypairs
  const admin = anchor.web3.Keypair.generate();
  const player1 = anchor.web3.Keypair.generate();
  const player2 = anchor.web3.Keypair.generate();
  const player3 = anchor.web3.Keypair.generate();

  // Derive PDAs
  let leaderboardPDA;
  let potPDA;

  before(async () => {
    // Find PDAs
    [leaderboardPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("leaderboard"), admin.publicKey.toBuffer()],
      program.programId
    );

    [potPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pot"), admin.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to admin and players for transactions
    for (const user of [admin, player1, player2, player3]) {
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          user.publicKey,
          anchor.web3.LAMPORTS_PER_SOL
        )
      );
    }
  });

  it("Player 1 submits a score", async () => {
    const [playerScorePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("player_score"), player1.publicKey.toBuffer()],
      program.programId
    );

    // Simulate in-game actions and generate a hash
    const actionHash = new Uint8Array(32).fill(0); // Replace with actual hash logic
    const actionHashArray = Array.from(actionHash); // Convert Uint8Array to number[]
    
    const timestamp = new anchor.BN(Date.now() / 1000); // Convert JS timestamp to seconds
    
    await program.methods
      .submitScore(new anchor.BN(500), actionHashArray, timestamp)
      .accounts({
        player_score: playerScorePDA, // ✅ Fix: Match Solana program names
        initializer: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    const scoreAccount = await program.account.playerScore.fetch(playerScorePDA);
    assert.equal(scoreAccount.bestScore.toNumber(), 500, "Score should be 500");
  });

  it("Multiple players submit scores", async () => {
    const players = [
      { keypair: player2, score: 800 },
      { keypair: player3, score: 300 },
    ];

    for (const player of players) {
      const [playerScorePDA] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("player_score"), player.keypair.publicKey.toBuffer()],
        program.programId
      );

      const actionHash = new Uint8Array(32).fill(0); // Replace with actual hash logic
      const actionHashArray = Array.from(actionHash); // ✅ Convert Uint8Array to number[]
      
      const timestamp = new anchor.BN(Date.now() / 1000); // Convert JS timestamp to seconds
      
      await program.methods
        .submitScore(new anchor.BN(player.score), actionHashArray, timestamp) // ✅ Fix: Use correct player score
        .accounts({
          player_score: playerScorePDA, 
          initializer: player.keypair.publicKey, // ✅ Fix: Use correct player key
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player.keypair]) // ✅ Fix: Use correct player signer
        .rpc();
      
      const scoreAccount = await program.account.playerScore.fetch(playerScorePDA);
      assert.equal(scoreAccount.bestScore.toNumber(), player.score, `Score should be ${player.score}`);
    }
  });

  it("Admin resets leaderboard", async () => {
    await program.methods
      .resetWeeklyLeaderboard()
      .accounts({
        leaderboard: leaderboardPDA, 
        admin: admin.publicKey,
        programOwner: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const leaderboardAccount = await program.account.leaderboard.fetch(leaderboardPDA);
    assert.equal(
      leaderboardAccount.topPlayerKeys.length, 
      0, 
      "Leaderboard should be empty after reset"
    );
  });

  it("Distribute rewards to top players", async () => {
    await program.methods
      .distributeRewards()
      .accounts({
        pot: potPDA,
        admin: admin.publicKey,
        programOwner: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const potAccount = await program.account.pot.fetch(potPDA);
    assert.equal(
      potAccount.totalAmount.toNumber(), 
      0, 
      "Pot should be empty after distributing rewards"
    );
  });
});
