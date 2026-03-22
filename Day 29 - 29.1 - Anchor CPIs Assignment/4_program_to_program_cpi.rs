// Lecture Code - 4_program_to_program_cpi.rs
// Topic: Calling Custom Programs via CPI
// Day 29.1 - Anchor CPIs
//
// To build: anchor build
// To test: anchor test

// ── What Does This Demonstrate? ───────────────────────────────────────────────
//
// This program shows how to call ANOTHER custom program via CPI (not just
// System Program). This enables true composability—programs building on
// programs, like DeFi protocols composing together.
//
// Real-Life Analogy:
//   Like a travel booking app that calls both a flight API and a hotel API.
//   Your app doesn't implement flights or hotels—it orchestrates calls to
//   specialized services. Similarly, this program orchestrates calls to
//   other Solana programs.
//
// Why compose programs?
//   1. MODULARITY: Each program does one thing well
//   2. REUSABILITY: Leverage existing battle-tested programs
//   3. UPGRADABILITY: Update one program without touching others
//   4. SPECIALIZATION: DeFi, NFT, Oracle programs all work together

use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

// ══════════════════════════════════════════════════════════════════════════════
// PROGRAM MODULE
// ══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod cpi_caller {
    use super::*;

    /// Forward initialize call to target program
    /// 
    /// This function acts as a proxy, calling another program's
    /// initialize instruction via CPI.
    pub fn proxy_initialize(ctx: Context<ProxyInitialize>) -> Result<()> {
        msg!("Proxying initialize to target program");
        
        // ── Build CPI Context ─────────────────────────────────────────────────
        
        // CpiContext for calling external program
        let cpi_program = ctx.accounts.target_program.to_account_info();
        
        let cpi_accounts = target_program::cpi::accounts::Initialize {
            counter: ctx.accounts.counter.to_account_info(),
            user: ctx.accounts.user.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        // ── Execute CPI ───────────────────────────────────────────────────────
        
        // Call the target program's initialize instruction
        target_program::cpi::initialize(cpi_ctx)?;
        
        msg!("Target program initialized via CPI");
        
        Ok(())
    }
    
    /// Forward double call to target program
    pub fn proxy_double(ctx: Context<ProxyDouble>) -> Result<()> {
        msg!("Proxying double to target program");
        
        let cpi_program = ctx.accounts.target_program.to_account_info();
        
        let cpi_accounts = target_program::cpi::accounts::Update {
            counter: ctx.accounts.counter.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        target_program::cpi::double(cpi_ctx)?;
        
        msg!("Target program doubled via CPI");
        
        Ok(())
    }
    
    /// Call target and log result
    /// 
    /// Shows how to call CPI and work with the result
    pub fn call_and_log(ctx: Context<ProxyDouble>) -> Result<()> {
        // Call via CPI
        let cpi_program = ctx.accounts.target_program.to_account_info();
        let cpi_accounts = target_program::cpi::accounts::Update {
            counter: ctx.accounts.counter.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        target_program::cpi::double(cpi_ctx)?;
        
        // Read the updated value
        // Note: Need to reload account data
        ctx.accounts.counter.reload()?;
        msg!("Counter value after CPI: {}", ctx.accounts.counter.count);
        
        Ok(())
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

/// Accounts for proxying initialize
#[derive(Accounts)]
pub struct ProxyInitialize<'info> {
    /// The counter account (will be created by target program)
    /// CHECK: This account will be validated and created by target program
    #[account(mut)]
    pub counter: UncheckedAccount<'info>,
    
    /// User paying for account creation
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// The target program to call
    /// CHECK: Should verify this is the correct program
    pub target_program: UncheckedAccount<'info>,
    
    /// System program (needed by target program)
    pub system_program: Program<'info, System>,
}

/// Accounts for proxying double
#[derive(Accounts)]
pub struct ProxyDouble<'info> {
    /// The counter account (owned by target program)
    #[account(mut)]
    pub counter: Account<'info, target_program::Counter>,
    
    /// The target program to call
    /// CHECK: Verified by Account type above
    pub target_program: Program<'info, target_program::program::TargetProgram>,
}

// ══════════════════════════════════════════════════════════════════════════════
// TARGET PROGRAM REFERENCE
// ══════════════════════════════════════════════════════════════════════════════

// This is how we reference the external program
// In a real implementation, you'd add it to Cargo.toml:
//
// [dependencies]
// target-program = { path = "../target-program", features = ["cpi"] }
//
// Then import it:
// use target_program;

// Mock definition for demonstration:
pub mod target_program {
    use super::*;
    
    // Program module
    pub mod program {
        use super::*;
        declare_id!("TargetProgramIDHere111111111111111111111");
        
        pub struct TargetProgram;
    }
    
    // Account structure
    #[account]
    pub struct Counter {
        pub count: u32,
    }
    
    // CPI helpers (generated by Anchor with features = ["cpi"])
    pub mod cpi {
        use super::*;
        
        pub mod accounts {
            use super::*;
            
            pub struct Initialize {
                pub counter: AccountInfo<'static>,
                pub user: AccountInfo<'static>,
                pub system_program: AccountInfo<'static>,
            }
            
            pub struct Update {
                pub counter: AccountInfo<'static>,
            }
        }
        
        pub fn initialize(ctx: CpiContext<accounts::Initialize>) -> Result<()> {
            // In real implementation, this calls the actual program
            Ok(())
        }
        
        pub fn double(ctx: CpiContext<accounts::Update>) -> Result<()> {
            // In real implementation, this calls the actual program
            Ok(())
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL CPI (Alternative Approach)
// ══════════════════════════════════════════════════════════════════════════════

// If you don't have the Anchor CPI helpers, you can do it manually:
//
// pub fn manual_proxy_double(ctx: Context<ProxyDouble>) -> Result<()> {
//     // Instruction data for "double" instruction
//     // Format: [instruction_discriminator_8_bytes]
//     // You'd calculate this from the target program's IDL
//     let mut instruction_data = Vec::new();
//     instruction_data.extend_from_slice(&[/* 8 byte discriminator */]);
//     
//     // Prepare account metas
//     let account_metas = vec![
//         AccountMeta::new(*ctx.accounts.counter.key, false),
//     ];
//     
//     // Create instruction
//     let instruction = Instruction {
//         program_id: *ctx.accounts.target_program.key,
//         accounts: account_metas,
//         data: instruction_data,
//     };
//     
//     // Invoke
//     solana_program::program::invoke(
//         &instruction,
//         &[
//             ctx.accounts.counter.to_account_info(),
//             ctx.accounts.target_program.to_account_info(),
//         ],
//     )?;
//     
//     Ok(())
// }

// ══════════════════════════════════════════════════════════════════════════════
// ENABLING CPI IN TARGET PROGRAM
// ══════════════════════════════════════════════════════════════════════════════

// To enable CPI in an Anchor program, add to Cargo.toml:
//
// [lib]
// crate-type = ["cdylib", "lib"]
//
// [features]
// cpi = ["no-entrypoint"]
// no-entrypoint = []
//
// This generates CPI helpers in target_program::cpi module

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSABILITY PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

// Pattern 1: DeFi Composability
// ────────────────────────────────────────────────────────────────────────────
// Your lending protocol calls:
//   → Oracle program (get price)
//   → DEX program (swap collateral)
//   → Token program (transfer tokens)

// Pattern 2: NFT Marketplace
// ────────────────────────────────────────────────────────────────────────────
// Your marketplace calls:
//   → Metaplex program (transfer NFT)
//   → Token program (escrow payment)
//   → Royalty program (distribute royalties)

// Pattern 3: DAO Governance
// ────────────────────────────────────────────────────────────────────────────
// Your DAO calls:
//   → Voting program (tally votes)
//   → Treasury program (execute proposal)
//   → Token program (distribute rewards)

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY CONSIDERATIONS
// ══════════════════════════════════════════════════════════════════════════════

// 1. VALIDATE PROGRAM ID:
//    Always verify you're calling the correct program
//    Use Program<'info, TargetProgram> when possible
//
// 2. CHECK RETURN VALUES:
//    CPIs can fail - handle errors appropriately
//    Don't assume CPI succeeded without checking
//
// 3. ACCOUNT OWNERSHIP:
//    Verify accounts are owned by expected programs
//    Don't trust unchecked accounts
//
// 4. REENTRANCY:
//    Be careful of programs calling back into your program
//    Use mutexes or state flags if needed
//
// 5. UPGRADEABLE PROGRAMS:
//    Target programs can be upgraded
//    Consider version checks or compatibility layers

// ══════════════════════════════════════════════════════════════════════════════
// TESTING
// ══════════════════════════════════════════════════════════════════════════════

// Testing program-to-program CPIs:
//
// 1. Deploy both programs to localnet:
//    anchor build
//    anchor deploy
//
// 2. Test with correct program IDs:
//    it("Calls target program via CPI", async () => {
//      const counter = anchor.web3.Keypair.generate();
//      
//      await callerProgram.methods
//        .proxyInitialize()
//        .accounts({
//          counter: counter.publicKey,
//          user: provider.wallet.publicKey,
//          targetProgram: targetProgram.programId,
//          systemProgram: anchor.web3.SystemProgram.programId,
//        })
//        .signers([counter])
//        .rpc();
//      
//      const account = await targetProgram.account.counter.fetch(
//        counter.publicKey
//      );
//      assert.equal(account.count, 1);
//    });

/*
KEY CONCEPTS:
- PROGRAM-TO-PROGRAM CPI = Calling your own custom program (not System)
- COMPOSABILITY = Programs building on programs
- CPI HELPERS = Anchor-generated functions for calling programs
- CRATE FEATURES = Enabling "cpi" feature generates helpers
- PROGRAM<'INFO, T> = Type-safe reference to external program
- UNCHECKEDACCOUNT = Account not validated by Anchor
- INSTRUCTION DISCRIMINATOR = 8-byte identifier for instruction
- IDL = Interface definition for knowing how to call program
- MODULARITY = Each program focused on specific functionality
- CROSS-PROGRAM CALLS = Fundamental to Solana's composability
*/
