// Lecture Code - 4_local_wallet_vs_adapter.js
// Topic: Local Wallet vs Wallet Adapter — when and why to use each
// Day 6.1 - Token Launchpad in React

// ══════════════════════════════════════════════════════════════════════════════
// APPROACH 1: LOCAL WALLET (Node.js script / CLI)
// Used in Day 4 — we had the private key, we signed everything ourselves
// ══════════════════════════════════════════════════════════════════════════════

import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";

async function createTokenWithLocalWallet() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Load private key from local file — WE control this key
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`)))
  );

  // createMint() works here because WE have the payer's private key
  // It internally calls sendAndConfirmTransaction(connection, tx, [payer, mintKeypair])
  const mint = await createMint(
    connection,
    payer,              // ← WE sign this (we have the private key)
    payer.publicKey,    // mint authority
    null,               // freeze authority
    6,
    undefined,
    undefined,
    TOKEN_PROGRAM_ID
  );

  console.log("Token created (local wallet):", mint.toBase58());
}

// ══════════════════════════════════════════════════════════════════════════════
// APPROACH 2: WALLET ADAPTER (React dApp)
// Used in Day 6 — user has the private key, we build the tx, they sign it
// ══════════════════════════════════════════════════════════════════════════════

// In a dApp, we CANNOT do:
// const payer = Keypair.fromSecretKey(...) // ❌ We don't have the user's key!
//
// Instead we:
// 1. Build the transaction manually (same instructions as createMint)
// 2. Call wallet.sendTransaction() → user's wallet signs it (Phantom popup)

// Pseudo-code showing the difference:

/*
// ❌ WRONG in a dApp — we don't have the user's private key
const mint = await createMint(connection, userKeypair, ...);

// ✅ CORRECT in a dApp — user signs via wallet adapter
const tx = new Transaction().add(
  SystemProgram.createAccount({ fromPubkey: wallet.publicKey, ... }),
  createInitializeMintInstruction(mintKeypair.publicKey, decimals, wallet.publicKey, ...),
  createAssociatedTokenAccountInstruction(...),
  createMintToInstruction(...)
);
await wallet.sendTransaction(tx, connection, { signers: [mintKeypair] });
//          ↑ Phantom/Backpack popup → user approves → signed + broadcast
*/

// ── Comparison Table ──────────────────────────────────────────────────────────
console.log(`
LOCAL WALLET vs WALLET ADAPTER:
════════════════════════════════════════════════════════════
                    LOCAL WALLET          WALLET ADAPTER
────────────────────────────────────────────────────────────
Where used          Node.js / CLI          React dApp / Browser
Private key         You manage it          User manages it (Phantom etc.)
How to sign         Keypair.fromSecretKey  wallet.sendTransaction()
createMint          Works directly ✅      Must build tx manually ✅
Use case            Scripts, backends      User-facing dApps
Security            Private key in file    Private key never exposed
Example             Day 4 lecture codes    Day 6 Token Launchpad
════════════════════════════════════════════════════════════

KEY INSIGHT:
  - "End user creates their own token" = they must sign = Wallet Adapter
  - "Backend service mints tokens"     = server signs  = Local Wallet

WHY mintKeypair MUST ALSO SIGN:
  When you create a new account on Solana (SystemProgram.createAccount),
  the new account's keypair MUST co-sign the transaction.
  This prevents someone from creating accounts at addresses they don't control.

  wallet.sendTransaction(tx, connection, { signers: [mintKeypair] })
  → wallet signs as the payer/authority
  → mintKeypair signs as the new account being created
`);

// ── What happens in wallet.sendTransaction ────────────────────────────────────
//
// Under the hood, wallet.sendTransaction() does:
// 1. Gets the latest blockhash from the RPC
// 2. Sets transaction.recentBlockhash = blockhash
// 3. Sets transaction.feePayer = wallet.publicKey
// 4. Merges any additional signers (mintKeypair)
// 5. Calls wallet.signTransaction(tx) → triggers Phantom popup
// 6. Broadcasts the signed tx to the network
// 7. Returns the transaction signature (txid)
