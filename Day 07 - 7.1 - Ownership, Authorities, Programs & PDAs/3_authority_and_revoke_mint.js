// Lecture Code - 3_authority_and_revoke_mint.js
// Topic: Authority in Solana Programs — mint, freeze, upgrade + revoking mint authority
// Day 7.1 - Ownership, Authorities, Programs & PDAs
// npm install @solana/web3.js @solana/spl-token

import {
  Connection,
  Keypair,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getMint,
  setAuthority,
  AuthorityType,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import fs from "fs";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`)))
);

// ── Types of Authority in Solana ──────────────────────────────────────────────
//
// 1. Token Mint Authority → can mint new tokens (increase supply)
//    - Set to null to permanently cap supply
//    - Real examples:
//      With mint auth:   EPJFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC)
//      No mint auth:     8FQvj8xFdRS1wb2fTQVaWbkjR2sNNxDLyabNePPmsyou9
//
// 2. Token Freeze Authority → can freeze token accounts (prevent transfers)
//    - USDC has freeze authority (regulatory compliance)
//    - Most DeFi tokens set this to null (trustless)
//
// 3. Upgrade Authority → can upgrade a deployed program's bytecode
//    - Set to null to make program immutable forever
//    - Important for security/trust in smart contracts

// ── Full mint authority lifecycle ─────────────────────────────────────────────
async function mintAuthorityLifecycle() {
  console.log("=== Creating token with mint authority ===");

  // Step 1: Create token (WE are the mint authority)
  const mint = await createMint(
    connection,
    payer,            // payer
    payer.publicKey,  // mintAuthority = us
    payer.publicKey,  // freezeAuthority = us
    9                 // decimals
  );
  console.log("Mint address:", mint.toBase58());

  // Step 2: Check mint authority exists
  let mintInfo = await getMint(connection, mint);
  console.log("\nMint authority:", mintInfo.mintAuthority?.toBase58()); // our address
  console.log("Freeze authority:", mintInfo.freezeAuthority?.toBase58());
  console.log("Supply:", mintInfo.supply.toString()); // 0

  // Step 3: Mint some tokens (possible because we have mint authority)
  const ata = await getOrCreateAssociatedTokenAccount(
    connection, payer, mint, payer.publicKey
  );
  await mintTo(connection, payer, mint, ata.address, payer, 1_000_000_000n * 10n);
  mintInfo = await getMint(connection, mint);
  console.log("\nAfter minting:");
  console.log("Supply:", mintInfo.supply.toString()); // 10,000,000,000

  // Step 4: Revoke mint authority (permanently caps supply!)
  console.log("\n=== Revoking mint authority ===");
  await setAuthority(
    connection,
    payer,
    mint,
    payer.publicKey,      // current authority
    AuthorityType.MintTokens,
    null                  // null = permanently revoke
  );

  // Step 5: Verify — mint authority is now null
  mintInfo = await getMint(connection, mint);
  console.log("Mint authority after revoke:", mintInfo.mintAuthority); // null

  // Step 6: Try to mint again — WILL FAIL
  try {
    await mintTo(connection, payer, mint, ata.address, payer, 1_000_000_000n);
    console.log("ERROR: Should have failed!");
  } catch (err) {
    console.log("\nExpected error — cannot mint anymore:");
    console.log("Error:", err.message.slice(0, 100));
    // "Transaction simulation failed: Error processing Instruction 0: custom program error: 0x5"
    // This is the "MintAuthorityNotPresent" error from the Token Program
  }

  console.log("\n✅ Supply is now FIXED forever at:", mintInfo.supply.toString());
  console.log("This is a trust signal — token holders know no more can be minted");
}

// ── Equivalent CLI commands ───────────────────────────────────────────────────
//
// # Create token
// spl-token create-token
//
// # Create ATA
// spl-token create-account <token_mint_address>
//
// # Mint tokens
// spl-token mint <token_mint_address> 10000000000
//
// # Check mint authority on Solscan/Explorer
// # → "Mint Authority" field shows your wallet address
//
// # Revoke mint authority permanently
// spl-token authorize <token_id> mint --disable
//
// # Try to mint again — should fail!
// spl-token mint <token_mint_address> 10000000000
// # Error: Transaction simulation failed...

// ── Revoke freeze authority too ───────────────────────────────────────────────
async function revokeFreezeAuthority(mint) {
  console.log("\n=== Revoking freeze authority ===");
  await setAuthority(
    connection,
    payer,
    mint,
    payer.publicKey,
    AuthorityType.FreezeAccount,
    null  // nobody can freeze accounts for this token
  );
  console.log("Freeze authority revoked — token accounts can never be frozen");
}

mintAuthorityLifecycle().catch(console.error);

/*
KEY CONCEPTS:
- Authority = account with permission to perform specific actions
- AuthorityType.MintTokens → controls who can mint new tokens
- AuthorityType.FreezeAccount → controls who can freeze token accounts
- setAuthority(connection, payer, mint, currentAuthority, authorityType, newAuthority)
  - newAuthority = null → permanently revokes that authority (IRREVERSIBLE)
- After revoking mint authority:
  - Supply is fixed forever
  - Any attempt to mint will fail with Token Program error 0x5
  - This increases trust — investors know supply is capped
- Real-world examples:
  - USDC has BOTH mint + freeze authority (Coinbase controls supply + can freeze)
  - Good memecoins/DeFi tokens often revoke both for full decentralization
*/
