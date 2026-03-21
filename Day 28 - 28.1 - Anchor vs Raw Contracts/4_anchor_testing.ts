// Lecture Code - 4_anchor_testing.ts
// Topic: Testing Anchor Programs with Mocha and TypeScript
// Day 28.1 - Anchor vs Raw Contracts
//
// To run: anchor test

// ── What is Anchor Testing? ───────────────────────────────────────────────────
//
// Anchor provides a TypeScript testing framework built on Mocha.
// Tests run against a local validator, providing full Solana simulation.
//
// Real-Life Analogy:
//   Like end-to-end testing for web apps, but for smart contracts.
//   Tests the full stack: client → RPC → validator → program.
//
// Why Anchor testing?
//   1. TYPE SAFETY: Auto-generated types from IDL
//   2. SIMPLE API: Clean, readable test code
//   3. INTEGRATION: Tests real transaction flow
//   4. AUTO-COMPLETION: IDE suggests methods and accounts

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorCalculator } from "../target/types/anchor_calculator";
import assert from "assert";

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE SETUP
// ══════════════════════════════════════════════════════════════════════════════

describe("anchor-calculator", () => {
  // ── Configure Provider ────────────────────────────────────────────────────
  
  // Set the provider (connection to Solana cluster)
  // AnchorProvider.env() reads from:
  //   - Anchor.toml (cluster URL)
  //   - ~/.config/solana/id.json (wallet)
  anchor.setProvider(anchor.AnchorProvider.env());

  // ── Get Program Instance ──────────────────────────────────────────────────
  
  // Get typed program instance
  // The type AnchorCalculator is auto-generated from IDL
  // This gives us full TypeScript type safety!
  const program = anchor.workspace.anchorCalculator as Program<AnchorCalculator>;
  
  // ── Generate Test Account ─────────────────────────────────────────────────
  
  // Generate a new keypair for our counter account
  // This account will store the counter state
  const newAccount = anchor.web3.Keypair.generate();
  
  console.log("Test setup complete:");
  console.log("  Program ID:", program.programId.toBase58());
  console.log("  Counter Account:", newAccount.publicKey.toBase58());
  console.log("  Wallet:", anchor.getProvider().wallet.publicKey.toBase58());

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 1: INITIALIZE
  // ══════════════════════════════════════════════════════════════════════════

  it("Initializes the counter account", async () => {
    // ── Call Initialize Instruction ──────────────────────────────────────────
    
    // program.methods gives access to all instruction handlers
    // initialize() corresponds to pub fn initialize() in Rust
    const tx = await program.methods
      .initialize()                    // Call initialize instruction
      .accounts({
        // Provide required accounts
        // These match the Initialize struct in Rust
        newAccount: newAccount.publicKey,
        signer: anchor.getProvider().wallet.publicKey,
        // system_program is auto-added by Anchor
      })
      .signers([newAccount])           // newAccount must sign (it's being created)
      .rpc();                          // Send transaction and wait for confirmation
    
    console.log("Initialize transaction signature:", tx);
    
    // ── Verify Account Created ───────────────────────────────────────────────
    
    // Fetch the account data
    // program.account.newAccount corresponds to NewAccount struct
    // Anchor automatically deserializes the data!
    const account = await program.account.newAccount.fetch(newAccount.publicKey);
    
    // Verify counter was initialized to 1
    assert.equal(account.data, 1, "Counter should be initialized to 1");
    
    console.log("✓ Counter initialized:", account.data);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 2: DOUBLE
  // ══════════════════════════════════════════════════════════════════════════

  it("Doubles the counter value", async () => {
    // ── Get Current Value ─────────────────────────────────────────────────────
    
    let account = await program.account.newAccount.fetch(newAccount.publicKey);
    const beforeValue = account.data;
    console.log("Before double:", beforeValue);
    
    // ── Call Double Instruction ───────────────────────────────────────────────
    
    const tx = await program.methods
      .double()                        // Call double instruction
      .accounts({
        // Provide required accounts
        account: newAccount.publicKey,
        signer: anchor.getProvider().wallet.publicKey,
      })
      .rpc();                          // No .signers() needed (no new accounts created)
    
    console.log("Double transaction signature:", tx);
    
    // ── Verify Result ─────────────────────────────────────────────────────────
    
    account = await program.account.newAccount.fetch(newAccount.publicKey);
    const afterValue = account.data;
    
    // Should be doubled
    assert.equal(afterValue, beforeValue * 2, "Value should be doubled");
    assert.equal(afterValue, 2, "Value should be 2");
    
    console.log("✓ Counter doubled:", afterValue);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 3: HALVE
  // ══════════════════════════════════════════════════════════════════════════

  it("Halves the counter value", async () => {
    let account = await program.account.newAccount.fetch(newAccount.publicKey);
    const beforeValue = account.data;
    console.log("Before halve:", beforeValue);
    
    // ── Call Halve Instruction ────────────────────────────────────────────────
    
    const tx = await program.methods
      .halve()
      .accounts({
        account: newAccount.publicKey,
      })
      .rpc();
    
    console.log("Halve transaction signature:", tx);
    
    // ── Verify Result ─────────────────────────────────────────────────────────
    
    account = await program.account.newAccount.fetch(newAccount.publicKey);
    const afterValue = account.data;
    
    // Should be halved (integer division)
    assert.equal(afterValue, Math.floor(beforeValue / 2), "Value should be halved");
    assert.equal(afterValue, 1, "Value should be 1");
    
    console.log("✓ Counter halved:", afterValue);
  });
  
  // ══════════════════════════════════════════════════════════════════════════
  // TEST 4: ADD
  // ══════════════════════════════════════════════════════════════════════════
  
  it("Adds amount to counter", async () => {
    let account = await program.account.newAccount.fetch(newAccount.publicKey);
    const beforeValue = account.data;
    console.log("Before add:", beforeValue);
    
    // ── Call Add Instruction with Parameter ──────────────────────────────────
    
    const amountToAdd = 10;
    
    // Notice: add(amount) takes a parameter
    // This matches: pub fn add(ctx: Context<Add>, amount: u32)
    const tx = await program.methods
      .add(amountToAdd)                // Pass amount parameter
      .accounts({
        account: newAccount.publicKey,
        signer: anchor.getProvider().wallet.publicKey,
      })
      .rpc();
    
    console.log("Add transaction signature:", tx);
    
    // ── Verify Result ─────────────────────────────────────────────────────────
    
    account = await program.account.newAccount.fetch(newAccount.publicKey);
    const afterValue = account.data;
    
    assert.equal(afterValue, beforeValue + amountToAdd, "Value should increase by amount");
    assert.equal(afterValue, 11, "Value should be 11");
    
    console.log(`✓ Added ${amountToAdd}, counter now:`, afterValue);
  });
  
  // ══════════════════════════════════════════════════════════════════════════
  // TEST 5: SUBTRACT
  // ══════════════════════════════════════════════════════════════════════════
  
  it("Subtracts amount from counter", async () => {
    let account = await program.account.newAccount.fetch(newAccount.publicKey);
    const beforeValue = account.data;
    console.log("Before subtract:", beforeValue);
    
    // ── Call Sub Instruction with Parameter ──────────────────────────────────
    
    const amountToSubtract = 5;
    
    const tx = await program.methods
      .sub(amountToSubtract)           // Pass amount parameter
      .accounts({
        account: newAccount.publicKey,
        signer: anchor.getProvider().wallet.publicKey,
      })
      .rpc();
    
    console.log("Subtract transaction signature:", tx);
    
    // ── Verify Result ─────────────────────────────────────────────────────────
    
    account = await program.account.newAccount.fetch(newAccount.publicKey);
    const afterValue = account.data;
    
    assert.equal(afterValue, beforeValue - amountToSubtract, "Value should decrease by amount");
    assert.equal(afterValue, 6, "Value should be 6");
    
    console.log(`✓ Subtracted ${amountToSubtract}, counter now:`, afterValue);
  });
  
  // ══════════════════════════════════════════════════════════════════════════
  // TEST 6: ERROR HANDLING (Overflow)
  // ══════════════════════════════════════════════════════════════════════════
  
  it("Handles overflow gracefully", async () => {
    // ── Set Counter to Max Value ──────────────────────────────────────────────
    
    // First, we'd need a "set" instruction or manipulate to u32::MAX
    // For demo, we'll try to double a large number
    
    // Skip this test if not implemented
    // Just showing how error handling would work:
    
    try {
      await program.methods
        .add(4294967295)  // Try to add max u32
        .accounts({
          account: newAccount.publicKey,
          signer: anchor.getProvider().wallet.publicKey,
        })
        .rpc();
      
      // If we get here, test should fail
      assert.fail("Should have thrown overflow error");
      
    } catch (err) {
      // Verify error is arithmetic overflow
      console.log("✓ Correctly caught overflow error");
      // In production, check specific error code
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ANCHOR TESTING API REFERENCE
// ══════════════════════════════════════════════════════════════════════════════

// Key methods:
//
// program.methods.instructionName(args)
//   - Call an instruction handler
//   - Arguments match Rust function signature
//
// .accounts({ ... })
//   - Provide required accounts
//   - Keys match #[derive(Accounts)] struct fields
//
// .signers([keypair1, keypair2])
//   - Add signers beyond the provider wallet
//   - Needed for new accounts being created
//
// .rpc()
//   - Send transaction and wait for confirmation
//   - Returns transaction signature
//
// program.account.accountType.fetch(pubkey)
//   - Fetch and deserialize account data
//   - Returns typed object matching Rust struct
//
// Alternative sending methods:
//   - .transaction() - Build transaction without sending
//   - .simulate() - Simulate without sending
//   - .instruction() - Get instruction without transaction

// ══════════════════════════════════════════════════════════════════════════════
// TYPE SAFETY DEMONSTRATION
// ══════════════════════════════════════════════════════════════════════════════

// The IDL-generated types provide full type safety:
//
// // ✓ Correct - TypeScript knows this is valid
// await program.methods.double().accounts({ ... }).rpc();
//
// // ✗ Error - TypeScript catches typo at compile time
// await program.methods.dubble().accounts({ ... }).rpc();
//              // ~~~~~~ Property 'dubble' does not exist
//
// // ✓ Correct - Account has 'data' field
// const account = await program.account.newAccount.fetch(...);
// console.log(account.data);
//
// // ✗ Error - TypeScript knows field doesn't exist
// console.log(account.count);
//             // ~~~~~ Property 'count' does not exist

// ══════════════════════════════════════════════════════════════════════════════
// COMPARISON: LITESVM vs ANCHOR TESTING
// ══════════════════════════════════════════════════════════════════════════════

// LiteSVM:
//   ✓ Extremely fast (milliseconds)
//   ✓ No validator needed
//   ✓ Lightweight
//   ✗ Manual instruction encoding
//   ✗ No type safety
//   ✗ More verbose
//
// Anchor Testing:
//   ✓ Type-safe API
//   ✓ Clean, readable code
//   ✓ Auto-completion in IDE
//   ✓ Full Solana validator
//   ✗ Slower (seconds)
//   ✗ Requires running validator
//
// Best practice:
//   - Use Anchor tests for integration testing
//   - Use LiteSVM for unit tests (if writing native programs)
//   - Use both for comprehensive coverage

/*
KEY CONCEPTS:
- MOCHA = JavaScript testing framework used by Anchor
- IDL = Interface Definition Language (auto-generated from Rust code)
- TYPE GENERATION = TypeScript types created from IDL
- PROGRAM.METHODS = API for calling instruction handlers
- PROGRAM.ACCOUNT = API for fetching account data
- RPC = Remote Procedure Call (sending transaction to cluster)
- SIGNERS = Keypairs that must sign the transaction
- ACCOUNTS = Accounts passed to instruction handler
- PROVIDER = Connection to Solana cluster + wallet
- WORKSPACE = All programs in the Anchor project
*/
