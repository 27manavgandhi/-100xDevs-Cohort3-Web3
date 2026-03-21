// Lecture Code - 3_anchor_calculator.rs
// Topic: Anchor Framework Calculator Program
// Day 28.1 - Anchor vs Raw Contracts
//
// To build: anchor build
// To test: anchor test
// To deploy: anchor deploy

// ── What is Anchor? ───────────────────────────────────────────────────────────
//
// Anchor is a framework for Solana smart contracts that provides:
//   - Macros to eliminate boilerplate
//   - Automatic account validation
//   - Type-safe client library generation (IDL)
//   - Built-in testing framework
//
// Real-Life Analogy:
//   Anchor is to Solana what React is to web development.
//   Framework handles the plumbing, you focus on logic.
//
// Why use Anchor?
//   1. PRODUCTIVITY: Write less code, ship faster
//   2. SAFETY: Compile-time validation prevents bugs
//   3. MAINTAINABILITY: Cleaner, more readable code
//   4. ECOSYSTEM: Rich library of reusable components

use anchor_lang::prelude::*;

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAM ID DECLARATION
// ══════════════════════════════════════════════════════════════════════════════

/// Declares the program's on-chain address
/// 
/// This ID is generated during `anchor build` and stored in:
///   target/deploy/anchor_calculator-keypair.json
/// 
/// After building, update this with your actual program ID
declare_id!("11111111111111111111111111111111");

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAM MODULE
// ══════════════════════════════════════════════════════════════════════════════

/// The #[program] macro defines all instruction handlers
/// 
/// Each public function in this module becomes an instruction
/// that clients can invoke. This is similar to:
///   - Functions in Solidity contracts
///   - Methods in classes
/// 
/// Compare to native Solana where you have one big
/// process_instruction function with manual matching.
#[program]
pub mod anchor_calculator {
    use super::*;

    /// Initialize a new counter account
    /// 
    /// Sets the counter value to 1.
    /// 
    /// # Arguments
    /// * `ctx` - Context containing validated accounts
    /// 
    /// # Accounts
    /// * `new_account` - The account to initialize (must be new)
    /// * `signer` - The account paying for initialization
    /// * `system_program` - System program (for account creation)
    /// 
    /// # Example
    /// ```typescript
    /// await program.methods.initialize()
    ///   .accounts({
    ///     newAccount: newAccount.publicKey,
    ///     signer: wallet.publicKey,
    ///   })
    ///   .signers([newAccount])
    ///   .rpc();
    /// ```
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Access the new_account from validated context
        // Anchor has already:
        //   - Validated account ownership
        //   - Allocated space (8 + 4 bytes)
        //   - Deserialized account data
        ctx.accounts.new_account.data = 1;
        
        msg!("Counter initialized to 1");
        
        Ok(())
    }

    /// Double the counter value
    /// 
    /// Multiplies the current value by 2.
    /// Uses checked arithmetic to prevent overflow.
    /// 
    /// # Arguments
    /// * `ctx` - Context containing validated accounts
    /// 
    /// # Accounts
    /// * `account` - The counter account to modify
    /// * `signer` - The account authorizing this operation
    /// 
    /// # Errors
    /// Returns error if multiplication would overflow u32::MAX
    pub fn double(ctx: Context<Double>) -> Result<()> {
        // Get mutable reference to account data
        let account = &mut ctx.accounts.account;
        
        // Use checked_mul to detect overflow
        // If overflow occurs, returns None which we convert to error
        account.data = account.data
            .checked_mul(2)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        msg!("Counter doubled to {}", account.data);
        
        Ok(())
    }
    
    /// Halve the counter value
    /// 
    /// Divides the current value by 2 (integer division).
    /// 
    /// # Arguments
    /// * `ctx` - Context containing validated accounts
    /// 
    /// # Example
    /// Value 5 / 2 = 2 (not 2.5, integer division)
    pub fn halve(ctx: Context<Halve>) -> Result<()> {
        let account = &mut ctx.accounts.account;
        
        // Integer division, no overflow possible
        account.data = account.data / 2;
        
        msg!("Counter halved to {}", account.data);
        
        Ok(())
    }

    /// Add specified amount to counter
    /// 
    /// # Arguments
    /// * `ctx` - Context containing validated accounts
    /// * `amount` - Value to add (u32)
    /// 
    /// # Errors
    /// Returns error if addition would overflow u32::MAX
    pub fn add(ctx: Context<Add>, amount: u32) -> Result<()> {
        let account = &mut ctx.accounts.account;
        
        // Use checked_add to prevent overflow
        account.data = account.data
            .checked_add(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        msg!("Added {} to counter, new value: {}", amount, account.data);
        
        Ok(())
    }
    
    /// Subtract specified amount from counter
    /// 
    /// # Arguments
    /// * `ctx` - Context containing validated accounts
    /// * `amount` - Value to subtract (u32)
    /// 
    /// # Errors
    /// Returns error if subtraction would underflow (go below 0)
    pub fn sub(ctx: Context<Sub>, amount: u32) -> Result<()> {
        let account = &mut ctx.accounts.account;
        
        // Use checked_sub to prevent underflow
        account.data = account.data
            .checked_sub(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        
        msg!("Subtracted {} from counter, new value: {}", amount, account.data);
        
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT DATA STRUCTURE
// ══════════════════════════════════════════════════════════════════════════════

/// The counter account state
/// 
/// The #[account] macro:
///   - Implements Borsh serialization/deserialization
///   - Adds 8-byte discriminator (account type identifier)
///   - Provides safety checks
/// 
/// Total account size: 8 (discriminator) + 4 (u32) = 12 bytes
/// But we allocate 8 + 4 in Initialize constraint for simplicity
#[account]
pub struct NewAccount {
    /// The counter value
    /// 
    /// Stored as u32 (4 bytes):
    ///   - Range: 0 to 4,294,967,295
    ///   - Compact storage
    pub data: u32,
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT VALIDATION STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

/// Accounts required for initialize instruction
/// 
/// The #[derive(Accounts)] macro:
///   - Validates account types
///   - Checks ownership
///   - Verifies mutability
///   - Deserializes account data
///   - All automatically at compile time!
/// 
/// Lifetime 'info:
///   - Ensures account references are valid
///   - Prevents use-after-free bugs
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The account to initialize
    /// 
    /// Constraints:
    ///   - init: Create this account
    ///   - payer: signer pays for account creation
    ///   - space: Allocate 8 + 4 bytes (discriminator + data)
    #[account(init, payer = signer, space = 8 + 4)]
    pub new_account: Account<'info, NewAccount>,
    
    /// The account paying for initialization
    /// 
    /// Must be:
    ///   - mut: Account balance will decrease (paying rent)
    ///   - Signer: Must sign the transaction
    #[account(mut)]
    pub signer: Signer<'info>,
    
    /// System program (required for account creation)
    /// 
    /// Anchor automatically checks this is the real system program
    pub system_program: Program<'info, System>,
}

/// Accounts required for double instruction
#[derive(Accounts)]
pub struct Double<'info> {
    /// The counter account to modify
    /// 
    /// Must be:
    ///   - mut: Will be modified
    ///   - Valid NewAccount type (checked by Account<'info, NewAccount>)
    #[account(mut)]
    pub account: Account<'info, NewAccount>,
    
    /// Account authorizing this operation
    /// 
    /// In production, you might add:
    ///   #[account(mut, has_one = authority)]
    /// to restrict who can call this
    pub signer: Signer<'info>,
}

/// Accounts required for halve instruction
#[derive(Accounts)]
pub struct Halve<'info> {
    #[account(mut)]
    pub account: Account<'info, NewAccount>,
    
    pub signer: Signer<'info>,
}

/// Accounts required for add instruction
#[derive(Accounts)]
pub struct Add<'info> {
    #[account(mut)]
    pub account: Account<'info, NewAccount>,
    
    pub signer: Signer<'info>,
}

/// Accounts required for sub instruction
#[derive(Accounts)]
pub struct Sub<'info> {
    #[account(mut)]
    pub account: Account<'info, NewAccount>,
    
    pub signer: Signer<'info>,
}

// ══════════════════════════════════════════════════════════════════════════════
// ANCHOR VS NATIVE COMPARISON
// ══════════════════════════════════════════════════════════════════════════════

// Native Solana:
// ──────────────────────────────────────────────────────────────────────────────
// fn process_instruction(
//     program_id: &Pubkey,
//     accounts: &[AccountInfo],
//     instruction_data: &[u8]
// ) -> ProgramResult {
//     // Get account manually
//     let account = next_account_info(&mut accounts.iter())?;
//     
//     // Validate owner manually
//     if account.owner != program_id {
//         return Err(ProgramError::IncorrectProgramId);
//     }
//     
//     // Validate signer manually
//     if !account.is_signer {
//         return Err(ProgramError::MissingRequiredSignature);
//     }
//     
//     // Deserialize manually
//     let mut state = CounterState::try_from_slice(&account.data.borrow())?;
//     
//     // Business logic
//     state.count *= 2;
//     
//     // Serialize manually
//     state.serialize(&mut *account.data.borrow_mut())?;
//     
//     Ok(())
// }
// ──────────────────────────────────────────────────────────────────────────────
//
// Anchor:
// ──────────────────────────────────────────────────────────────────────────────
// pub fn double(ctx: Context<Double>) -> Result<()> {
//     ctx.accounts.account.data *= 2;
//     Ok(())
// }
// ──────────────────────────────────────────────────────────────────────────────
//
// Anchor handles:
//   ✓ Account validation
//   ✓ Deserialization
//   ✓ Serialization
//   ✓ Type safety
//
// You write:
//   ✓ Only business logic

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT CONSTRAINTS REFERENCE
// ══════════════════════════════════════════════════════════════════════════════

// Common constraints:
//
// #[account(init)]
//   - Create new account
//   - Requires: payer, space
//
// #[account(mut)]
//   - Account can be modified
//
// #[account(has_one = field)]
//   - Validate account.field == provided_account
//   - Example: Restrict to original creator
//
// #[account(constraint = expression)]
//   - Custom validation logic
//   - Example: constraint = account.data < 100
//
// #[account(close = destination)]
//   - Close account and send lamports to destination
//
// #[account(seeds = [...], bump)]
//   - Validate PDA (Program Derived Address)

/*
KEY CONCEPTS:
- ANCHOR = Framework for Solana smart contracts in Rust
- #[program] = Macro defining instruction handlers module
- #[account] = Macro for account data structures with auto-serialization
- #[derive(Accounts)] = Macro for account validation structures
- Context<T> = Wrapper providing validated accounts of type T
- Account<'info, T> = Account data deserialized as type T
- Signer<'info> = Account that signed the transaction
- Program<'info, T> = Reference to another program (e.g., System)
- DISCRIMINATOR = 8-byte prefix identifying account type
- CHECKED ARITHMETIC = Operations that return None on overflow/underflow
- LIFETIME = Ensures references remain valid
- IDL = Interface Definition Language (auto-generated API description)
*/
