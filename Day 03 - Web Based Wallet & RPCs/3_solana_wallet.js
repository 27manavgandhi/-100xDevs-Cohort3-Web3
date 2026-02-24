// Lecture Code - 3_solana_wallet.js
// Topic: Generating Solana Wallets from Mnemonic (HD Wallet)
// Day 3.1 - Web Based Wallet & RPCs

// npm install bip39 ed25519-hd-key tweetnacl @solana/web3.js

const { generateMnemonic, mnemonicToSeedSync } = require("bip39");
const { derivePath } = require("ed25519-hd-key");
const nacl = require("tweetnacl");
const { Keypair, Connection, LAMPORTS_PER_SOL } = require("@solana/web3.js");

// ============================================================
// Step 1: Generate a mnemonic
// ============================================================
const mnemonic = generateMnemonic();
console.log("Generated Mnemonic:\n", mnemonic);
console.log();

// ============================================================
// Step 2: Convert mnemonic → seed
// ============================================================
const seed = mnemonicToSeedSync(mnemonic);
console.log("Seed (hex):", seed.toString("hex").slice(0, 64) + "...");
console.log();

// ============================================================
// Step 3: Derive multiple Solana wallets from the same seed
// Derivation path: m/44'/501'/index'/0'
//   44'  = BIP44 purpose
//   501' = Solana coin type
//   index' = account index (0, 1, 2, ...)
//   0'   = change
// ============================================================
console.log("=== Derived Solana Wallets ===");

for (let i = 0; i < 4; i++) {
  const path = `m/44'/501'/${i}'/0'`;
  const derivedSeed = derivePath(path, seed.toString("hex")).key;

  // Create keypair from 32-byte seed
  const keypair = Keypair.fromSecretKey(
    nacl.sign.keyPair.fromSeed(derivedSeed).secretKey
  );

  console.log(`\nWallet ${i + 1} — Path: ${path}`);
  console.log("  Public Key:", keypair.publicKey.toBase58());
  console.log(
    "  Private Key (hex):",
    Buffer.from(keypair.secretKey).toString("hex").slice(0, 32) + "..."
  );
}

// ============================================================
// Step 4: Fetch Balance via RPC (using @solana/web3.js)
// ============================================================
async function fetchSolanaBalance(publicKeyStr) {
  try {
    // Using public devnet endpoint
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed"
    );
    const { PublicKey } = require("@solana/web3.js");
    const pubKey = new PublicKey(publicKeyStr);
    const balance = await connection.getBalance(pubKey);
    console.log(`\nBalance of ${publicKeyStr}:`);
    console.log(`  ${balance} Lamports = ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (err) {
    console.log("Balance fetch error:", err.message);
  }
}

// Uncomment to fetch balance:
// const seed2 = mnemonicToSeedSync(mnemonic);
// const derived = derivePath(`m/44'/501'/0'/0'`, seed2.toString('hex')).key;
// const kp = Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derived).secretKey);
// fetchSolanaBalance(kp.publicKey.toBase58());

/*
KEY CONCEPTS:
- Same mnemonic → same seed → deterministic wallet derivation
- BIP44 path structure: m / purpose' / coin_type' / account' / change / index
- Solana coin type = 501 (https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
- nacl.sign.keyPair.fromSeed() creates ed25519 keypair
- Public key IS the Solana address (no hashing needed)
*/
