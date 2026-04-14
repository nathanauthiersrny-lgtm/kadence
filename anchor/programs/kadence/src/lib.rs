use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

#[cfg(test)]
mod tests;

declare_id!("AmiknhZoficTbeV33KT2LQheAYKQuJp7pBdquRR4ZkKA");

/// KAD token has 6 decimal places (like USDC).
const KAD_DECIMALS: u8 = 6;

/// Reward rate: 1 KAD (1_000_000 base units) per 1,000 meters (1 km).
/// So each meter earns 1_000 base units = 0.001 KAD.
const REWARD_BASE_UNITS_PER_METER: u64 = 1_000;

/// Sanity cap: no run longer than 100 km.
const MAX_DISTANCE_METERS: u64 = 100_000;

/// Sanity pace: no faster than 1 min/km (60 sec per 1,000 m).
/// min_duration = distance_meters * 60 / 1_000
const MIN_SECONDS_PER_KM: u64 = 60;
const METERS_PER_KM: u64 = 1_000;

#[program]
pub mod kadence {
    use super::*;

    /// One-time setup: create the KAD SPL token mint at a deterministic PDA.
    /// The mint authority is a separate PDA so `complete_run` can sign CPIs
    /// without holding a keypair.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Account constraints in `Initialize` handle all the init work;
        // nothing extra needed here.
        msg!("KAD mint initialised: {}", ctx.accounts.mint.key());
        Ok(())
    }

    /// Record a completed run and mint KAD tokens to the runner.
    ///
    /// # Arguments
    /// * `distance` – metres covered (must be 1–100,000)
    /// * `duration` – seconds elapsed (must be positive and respect pace floor)
    ///
    /// # Reward formula
    /// `reward = distance * 1_000` base units  →  1 KAD per km
    pub fn complete_run(ctx: Context<CompleteRun>, distance: u64, duration: u64) -> Result<()> {
        // --- input validation ---
        require!(distance > 0, KadenceError::InvalidDistance);
        require!(distance <= MAX_DISTANCE_METERS, KadenceError::DistanceTooLarge);
        require!(duration > 0, KadenceError::InvalidDuration);

        // Pace floor: runner must take at least 60 s per km.
        let min_duration = distance
            .checked_mul(MIN_SECONDS_PER_KM)
            .ok_or(KadenceError::MathOverflow)?
            .checked_div(METERS_PER_KM)
            .ok_or(KadenceError::MathOverflow)?;
        require!(duration >= min_duration, KadenceError::PaceTooFast);

        // --- reward calculation ---
        let reward = distance
            .checked_mul(REWARD_BASE_UNITS_PER_METER)
            .ok_or(KadenceError::MathOverflow)?;

        // --- mint KAD to runner via PDA-signed CPI ---
        let authority_bump = ctx.bumps.mint_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint-authority", &[authority_bump]]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.runner_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            reward,
        )?;

        emit!(RunCompleted {
            runner: ctx.accounts.runner.key(),
            distance,
            duration,
            reward,
        });

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// KAD token mint lives at a deterministic PDA so any client can derive it.
    #[account(
        init,
        payer = payer,
        mint::decimals = KAD_DECIMALS,
        mint::authority = mint_authority,
        seeds = [b"kad-mint"],
        bump,
    )]
    pub mint: Account<'info, Mint>,

    /// Signing authority for future mint_to CPIs.
    /// This account holds no data; it exists only as a valid on-chain address
    /// whose private key the program controls via PDA seeds.
    /// CHECK: PDA used only as a mint authority signer — no data stored.
    #[account(
        seeds = [b"mint-authority"],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteRun<'info> {
    /// The runner pays for ATA creation (if needed) and signs the transaction.
    #[account(mut)]
    pub runner: Signer<'info>,

    /// The KAD token mint. Must match the PDA derived with seed "kad-mint".
    #[account(
        mut,
        seeds = [b"kad-mint"],
        bump,
    )]
    pub mint: Account<'info, Mint>,

    /// Runner's KAD token account. Created automatically on the first run.
    #[account(
        init_if_needed,
        payer = runner,
        associated_token::mint = mint,
        associated_token::authority = runner,
    )]
    pub runner_token_account: Account<'info, TokenAccount>,

    /// PDA that holds mint authority. Signs the mint_to CPI.
    /// CHECK: PDA used only as a mint authority signer — no data stored.
    #[account(
        seeds = [b"mint-authority"],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct RunCompleted {
    pub runner: Pubkey,
    /// Metres covered.
    pub distance: u64,
    /// Seconds elapsed.
    pub duration: u64,
    /// KAD base units minted (6 decimals).
    pub reward: u64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum KadenceError {
    #[msg("Distance must be greater than 0")]
    InvalidDistance,
    #[msg("Distance exceeds maximum allowed (100,000 m / 100 km)")]
    DistanceTooLarge,
    #[msg("Duration must be greater than 0")]
    InvalidDuration,
    #[msg("Pace is too fast — minimum is 1 min/km")]
    PaceTooFast,
    #[msg("Math overflow")]
    MathOverflow,
}
