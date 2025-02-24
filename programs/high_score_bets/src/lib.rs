use anchor_lang::prelude::*;

declare_id!("2r9LfxQ588QkQUgSfqojY5k2pJptHdhys3y7nC92hwUP");

#[program]
pub mod high_score_bets {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
