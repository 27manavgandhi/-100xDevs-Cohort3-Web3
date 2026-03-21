// Lecture Code - 2_litesvm_testing.ts
// Topic: Testing Native Solana Programs with LiteSVM
// Day 28.1 - Anchor vs Raw Contracts
//
// To run: bun test

// ── What is LiteSVM? ──────────────────────────────────────────────────────────
//
// LiteSVM is a lightweight Solana Virtual Machine that runs locally.
// It simulates the Solana runtime without needing a validator.
//
// Real-Life Analogy:
//   Like running a database in-memory for testing instead of connecting
//   to a real PostgreSQL server. Much faster, no network overhead.
//
// Why use LiteSVM?
//   1. SPEED: Tests run in milliseconds, not seconds
//   2. NO VALIDATOR: No need to run solana-test-validator
//   3. DETERMINISTIC: Isolated test environment
//   4. PORTABLE: Works with Bun, Node.js, etc.

import * as path from "path";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import { LiteSVM } from "litesvm";
import { describe, beforeAll, test, expect } from "bun:test";

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE SETUP
// ══════════════════════════════════════════════════════════════════════════════

describe("Native Calculator Tests", () => {
    let svm: LiteSVM;              // Lightweight Solana VM
    let programId: PublicKey;       // Our program's address
    let dataAccount: Keypair;       // Account storing counter state
    let userAccount: Keypair;       // Account paying for transactions
  
    // Path to compiled program (.so file)
    const programPath = path.join(import.meta.dir, "calculator.so");
  
    // ── SETUP (runs once before all tests) ───────────────────────────────────
    
    beforeAll(() => {
      // ── Initialize LiteSVM ──────────────────────────────────────────────────
      
      // Create new SVM instance
      // This is our local Solana runtime
      svm = new LiteSVM();
      
      // ── Generate Program ID ─────────────────────────────────────────────────
      
      // Generate a unique address for our program
      programId = PublicKey.unique();
      
      // ── Load Program ────────────────────────────────────────────────────────
      
      // Load compiled program into the SVM
      // This is like deploying the program on-chain
      svm.addProgramFromFile(programId, programPath);
      
      // ── Create Accounts ─────────────────────────────────────────────────────
      
      // Create keypair for data storage account
      // This account will store our counter state (4 bytes)
      dataAccount = new Keypair();
      
      // Create keypair for user/payer account
      // This account will pay transaction fees
      userAccount = new Keypair();
  
      // ── Fund User Account ───────────────────────────────────────────────────
      
      // Airdrop 1 SOL to user account
      // This gives the user account lamports to pay fees
      svm.airdrop(userAccount.publicKey, BigInt(LAMPORTS_PER_SOL));
      
      // ── Create Data Account ─────────────────────────────────────────────────
      
      // Create account instruction
      // This creates an account owned by our program
      let createAccountIx = SystemProgram.createAccount({
        fromPubkey: userAccount.publicKey,        // Who's paying
        newAccountPubkey: dataAccount.publicKey,  // New account address
        lamports: Number(svm.minimumBalanceForRentExemption(BigInt(4))), // Rent exemption
        space: 4,                                 // 4 bytes for u32
        programId                                 // Owner of new account
      });
      
      // Create and send transaction
      let createAccountTx = new Transaction().add(createAccountIx);
      createAccountTx.recentBlockhash = svm.latestBlockhash();
      createAccountTx.sign(userAccount, dataAccount);  // Both must sign
      svm.sendTransaction(createAccountTx);
      
      console.log("Setup complete:");
      console.log("  Program ID:", programId.toBase58());
      console.log("  Data Account:", dataAccount.publicKey.toBase58());
      console.log("  User Account:", userAccount.publicKey.toBase58());
    });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1: INITIALIZE COUNTER
    // ══════════════════════════════════════════════════════════════════════════

    test("Initialize counter to 1", () => {
        // ── Build Instruction ─────────────────────────────────────────────────
        
        // Instruction data: [0] for Init variant
        // This matches our Instruction enum in Rust:
        //   enum Instruction { Init, ... }
        //   Init = discriminator 0
        const instructionData = Buffer.from([0]);
        
        // Create transaction instruction
        const instruction = new TransactionInstruction({
            programId,                                    // Our calculator program
            keys: [
                { 
                    pubkey: dataAccount.publicKey,        // Data account
                    isSigner: true,                        // Must sign
                    isWritable: true                       // Will be modified
                }
            ],
            data: instructionData
        });

        // ── Build and Send Transaction ────────────────────────────────────────
        
        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = svm.latestBlockhash();
        transaction.feePayer = userAccount.publicKey;
        
        // Both accounts must sign:
        //   - dataAccount: Required by our program (is_signer check)
        //   - userAccount: Fee payer
        transaction.sign(dataAccount, userAccount);
        
        // Send transaction to SVM
        let signature = svm.sendTransaction(transaction);
        
        console.log("Init transaction signature:", signature);

        // ── Verify Result ─────────────────────────────────────────────────────
        
        // Fetch updated account data
        const updatedAccountData = svm.getAccount(dataAccount.publicKey);
        
        if (!updatedAccountData) {
            throw new Error("Account not found after initialization");
        }

        // Verify counter value is 1
        // u32 in little-endian: [1, 0, 0, 0]
        expect(updatedAccountData.data[0]).toBe(1);  // Least significant byte
        expect(updatedAccountData.data[1]).toBe(0);
        expect(updatedAccountData.data[2]).toBe(0);
        expect(updatedAccountData.data[3]).toBe(0);  // Most significant byte
        
        console.log("✓ Counter initialized to 1");
    });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2: DOUBLE COUNTER
    // ══════════════════════════════════════════════════════════════════════════

    test("Double the counter value", () => {
        // Instruction data: [1] for Double variant
        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: dataAccount.publicKey, isSigner: true, isWritable: true }
            ],  
            data: Buffer.from([1])  // Double = discriminator 1
        });

        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = svm.latestBlockhash();
        transaction.feePayer = userAccount.publicKey;
        transaction.sign(dataAccount, userAccount);
        
        let signature = svm.sendTransaction(transaction);
        console.log("Double transaction signature:", signature);

        // Verify counter is now 2
        const updatedAccountData = svm.getAccount(dataAccount.publicKey);
        if (!updatedAccountData) {
            throw new Error("Account not found");
        }

        // u32 value 2 in little-endian: [2, 0, 0, 0]
        expect(updatedAccountData.data[0]).toBe(2);
        expect(updatedAccountData.data[1]).toBe(0);
        expect(updatedAccountData.data[2]).toBe(0);
        expect(updatedAccountData.data[3]).toBe(0);
        
        console.log("✓ Counter doubled to 2");
    });

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3: HALVE COUNTER
    // ══════════════════════════════════════════════════════════════════════════

    test("Halve the counter value", () => {
        // Instruction data: [2] for Half variant
        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: dataAccount.publicKey, isSigner: true, isWritable: true }
            ],  
            data: Buffer.from([2])  // Half = discriminator 2
        });

        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = svm.latestBlockhash();
        transaction.feePayer = userAccount.publicKey;
        transaction.sign(dataAccount, userAccount);
        
        let signature = svm.sendTransaction(transaction);
        console.log("Half transaction signature:", signature);

        // Verify counter is back to 1
        const updatedAccountData = svm.getAccount(dataAccount.publicKey);
        if (!updatedAccountData) {
            throw new Error("Account not found");
        }

        // Should be 1 again (2 / 2 = 1)
        expect(updatedAccountData.data[0]).toBe(1);
        expect(updatedAccountData.data[1]).toBe(0);
        expect(updatedAccountData.data[2]).toBe(0);
        expect(updatedAccountData.data[3]).toBe(0);
        
        console.log("✓ Counter halved to 1");
    });
    
    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4: ADD AMOUNT
    // ══════════════════════════════════════════════════════════════════════════
    
    test("Add amount to counter", () => {
        // ── Encode Instruction with Amount ───────────────────────────────────
        
        // For Add instruction: [discriminator, amount_bytes]
        // discriminator = 3
        // amount = 10 (u32)
        
        const amount = 10;
        const instructionData = Buffer.alloc(5);  // 1 byte discriminator + 4 bytes u32
        
        instructionData[0] = 3;  // Add discriminator
        
        // Write amount as little-endian u32
        instructionData.writeUInt32LE(amount, 1);
        
        // Result: [3, 10, 0, 0, 0]
        
        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: dataAccount.publicKey, isSigner: true, isWritable: true }
            ],
            data: instructionData
        });

        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = svm.latestBlockhash();
        transaction.feePayer = userAccount.publicKey;
        transaction.sign(dataAccount, userAccount);
        
        svm.sendTransaction(transaction);

        // Verify counter is 11 (1 + 10)
        const updatedAccountData = svm.getAccount(dataAccount.publicKey);
        
        // Read u32 little-endian
        const value = updatedAccountData!.data.readUInt32LE(0);
        expect(value).toBe(11);
        
        console.log(`✓ Added ${amount}, counter now ${value}`);
    });
    
    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5: SUBTRACT AMOUNT
    // ══════════════════════════════════════════════════════════════════════════
    
    test("Subtract amount from counter", () => {
        // Instruction: [4, amount_bytes]
        const amount = 5;
        const instructionData = Buffer.alloc(5);
        
        instructionData[0] = 4;  // Subtract discriminator
        instructionData.writeUInt32LE(amount, 1);
        
        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: dataAccount.publicKey, isSigner: true, isWritable: true }
            ],
            data: instructionData
        });

        const transaction = new Transaction().add(instruction);
        transaction.recentBlockhash = svm.latestBlockhash();
        transaction.feePayer = userAccount.publicKey;
        transaction.sign(dataAccount, userAccount);
        
        svm.sendTransaction(transaction);

        // Verify counter is 6 (11 - 5)
        const updatedAccountData = svm.getAccount(dataAccount.publicKey);
        const value = updatedAccountData!.data.readUInt32LE(0);
        expect(value).toBe(6);
        
        console.log(`✓ Subtracted ${amount}, counter now ${value}`);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTION DATA ENCODING REFERENCE
// ══════════════════════════════════════════════════════════════════════════════

// Init:        [0]
// Double:      [1]
// Half:        [2]
// Add 10:      [3, 10, 0, 0, 0]
// Subtract 5:  [4, 5, 0, 0, 0]
//
// Why little-endian?
//   - Solana (and most modern systems) use little-endian byte order
//   - u32 value 10 = 0x0000000A
//   - Little-endian bytes: [0x0A, 0x00, 0x00, 0x00] = [10, 0, 0, 0]

// ══════════════════════════════════════════════════════════════════════════════
// LITESVM vs SOLANA VALIDATOR
// ══════════════════════════════════════════════════════════════════════════════

// LiteSVM:
//   ✓ Fast (milliseconds)
//   ✓ No validator needed
//   ✓ Lightweight
//   ✓ Deterministic
//   ✗ Not 100% parity with real Solana
//   ✗ Missing some advanced features
//
// Solana Test Validator:
//   ✓ Full Solana parity
//   ✓ Real transaction processing
//   ✗ Slow (seconds to start)
//   ✗ Requires running validator
//   ✗ More complex setup
//
// Use LiteSVM for: Unit tests, rapid iteration
// Use validator for: Integration tests, final validation

/*
KEY CONCEPTS:
- LITESVM = Lightweight Solana VM for local testing
- TRANSACTION INSTRUCTION = Command sent to a program
- INSTRUCTION DATA = Serialized parameters for instruction
- SIGNER = Account that must sign transaction to authorize it
- WRITABLE = Account that will be modified by instruction
- FEE PAYER = Account paying transaction fees
- LITTLE-ENDIAN = Byte order where least significant byte comes first
- DISCRIMINATOR = First byte(s) identifying instruction variant
- RENT EXEMPTION = Minimum balance to keep account alive
- RECENT BLOCKHASH = Recent block hash required for transactions
*/
