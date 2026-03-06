// Lecture Code - 3_lst_token_operations.ts
// Topic: mintTokens, burnTokens, sendNativeTokens — the 3 core LST operations
// Day 13.1 - Liquid Staking Tokens, Validators, Indexer & Building a Centralized LST
//
// npm install @solana/web3.js @solana/spl-token
// npm install -D typescript @types/node

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createMintToInstruction,
  createBurnInstruction,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── mintTokens ────────────────────────────────────────────────────────────────
// Called when: user sends SOL to our address
// Effect: mint custom tokens proportional to SOL received → send to user
//
// Flow:
//   SOL arrives → we detect via Helius → calculate tokensToMint
//   → getOrCreateATA for recipient → mintTo instruction → send tx

export async function mintTokens(
  connection: Connection,
  mintAuthority: Keypair,    // our keypair that controls the mint
  mintAddress: PublicKey,    // the custom token's mint address
  recipient: PublicKey,      // who gets the tokens (the SOL sender)
  amount: number             // raw token amount (with decimals)
): Promise<string> {

  console.log(`\n🔨 Minting ${amount} tokens to ${recipient.toBase58().slice(0, 8)}...`);

  // Step 1: Get or create the recipient's ATA for our token
  // If they don't have an ATA yet, this creates one (costs ~0.002 SOL in rent)
  // We (mintAuthority) pay for the ATA creation
  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuthority,           // fee payer for ATA creation
    mintAddress,             // which token
    recipient,               // whose wallet
  );

  console.log(`  ATA: ${recipientATA.address.toBase58().slice(0, 12)}...`);

  // Step 2: Build mintTo instruction
  const mintToIx = createMintToInstruction(
    mintAddress,                  // the mint
    recipientATA.address,         // destination ATA
    mintAuthority.publicKey,      // mint authority (must sign)
    amount,                       // amount in raw units (e.g. 100_000 for 0.1 with 6 decimals)
    [],                           // additional signers (none needed here)
    TOKEN_PROGRAM_ID
  );

  // Step 3: Send and confirm
  const tx = new Transaction().add(mintToIx);
  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [mintAuthority],             // signers: mintAuthority must sign
    { commitment: "confirmed" }
  );

  console.log(`  ✅ Minted! Tx: ${signature.slice(0, 20)}...`);
  return signature;
}

// ── burnTokens ────────────────────────────────────────────────────────────────
// Called when: user sends custom tokens back to our address
// Effect: burn those tokens (reduce supply) → we then send SOL back
//
// IMPORTANT: We can only burn tokens that we own (in our ATA).
// The user first sends tokens to OUR address → we receive them in OUR ATA
// Then we burn from OUR ATA
//
// Flow:
//   User sends tokens to us → Helius detects → we burn from our ATA
//   → then call sendNativeTokens to return SOL

export async function burnTokens(
  connection: Connection,
  authority: Keypair,        // our keypair (owns the ATA where tokens sit)
  mintAddress: PublicKey,    // the token's mint address
  amount: number             // raw amount to burn
): Promise<string> {

  console.log(`\n🔥 Burning ${amount} tokens...`);

  // Step 1: Get OUR ATA (the tokens were sent to us, so they're in our ATA)
  const ourATA = await getAssociatedTokenAddress(
    mintAddress,
    authority.publicKey,
  );

  console.log(`  Burning from ATA: ${ourATA.toBase58().slice(0, 12)}...`);

  // Step 2: Build burn instruction
  // Burn reduces totalSupply — the tokens are gone forever
  const burnIx = createBurnInstruction(
    ourATA,                    // source ATA (where tokens are)
    mintAddress,               // the mint (to update supply)
    authority.publicKey,       // account owner (must sign)
    amount,                    // amount to burn
    [],
    TOKEN_PROGRAM_ID
  );

  // Step 3: Send and confirm
  const tx = new Transaction().add(burnIx);
  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [authority],
    { commitment: "confirmed" }
  );

  console.log(`  ✅ Burned! Tx: ${signature.slice(0, 20)}...`);
  return signature;
}

// ── sendNativeTokens ──────────────────────────────────────────────────────────
// Called after: burning tokens received from user
// Effect: send SOL back to the user
//
// This uses the System Program (SOL transfers happen at the protocol level)

export async function sendNativeTokens(
  connection: Connection,
  from: Keypair,             // our keypair (holds the SOL)
  to: PublicKey,             // user who is getting SOL back
  amountInSOL: number        // how much SOL to send
): Promise<string> {

  console.log(`\n💸 Sending ${amountInSOL} SOL to ${to.toBase58().slice(0, 8)}...`);

  const lamports = Math.floor(amountInSOL * LAMPORTS_PER_SOL);

  // SystemProgram.transfer = the standard SOL transfer instruction
  const transferIx = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to,
    lamports,
  });

  const tx = new Transaction().add(transferIx);
  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [from],                  // signer: the sender keypair
    { commitment: "confirmed" }
  );

  console.log(`  ✅ Sent ${amountInSOL} SOL! Tx: ${signature.slice(0, 20)}...`);
  return signature;
}

// ── Demo: Full LST round-trip flow (dry run — no real keys) ──────────────────
async function demonstrateLSTFlow() {
  console.log("=== CENTRALIZED LST — FULL FLOW DEMONSTRATION ===\n");

  console.log("FLOW 1: User sends SOL → they get custom tokens");
  console.log("─".repeat(50));
  console.log("1. User sends 5 SOL to our address");
  console.log("2. Helius webhook fires → our server receives the event");
  console.log("3. We calculate: 5 SOL × 100 = 500 custom tokens");
  console.log("4. mintTokens(connection, mintAuthority, mint, userAddress, 500_000000)");
  console.log("   → getOrCreateATA for user");
  console.log("   → createMintToInstruction(mint, userATA, mintAuthority, 500_000000)");
  console.log("   → sendAndConfirmTransaction");
  console.log("   → User now holds 500 custom tokens ✅");

  console.log("\nFLOW 2: User sends tokens back → they get SOL");
  console.log("─".repeat(50));
  console.log("1. User sends 500 custom tokens to our address");
  console.log("2. Helius webhook fires → our server receives the event");
  console.log("3. We calculate: 500 tokens ÷ 100 = 5 SOL to return");
  console.log("4. burnTokens(connection, authority, mint, 500_000000)");
  console.log("   → createBurnInstruction(ourATA, mint, authority, 500_000000)");
  console.log("   → Tokens are permanently destroyed ✅");
  console.log("5. sendNativeTokens(connection, ourKeypair, userAddress, 5)");
  console.log("   → SystemProgram.transfer(ourKeypair → user, 5 SOL)");
  console.log("   → User gets 5 SOL back ✅");

  console.log("\nMATHEMATICAL FORMULA:");
  console.log("  SOL → Tokens:  tokensToMint = solAmount × 100 (×10^decimals for raw)");
  console.log("  Tokens → SOL:  solToReturn  = tokenAmount ÷ 100");
  console.log("\nPROBLEM WITH SIMPLE 1:1:");
  console.log("  We're not actually staking the SOL!");
  console.log("  Long-term: users redeem tokens but we have no extra SOL to return");
  console.log("  REAL LST: stake the SOL → earn 7% APY → use that to fund operations");
  console.log("  Better approach: stake user's SOL with a validator like Helius");
}

demonstrateLSTFlow();

/*
THREE CORE FUNCTIONS:
1. mintTokens()        → create new tokens for a user who sent SOL
2. burnTokens()        → destroy tokens that a user sent back to us
3. sendNativeTokens()  → send SOL back to user after burning their tokens

CRITICAL BUGS TO AVOID (from lecture README hints):
- Double-minting: check processedSignatures before minting
- Burning without sending SOL: burn ONLY if you have enough SOL to return
- ATA doesn't exist: use getOrCreateAssociatedTokenAccount, not getAssociatedTokenAddress
- Wrong token amounts: always use raw amounts (multiply by 10^decimals)
*/
