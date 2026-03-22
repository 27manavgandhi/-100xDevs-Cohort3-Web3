// Lecture Code - 1_native_cpi_counter.rs
// Topic: Native Solana Program with Cross-Program Invocation
// Day 29.1 - Anchor CPIs
//
// To build: cargo build-bpf
// To deploy: solana program deploy target/deploy/counter_cpi.so

// ── What is This Program? ─────────────────────────────────────────────────────
//
// This native Solana program demonstrates Cross-Program Invocation (CPI).
// It creates a counter account by calling the System Program via CPI,
// then provides instructions to manipulate the counter value.
//
// Real-Life Analogy:
//   Like a restaurant app that calls a payment service (Stripe) to process
//   transactions. Your app doesn't handle payment logic—it delegates to
//   the expert (Stripe). Similarly, this program delegates account creation
//   to the System Program (the expert).
//
// Why use CPI for account creation?
//   1. DON'T REINVENT THE WHEEL: System Program is battle-tested
//   2. SECURITY: Audited and secure account creation logic
//   3. STANDARD: All Solana programs use System Program for accounts
//   4. SIMPLICITY: No need to implement low-level account logic

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    entrypoint,
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    program_error::ProgramError,
    msg,
    rent::Rent,
    system_instruction,
    program::invoke,
    sysvar::Sysvar,
};

// ══════════════════════════════════════════════════════════════════════════════
// ON-CHAIN STATE
// ══════════════════════════════════════════════════════════════════════════════

/// Counter state stored on-chain
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CounterState {
    pub count: u32,
}

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Instructions this program supports
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum CounterInstruction {
    /// Create account and initialize counter
    /// 
    /// Accounts:
    ///   0. `[writable, signer]` Data account (to be created)
    ///   1. `[writable, signer]` Payer (pays for account creation)
    ///   2. `[]` System Program
    Initialize,
    
    /// Double the counter value
    /// 
    /// Accounts:
    ///   0. `[writable]` Data account
    Double,
    
    /// Halve the counter value
    /// 
    /// Accounts:
    ///   0. `[writable]` Data account
    Half,
}

// ══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> ProgramResult {
    let instruction = CounterInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    msg!("Instruction: {:?}", instruction);
    
    match instruction {
        CounterInstruction::Initialize => initialize(program_id, accounts),
        CounterInstruction::Double => double(program_id, accounts),
        CounterInstruction::Half => half(program_id, accounts),
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZE INSTRUCTION (with CPI)
// ══════════════════════════════════════════════════════════════════════════════

/// Initialize counter by creating account via CPI
fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    msg!("Initialize: Creating account via CPI");
    
    // ── Get Accounts ──────────────────────────────────────────────────────────
    
    let accounts_iter = &mut accounts.iter();
    
    // Account to be created (must sign)
    let data_account = next_account_info(accounts_iter)?;
    
    // Account paying for creation (must sign and be mutable)
    let payer = next_account_info(accounts_iter)?;
    
    // System Program (required for account creation)
    let system_program = next_account_info(accounts_iter)?;
    
    // ── Validate Inputs ───────────────────────────────────────────────────────
    
    // Both data account and payer must sign
    if !data_account.is_signer {
        msg!("Data account must be a signer");
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    if !payer.is_signer {
        msg!("Payer must be a signer");
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify system program is correct
    if system_program.key != &solana_program::system_program::id() {
        msg!("Invalid system program");
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // ── Calculate Space and Rent ──────────────────────────────────────────────
    
    // Space needed for CounterState (4 bytes for u32)
    let space: usize = 4;
    
    // Get rent sysvar to calculate minimum balance for rent exemption
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);
    
    msg!("Creating account with {} lamports, {} bytes", lamports, space);
    
    // ── Create CPI Instruction ────────────────────────────────────────────────
    
    // Build the instruction to call System Program's create_account
    let create_account_instruction = system_instruction::create_account(
        payer.key,           // Who pays for the account
        data_account.key,    // Address of new account
        lamports,            // Lamports for rent exemption
        space as u64,        // Space to allocate
        program_id,          // Owner of the new account (this program!)
    );
    
    // ── Execute CPI ───────────────────────────────────────────────────────────
    
    // invoke() executes the CPI
    // It takes:
    //   1. The instruction to execute
    //   2. Array of account infos needed for that instruction
    invoke(
        &create_account_instruction,
        &[
            payer.clone(),           // Payer account
            data_account.clone(),    // Account to create
            system_program.clone(),  // System Program
        ],
    )?;
    
    msg!("Account created via CPI");
    
    // ── Initialize Account Data ───────────────────────────────────────────────
    
    // Now that the account exists and is owned by our program,
    // we can write data to it
    let counter_state = CounterState { count: 1 };
    counter_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;
    
    msg!("Counter initialized to 1");
    
    Ok(())
}

// ══════════════════════════════════════════════════════════════════════════════
// DOUBLE INSTRUCTION
// ══════════════════════════════════════════════════════════════════════════════

fn double(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    msg!("Double: Multiplying counter by 2");
    
    let accounts_iter = &mut accounts.iter();
    let data_account = next_account_info(accounts_iter)?;
    
    // ── Validate Ownership ────────────────────────────────────────────────────
    
    // Only the program that owns an account can modify its data
    if data_account.owner != program_id {
        msg!("Account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // ── Update Counter ────────────────────────────────────────────────────────
    
    let mut counter_state = CounterState::try_from_slice(&data_account.data.borrow())?;
    
    msg!("Current count: {}", counter_state.count);
    
    // Use saturating_mul to prevent overflow panic
    counter_state.count = counter_state.count.saturating_mul(2);
    
    msg!("New count: {}", counter_state.count);
    
    counter_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;
    
    Ok(())
}

// ══════════════════════════════════════════════════════════════════════════════
// HALF INSTRUCTION
// ══════════════════════════════════════════════════════════════════════════════

fn half(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    msg!("Half: Dividing counter by 2");
    
    let accounts_iter = &mut accounts.iter();
    let data_account = next_account_info(accounts_iter)?;
    
    if data_account.owner != program_id {
        msg!("Account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }
    
    let mut counter_state = CounterState::try_from_slice(&data_account.data.borrow())?;
    
    msg!("Current count: {}", counter_state.count);
    
    // Integer division
    counter_state.count = counter_state.count / 2;
    
    msg!("New count: {}", counter_state.count);
    
    counter_state.serialize(&mut &mut data_account.data.borrow_mut()[..])?;
    
    Ok(())
}

// ══════════════════════════════════════════════════════════════════════════════
// CPI EXPLANATION
// ══════════════════════════════════════════════════════════════════════════════

// What happens during the CPI?
//
// 1. Our program calls invoke() with:
//    - An instruction (create_account)
//    - Accounts needed for that instruction
//
// 2. Solana runtime:
//    - Validates the accounts
//    - Checks signatures
//    - Invokes System Program with the instruction
//
// 3. System Program:
//    - Creates the account
//    - Transfers lamports from payer
//    - Sets owner to our program_id
//    - Allocates space
//
// 4. Control returns to our program:
//    - Account now exists and we own it
//    - We can write data to it

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTANT NOTES
// ══════════════════════════════════════════════════════════════════════════════

// 1. ACCOUNT OWNERSHIP:
//    - The new account is owned by OUR program (program_id)
//    - NOT owned by System Program
//    - Only we can modify its data
//
// 2. RENT EXEMPTION:
//    - Must provide enough lamports for rent exemption
//    - Otherwise account will be deleted
//    - Use Rent::minimum_balance() to calculate
//
// 3. SIGNATURES:
//    - Both data_account and payer must sign
//    - data_account signs because it's being created (security)
//    - payer signs because lamports are being spent
//
// 4. SYSTEM PROGRAM:
//    - Always required for account creation
//    - Program ID: 11111111111111111111111111111111
//    - Handles all basic account operations

/*
KEY CONCEPTS:
- CPI (CROSS-PROGRAM INVOCATION) = Calling another program from your program
- INVOKE() = Function to execute CPIs
- SYSTEM PROGRAM = Built-in program for account operations
- RENT EXEMPTION = Minimum balance to keep account alive forever
- ACCOUNT OWNERSHIP = Which program controls an account's data
- PAYER = Account paying lamports for account creation
- SPACE = Bytes to allocate for account data
- SIGNER = Account that must sign to authorize operation
- SYSTEM_INSTRUCTION = Helper functions for System Program instructions
- LAMPORTS = Smallest unit of SOL (1 SOL = 1 billion lamports)
*/
