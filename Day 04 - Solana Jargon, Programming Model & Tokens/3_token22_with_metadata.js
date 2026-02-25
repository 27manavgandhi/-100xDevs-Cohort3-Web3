// Lecture Code - 3_token22_with_metadata.js
// Topic: Token-22 Program with Metadata Extension
// Day 4.1 - Solana Jargon, Programming Model & Tokens
// npm install @solana/web3.js @solana/spl-token

import {
  Connection,
  Keypair,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  getMintLen,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
  getMetadataPointerState,
  getTokenMetadata,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
} from "@solana/spl-token-metadata";

import fs from "fs";

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`)))
);

console.log("Payer:", payer.publicKey.toBase58());

// ── Token Metadata ─────────────────────────────────────────────────────────────
const TOKEN_METADATA = {
  name: "100xCoin",
  symbol: "100X",
  uri: "https://cdn.100xdevs.com/metadata.json", // JSON with name, symbol, image
  decimals: 6,
};

// ── Create Token-22 with Metadata Extension ────────────────────────────────────
async function createToken22WithMetadata() {
  // Airdrop if needed
  const balance = await connection.getBalance(payer.publicKey);
  if (balance < LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  }

  // Generate a new keypair for the mint account
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Prepare metadata object
  const metadata = {
    mint,
    name: TOKEN_METADATA.name,
    symbol: TOKEN_METADATA.symbol,
    uri: TOKEN_METADATA.uri,
    additionalMetadata: [],
  };

  // Calculate space required for mint + metadata pointer + metadata
  const mintSpace = getMintLen([ExtensionType.MetadataPointer]);
  const metadataSpace = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const totalSpace = mintSpace + metadataSpace;

  const lamports = await connection.getMinimumBalanceForRentExemption(totalSpace);

  console.log("\n=== Creating Token-22 Mint with Metadata ===");
  console.log("Mint Address:", mint.toBase58());

  // Build transaction with all required instructions
  const tx = new Transaction().add(
    // 1. Create the mint account
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintSpace,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),

    // 2. Initialize metadata pointer (points to the mint itself)
    createInitializeMetadataPointerInstruction(
      mint,
      payer.publicKey,  // update authority
      mint,             // metadata account = the mint itself
      TOKEN_2022_PROGRAM_ID
    ),

    // 3. Initialize the mint
    createInitializeMintInstruction(
      mint,
      TOKEN_METADATA.decimals,
      payer.publicKey,  // mint authority
      null,             // freeze authority (null = disabled)
      TOKEN_2022_PROGRAM_ID
    ),

    // 4. Initialize metadata
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint,
      metadata: mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    }),
  );

  const txId = await sendAndConfirmTransaction(connection, tx, [payer, mintKeypair]);

  console.log("TX:", txId);
  console.log("Solscan:", `https://solscan.io/token/${mint.toBase58()}?cluster=devnet`);

  return mint;
}

// ── Create ATA and Mint Tokens ─────────────────────────────────────────────────
async function mintToken22(mint, amount = 1000) {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    false,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log("\n=== ATA Created ===");
  console.log("ATA:", ata.address.toBase58());

  const DECIMALS = TOKEN_METADATA.decimals;
  await mintTo(
    connection,
    payer,
    mint,
    ata.address,
    payer,
    BigInt(amount * 10 ** DECIMALS),
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log(`Minted ${amount} ${TOKEN_METADATA.symbol} tokens`);
  console.log("Check in Phantom wallet on devnet!");
}

// ── Read Metadata from Mint ────────────────────────────────────────────────────
async function readMetadata(mint) {
  const metadata = await getTokenMetadata(connection, mint);
  console.log("\n=== Token Metadata ===");
  console.log("Name  :", metadata?.name);
  console.log("Symbol:", metadata?.symbol);
  console.log("URI   :", metadata?.uri);
  console.log("Mint  :", metadata?.mint.toBase58());
}

// ── Run ────────────────────────────────────────────────────────────────────────
async function main() {
  const mint = await createToken22WithMetadata();
  await mintToken22(mint, 1000);
  await readMetadata(mint);
}

main().catch(console.error);

/*
KEY CONCEPTS:
- Token-22 (Token Extensions) is a superset of the original Token Program
- Program ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
- MetadataPointer extension: stores metadata on-chain inside the mint account itself
- Metadata includes: name, symbol, uri (pointing to JSON with image etc)
- uri JSON example: { name, symbol, image, description }
- Token-22 ATAs need TOKEN_2022_PROGRAM_ID passed explicitly
- After minting, the token appears in Phantom with name, symbol, and image
*/
