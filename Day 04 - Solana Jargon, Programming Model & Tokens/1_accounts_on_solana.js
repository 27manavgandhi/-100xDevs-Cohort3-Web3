// Lecture Code - 1_accounts_on_solana.js
// Topic: Accounts on Solana — Wallet, Program, Data accounts
// Day 4.1 - Solana Jargon, Programming Model & Tokens
// npm install @solana/web3.js

const {
  Connection,
  Keypair,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── 1. Fetch Account Info ─────────────────────────────────────────────────────
async function fetchAccountInfo() {
  // Example: a wallet account with lamports but no data
  const address = new PublicKey("Eg4F6LW8DD3SvFLLigYJBFvRnXSBiLZYYJ3KEePDL95Q");

  const accountInfo = await connection.getAccountInfo(address);
  console.log("=== Account Info ===");
  console.log("Lamports  :", accountInfo?.lamports);
  console.log("SOL       :", (accountInfo?.lamports || 0) / LAMPORTS_PER_SOL);
  console.log("Owner     :", accountInfo?.owner.toBase58());
  console.log("Executable:", accountInfo?.executable); // true = program account
  console.log("Data Size :", accountInfo?.data.length, "bytes");
}

// ── 2. Create a New Keypair (Wallet) ─────────────────────────────────────────
function createWallet() {
  const keypair = Keypair.generate();
  console.log("\n=== New Wallet ===");
  console.log("Public Key :", keypair.publicKey.toBase58());
  console.log("Secret Key :", Buffer.from(keypair.secretKey).toString("hex").slice(0, 32) + "...");
  return keypair;
}

// ── 3. Airdrop SOL (devnet only) ─────────────────────────────────────────────
async function airdropSOL(publicKey) {
  console.log("\n=== Airdropping 1 SOL ===");
  const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);
  const balance = await connection.getBalance(publicKey);
  console.log("New Balance:", balance / LAMPORTS_PER_SOL, "SOL");
}

// ── 4. Create a Data Account ──────────────────────────────────────────────────
// A data account stores arbitrary bytes for a program to use
async function createDataAccount(payer) {
  const dataAccount = Keypair.generate();
  const SPACE = 1000; // bytes to allocate

  const lamports = await connection.getMinimumBalanceForRentExemption(SPACE);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: dataAccount.publicKey,
      lamports,           // must hold enough lamports to be rent-exempt
      space: SPACE,       // how many bytes to allocate
      programId: SystemProgram.programId,
    })
  );

  const txId = await sendAndConfirmTransaction(connection, tx, [payer, dataAccount]);

  console.log("\n=== Data Account Created ===");
  console.log("Data Account :", dataAccount.publicKey.toBase58());
  console.log("TX ID        :", txId);
  console.log("Solscan      : https://solscan.io/tx/" + txId + "?cluster=devnet");

  return dataAccount;
}

// ── 5. Check balance ─────────────────────────────────────────────────────────
async function checkBalance(publicKey) {
  const balance = await connection.getBalance(publicKey);
  console.log(`\nBalance of ${publicKey.toBase58()}:`);
  console.log(`  ${balance} lamports = ${balance / LAMPORTS_PER_SOL} SOL`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  await fetchAccountInfo();

  // Uncomment below to run the full flow on devnet:
  // const wallet = createWallet();
  // await airdropSOL(wallet.publicKey);
  // await checkBalance(wallet.publicKey);
  // await createDataAccount(wallet);
})();

/*
KEY CONCEPTS:
- Every account on Solana has: lamports, data (bytes), owner (program), executable flag
- Wallet accounts: owned by System Program, executable = false, data = empty
- Program accounts: executable = true, data = compiled BPF bytecode
- Data accounts: owned by a program, executable = false, data = program state
- Rent: accounts must hold enough lamports to be rent-exempt (or get deleted)
- LAMPORTS_PER_SOL = 1_000_000_000 (1 billion lamports = 1 SOL)
*/
