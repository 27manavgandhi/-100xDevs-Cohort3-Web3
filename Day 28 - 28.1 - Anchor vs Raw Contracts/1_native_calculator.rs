// Lecture Code - 1_native_calculator.rs
// Topic: Native Solana Calculator Program
// Day 28.1 - Anchor vs Raw Contracts
//
// To build: cargo build-bpf
// To deploy: solana program deploy target/deploy/calculator.so

// ── What is a Native Solana Program? ──────────────────────────────────────────
//
// A native Solana program is a smart contract written using low-level Solana
// primitives without any framework. You manually handle:
//   - Account validation
//   - Serialization/deserialization
//   - Instruction parsing
//   - Error handling
//
// Real-Life Analogy:
//   Like building a website with vanilla JavaScript instead of React.
//   More control, more code, more room for errors.
//
// Why write native programs?
//   1. MAXIMUM CONTROL: Full control over every byte and operation
//   2. OPTIMIZATION: Can optimize for specific use cases
//   3. LEARNING: Understand what frameworks abstract away
//   4. LIGHTWEIGHT: No framework dependencies

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    entrypoint, 
    account_info::{next_account_info, AccountInfo}, 
    entrypoint::ProgramResult, 
    pubkey::Pubkey,
    program_error::ProgramError,
    msg,
};

// ══════════════════════════════════════════════════════════════════════════════
// ON-CHAIN STATE STRUCTURE
// ══════════════════════════════════════════════════════════════════════════════

/// Represents the counter state stored on-chain
/// 
/// This struct defines the data layout in the account.
/// Borsh serialization ensures compact binary representation:
///   - u32 = 4 bytes (little-endian)
///   - Total account size: 4 bytes
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct CounterState {
    /// The counter value
    /// 
    /// We use u32 instead of u64 to save space:
    ///   - u32: 0 to 4,294,967,295
    ///   - 4 bytes storage cost
    pub count: u32,
}

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTION DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/// All possible instructions this program can execute
/// 
/// Each variant becomes a discriminator (first byte) in instruction data:
///   - Init = 0
///   - Double = 1
///   - Half = 2
///   - Add = 3
///   - Subtract = 4
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum Instruction {
    /// Initialize counter to 1
    /// 
    /// Instruction data: [0]
    Init,
    
    /// Multiply counter by 2
    /// 
    /// Instruction data: [1]
    Double,
    
    /// Divide counter by 2 (integer division)
    /// 
    /// Instruction data: [2]
    Half,
    
    /// Add specified amount to counter
    /// 
    /// Instruction data: [3, amount_bytes[0..4]]
    /// Example: Add 10 = [3, 10, 0, 0, 0]
    Add { amount: u32 },
    
    /// Subtract specified amount from counter
    /// 
    /// Instruction data: [4, amount_bytes[0..4]]
    /// Example: Subtract 5 = [4, 5, 0, 0, 0]
    Subtract { amount: u32 },
}

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAM ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════

/// Declare the entry point
/// 
/// This macro generates the necessary boilerplate to make this function
/// the program's entry point. When a transaction invokes this program,
/// this function is called.
entrypoint!(process_instruction);

/// Main program logic
/// 
/// This function is called for every transaction that invokes this program.
/// 
/// # Arguments
/// * `program_id` - The program's on-chain address
/// * `accounts` - Array of accounts passed to this instruction
/// * `instruction_data` - Serialized instruction data
/// 
/// # Returns
/// * `ProgramResult` - Ok(()) if successful, Err(ProgramError) if failed
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> ProgramResult {
    msg!("Calculator program entry point");
    
    // ── STEP 1: Get Required Accounts ────────────────────────────────────────
    
    // Create iterator over accounts
    let accounts_iter = &mut accounts.iter();
    
    // Get the data account (first account in the array)
    // This account stores our counter state
    let data_account = next_account_info(accounts_iter)?;
    
    msg!("Data account: {}", data_account.key);
    
    // ── STEP 2: Validate Account Ownership ───────────────────────────────────
    
    // Verify this account is owned by our program
    // SECURITY: Only the program that owns an account can modify its data
    if data_account.owner != program_id {
        msg!("Account does not belong to this program");
        return Err(ProgramError::IncorrectProgramId);
    }
    
    // ── STEP 3: Validate Signer ──────────────────────────────────────────────
    
    // Verify the account signed this transaction
    // SECURITY: Prevents unauthorized modifications
    if !data_account.is_signer {
        msg!("Data account must be a signer");
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // ── STEP 4: Deserialize Instruction ──────────────────────────────────────
    
    // Parse instruction data into our Instruction enum
    let instruction = Instruction::try_from_slice(instruction_data)
        .map_err(|_| {
            msg!("Failed to deserialize instruction");
            ProgramError::InvalidInstructionData
        })?;
    
    msg!("Instruction: {:?}", instruction);
    
    // ── STEP 5: Deserialize Account State ────────────────────────────────────
    
    // Get mutable reference to account data
    let mut account_data = data_account.data.borrow_mut();
    
    // Deserialize current state from account data
    let mut counter_state = CounterState::try_from_slice(&account_data)
        .map_err(|_| {
            msg!("Failed to deserialize account data");
            ProgramError::InvalidAccountData
        })?;
    
    msg!("Current count: {}", counter_state.count);
    
    // ── STEP 6: Execute Instruction ──────────────────────────────────────────
    
    match instruction {
        Instruction::Init => {
            // Initialize counter to 1
            counter_state.count = 1;
            msg!("Initialized counter to 1");
        },
        
        Instruction::Double => {
            // Double the counter value
            // Use saturating_mul to prevent overflow panics
            counter_state.count = counter_state.count.saturating_mul(2);
            msg!("Doubled counter to {}", counter_state.count);
        },
        
        Instruction::Half => {
            // Halve the counter value (integer division)
            counter_state.count = counter_state.count / 2;
            msg!("Halved counter to {}", counter_state.count);
        },
        
        Instruction::Add { amount } => {
            // Add amount to counter
            // Use saturating_add to prevent overflow panics
            counter_state.count = counter_state.count.saturating_add(amount);
            msg!("Added {} to counter, new value: {}", amount, counter_state.count);
        },
        
        Instruction::Subtract { amount } => {
            // Subtract amount from counter
            // Use saturating_sub to prevent underflow panics
            counter_state.count = counter_state.count.saturating_sub(amount);
            msg!("Subtracted {} from counter, new value: {}", amount, counter_state.count);
        },
    }
    
    // ── STEP 7: Serialize State Back to Account ──────────────────────────────
    
    // Serialize updated state
    counter_state.serialize(&mut &mut account_data[..])?;
    
    msg!("State updated successfully");
    
    Ok(())
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY CONSIDERATIONS
// ══════════════════════════════════════════════════════════════════════════════

// 1. OVERFLOW/UNDERFLOW PROTECTION:
//    - Using saturating_mul, saturating_add, saturating_sub
//    - These methods clamp at min/max instead of panicking
//    - Alternative: checked_* methods that return Option
//
// 2. ACCOUNT VALIDATION:
//    - Check owner (only program can modify its accounts)
//    - Check signer (only authorized parties can execute)
//    - Check data size matches expected struct size
//
// 3. DESERIALIZATION SAFETY:
//    - try_from_slice returns Result, not panic
//    - Gracefully handle malformed data
//
// 4. REENTRANCY:
//    - Not a concern in this simple program
//    - For complex programs, use PDA-based locking

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTION DATA ENCODING
// ══════════════════════════════════════════════════════════════════════════════

// How clients should encode instruction data:
//
// Init:
//   [0]
//
// Double:
//   [1]
//
// Half:
//   [2]
//
// Add 10:
//   [3, 10, 0, 0, 0]  // 10 as u32 little-endian
//
// Subtract 5:
//   [4, 5, 0, 0, 0]   // 5 as u32 little-endian

// ══════════════════════════════════════════════════════════════════════════════
// COMPARISON TO ANCHOR
// ══════════════════════════════════════════════════════════════════════════════

// Native (this file):
// - Manual account validation (is_signer, owner checks)
// - Explicit serialization/deserialization calls
// - Manual instruction parsing
// - More verbose, more control
//
// Anchor equivalent would be:
//   #[program]
//   pub mod calculator {
//       pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
//           ctx.accounts.counter.count = 1;
//           Ok(())
//       }
//   }
//
// Anchor handles validation, serialization automatically!

/*
KEY CONCEPTS:
- NATIVE SOLANA PROGRAM = Low-level smart contract without frameworks
- BORSH = Binary Object Representation Serializer for Hashing (compact serialization)
- ENTRYPOINT = Function called when program is invoked
- ACCOUNT VALIDATION = Checking ownership, signer status, data integrity
- INSTRUCTION ENUM = All possible operations program can execute
- SATURATING OPERATIONS = Arithmetic that clamps instead of panicking
- PROGRAM_ID = On-chain address of the deployed program
- ACCOUNT_INFO = Metadata and data for an account
- SERIALIZATION = Converting struct to bytes for storage
- DESERIALIZATION = Converting bytes back to struct for use
*/
