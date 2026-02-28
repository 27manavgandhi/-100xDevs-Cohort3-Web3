// Lecture Code - 1_accounts_deep_dive.js
// Topic: Accounts on Solana — AccountInfo, types, rent exemption
// Day 7.1 - Ownership, Authorities, Programs & PDAs
// npm install @solana/web3.js

import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── AccountInfo structure ─────────────────────────────────────────────────────
// Every account on Solana has the following fields:
//
// {
//   data:        Buffer   ← raw bytes stored in the account
//   executable:  boolean  ← true = program account, false = data/wallet account
//   lamports:    number   ← SOL balance in lamports (1 SOL = 10^9 lamports)
//   owner:       PublicKey ← which program controls/owns this account
//   rentEpoch:   number   ← deprecated field
// }

// ── Example 1: Fetch a wallet account (owned by System Program) ───────────────
async function fetchWalletAccount() {
  // A regular wallet — owned by System Program
  const walletAddress = new PublicKey("5gLJXtBDDWdWL4nwdUKprThQwyzqNZ7VNARFcEtw3rD4I");
  const accountInfo = await connection.getAccountInfo(walletAddress);

  console.log("=== WALLET ACCOUNT ===");
  console.log("executable:", accountInfo.executable);    // false — not a program
  console.log("lamports:", accountInfo.lamports);        // SOL balance in lamports
  console.log("SOL:", accountInfo.lamports / LAMPORTS_PER_SOL);
  console.log("owner:", accountInfo.owner.toBase58());   // System Program (111...1)
  console.log("data size:", accountInfo.data.length, "bytes"); // 0 — no data
}

// ── Example 2: Fetch a Token Mint account (owned by Token Program) ────────────
async function fetchTokenMintAccount() {
  // USDC mint address on mainnet
  const usdcMint = new PublicKey("EPJFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  // Note: This will fail on devnet (mainnet address)
  // Use a devnet token mint you created in Day 4/6 instead
  const accountInfo = await connection.getAccountInfo(usdcMint);

  if (!accountInfo) {
    console.log("Account not found on devnet — use a devnet token mint address");
    return;
  }

  console.log("\n=== TOKEN MINT ACCOUNT ===");
  console.log("executable:", accountInfo.executable);    // false — data account
  console.log("lamports:", accountInfo.lamports);
  console.log("owner:", accountInfo.owner.toBase58());   // Token Program
  console.log("data size:", accountInfo.data.length, "bytes"); // 82 bytes (MINT_SIZE)
}

// ── Example 3: Fetch a Program account (owned by BPF Loader) ─────────────────
async function fetchProgramAccount() {
  // Token Program address — this IS a program (executable = true)
  const tokenProgram = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  const accountInfo = await connection.getAccountInfo(tokenProgram);

  console.log("\n=== PROGRAM ACCOUNT (Token Program) ===");
  console.log("executable:", accountInfo.executable);    // TRUE — this is a program!
  console.log("lamports:", accountInfo.lamports);
  console.log("owner:", accountInfo.owner.toBase58());   // BPF Loader
  console.log("data size:", accountInfo.data.length, "bytes"); // compiled bytecode
}

// ── Example 4: Check if an account exists ────────────────────────────────────
async function checkAccountExists(address) {
  const info = await connection.getAccountInfo(new PublicKey(address));

  if (!info) {
    console.log(`\nAccount ${address.slice(0, 8)}... does NOT exist`);
    return false;
  }

  const type = info.executable
    ? "Program Account"
    : info.data.length === 0
    ? "Wallet Account"
    : "Data Account";

  console.log(`\nAccount type: ${type}`);
  console.log(`Balance: ${info.lamports / LAMPORTS_PER_SOL} SOL`);
  return true;
}

// ── Example 5: Rent exemption ─────────────────────────────────────────────────
// Accounts must hold enough lamports to be "rent-exempt"
// Otherwise they get deleted when their lamports run out
async function checkRentExemption() {
  const sizes = [0, 82, 165, 200, 1000];

  console.log("\n=== RENT EXEMPTION BY DATA SIZE ===");
  for (const bytes of sizes) {
    const lamports = await connection.getMinimumBalanceForRentExemption(bytes);
    console.log(`${bytes} bytes → ${lamports} lamports (${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL)`);
  }
  // 0 bytes   → ~890880 lamports  (0.00089 SOL) — even empty accounts need rent!
  // 82 bytes  → ~1461600 lamports (0.00146 SOL) — standard mint account
  // 165 bytes → ~2039280 lamports (0.00204 SOL) — standard token account (ATA)
}

// Run examples
async function main() {
  await fetchWalletAccount();
  await fetchProgramAccount();
  await checkRentExemption();
}

main().catch(console.error);

/*
KEY CONCEPTS:
- All Solana data lives in accounts — it's a giant key-value store
- AccountInfo fields: data, executable, lamports, owner
- executable: false = wallet or data account; true = program account
- owner: which program controls the account
  - System Program (11111...1) owns wallets
  - Token Program (TokenkegQ...) owns mint + ATA accounts
  - BPF Loader (BPFLoader...) owns deployed programs
- Rent: accounts must hold lamports proportional to their data size to survive
- getMinimumBalanceForRentExemption(bytes) → tells you the minimum lamports needed
- getAccountInfo(pubkey) → returns null if account doesn't exist
*/
