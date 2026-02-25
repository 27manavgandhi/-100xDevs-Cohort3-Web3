// Lecture Code - 4_pdas.js
// Topic: Program Derived Addresses (PDAs) on Solana
// Day 4.1 - Solana Jargon, Programming Model & Tokens
// npm install @solana/web3.js @solana/spl-token

import {
  Connection,
  Keypair,
  clusterApiUrl,
  PublicKey,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── What is a PDA? ─────────────────────────────────────────────────────────────
/*
A PDA (Program Derived Address) is a public key that:
1. Is derived deterministically from a program ID + seeds
2. Does NOT have a private key (no one can sign for it directly)
3. Only the owning program can sign for it (via "program signing")

ATAs are PDAs derived from:
  - Token Program ID
  - User's public key (seed)
  - Mint address (seed)

This is why the same wallet always has the same ATA for any given token.
*/

// ── Derive an ATA address (this is a PDA) ─────────────────────────────────────
function deriveATA(walletAddress, mintAddress, tokenProgramId = TOKEN_PROGRAM_ID) {
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  // getAssociatedTokenAddressSync finds the PDA without an RPC call
  const ata = getAssociatedTokenAddressSync(
    mint,
    wallet,
    false,              // allowOwnerOffCurve — false for normal wallets
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return ata;
}

// ── Derive a custom PDA ────────────────────────────────────────────────────────
function deriveCustomPDA(programId, seeds) {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    seeds.map(s => Buffer.from(s)),
    new PublicKey(programId)
  );

  console.log("PDA       :", pda.toBase58());
  console.log("Bump      :", bump); // 0-255, used to ensure the PDA is off the ed25519 curve
  return { pda, bump };
}

// ── Demonstrate ATA is a PDA ───────────────────────────────────────────────────
function demonstrateATAisPDA() {
  const wallet = "Eg4F6LW8DD3SvFLLigYJBFvRnXSBiLZYYJ3KEePDL95Q";
  const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC on mainnet

  console.log("=== ATA is a PDA ===");
  console.log("Wallet:", wallet);
  console.log("Mint  :", usdcMint);

  const ata = deriveATA(wallet, usdcMint);
  console.log("ATA (PDA):", ata.toBase58());

  // The same wallet ALWAYS gets the same ATA for the same mint
  // because the ATA is deterministically derived — it IS a PDA
  console.log("\nSame inputs -> same ATA every time (deterministic)");
  console.log("No private key exists for this address");
  console.log("Only the Token Program can sign for this account");
}

// ── Custom PDA Example ────────────────────────────────────────────────────────
function customPDAExample() {
  console.log("\n=== Custom PDA Example ===");
  console.log("(as used in Anchor programs / custom Solana programs)");

  const PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // Token Program
  const userWallet = "Eg4F6LW8DD3SvFLLigYJBFvRnXSBiLZYYJ3KEePDL95Q";

  // Derive a PDA with seeds: ["user", wallet_pubkey]
  const { pda, bump } = deriveCustomPDA(PROGRAM_ID, [
    "user",
    new PublicKey(userWallet).toBuffer().toString("binary"),
  ]);

  console.log("Seeds: ['user', walletPubkey]");
  console.log("PDA  :", pda.toBase58());
  console.log("Bump :", bump);
}

// ── Why PDAs matter ───────────────────────────────────────────────────────────
/*
Why PDAs are important:
1. Deterministic: given same seeds + program, always same address
2. Trustless: users can verify what address will be used before signing
3. Program-controlled: no private key means only the program can change data
4. Composability: other programs can derive the same PDA to interact with it

Real-world use:
- ATAs: one per user per token, derived from wallet + mint
- Escrow accounts: hold funds until conditions are met
- Game state: one account per player, derived from player pubkey
- DEX liquidity pools: derived from token pair addresses
*/

demonstrateATAisPDA();
customPDAExample();

// ── Reference implementations ─────────────────────────────────────────────────
console.log("\n=== References ===");
console.log("ATA program (Rust):", "https://github.com/solana-labs/solana-program-library/blob/master/associated-token-account/program/src/lib.rs#L71");
console.log("Mint state (JS)   :", "https://github.com/solana-labs/solana-program-library/blob/ab830053c59c9c35bc3a727703aacf40c1215132/token/js/src/state/mint.ts#L171");
