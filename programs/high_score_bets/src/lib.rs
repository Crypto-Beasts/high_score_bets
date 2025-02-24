use anchor_lang::prelude::*;
use anchor_lang::solana_program::{self, system_instruction};
use anchor_lang::solana_program::clock::Clock;

declare_id!("2r9LfxQ588QkQUgSfqojY5k2pJptHdhys3y7nC92hwUP");

#[program]
pub mod high_score_bets {
    use super::*;

    /// Submit a new score with verifiable replay protection
    pub fn submit_score(ctx: Context<SubmitScore>, final_score: u64, action_hash: [u8; 32], timestamp: i64) -> Result<()> {
        let player_score = &mut ctx.accounts.player_score;
        let clock = Clock::get()?;

        // Validate timestamp (must be within 1 min)
        require!(timestamp >= clock.unix_timestamp - 60, ErrorCode::InvalidTimestamp);

        // Prevent replay attacks
        require!(player_score.last_action_hash != action_hash, ErrorCode::DuplicateSubmission);

        // Update score only if it's higher
        if final_score > player_score.best_score {
            player_score.best_score = final_score;
            player_score.last_action_hash = action_hash;
            player_score.last_timestamp = timestamp;
        }

        msg!("✅ Verified Score submitted: {} for player {}", final_score, ctx.accounts.initializer.key());
        Ok(())
    }

    /// Resets the weekly leaderboard
    pub fn reset_weekly_leaderboard(ctx: Context<ResetLeaderboard>) -> Result<()> {
        let leaderboard = &mut ctx.accounts.leaderboard;
        leaderboard.top_scores.clear();
        leaderboard.last_reset = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Distributes rewards to the top 3 players
    pub fn distribute_rewards(ctx: Context<DistributeRewards>) -> Result<()> {
        let pot = &mut ctx.accounts.pot;
        let leaderboard = &ctx.accounts.leaderboard;
        let clock = Clock::get()?;

        // Prevent duplicate reward distribution
        require!(leaderboard.last_reset + 604800 < clock.unix_timestamp, ErrorCode::RewardsAlreadyPaid); // 1 week

        for (index, player) in leaderboard.top_scores.iter().enumerate() {
            let reward_amount = match index {
                0 => pot.total_amount * 50 / 100, // 50% to 1st place
                1 => pot.total_amount * 30 / 100, // 30% to 2nd place
                2 => pot.total_amount * 20 / 100, // 20% to 3rd place
                _ => 0,
            };

            // Ensure player exists and is eligible
            require!(player.best_score > 0, ErrorCode::InvalidWinner);

            // Transfer rewards securely
            solana_program::program::invoke(
                &system_instruction::transfer(
                    &pot.to_account_info().key,
                    &player.to_account_info().key(),
                    reward_amount,
                ),
                &[pot.to_account_info(), player.to_account_info()],
            )?;
        }

        // Reset pot after distribution
        pot.total_amount = 0;
        leaderboard.last_reset = clock.unix_timestamp;

        Ok(())
    }
}

/// Stores the top player scores
#[account]
pub struct Leaderboard {
    pub top_scores: Vec<PlayerScore>,
    pub last_reset: i64,
}

/// Stores an individual player's best score
#[account]
pub struct PlayerScore {
    pub best_score: u64,
    pub last_action_hash: [u8; 32],  // Hash of the last submitted game actions
    pub last_timestamp: i64,         // Timestamp of last submitted score
}

/// Stores the total SOL in the betting pool
#[account]
pub struct Pot {
    pub total_amount: u64,
}

/// Context for submitting a new score
#[derive(Accounts)]
pub struct SubmitScore<'info> {
    #[account(
        init_if_needed,
        payer = initializer,
        space = 8 + 64, // Space for PlayerScore struct
        seeds = [b"player_score", initializer.key().as_ref()],
        bump
    )]
    pub player_score: Account<'info, PlayerScore>,

    #[account(mut)]
    pub initializer: Signer<'info>, // The player submitting their score

    #[account(mut)]
    pub pot: Account<'info, Pot>, // Ensure pot has SOL for rewards

    pub system_program: Program<'info, System>,
}

/// Context for resetting the leaderboard
#[derive(Accounts)]
pub struct ResetLeaderboard<'info> {
    #[account(
        mut,
        seeds = [b"leaderboard", admin.key().as_ref()],
        bump,
    )]
    pub leaderboard: Account<'info, Leaderboard>, 

    #[account(mut)]
    pub admin: Signer<'info>, // The user/admin resetting the leaderboard

    pub system_program: Program<'info, System>,
}

/// Context for distributing rewards
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
    pub admin: Signer<'info>, // The user/admin triggering the rewards

    pub system_program: Program<'info, System>,
}

/// Custom error codes for security checks
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
