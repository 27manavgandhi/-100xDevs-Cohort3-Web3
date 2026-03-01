// Lecture Code - 4_ATA_vs_Mint_and_PDA.js
// Topic: ATA vs Mint Account deep dive + Uber PDA example
// Day 8.1 - Solana Blockchain Deep Dive, Token Program, PDAs & DApps
// npm install @solana/web3.js @solana/spl-token

import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  getAccount,
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── ATA vs Mint — side by side comparison ─────────────────────────────────────
//
// MINT ACCOUNT (Coin Factory / RBI)
//   - Creates and controls token supply
//   - 82 bytes of data
//   - Owner: Token Program
//   - Is a PDA: NO — has its own keypair (public + private key)
//   - Analogy: Reserve Bank of India printing Rupees
//
// ATA (Your Bank Account / SBI)
//   - Holds YOUR tokens for a specific mint
//   - 165 bytes of data
//   - Owner: Token Program
//   - Is a PDA: YES — derived from [wallet, TOKEN_PROGRAM_ID, mint]
//   - Analogy: Your personal SBI bank account holding Rupees

async function compareATAandMint(mintAddress, walletAddress) {
  const mint = new PublicKey(mintAddress);
  const wallet = new PublicKey(walletAddress);

  console.log("=== MINT ACCOUNT ===");
  const mintInfo = await connection.getAccountInfo(mint);
  if (mintInfo) {
    console.log("executable:", mintInfo.executable);          // false
    console.log("data size:", mintInfo.data.length, "bytes"); // 82 bytes
    console.log("owner:", mintInfo.owner.toBase58());          // Token Program
    console.log("lamports:", mintInfo.lamports);
    console.log("Is a PDA: NO — Mint has its own keypair");
  }

  // ATA address — derived deterministically (it's a PDA!)
  const ata = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_PROGRAM_ID);

  console.log("\n=== ATA (Associated Token Account) ===");
  console.log("ATA address:", ata.toBase58());

  const ataInfo = await connection.getAccountInfo(ata);
  if (ataInfo) {
    console.log("executable:", ataInfo.executable);          // false
    console.log("data size:", ataInfo.data.length, "bytes"); // 165 bytes
    console.log("owner:", ataInfo.owner.toBase58());          // Token Program
    console.log("Is a PDA: YES — derived from wallet + TOKEN_PROGRAM_ID + mint");

    const tokenAccount = await getAccount(connection, ata);
    console.log("Token balance:", tokenAccount.amount.toString());
  } else {
    console.log("ATA does not exist yet");
    console.log("Is a PDA: YES — but needs explicit creation");
  }
}

// ── Prove ATA is a PDA ────────────────────────────────────────────────────────
function proveATAisAPDA(mintAddress, walletAddress) {
  const mint = new PublicKey(mintAddress);
  const wallet = new PublicKey(walletAddress);

  // Method 1: getAssociatedTokenAddressSync (helper from spl-token)
  const ataFromHelper = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_PROGRAM_ID);

  // Method 2: raw findProgramAddressSync (proves it's a PDA)
  const [ataFromPDA] = PublicKey.findProgramAddressSync(
    [
      wallet.toBuffer(),            // seed 1: user wallet
      TOKEN_PROGRAM_ID.toBuffer(),  // seed 2: Token Program
      mint.toBuffer(),              // seed 3: mint address
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID     // the Associated Token Program derives the PDA
  );

  console.log("\n=== Proving ATA is a PDA ===");
  console.log("Via helper:  ", ataFromHelper.toBase58());
  console.log("Via raw PDA: ", ataFromPDA.toBase58());
  console.log("Match:", ataFromHelper.toBase58() === ataFromPDA.toBase58()); // true!
  console.log("→ ATA IS a PDA derived from [wallet, TOKEN_PROGRAM_ID, mint]");
}

// ── Uber App Problem — PDAs as solution ───────────────────────────────────────
// Problem: In an Uber dApp, each ride needs its own account.
//   Without PDAs: generate random keypair for each ride → user must remember all private keys
//   With PDAs: derive ride account deterministically from [user, rideId]

function uberPDAExample() {
  const userWallet = new PublicKey("5gLJXtBDDWdWL4nwdUKprThQwyzqNZ7VNARFcEtw3rD4I");
  const UBER_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"); // placeholder

  console.log("\n=== Uber App PDA Example ===");

  const rides = ["ride_001", "ride_002", "ride_003"];

  for (const rideId of rides) {
    // Derive a unique PDA for each ride — deterministic!
    const [ridePDA, bump] = PublicKey.findProgramAddressSync(
      [
        userWallet.toBuffer(),          // seed: user's wallet
        Buffer.from(rideId),            // seed: ride ID string
      ],
      UBER_PROGRAM_ID
    );

    console.log(`${rideId} → PDA: ${ridePDA.toBase58().slice(0, 20)}... (bump: ${bump})`);
  }

  console.log("\nBenefits of PDAs for Uber:");
  console.log("✅ Same inputs = same address (deterministic)");
  console.log("✅ No private key = users don't need to manage ride keys");
  console.log("✅ Only the Uber Program can sign for these accounts");
  console.log("✅ Easy to look up any ride: derive address from user + rideId");
}

// ── Data storage comparison: Web2 vs Web3 ────────────────────────────────────
console.log(`
WEB2 vs WEB3 DATA STORAGE:
═══════════════════════════════════════════════════════
WEB2 (Traditional):
  Database: SQL (tables/rows) or NoSQL (key-value)
  Example: "users" table with userId, balance, tokens
  Controlled by: One company's server
  Trust: You trust the company

WEB3 (Solana):
  Storage: Blockchain accounts (key-value store)
  Example:
    Token Mint    |  ATA Address           | Balance
    USDC          |  Harkirat's address    | 100
    DOGGY         |  Raman's address       | 140
    USDT          |  Jyoti's address       | 200
    BONK          |  Poonam's address      | 400
  Controlled by: Token Program (open-source, on-chain)
  Trust: Math and code — not a company
═══════════════════════════════════════════════════════
`);

// Run examples
uberPDAExample();

// Example with real addresses (replace with your devnet addresses):
// compareATAandMint("YOUR_MINT_ADDRESS", "YOUR_WALLET_ADDRESS").catch(console.error);
// proveATAisAPDA("YOUR_MINT_ADDRESS", "YOUR_WALLET_ADDRESS");

/*
KEY CONCEPTS:
- Mint Account: 82 bytes, no PDA, has keypair → controls token supply (RBI analogy)
- ATA: 165 bytes, IS a PDA, derived from [wallet, TOKEN_PROGRAM_ID, mint] → holds your tokens (SBI analogy)
- Both owned by Token Program
- Uber PDA: derive ride accounts from [user, rideId] → deterministic, no private keys needed
- Web2 = centralized DB. Web3 = decentralized accounts on blockchain managed by Token Program
*/
