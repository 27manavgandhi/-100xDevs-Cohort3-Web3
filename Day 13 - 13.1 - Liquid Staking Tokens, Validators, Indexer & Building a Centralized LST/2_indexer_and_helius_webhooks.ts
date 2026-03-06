// Lecture Code - 2_indexer_and_helius_webhooks.ts
// Topic: What is an Indexer, Helius Webhooks, subscribing to blockchain events
// Day 13.1 - Liquid Staking Tokens, Validators, Indexer & Building a Centralized LST
//
// npm install express @solana/web3.js
// npm install -D @types/express @types/node typescript ts-node

import express, { Request, Response } from "express";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ── What is an Indexer? ───────────────────────────────────────────────────────
//
// An Indexer = tool that scans every block & transaction on the blockchain
//             and lets you subscribe to specific events.
//
// Real-life analogy: News alert system
//   - It watches EVERYTHING happening in a city (blockchain)
//   - You subscribe to specific alerts:
//     - "Notify me if $100 arrives at my address" → SOL transfer event
//     - "Notify me if someone swaps on Raydium"  → program instruction event
//     - "Notify me if my custom token is sent"   → token transfer event
//
// Without an indexer, you'd have to:
//   - Poll the RPC every second → expensive, slow, misses events, rate-limited
//
// With an indexer (Helius):
//   - Register a webhook URL
//   - Helius scans every block and POSTs to your URL when your event happens
//   - Reliable, real-time, no polling needed

const app = express();
app.use(express.json());

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── Types for Helius webhook payload ─────────────────────────────────────────
// Helius sends a structured JSON payload with transaction details
interface HeliumNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // in lamports
}

interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
}

interface HeliusWebhookEvent {
  type: string;                          // e.g. "TRANSFER"
  signature: string;                     // tx signature
  timestamp: number;
  slot: number;
  nativeTransfers: HeliumNativeTransfer[];
  tokenTransfers: HeliusTokenTransfer[];
  accountData: any[];
}

// ── Config ────────────────────────────────────────────────────────────────────
const OUR_ADDRESS = process.env.OUR_ADDRESS || "YourSolanaAddressHere";
const CUSTOM_TOKEN_MINT = process.env.CUSTOM_TOKEN_MINT || "YourTokenMintAddress";
const MIN_SOL_TO_PROCESS = 2; // minimum SOL to trigger minting (from lecture)

// ── Track processed signatures to prevent double-minting ─────────────────────
// In production: use a database (PostgreSQL/SQLite)
// This is the bug hinted at in the lecture's README (line 16 of index.ts)
const processedSignatures = new Set<string>();

// ── Webhook endpoint — Helius POSTs here when events happen ──────────────────
app.post("/webhook", async (req: Request, res: Response) => {
  const events: HeliusWebhookEvent[] = req.body;

  // Always respond 200 quickly so Helius doesn't retry
  res.status(200).json({ received: true });

  for (const event of events) {
    console.log(`\n📨 Received event: ${event.type} | Sig: ${event.signature.slice(0, 20)}...`);

    // ── CRITICAL: Prevent double-processing ───────────────────────────────
    // Helius may send the same event twice (network retries, etc.)
    // Without this check, we'd double-mint tokens!
    if (processedSignatures.has(event.signature)) {
      console.log(`⚠️  Skipping duplicate event: ${event.signature.slice(0, 20)}...`);
      continue;
    }
    processedSignatures.add(event.signature);

    // ── Handle incoming SOL transfers ─────────────────────────────────────
    for (const transfer of event.nativeTransfers) {
      if (transfer.toUserAccount === OUR_ADDRESS) {
        const amountInSOL = transfer.amount / LAMPORTS_PER_SOL;
        console.log(`💰 Received ${amountInSOL} SOL from ${transfer.fromUserAccount.slice(0, 8)}...`);

        // Only process if >= minimum (from lecture: "if received >= 2")
        if (amountInSOL >= MIN_SOL_TO_PROCESS) {
          await handleSOLReceived(
            transfer.fromUserAccount,
            amountInSOL,
            event.signature
          );
        } else {
          console.log(`⏭️  Amount too small (${amountInSOL} SOL < ${MIN_SOL_TO_PROCESS} SOL minimum)`);
        }
      }
    }

    // ── Handle incoming custom token transfers ────────────────────────────
    for (const transfer of event.tokenTransfers) {
      if (
        transfer.toUserAccount === OUR_ADDRESS &&
        transfer.mint === CUSTOM_TOKEN_MINT
      ) {
        console.log(`🪙 Received ${transfer.tokenAmount} custom tokens from ${transfer.fromUserAccount.slice(0, 8)}...`);
        await handleTokensReceived(
          transfer.fromUserAccount,
          transfer.tokenAmount,
          event.signature
        );
      }
    }
  }
});

// ── Handle SOL received → mint custom tokens ─────────────────────────────────
async function handleSOLReceived(
  senderAddress: string,
  amountSOL: number,
  txSignature: string
): Promise<void> {
  // Mathematical formula for token minting
  // Simple 1:1 for now — in reality use a dynamic exchange rate
  const tokensToMint = calculateTokensForSOL(amountSOL);

  console.log(`\n🔨 Minting ${tokensToMint} custom tokens to ${senderAddress.slice(0, 8)}...`);
  console.log(`   Reason: Received ${amountSOL} SOL (tx: ${txSignature.slice(0, 20)}...)`);

  // In real code: call mintTokens() from mintTokens.ts
  // await mintTokens(connection, mintAuthority, mintAddress, new PublicKey(senderAddress), tokensToMint);
  console.log(`   ✅ Would mint ${tokensToMint} tokens (implement mintTokens.ts)`);
}

// ── Handle tokens received → burn tokens + send SOL back ─────────────────────
async function handleTokensReceived(
  senderAddress: string,
  tokenAmount: number,
  txSignature: string
): Promise<void> {
  const solToReturn = calculateSOLForTokens(tokenAmount);

  console.log(`\n🔥 Burning ${tokenAmount} custom tokens`);
  console.log(`💸 Sending ${solToReturn} SOL back to ${senderAddress.slice(0, 8)}...`);

  // In real code:
  // await burnTokens(connection, authority, mintAddress, new PublicKey(senderAddress), tokenAmount);
  // await sendNativeTokens(connection, ourKeypair, new PublicKey(senderAddress), solToReturn);
  console.log(`   ✅ Would burn tokens and return ${solToReturn} SOL (implement burnTokens.ts + sendNativeTokens.ts)`);
}

// ── Exchange rate formulas ─────────────────────────────────────────────────────
function calculateTokensForSOL(solAmount: number): number {
  // Simple: 1 SOL = 100 tokens (you can make this dynamic)
  // In a real LST: tokens = solAmount / exchangeRate
  return Math.floor(solAmount * 100);
}

function calculateSOLForTokens(tokenAmount: number): number {
  // Reverse: 100 tokens = 1 SOL
  return tokenAmount / 100;
}

// ── Health check endpoint ──────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    ourAddress: OUR_ADDRESS,
    customTokenMint: CUSTOM_TOKEN_MINT,
    processedEvents: processedSignatures.size,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 LST Webhook Server running on port ${PORT}`);
  console.log(`📡 Listening for events at POST /webhook`);
  console.log(`❤️  Health check at GET /health`);
  console.log(`\nRegister this webhook URL in Helius Dashboard:`);
  console.log(`  https://your-server.com/webhook`);
});

/*
KEY CONCEPTS:
- Indexer scans every block → fires webhooks for subscribed events
- Helius webhook = HTTP POST to your server when events happen on-chain
- CRITICAL: Always check for duplicate signatures before processing!
  → Same tx can arrive twice from retries → double-mint = catastrophic bug
- Always respond 200 immediately → then process async (Helius retries on failure)
- handleSOLReceived: SOL arrives → calculate tokens → mintTo sender's address
- handleTokensReceived: tokens arrive → burn them → send SOL back to sender
- Exchange rate formula: simple 1 SOL = 100 tokens (should be dynamic in production)
- processedSignatures Set: in-memory dedup (replace with DB in production)
*/

export { app };
