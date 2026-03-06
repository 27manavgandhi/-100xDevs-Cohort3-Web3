// Lecture Code - 4_centralized_lst_server.ts
// Topic: Full Centralized LST — complete server combining webhook + mint/burn/send
// Day 13.1 - Liquid Staking Tokens, Validators, Indexer & Building a Centralized LST
//
// This is the COMPLETE server that ties everything together.
//
// Architecture:
//   User ──sends SOL──► Our Address ──► Helius Indexer
//                                            │  (webhook)
//                                            ▼
//                                       Express Server
//                                       /webhook endpoint
//                                            │
//                          ┌─────────────────┴──────────────────┐
//                     SOL received?                     Custom tokens received?
//                          │                                     │
//                   mintTokens()                   burnTokens() + sendNativeTokens()
//
// npm install @solana/web3.js @solana/spl-token express dotenv
// npm install -D typescript @types/express @types/node ts-node nodemon

import express from "express";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMintToInstruction,
  createBurnInstruction,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";

// ── Environment config ────────────────────────────────────────────────────────
// In production: use .env file
// OUR_PRIVATE_KEY=<base58 private key>
// MINT_ADDRESS=<token mint address>
// OUR_ADDRESS=<our wallet address>
const OUR_PRIVATE_KEY = process.env.OUR_PRIVATE_KEY || "";
const MINT_ADDRESS = process.env.MINT_ADDRESS || "";
const OUR_ADDRESS = process.env.OUR_ADDRESS || "";
const TOKEN_DECIMALS = 6;
const TOKENS_PER_SOL = 100; // exchange rate: 1 SOL = 100 tokens
const MIN_SOL = 2; // minimum SOL to trigger (from lecture)

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Load our keypair (the mintAuthority)
let ourKeypair: Keypair;
try {
  ourKeypair = Keypair.fromSecretKey(Buffer.from(JSON.parse(OUR_PRIVATE_KEY)));
} catch {
  console.warn("⚠️  No valid OUR_PRIVATE_KEY — using generated keypair (demo mode)");
  ourKeypair = Keypair.generate();
}

const mintPublicKey = MINT_ADDRESS ? new PublicKey(MINT_ADDRESS) : Keypair.generate().publicKey;

// ── Deduplication store (replace with DB in production) ──────────────────────
const processedTxns = new Set<string>();

// ── Core LST operations ───────────────────────────────────────────────────────
async function mintCustomTokens(recipient: PublicKey, solAmount: number, txSig: string) {
  const rawAmount = Math.floor(solAmount * TOKENS_PER_SOL * (10 ** TOKEN_DECIMALS));

  const recipientATA = await getOrCreateAssociatedTokenAccount(
    connection, ourKeypair, mintPublicKey, recipient
  );

  const tx = new Transaction().add(
    createMintToInstruction(
      mintPublicKey, recipientATA.address, ourKeypair.publicKey, rawAmount
    )
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [ourKeypair]);
  console.log(`✅ Minted ${solAmount * TOKENS_PER_SOL} tokens to ${recipient.toBase58().slice(0,8)}... | TX: ${sig.slice(0,20)}...`);
  return sig;
}

async function burnAndReturnSOL(sender: PublicKey, tokenAmount: number) {
  // 1. Burn tokens from OUR ATA (where user sent them)
  const ourATA = await getAssociatedTokenAddress(mintPublicKey, ourKeypair.publicKey);
  const rawAmount = Math.floor(tokenAmount * (10 ** TOKEN_DECIMALS));

  const burnTx = new Transaction().add(
    createBurnInstruction(ourATA, mintPublicKey, ourKeypair.publicKey, rawAmount)
  );
  await sendAndConfirmTransaction(connection, burnTx, [ourKeypair]);
  console.log(`🔥 Burned ${tokenAmount} tokens`);

  // 2. Send SOL back to user
  const solToReturn = tokenAmount / TOKENS_PER_SOL;
  const lamports = Math.floor(solToReturn * LAMPORTS_PER_SOL);

  const sendTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: ourKeypair.publicKey,
      toPubkey: sender,
      lamports,
    })
  );
  const sig = await sendAndConfirmTransaction(connection, sendTx, [ourKeypair]);
  console.log(`💸 Sent ${solToReturn} SOL back to ${sender.toBase58().slice(0,8)}... | TX: ${sig.slice(0,20)}...`);
  return sig;
}

// ── Express server ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  // Always respond 200 first (Helius retries if you don't respond fast)
  res.status(200).json({ received: true });

  const events = req.body;
  if (!Array.isArray(events)) return;

  for (const event of events) {
    const sig: string = event.signature;
    if (!sig) continue;

    // ── Deduplicate: skip if already processed ────────────────────────────
    // This is the bug hinted at in the README (line 16 of index.ts):
    // Without this check, a duplicate webhook could cause double-minting!
    if (processedTxns.has(sig)) {
      console.log(`⏭️  Skipping duplicate: ${sig.slice(0, 20)}...`);
      continue;
    }
    processedTxns.add(sig);

    // ── Process native SOL transfers ──────────────────────────────────────
    for (const transfer of (event.nativeTransfers || [])) {
      if (transfer.toUserAccount === OUR_ADDRESS) {
        const solAmount = transfer.amount / LAMPORTS_PER_SOL;
        console.log(`\n📥 ${solAmount} SOL from ${transfer.fromUserAccount.slice(0, 8)}...`);

        if (solAmount >= MIN_SOL) {
          try {
            await mintCustomTokens(
              new PublicKey(transfer.fromUserAccount),
              solAmount,
              sig
            );
          } catch (err) {
            console.error("Mint error:", err);
          }
        }
      }
    }

    // ── Process custom token transfers ────────────────────────────────────
    for (const transfer of (event.tokenTransfers || [])) {
      if (
        transfer.toUserAccount === OUR_ADDRESS &&
        transfer.mint === MINT_ADDRESS
      ) {
        console.log(`\n📥 ${transfer.tokenAmount} tokens from ${transfer.fromUserAccount.slice(0, 8)}...`);
        try {
          await burnAndReturnSOL(
            new PublicKey(transfer.fromUserAccount),
            transfer.tokenAmount
          );
        } catch (err) {
          console.error("Burn/send error:", err);
        }
      }
    }
  }
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: "Centralized LST Server",
    ourAddress: ourKeypair.publicKey.toBase58(),
    mint: mintPublicKey.toBase58(),
    processedTxns: processedTxns.size,
    exchangeRate: `1 SOL = ${TOKENS_PER_SOL} tokens`,
  });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`
🚀 Centralized LST Server — Port ${PORT}
📡 Webhook: POST http://localhost:${PORT}/webhook
❤️  Health:  GET  http://localhost:${PORT}/health

Steps to run fully:
  1. Set OUR_PRIVATE_KEY, MINT_ADDRESS, OUR_ADDRESS in .env
  2. Run: npm run start
  3. Expose publicly: ngrok http ${PORT}
  4. Register https://your-ngrok-url/webhook in Helius dashboard
  5. Send some devnet SOL to ${ourKeypair.publicKey.toBase58().slice(0, 20)}...
  6. Watch tokens get minted automatically!

Exchange rate: 1 SOL = ${TOKENS_PER_SOL} custom tokens
Min SOL to trigger: ${MIN_SOL} SOL
  `);
});

/*
COMPLETE FLOW:
  User sends SOL → Helius detects → POST /webhook
    → check dedup (processedTxns.has(sig))
    → mintCustomTokens(sender, solAmount) 
       → getOrCreateATA for sender
       → mintTo their ATA

  User sends tokens → Helius detects → POST /webhook
    → check dedup
    → burnAndReturnSOL(sender, tokenAmount)
       → burn from OUR ATA (where they sent tokens)
       → SystemProgram.transfer SOL back to sender

PRODUCTION IMPROVEMENTS (from lecture hints):
  1. Store events in DB (not in-memory Set) → survives server restarts
  2. Check you have enough SOL before burning + returning
  3. Stake user's SOL with Helius to earn yield → fund the protocol
  4. Use a dynamic exchange rate that grows as yield accrues
*/
