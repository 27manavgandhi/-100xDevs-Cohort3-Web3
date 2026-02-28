// Lecture Code - 4_pdas_deep_dive.js
// Topic: Program Derived Addresses (PDAs) — properties, derivation, ATA as PDA
// Day 7.1 - Ownership, Authorities, Programs & PDAs
// Ref: https://solana.com/docs/core/pda
// npm install @solana/web3.js @solana/spl-token

import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── What is a PDA? ────────────────────────────────────────────────────────────
//
// A Program Derived Address (PDA) is an address that:
//   1. Is DETERMINISTICALLY derived from seeds + programId
//   2. Falls OFF the Ed25519 curve → has NO private key
//   3. Only the owning program can "sign" for it
//   4. Creating a PDA address ≠ creating an on-chain account (must be explicit)
//
// Two main use cases:
//   1. Deterministic addresses: given same inputs → always same address
//   2. Program signing: the program can authorize transactions for its PDAs

// ── Example 1: findProgramAddressSync (recommended) ──────────────────────────
// Automatically finds a valid bump seed (iterates 255 → 0)
function derivePDAWithFind() {
  const userAddress = new PublicKey("5gLJXtBDDWdWL4nwdUKprThQwyzqNZ7VNARFcEtw3rD4I");
  const mintAddress = new PublicKey("4Ne8R25TEEb6CPZ5GsdJydb1AkabdrIMdIxeMWC2U9hcJs");

  // findProgramAddressSync: adds bump seed automatically to find off-curve address
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      userAddress.toBuffer(),        // seed 1: user wallet
      TOKEN_PROGRAM_ID.toBuffer(),   // seed 2: Token Program ID
      mintAddress.toBuffer(),        // seed 3: mint address
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID      // the program that "owns" this PDA
  );

  console.log("=== findProgramAddressSync ===");
  console.log("PDA:", pda.toBase58());
  console.log("Bump:", bump); // canonical bump (255, 254, ... until valid)
  console.log("Same inputs always give same PDA — deterministic!");

  return { pda, bump };
}

// ── Example 2: createProgramAddressSync (manual bump) ────────────────────────
// You provide the bump yourself — can fail if result is ON the curve
function derivePDAManual() {
  const userAddress = new PublicKey("5gLJXtBDDWdWL4nwdUKprThQwyzqNZ7VNARFcEtw3rD4I");
  const mintAddress = new PublicKey("4Ne8R25TEEb6CPZ5GsdJydb1AkabdrIMdIxeMWC2U9hcJs");

  try {
    const PDA = PublicKey.createProgramAddressSync(
      [
        userAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintAddress.toBuffer(),
        Buffer.from([255]), // bump = 255 (manual)
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log("\n=== createProgramAddressSync (manual bump=255) ===");
    console.log("PDA:", PDA.toBase58());
  } catch (err) {
    // If bump=255 results in an on-curve address, it throws
    // That's why findProgramAddressSync is preferred — it finds valid bump automatically
    console.log("\ncreateProgram with bump=255 failed — not off-curve. Try lower bump.");
  }
}

// ── Example 3: ATA IS a PDA ───────────────────────────────────────────────────
// The Associated Token Account address is a PDA derived from:
//   - User wallet address (seed)
//   - Token Program ID (seed)
//   - Mint address (seed)
//   - Program: Associated Token Program
//
// This means: same wallet + same mint → ALWAYS same ATA address, on any computer, forever

function deriveATA() {
  const userWallet = new PublicKey("5gLJXtBDDWdWL4nwdUKprThQwyzqNZ7VNARFcEtw3rD4I");
  const mintAddress = new PublicKey("4Ne8R25TEEb6CPZ5GsdJydb1AkabdrIMdIxeMWC2U9hcJs");

  // getAssociatedTokenAddressSync is just a wrapper around findProgramAddressSync
  const ata = getAssociatedTokenAddressSync(
    mintAddress,    // which token
    userWallet,     // who owns the ATA
    false,          // allowOwnerOffCurve
    TOKEN_PROGRAM_ID
  );

  console.log("\n=== ATA as PDA ===");
  console.log("Wallet:", userWallet.toBase58());
  console.log("Mint:", mintAddress.toBase58());
  console.log("ATA (PDA):", ata.toBase58());
  console.log("This address is deterministic — same wallet + mint = same ATA everywhere");

  // Verify it matches what findProgramAddressSync gives us directly:
  const [manualATA] = PublicKey.findProgramAddressSync(
    [userWallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintAddress.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log("Manual derivation:", manualATA.toBase58());
  console.log("Match:", ata.toBase58() === manualATA.toBase58()); // true
}

// ── Example 4: Check if ATA exists on-chain ───────────────────────────────────
async function checkATAExists(walletAddress, mintAddress) {
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const ata = getAssociatedTokenAddressSync(mint, wallet, false, TOKEN_PROGRAM_ID);

  const accountInfo = await connection.getAccountInfo(ata);

  console.log("\n=== Check if ATA exists ===");
  console.log("ATA address:", ata.toBase58());
  if (accountInfo) {
    console.log("✅ ATA exists on-chain");
    console.log("Owner:", accountInfo.owner.toBase58()); // Token Program
    console.log("Data size:", accountInfo.data.length, "bytes"); // 165 bytes
  } else {
    console.log("❌ ATA does not exist yet — needs to be created with createAssociatedTokenAccountInstruction");
  }
}

// ── Summary: findProgramAddressSync vs createProgramAddressSync ───────────────
console.log(`
PDA DERIVATION METHODS:
═══════════════════════════════════════════════════════════════
findProgramAddressSync(seeds, programId)
  → Automatically iterates bump from 255 down to find valid off-curve address
  → Returns [pda, bump]
  → RECOMMENDED — use this in 99% of cases

createProgramAddressSync(seeds + [bump], programId)
  → YOU provide the bump as a seed
  → Throws if result is on the ed25519 curve (invalid PDA)
  → Use only when you already know the canonical bump

WHY does bump exist?
  Ed25519 is an elliptic curve. Most addresses are ON the curve (have a private key).
  PDAs must be OFF the curve (no private key → only program can sign).
  The bump seed is incremented until we find an address that falls off the curve.
  The canonical bump (highest valid bump, usually 255) is stored and reused.

ATA = PDA derived from: [wallet, TOKEN_PROGRAM_ID, mint] → ASSOCIATED_TOKEN_PROGRAM_ID
═══════════════════════════════════════════════════════════════
`);

// Run examples
derivePDAWithFind();
derivePDAManual();
deriveATA();
// checkATAExists("YOUR_WALLET", "YOUR_MINT").catch(console.error);
