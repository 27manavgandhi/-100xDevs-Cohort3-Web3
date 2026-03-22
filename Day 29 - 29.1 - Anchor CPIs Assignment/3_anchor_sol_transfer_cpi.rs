// Lecture Code - 3_anchor_sol_transfer_cpi.rs
// Topic: SOL Transfers Using CPI in Anchor
// Day 29.1 - Anchor CPIs
//
// To build: anchor build
// To test: anchor test

// ── What Does This Demonstrate? ───────────────────────────────────────────────
//
// This program shows how to transfer SOL between accounts using CPIs.
// We use Anchor's helper functions to call the System Program's transfer
// instruction.
//
// Real-Life Analogy:
//   Like a payment processing app (your program) that uses a bank's API
//   (System Program) to transfer money between accounts. The app doesn't
//   handle the actual money movement—it just tells the bank to do it.
//
// Why use CPI for transfers?
//   1. SECURITY: System Program's transfer is battle-tested
//   2. ATOMIC: Either entire transaction succeeds or fails
//   3. AUDITABLE: All transfers logged on-chain
//   4. STANDARD: Universal way to move SOL

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("11111111111111111111111111111111");

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAM MODULE
// ══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod sol_transfer_cpi {
    use super::*;

    /// Transfer SOL from sender to recipient
    /// 
    /// Uses CPI to call System Program's transfer instruction.
    /// 
    /// # Arguments
    /// * `amount` - Lamports to transfer (1 SOL = 1,000,000,000 lamports)
    /// 
    /// # Example
    /// ```typescript
    /// // Transfer 0.1 SOL
    /// await program.methods
    ///   .solTransfer(new anchor.BN(100_000_000))
    ///   .accounts({
    ///     sender: wallet.publicKey,
    ///     recipient: recipientPubkey,
    ///   })
    ///   .rpc();
    /// ```
    pub fn sol_transfer(ctx: Context<SolTransfer>, amount: u64) -> Result<()> {
        msg!("Transferring {} lamports", amount);
        msg!("From: {}", ctx.accounts.sender.key());
        msg!("To: {}", ctx.accounts.recipient.key());
        
        // ── Create CPI Context ────────────────────────────────────────────────
        
        // CpiContext wraps the accounts needed for the CPI
        // It takes:
        //   1. The program to call (System Program)
        //   2. The accounts struct (Transfer)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sender.to_account_info(),
                to: ctx.accounts.recipient.to_account_info(),
            },
        );
        
        // ── Execute CPI ───────────────────────────────────────────────────────
        
        // transfer() is Anchor's helper function that:
        //   1. Creates the transfer instruction
        //   2. Calls invoke() with correct accounts
        //   3. Handles error conversion
        transfer(cpi_context, amount)?;
        
        msg!("Transfer successful");
        
        Ok(())
    }
    
    /// Transfer SOL and log balances
    /// 
    /// Shows how to check balances before/after transfer
    pub fn sol_transfer_with_logs(
        ctx: Context<SolTransfer>,
        amount: u64
    ) -> Result<()> {
        // Log initial balances
        msg!(
            "Sender balance before: {} lamports",
            ctx.accounts.sender.to_account_info().lamports()
        );
        msg!(
            "Recipient balance before: {} lamports",
            ctx.accounts.recipient.to_account_info().lamports()
        );
        
        // Execute transfer
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.sender.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                },
            ),
            amount,
        )?;
        
        // Log final balances
        // Note: We need to reload account data to see updated balances
        msg!(
            "Sender balance after: {} lamports",
            ctx.accounts.sender.to_account_info().lamports()
        );
        msg!(
            "Recipient balance after: {} lamports",
            ctx.accounts.recipient.to_account_info().lamports()
        );
        
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

/// Accounts required for SOL transfer
#[derive(Accounts)]
pub struct SolTransfer<'info> {
    /// Account sending SOL
    /// 
    /// Must be:
    ///   - mut: Balance will decrease
    ///   - Signer: Must authorize spending their SOL
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// Account receiving SOL
    /// 
    /// Must be:
    ///   - mut: Balance will increase
    /// 
    /// Using SystemAccount ensures it's a system-owned account
    /// (Can't transfer SOL to a program-owned account this way)
    #[account(mut)]
    /// CHECK: This account is safe to transfer SOL to
    pub recipient: SystemAccount<'info>,
    
    /// System Program (required for transfers)
    pub system_program: Program<'info, System>,
}

// ══════════════════════════════════════════════════════════════════════════════
// ALTERNATIVE APPROACHES
// ══════════════════════════════════════════════════════════════════════════════

// Approach #2: More Verbose (Manual CPI)
// ────────────────────────────────────────────────────────────────────────────
//
// pub fn sol_transfer_manual(ctx: Context<SolTransfer>, amount: u64) -> Result<()> {
//     // Prepare instruction AccountMetas
//     let account_metas = vec![
//         AccountMeta::new(*ctx.accounts.sender.key, true),   // Sender (mut, signer)
//         AccountMeta::new(*ctx.accounts.recipient.key, false), // Recipient (mut)
//     ];
//     
//     // Transfer instruction discriminator is 2
//     let instruction_discriminator = 2u32;
//     
//     // Build instruction data
//     let mut instruction_data = Vec::with_capacity(4 + 8);
//     instruction_data.extend_from_slice(&instruction_discriminator.to_le_bytes());
//     instruction_data.extend_from_slice(&amount.to_le_bytes());
//     
//     // Create instruction
//     let instruction = Instruction {
//         program_id: *ctx.accounts.system_program.key,
//         accounts: account_metas,
//         data: instruction_data,
//     };
//     
//     // Invoke
//     solana_program::program::invoke(
//         &instruction,
//         &[
//             ctx.accounts.sender.to_account_info(),
//             ctx.accounts.recipient.to_account_info(),
//             ctx.accounts.system_program.to_account_info(),
//         ],
//     )?;
//     
//     Ok(())
// }

// ══════════════════════════════════════════════════════════════════════════════
// COMMON TRANSFER PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

// Pattern 1: Simple Transfer
// ────────────────────────────────────────────────────────────────────────────
// transfer(
//     CpiContext::new(system_program, Transfer { from, to }),
//     amount,
// )?;

// Pattern 2: Transfer with Balance Check
// ────────────────────────────────────────────────────────────────────────────
// let sender_balance = sender.lamports();
// if sender_balance < amount {
//     return Err(ProgramError::InsufficientFunds.into());
// }
// transfer(cpi_context, amount)?;

// Pattern 3: Transfer with Rent Protection
// ────────────────────────────────────────────────────────────────────────────
// let rent = Rent::get()?;
// let min_balance = rent.minimum_balance(0);
// let available = sender.lamports().saturating_sub(min_balance);
// if available < amount {
//     return Err(error!(ErrorCode::InsufficientFunds));
// }
// transfer(cpi_context, amount)?;

// ══════════════════════════════════════════════════════════════════════════════
// LAMPORTS CONVERSION REFERENCE
// ══════════════════════════════════════════════════════════════════════════════

// 1 SOL = 1,000,000,000 lamports
// 0.1 SOL = 100,000,000 lamports
// 0.01 SOL = 10,000,000 lamports
// 0.001 SOL = 1,000,000 lamports
//
// Constant for conversion:
// const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
//
// Convert SOL to lamports:
// let lamports = sol_amount * LAMPORTS_PER_SOL;
//
// Convert lamports to SOL:
// let sol = lamports as f64 / LAMPORTS_PER_SOL as f64;

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

// Common errors when transferring:
//
// 1. InsufficientFunds:
//    Sender doesn't have enough SOL
//    
// 2. AccountNotRentExempt:
//    Transfer would leave sender below rent exemption
//    
// 3. MissingRequiredSignature:
//    Sender didn't sign the transaction
//    
// 4. InvalidAccountData:
//    Trying to transfer to invalid account type

// Custom error example:
// #[error_code]
// pub enum TransferError {
//     #[msg("Insufficient balance for transfer")]
//     InsufficientBalance,
//     #[msg("Transfer would leave account below rent exemption")]
//     BelowRentExemption,
// }

// ══════════════════════════════════════════════════════════════════════════════
// TESTING
// ══════════════════════════════════════════════════════════════════════════════

// Example test:
//
// it("Transfers SOL via CPI", async () => {
//     const recipient = anchor.web3.Keypair.generate();
//     const transferAmount = 100_000_000; // 0.1 SOL
//     
//     // Get balances before
//     const senderBefore = await provider.connection.getBalance(
//       provider.wallet.publicKey
//     );
//     const recipientBefore = await provider.connection.getBalance(
//       recipient.publicKey
//     );
//     
//     // Execute transfer
//     await program.methods
//       .solTransfer(new anchor.BN(transferAmount))
//       .accounts({
//         sender: provider.wallet.publicKey,
//         recipient: recipient.publicKey,
//       })
//       .rpc();
//     
//     // Get balances after
//     const senderAfter = await provider.connection.getBalance(
//       provider.wallet.publicKey
//     );
//     const recipientAfter = await provider.connection.getBalance(
//       recipient.publicKey
//     );
//     
//     // Verify transfer (accounting for tx fees)
//     assert.equal(recipientAfter - recipientBefore, transferAmount);
//     assert.ok(senderBefore - senderAfter >= transferAmount);
// });

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY CONSIDERATIONS
// ══════════════════════════════════════════════════════════════════════════════

// 1. VALIDATE RECIPIENT:
//    Make sure recipient address is correct
//    Consider adding constraints or checks
//
// 2. PROTECT RENT EXEMPTION:
//    Don't allow transfers that leave sender below rent exemption
//    Use rent.minimum_balance() to check
//
// 3. AMOUNT VALIDATION:
//    Check amount is not zero
//    Check amount doesn't overflow
//    Validate against maximum allowed
//
// 4. SIGNER CHECK:
//    Anchor's Signer<'info> handles this
//    But be careful with PDAs signing via invoke_signed
//
// 5. AVOID DRAINING:
//    Protect against complete account drain
//    Leave some SOL for future transactions

/*
KEY CONCEPTS:
- TRANSFER = Moving SOL from one account to another
- LAMPORTS = Smallest unit of SOL (billionths)
- CPI (TRANSFER) = Calling System Program to move SOL
- CPICONTEXT = Anchor wrapper for CPI with accounts
- SYSTEM PROGRAM = Handles all SOL transfers
- SENDER = Account sending SOL (must sign)
- RECIPIENT = Account receiving SOL
- RENT EXEMPTION = Minimum balance to keep account alive
- BALANCE CHECK = Verifying sufficient funds before transfer
- ATOMIC = Transfer either fully succeeds or fully fails
*/
