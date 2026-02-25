// Lecture Code - 2_create_token_mint.js
// Topic: Creating a Token Mint on Solana using spl-token
// Day 4.1 - Solana Jargon, Programming Model & Tokens
// npm install @solana/web3.js @solana/spl-token

import {
  Connection,
  Keypair,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import fs from "fs";

// ── Setup ──────────────────────────────────────────────────────────────────────
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Load your payer wallet from local Solana CLI keypair
// Run: solana-keygen new  to create one
// Run: solana airdrop 2   to fund it
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`)))
);

console.log("Payer:", payer.publicKey.toBase58());

// ── Helper: Airdrop if balance is low ──────────────────────────────────────────
async function airdropIfRequired(pubkey, minLamports = LAMPORTS_PER_SOL) {
  const balance = await connection.getBalance(pubkey);
  if (balance < minLamports) {
    console.log("Airdropping 2 SOL...");
    const sig = await connection.requestAirdrop(pubkey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  }
  const bal = await connection.getBalance(pubkey);
  console.log("Balance:", bal / LAMPORTS_PER_SOL, "SOL");
}

// ── Step 1: Create a Token Mint ────────────────────────────────────────────────
// A mint is the "central bank" that controls token supply
async function createTokenMint() {
  await airdropIfRequired(payer.publicKey);

  const mint = await createMint(
    connection,
    payer,              // payer of the transaction
    payer.publicKey,    // mint authority (who can mint new tokens)
    payer.publicKey,    // freeze authority (who can freeze accounts), null to disable
    6                   // decimals (like USDC = 6, SOL = 9)
  );

  console.log("\n=== Token Mint Created ===");
  console.log("Mint Address:", mint.toBase58());
  console.log("Solscan:", `https://solscan.io/token/${mint.toBase58()}?cluster=devnet`);

  return mint;
}

// ── Step 2: Create an Associated Token Account (ATA) ──────────────────────────
// Each user needs one ATA per token to hold their balance
async function createATA(mint, owner) {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,            // fee payer
    mint,             // which token
    owner             // who owns this ATA
  );

  console.log("\n=== ATA Created ===");
  console.log("ATA Address:", ata.address.toBase58());
  console.log("Owner      :", owner.toBase58());
  console.log("Mint       :", mint.toBase58());

  return ata;
}

// ── Step 3: Mint Tokens ────────────────────────────────────────────────────────
async function mintTokens(mint, ata, amount = 1000) {
  const DECIMALS = 6;
  const rawAmount = BigInt(amount * 10 ** DECIMALS);

  const sig = await mintTo(
    connection,
    payer,
    mint,
    ata.address,
    payer,          // mint authority must sign
    rawAmount
  );

  console.log("\n=== Tokens Minted ===");
  console.log(`Minted ${amount} tokens to ${ata.address.toBase58()}`);
  console.log("TX:", sig);

  // Check balance
  const account = await getAccount(connection, ata.address);
  console.log("ATA Balance:", account.amount.toString(), "raw units");
  console.log("ATA Balance:", Number(account.amount) / 10 ** DECIMALS, "tokens");
}

// ── Step 4: Transfer Tokens ────────────────────────────────────────────────────
async function transferTokens(mint, sourceATA, destOwner, amount = 10) {
  const DECIMALS = 6;

  // Create ATA for destination
  const destATA = await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, destOwner
  );

  const sig = await transfer(
    connection,
    payer,
    sourceATA.address,
    destATA.address,
    payer,                           // owner of source ATA
    BigInt(amount * 10 ** DECIMALS)
  );

  console.log("\n=== Transfer Complete ===");
  console.log(`Transferred ${amount} tokens to ${destOwner.toBase58()}`);
  console.log("TX:", sig);
}

// ── Step 5: Check Mint Info ────────────────────────────────────────────────────
async function getMintInfo(mint) {
  const mintInfo = await getMint(connection, mint);
  console.log("\n=== Mint Info ===");
  console.log("Supply    :", mintInfo.supply.toString());
  console.log("Decimals  :", mintInfo.decimals);
  console.log("Mint Auth :", mintInfo.mintAuthority?.toBase58());
  console.log("Freeze Auth:", mintInfo.freezeAuthority?.toBase58() || "None");
}

// ── Run Full Flow ─────────────────────────────────────────────────────────────
async function main() {
  const mint = await createTokenMint();
  const payerATA = await createATA(mint, payer.publicKey);
  await mintTokens(mint, payerATA);
  await getMintInfo(mint);

  // Transfer to a random wallet
  const recipient = Keypair.generate();
  await transferTokens(mint, payerATA, recipient.publicKey, 50);
}

main().catch(console.error);

/*
KEY CONCEPTS:
- Token Mint = the "factory" that creates tokens. One mint per token type.
- ATA = Associated Token Account. One per user per token.
- mint_authority = who can call mintTo() to create new tokens
- freeze_authority = who can freeze user ATAs (set null to disable)
- decimals = like cents. 6 decimals means 1 token = 1_000_000 raw units
- Transfer doesn't require mint authority — just the ATA owner's signature
*/
