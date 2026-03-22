// Lecture Code - 2_anchor_cpi_init.rs
// Topic: Anchor Account Creation via CPI (init constraint)
// Day 29.1 - Anchor CPIs
//
// To build: anchor build
// To test: anchor test

// ── What Does This Demonstrate? ───────────────────────────────────────────────
//
// This Anchor program shows how the `init` constraint automatically handles
// CPIs to the System Program for account creation. No manual CPI code needed!
//
// Real-Life Analogy:
//   Like using a food delivery app instead of calling restaurants directly.
//   The app (Anchor) handles all the communication (CPI) for you automatically.
//   You just specify what you want (init constraint).
//
// Why use Anchor's init?
//   1. LESS CODE: One line vs 20+ lines in native
//   2. SAFETY: Validated at compile time
//   3. CLARITY: Clear intent ("this account will be initialized")
//   4. AUTOMATIC: Rent calculation, CPI, ownership all handled

use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAM MODULE
// ══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod anchor_cpi_init {
    use super::*;

    /// Initialize a new counter account
    /// 
    /// The `init` constraint in the Initialize struct automatically:
    ///   1. Creates a CPI to System Program
    ///   2. Calls create_account instruction
    ///   3. Transfers lamports from payer
    ///   4. Allocates space
    ///   5. Sets owner to this program
    ///   6. Writes account discriminator (8 bytes)
    /// 
    /// We just need to initialize our data!
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Initializing counter account");
        
        // Access the new account (already created via CPI!)
        let counter = &mut ctx.accounts.counter;
        
        // Initialize our data
        counter.count = 1;
        
        msg!("Counter initialized to {}", counter.count);
        
        Ok(())
    }

    /// Double the counter value
    pub fn double(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        
        msg!("Doubling counter from {}", counter.count);
        
        // Use checked_mul to prevent overflow
        counter.count = counter.count
            .checked_mul(2)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        msg!("Counter doubled to {}", counter.count);
        
        Ok(())
    }
    
    /// Halve the counter value
    pub fn halve(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        
        msg!("Halving counter from {}", counter.count);
        
        counter.count = counter.count / 2;
        
        msg!("Counter halved to {}", counter.count);
        
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

/// Account storing counter data
/// 
/// The #[account] macro:
///   - Implements Borsh serialization/deserialization
///   - Adds 8-byte discriminator to identify account type
///   - Provides safety checks on deserialization
#[account]
pub struct Counter {
    /// The counter value
    pub count: u32,  // 4 bytes
}

// Total account size: 8 (discriminator) + 4 (count) = 12 bytes
// But we allocate 8 + 4 in the init constraint for consistency

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZE CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

/// Accounts required for initialization
/// 
/// This is where the CPI magic happens!
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The counter account to initialize
    /// 
    /// The `init` constraint triggers a CPI to System Program:
    ///   - payer: Specifies who pays for account creation
    ///   - space: Specifies how many bytes to allocate
    /// 
    /// Anchor automatically:
    ///   - Calculates rent exemption amount
    ///   - Creates system_instruction::create_account
    ///   - Executes invoke() with correct accounts
    ///   - Validates account was created successfully
    #[account(
        init,                    // Trigger CPI to create account
        payer = user,            // user pays rent
        space = 8 + 4            // 8 discriminator + 4 data
    )]
    pub counter: Account<'info, Counter>,
    
    /// The user paying for account creation
    /// 
    /// Must be:
    ///   - mut: Balance will decrease (paying rent)
    ///   - Signer: Must authorize spending lamports
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// The System Program
    /// 
    /// Required for account creation
    /// Anchor validates this is the real System Program
    pub system_program: Program<'info, System>,
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

/// Accounts required for update operations (double, halve)
#[derive(Accounts)]
pub struct Update<'info> {
    /// The counter account to modify
    /// 
    /// Must be:
    ///   - mut: We're modifying data
    ///   - Owned by this program (checked by Account<'info, Counter>)
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

// ══════════════════════════════════════════════════════════════════════════════
// WHAT ANCHOR GENERATES (UNDER THE HOOD)
// ══════════════════════════════════════════════════════════════════════════════

// When you use #[account(init, payer = user, space = 8 + 4)],
// Anchor generates code equivalent to:
//
// pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
//     // Calculate rent
//     let rent = Rent::get()?;
//     let lamports = rent.minimum_balance(8 + 4);
//     
//     // Create CPI instruction
//     let create_ix = system_instruction::create_account(
//         ctx.accounts.user.key,
//         ctx.accounts.counter.key,
//         lamports,
//         (8 + 4) as u64,
//         ctx.program_id,
//     );
//     
//     // Execute CPI
//     solana_program::program::invoke(
//         &create_ix,
//         &[
//             ctx.accounts.user.to_account_info(),
//             ctx.accounts.counter.to_account_info(),
//             ctx.accounts.system_program.to_account_info(),
//         ],
//     )?;
//     
//     // Write discriminator
//     let mut data = ctx.accounts.counter.try_borrow_mut_data()?;
//     data[0..8].copy_from_slice(&Counter::discriminator());
//     
//     // Now run your initialize logic...
//     Ok(())
// }
//
// You write: One line (#[account(init, ...)])
// Anchor generates: 20+ lines of CPI code!

// ══════════════════════════════════════════════════════════════════════════════
// SPACE CALCULATION
// ══════════════════════════════════════════════════════════════════════════════

// How to calculate space for different data types:
//
// Fixed-size types:
//   - u8, i8: 1 byte
//   - u16, i16: 2 bytes
//   - u32, i32: 4 bytes
//   - u64, i64, f64: 8 bytes
//   - u128, i128: 16 bytes
//   - Pubkey: 32 bytes
//   - bool: 1 byte
//
// Variable-size types:
//   - String: 4 + string.len()
//   - Vec<T>: 4 + (size_of::<T>() * length)
//
// Structs:
//   Sum of all fields + 8 (discriminator)
//
// Example:
//   #[account]
//   pub struct User {
//       authority: Pubkey,    // 32
//       name: String,         // 4 + name.len() (max)
//       age: u8,              // 1
//   }
//   
//   // For name max 20 chars:
//   space = 8 + 32 + 4 + 20 + 1 = 65 bytes

// ══════════════════════════════════════════════════════════════════════════════
// INIT CONSTRAINT VARIATIONS
// ══════════════════════════════════════════════════════════════════════════════

// Basic init:
// #[account(init, payer = user, space = 8 + 4)]
// pub counter: Account<'info, Counter>,

// Init with seeds (PDA):
// #[account(
//     init,
//     payer = user,
//     space = 8 + 4,
//     seeds = [b"counter", user.key().as_ref()],
//     bump
// )]
// pub counter: Account<'info, Counter>,

// Init if needed (only create if doesn't exist):
// #[account(init_if_needed, payer = user, space = 8 + 4)]
// pub counter: Account<'info, Counter>,

// ══════════════════════════════════════════════════════════════════════════════
// TESTING
// ══════════════════════════════════════════════════════════════════════════════

// Example test:
//
// it("Initializes counter via CPI", async () => {
//     const counter = anchor.web3.Keypair.generate();
//     
//     await program.methods
//       .initialize()
//       .accounts({
//         counter: counter.publicKey,
//         user: provider.wallet.publicKey,
//       })
//       .signers([counter])
//       .rpc();
//     
//     const account = await program.account.counter.fetch(counter.publicKey);
//     assert.equal(account.count, 1);
// });

/*
KEY CONCEPTS:
- INIT CONSTRAINT = Anchor macro that triggers CPI for account creation
- PAYER = Account paying lamports for new account
- SPACE = Bytes to allocate (8 for discriminator + data size)
- DISCRIMINATOR = 8-byte prefix identifying account type
- ACCOUNT<'INFO, T> = Anchor wrapper that deserializes and validates account
- SIGNER<'INFO> = Account that must sign the transaction
- PROGRAM<'INFO, T> = Reference to another program (e.g., System)
- RENT EXEMPTION = Minimum balance to keep account alive
- CPI (AUTOMATIC) = Anchor handles System Program call automatically
- ACCOUNT OWNERSHIP = New account owned by your program
*/
