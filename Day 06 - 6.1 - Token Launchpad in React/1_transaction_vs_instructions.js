// Lecture Code - 1_transaction_vs_instructions.js
// Topic: Transaction vs Instructions on Solana — deep dive
// Day 6.1 - Token Launchpad in React
// npm install @solana/web3.js

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── What is an Instruction? ───────────────────────────────────────────────────
//
// An instruction is the SMALLEST unit of work on Solana.
// It tells the blockchain:
//   - Which program to call (programId)
//   - Which accounts are involved (keys)
//   - What data to pass (data)
//
// Think of it as a single line item on a bank form:
//   "Transfer $100 to account X"

// ── What is a Transaction? ────────────────────────────────────────────────────
//
// A transaction is a BUNDLE of one or more instructions.
// It also contains:
//   - recentBlockhash  → prevents replay attacks (expires ~150 slots / ~1 min)
//   - feePayer         → who pays the ~0.000005 SOL fee
//   - signatures       → signed by all required signers
//
// Think of it as a bank form that can contain multiple line items.

// ── Example 1: Single instruction transaction ─────────────────────────────────
// Transfer SOL from one account to another
async function singleInstructionExample() {
  const from = Keypair.generate();
  const to = Keypair.generate();

  // Airdrop to fund the sender
  await connection.requestAirdrop(from.publicKey, LAMPORTS_PER_SOL);
  await new Promise(r => setTimeout(r, 2000)); // wait for confirmation

  // One instruction: transfer 0.1 SOL
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to.publicKey,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  });

  const transaction = new Transaction().add(transferInstruction);

  // Set required fields
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = from.publicKey;

  console.log("=== Single Instruction Transaction ===");
  console.log("Instructions:", transaction.instructions.length); // 1
  console.log("From:", from.publicKey.toBase58());
  console.log("To:", to.publicKey.toBase58());
}

// ── Example 2: Multiple instructions in one transaction ───────────────────────
// Send SOL to TWO different recipients in a single transaction
async function multipleInstructionsExample() {
  const from = Keypair.generate();
  const recipient1 = Keypair.generate();
  const recipient2 = Keypair.generate();

  // Two instructions bundled into ONE transaction
  const ix1 = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: recipient1.publicKey,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  });

  const ix2 = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: recipient2.publicKey,
    lamports: 0.05 * LAMPORTS_PER_SOL,
  });

  // Bundle both into ONE transaction — pays one fee, atomic execution
  const transaction = new Transaction().add(ix1, ix2);

  console.log("=== Multi-Instruction Transaction ===");
  console.log("Instructions:", transaction.instructions.length); // 2
  console.log("Recipient 1:", recipient1.publicKey.toBase58());
  console.log("Recipient 2:", recipient2.publicKey.toBase58());

  // Key benefit: ATOMIC — either BOTH succeed or BOTH fail
  // No partial execution!
}

// ── Example 3: What createMint sends internally ───────────────────────────────
// createMint() from @solana/spl-token bundles 2 instructions:
//   Instruction 1: SystemProgram.createAccount → allocate mint account bytes
//   Instruction 2: createInitializeMintInstruction → set decimals + authorities
//
// This is what happens under the hood when you call createMint():

import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint } from "@solana/spl-token";

async function inspectCreateMint() {
  const payer = Keypair.generate();
  const mintKeypair = Keypair.generate();
  const mintAuthority = payer.publicKey;
  const freezeAuthority = null;
  const decimals = 6;

  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  console.log("\n=== createMint internals ===");
  console.log("MINT_SIZE:", MINT_SIZE, "bytes"); // 82 bytes
  console.log("Rent-exempt lamports:", lamports);
  console.log("= ", lamports / LAMPORTS_PER_SOL, "SOL");

  // Instruction 1: allocate the mint account
  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  });

  // Instruction 2: initialize mint data
  const initMintIx = createInitializeMintInstruction(
    mintKeypair.publicKey,
    decimals,
    mintAuthority,
    freezeAuthority,
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction().add(createAccountIx, initMintIx);

  console.log("Transaction has", transaction.instructions.length, "instructions");
  console.log("Instruction 1: createAccount (allocate", MINT_SIZE, "bytes for mint)");
  console.log("Instruction 2: initializeMint (set decimals, mintAuthority, freezeAuthority)");

  // Note: both payer AND mintKeypair must sign:
  // - payer signs to authorize payment
  // - mintKeypair signs because it's being created as a new account
  console.log("\nSigners required: [payer, mintKeypair]");
}

// ── Key differences summary ───────────────────────────────────────────────────
console.log(`
TRANSACTION vs INSTRUCTION SUMMARY:
────────────────────────────────────
Transaction:
  - The whole "package" submitted to Solana
  - Contains: instructions[], recentBlockhash, feePayer, signatures
  - Has a size limit: 1232 bytes max
  - Atomic: all instructions succeed or all fail

Instruction:
  - A single operation (call to a program)
  - Contains: programId, accounts[], data
  - Examples: transfer SOL, create account, initialize mint, mint tokens

Real-world analogy:
  Transaction = bank form
  Instructions = line items on the form ("Transfer $100", "Pay $50 bill")
`);

inspectCreateMint().catch(console.error);
