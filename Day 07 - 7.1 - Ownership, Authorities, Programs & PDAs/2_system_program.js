// Lecture Code - 2_system_program.js
// Topic: System Program — create accounts, transfer lamports, change owner
// Day 7.1 - Ownership, Authorities, Programs & PDAs
// npm install @solana/web3.js

import {
  Keypair,
  Connection,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "fs";

// ── Load your local keypair (devnet) ──────────────────────────────────────────
// Run: solana-keygen new --outfile ~/.config/solana/id.json
// Run: solana airdrop 2 --url devnet
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`)))
);
const mintAuthority = payer;
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── What is the System Program? ───────────────────────────────────────────────
// Address: 11111111111111111111111111111111 (all 1s)
// Only the System Program can:
//   1. Create new accounts
//   2. Allocate data space
//   3. Assign ownership to a different program

// ── Example 1: Create a new account with data and rent ───────────────────────
async function createNewAccount() {
  const TOTAL_BYTES = 400;
  const newAccount = Keypair.generate();

  // Calculate minimum lamports to keep account alive (rent-exempt)
  const lamports = await connection.getMinimumBalanceForRentExemption(TOTAL_BYTES);

  console.log("=== Creating new account ===");
  console.log("New account address:", newAccount.publicKey.toBase58());
  console.log("Space allocated:", TOTAL_BYTES, "bytes");
  console.log("Rent-exempt lamports:", lamports, `(${lamports / LAMPORTS_PER_SOL} SOL)`);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,      // who pays for the account
      newAccountPubkey: newAccount.publicKey, // address of new account
      lamports: lamports,               // rent deposit
      space: TOTAL_BYTES,               // how many bytes to allocate
      programId: SystemProgram.programId, // initial owner = System Program
    })
  );

  const sig = await connection.sendTransaction(transaction, [payer, newAccount]);
  await connection.confirmTransaction(sig);
  console.log("Account created at:", newAccount.publicKey.toBase58());
  console.log("TX:", sig);

  // Verify
  const info = await connection.getAccountInfo(newAccount.publicKey);
  console.log("owner:", info.owner.toBase58());     // System Program
  console.log("executable:", info.executable);       // false
  console.log("data size:", info.data.length);       // 400

  return newAccount;
}

// ── Example 2: Transfer lamports from your account to another ────────────────
async function transferLamports() {
  const recipient = Keypair.generate();
  const TOTAL_BYTES = 400;
  const lamports = await connection.getMinimumBalanceForRentExemption(TOTAL_BYTES);

  console.log("\n=== Transferring lamports ===");
  console.log("Recipient:", recipient.publicKey.toBase58());

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient.publicKey,
      lamports,
    })
  );

  const sig = await connection.sendTransaction(transaction, [payer, recipient]);
  await connection.confirmTransaction(sig);
  console.log("Transferred to:", recipient.publicKey.toBase58());

  // Verify the transfer result:
  // {
  //   "value": {
  //     "data": "",
  //     "executable": false,
  //     "lamports": 2039280,   ← transferred amount
  //     "owner": "111...1",    ← System Program
  //     "rentEpoch": 18446744073709551615,
  //     "space": 0
  //   }
  // }
}

// ── Example 3: Change the owner of an account ─────────────────────────────────
// This is how custom programs take ownership of accounts!
// System Program creates account → then assigns ownership to your custom program
async function changeAccountOwner() {
  const newAccount = Keypair.generate();
  const customProgramOwner = Keypair.generate(); // represents a custom program
  const TOTAL_BYTES = 400;
  const lamports = await connection.getMinimumBalanceForRentExemption(TOTAL_BYTES);

  console.log("\n=== Changing account owner ===");
  console.log("New account:", newAccount.publicKey.toBase58());
  console.log("New owner (custom program):", customProgramOwner.publicKey.toBase58());

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: newAccount.publicKey,
      lamports: lamports,
      space: TOTAL_BYTES,
      programId: customProgramOwner.publicKey, // ← owner = custom program (not System Program)
    })
  );

  const sig = await connection.sendTransaction(transaction, [payer, newAccount]);
  await connection.confirmTransaction(sig);
  console.log("Account created at:", newAccount.publicKey.toBase58());

  // Verify — owner is now our custom program, not System Program
  const info = await connection.getAccountInfo(newAccount.publicKey);
  console.log("owner:", info.owner.toBase58()); // customProgramOwner address
}

// ── Wallet on Solana ──────────────────────────────────────────────────────────
// A wallet is just a System Program account with:
//   - Data: None (0 bytes)
//   - Executable: false
//   - Lamports: your SOL balance
//   - Owner: System Program
//
// That's it! A wallet is NOT special — it's just the simplest type of account.

async function main() {
  await transferLamports();
  // await createNewAccount();   // uncomment to run
  // await changeAccountOwner(); // uncomment to run
}

main().catch(console.error);

/*
KEY CONCEPTS:
- System Program address: 11111111111111111111111111111111
- ONLY System Program can create new accounts on Solana
- SystemProgram.createAccount({ fromPubkey, newAccountPubkey, lamports, space, programId })
  → allocates `space` bytes, sets `owner` to `programId`
- SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
  → moves lamports between accounts
- Changing owner: pass your custom program's pubkey as `programId` in createAccount
  → System Program creates it, then hands ownership to your program
- A wallet is simply: { data: none, executable: false, owner: SystemProgram }
*/
