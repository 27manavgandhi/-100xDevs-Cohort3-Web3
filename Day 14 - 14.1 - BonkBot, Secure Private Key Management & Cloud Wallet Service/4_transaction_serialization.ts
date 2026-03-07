// Lecture Code - 4_transaction_serialization.ts
// Topic: Solana tx serialization, signing flow, and the cloud wallet cycle
// Day 14.1 - BonkBot, Secure Private Key Management & Cloud Wallet Service
//
// Hints from lecture:
//   - Serialize: tx.serialise() / tx.serialize({ requireAllSignatures: false })
//   - String private key → Uint8Array: https://gist.github.com/XavierS9/b0b216f003b8e54db53c39397e98cd70
//   - Node polyfills: https://www.npmjs.com/package/vite-plugin-node-polyfills

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import crypto from "crypto";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── Step 1: CLIENT SIDE — Build and serialize a transaction ──────────────────
// The client knows: sender (publicKey), recipient, amount
// The client does NOT have the private key — the server has it

async function clientSideBuildTransaction(
  senderPublicKey: string,
  recipientAddress: string,
  amountSOL: number
): Promise<string> {
  console.log("\n=== CLIENT SIDE: Building Transaction ===");

  const senderPubkey = new PublicKey(senderPublicKey);
  const recipientPubkey = new PublicKey(recipientAddress);

  // Need a recent blockhash — tells the network this tx is fresh
  const { blockhash } = await connection.getLatestBlockhash();
  console.log(`  blockhash: ${blockhash.slice(0, 20)}...`);

  // Build the transaction (just instructions, no signature yet)
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: senderPubkey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );

  // Serialize WITHOUT signatures
  // requireAllSignatures: false = allow serializing an unsigned transaction
  // This is the key hint from the lecture!
  const serialized = tx.serialize({ requireAllSignatures: false });
  const base64 = Buffer.from(serialized).toString("base64");

  console.log(`  Transaction built: ${senderPublicKey.slice(0, 8)}... → ${recipientAddress.slice(0, 8)}...`);
  console.log(`  Amount: ${amountSOL} SOL`);
  console.log(`  Serialized (base64): ${base64.slice(0, 40)}...`);
  console.log(`  Serialized length: ${base64.length} chars`);

  return base64; // send this to the backend via POST /api/v1/txn/sign
}

// ── Step 2: SERVER SIDE — Deserialize, sign, broadcast ───────────────────────
// Server receives the base64 transaction, decrypts stored private key, signs + broadcasts

async function serverSideSignAndBroadcast(
  base64Message: string,
  encryptedPrivateKey: string,  // from DB
  encryptionKey: Buffer         // from env
): Promise<string> {
  console.log("\n=== SERVER SIDE: Signing and Broadcasting ===");

  // Step 2a: Deserialize the transaction from base64
  const txBuffer = Buffer.from(base64Message, "base64");
  const tx = Transaction.from(txBuffer);
  console.log(`  Transaction deserialized. Instructions: ${tx.instructions.length}`);

  // Step 2b: Decrypt private key from DB
  // Hint from lecture: String private key → Uint8Array
  // Reference: https://gist.github.com/XavierS9/b0b216f003b8e54db53c39397e98cd70
  const privateKeyBase64 = decryptAES256(encryptedPrivateKey, encryptionKey);
  const privateKeyBytes = Buffer.from(privateKeyBase64, "base64"); // base64 → Uint8Array
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  console.log(`  Keypair reconstructed: ${keypair.publicKey.toBase58().slice(0, 8)}...`);

  // Step 2c: Sign the transaction
  tx.sign(keypair); // adds the user's signature to the tx
  console.log(`  Transaction signed. Signatures: ${tx.signatures.length}`);

  // Step 2d: Serialize the SIGNED transaction
  const rawTx = tx.serialize(); // now requires all signatures → works because we signed

  // Step 2e: Broadcast to Solana network
  console.log(`  Broadcasting to Solana devnet...`);
  const signature = await sendAndConfirmRawTransaction(connection, rawTx, {
    commitment: "confirmed",
  });

  console.log(`  ✅ Transaction confirmed!`);
  console.log(`  Signature: ${signature.slice(0, 20)}...`);
  console.log(`  Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  return signature;
}

// ── AES-256 helpers ───────────────────────────────────────────────────────────
function encryptAES256(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptAES256(encrypted: string, key: Buffer): string {
  const [ivHex, ciphertext] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Full Flow Demo ─────────────────────────────────────────────────────────────
async function demonstrateFullFlow() {
  console.log("=== CLOUD WALLET — FULL SIGNING FLOW DEMO ===\n");

  const encryptionKey = crypto.randomBytes(32);

  // Simulate: server created a keypair for "Alice" on signup
  const aliceKeypair = Keypair.generate();
  const alicePublicKey = aliceKeypair.publicKey.toBase58();

  // Server encrypted and stored Alice's private key
  const alicePrivKeyBase64 = Buffer.from(aliceKeypair.secretKey).toString("base64");
  const storedEncryptedKey = encryptAES256(alicePrivKeyBase64, encryptionKey);

  console.log("SIGNUP PHASE:");
  console.log(`  Alice's public key:        ${alicePublicKey.slice(0, 12)}...`);
  console.log(`  Encrypted private key DB:  ${storedEncryptedKey.slice(0, 30)}...`);
  console.log(`  (Alice never sees her private key)\n`);

  // Simulate: Alice wants to send 0.001 SOL to Bob
  const bobKeypair = Keypair.generate();
  const bobAddress = bobKeypair.publicKey.toBase58();

  console.log("SEND TRANSACTION PHASE:");

  // This runs in Alice's browser
  const base64Tx = await clientSideBuildTransaction(alicePublicKey, bobAddress, 0.001);

  // This runs on the server (POST /api/v1/txn/sign)
  // In real life: Alice sends base64Tx to backend, backend signs + broadcasts
  // (We skip the actual broadcast in this demo to avoid needing funded accounts)
  console.log("\nSERVER RECEIVES THE TRANSACTION:");
  console.log(`  base64Tx received (${base64Tx.length} chars)`);

  // Decrypt + reconstruct keypair (what server does)
  const decryptedKey = decryptAES256(storedEncryptedKey, encryptionKey);
  const reconstructedKeypair = Keypair.fromSecretKey(Buffer.from(decryptedKey, "base64"));
  console.log(`\n  Keypair reconstructed: matches original? ${reconstructedKeypair.publicKey.toBase58() === alicePublicKey ? "✅ YES" : "❌ NO"}`);

  // Deserialize and sign (without broadcasting)
  const txBuffer = Buffer.from(base64Tx, "base64");
  const tx = Transaction.from(txBuffer);
  tx.sign(reconstructedKeypair);
  console.log(`  Transaction signed with reconstructed keypair ✅`);
  console.log(`  Signature count: ${tx.signatures.filter(s => s.signature !== null).length}`);
  console.log(`\n  (In production: call sendAndConfirmRawTransaction() to broadcast)`);
}

demonstrateFullFlow().catch(console.error);

/*
FULL CLOUD WALLET SIGNING CYCLE:
  SIGNUP:
    Server → Keypair.generate() → encrypt secretKey → store in DB
    Returns publicKey to user

  SEND TX (client):
    Browser → build Transaction → tx.serialize({ requireAllSignatures: false })
    → base64 encode → POST /api/v1/txn/sign { message: base64 }

  SIGN TX (server):
    Server → JWT verify → get user → decrypt private key from DB
    → Keypair.fromSecretKey(Buffer.from(decryptedBase64, "base64"))
    → Transaction.from(Buffer.from(base64, "base64"))
    → tx.sign(keypair)
    → sendAndConfirmRawTransaction(connection, tx.serialize())
    → return { id: txnId }

  TRACK TX (client):
    Poll GET /api/v1/txn?id=<id> every 2s
    Until status changes from "processing" → "success" | "failed"

KEY HINTS FROM LECTURE:
  1. vite-plugin-node-polyfills  → Buffer, crypto in browser
  2. String private key → Uint8Array: Buffer.from(base64key, "base64")
  3. Serialize unsigned: tx.serialize({ requireAllSignatures: false })
  4. Deserialize: Transaction.from(Buffer.from(base64, "base64"))
*/
