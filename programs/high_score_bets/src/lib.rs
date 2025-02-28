use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::clock::Clock;

declare_id!("2r9LfxQ588QkQUgSfqojY5k2pJptHdhys3y7nC92hwUP");

#[program]
pub mod high_score_bets {
    use super::*;

    pub fn submit_score(ctx: Context<SubmitScore>, final_score: u64, action_hash: [u8; 32], timestamp: i64) -> Result<()> {
        let player_score = &mut ctx.accounts.player_score;
    
        // Save the best score
        if final_score > player_score.best_score {
            player_score.best_score = final_score;
        }
    
        // Save action hash for replay verification
        player_score.last_action_hash = action_hash;
        player_score.last_timestamp = timestamp; 
    
        msg!("Score submitted: {} for player {}", final_score, ctx.accounts.initializer.key());
    
        Ok(())
    }
    

    pub fn reset_weekly_leaderboard(ctx: Context<ResetLeaderboard>) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        leaderboard.top_player_keys.clear(); 
        leaderboard.last_reset = Clock::get()?.unix_timestamp;
        Ok(())
    }
    

    pub fn distribute_rewards(ctx: Context<DistributeRewards>) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        let pot = &mut ctx.accounts.pot;
        let clock = Clock::get()?;
    
        // Send SOL to top 3 players
        for (index, player_key) in leaderboard.top_player_keys.iter().enumerate() {
            let reward_amount = match index {
                0 => pot.total_amount * 50 / 100, // 50% to 1st place
                1 => pot.total_amount * 30 / 100, // 30% to 2nd place
                2 => pot.total_amount * 20 / 100, // 20% to 3rd place
                _ => 0,
            };
    
            if reward_amount > 0 {
                // Transfer SOL to the player's account
                invoke(
                    &system_instruction::transfer(
                        &pot.to_account_info().key(),  // Sender (pot)
                        &player_key.key(),             // Receiver (player)
                        reward_amount,                 // Amount in lamports
                    ),
                    &[
                        pot.to_account_info(),
                        ctx.accounts.system_program.to_account_info(),
                    ],
                )?;
            }
        }
        
        // Reset leaderboard after rewards are distributed
        leaderboard.top_player_keys.clear();
        leaderboard.last_reset = clock.unix_timestamp;
        
        pot.total_amount = 0; // Reset the pot
        Ok(())
    }
    
}

/// Leaderboard storing the best scores
#[account]
pub struct Leaderboard {
    pub top_player_keys: Vec<Pubkey>, // Only stores player public keys, not full data
    pub last_reset: i64,
    // We should add a Surname, the leaderboard should not show the pub keys, we should store them, but not show them.
    // We need to add the Scores of the players, new branch
}

/// Player's Score Account
#[account]
pub struct PlayerScore {
    pub best_score: u64,
    pub last_action_hash: [u8; 32],
    pub last_timestamp: i64,
}

/// Betting Pot
#[account]
pub struct Pot {
    pub total_amount: u64,
}

/// Submit a new score
#[derive(Accounts)]
pub struct SubmitScore<'info> {
    #[account(
        init_if_needed,
        payer = initializer,
        space = 8 + 64,
        seeds = [b"player_score", initializer.key().as_ref()],
        bump
    )]
    pub player_score: Account<'info, PlayerScore>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    pub system_program: Program<'info, System>,
}


/// Reset the leaderboard
#[derive(Accounts)]
pub struct ResetLeaderboard<'info> {
    #[account(
        mut,
        seeds = [b"leaderboard", admin.key().as_ref()],
        bump,
    )]
    pub leaderboard: Account<'info, Leaderboard>, 

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Distribute rewards
#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [b"pot", admin.key().as_ref()],
        bump,
    )]
    pub pot: Account<'info, Pot>, 

    #[account(mut)]
    pub leaderboard: Account<'info, Leaderboard>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Custom Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid timestamp detected.")]
    InvalidTimestamp,
    #[msg("Duplicate submission detected.")]
    DuplicateSubmission,
    #[msg("This winner is invalid.")]
    InvalidWinner,
    #[msg("Rewards were already distributed this week.")]
    RewardsAlreadyPaid,
}
