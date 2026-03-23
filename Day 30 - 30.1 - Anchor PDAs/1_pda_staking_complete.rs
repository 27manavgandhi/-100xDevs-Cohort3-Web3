// Lecture Code - 1_pda_staking_complete.rs
// Complete staking program with PDAs from the notes

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("YourProgramIDHere");

const POINTS_PER_SOL_PER_DAY: u64 = 1_000_000;
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
const SECONDS_PER_DAY: i64 = 86_400;

#[program]
pub mod staking_program {
    use super::*;

    pub fn create_pda_account(ctx: Context<CreatePdaAccount>) -> Result<()> {
        let pda_account = &mut ctx.accounts.pda_account;
        let clock = Clock::get()?;
        
        pda_account.owner = ctx.accounts.payer.key();
        pda_account.staked_amount = 0;
        pda_account.total_points = 0;
        pda_account.last_update_time = clock.unix_timestamp;
        pda_account.bump = ctx.bumps.pda_account;
        
        msg!("PDA account created successfully");
        Ok(())
    }
    
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakeError::InvalidAmount);
        
        let pda_account = &mut ctx.accounts.pda_account;
        let clock = Clock::get()?;
        
        update_points(pda_account, clock.unix_timestamp)?;
        
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.pda_account.to_account_info(),
                },
            ),
            amount,
        )?;
        
        pda_account.staked_amount = pda_account.staked_amount
            .checked_add(amount)
            .ok_or(StakeError::Overflow)?;
        
        msg!("Staked {} lamports", amount);
        Ok(())
    }
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub total_points: u64,
    pub last_update_time: i64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct CreatePdaAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"client", payer.key().as_ref()],
        bump
    )]
    pub pda_account: Account<'info, StakeAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"client", user.key().as_ref()],
        bump = pda_account.bump
    )]
    pub pda_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum StakeError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Overflow")]
    Overflow,
}

fn update_points(pda_account: &mut StakeAccount, current_time: i64) -> Result<()> {
    let time_elapsed = current_time
        .checked_sub(pda_account.last_update_time)
        .ok_or(StakeError::Overflow)? as u64;
    
    if time_elapsed > 0 && pda_account.staked_amount > 0 {
        let new_points = (pda_account.staked_amount as u128)
            .checked_mul(time_elapsed as u128)
            .unwrap()
            .checked_mul(POINTS_PER_SOL_PER_DAY as u128)
            .unwrap()
            .checked_div(LAMPORTS_PER_SOL as u128)
            .unwrap()
            .checked_div(SECONDS_PER_DAY as u128)
            .unwrap() as u64;
        
        pda_account.total_points = pda_account.total_points
            .checked_add(new_points)
            .ok_or(StakeError::Overflow)?;
    }
    
    pda_account.last_update_time = current_time;
    Ok(())
}
