// Lecture Code - 1_bonkbot_and_private_key_security.js
// Topic: BonkBot — what it does, how it stores keys, cloud wallet concept
// Day 14.1 - BonkBot, Secure Private Key Management & Cloud Wallet Service

const crypto = require("crypto");

// ── What is BonkBot? ──────────────────────────────────────────────────────────
//
// BonkBot is a Telegram bot on Solana that:
//   1. Monitors Transactions  — watches blockchain for specific events
//   2. Automates Actions      — sends tokens, swaps, stakes on your behalf
//   3. Handles Private Keys Securely — you never type your private key manually
//
// The core problem it solves:
//   WITHOUT BonkBot: User must manually sign every transaction in MetaMask/Phantom
//   WITH BonkBot:    User deposits once → bot handles all future tx signing
//
// This is called a "cloud wallet" or "custodial wallet"
//   - YOU don't hold the private key
//   - The SERVICE holds it and signs on your behalf
//   - Trade-off: convenience vs self-custody

console.log(`
${"═".repeat(65)}
CUSTODIAL vs NON-CUSTODIAL WALLETS
${"═".repeat(65)}
                Custodial (Cloud)         Non-Custodial (Self)
────────────────────────────────────────────────────────────────
Who holds key   Service (BonkBot)         You (Phantom, MetaMask)
Sign txns       Service signs for you     You approve each txn
UX              Seamless, automated       Manual approval needed
Risk            Trust the service         You alone lose it
Examples        BonkBot, Coinbase         Phantom, MetaMask, Ledger
Use case        Bots, automation          Daily use, self-custody
${"═".repeat(65)}
`);

// ── Method 1: Plain text (NEVER DO THIS) ─────────────────────────────────────
const NEVER_DO_THIS = {
  privateKey: "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP8...",
  note: "❌ Private key in plaintext — anyone with DB access can steal it"
};
console.log("❌ BAD:", JSON.stringify(NEVER_DO_THIS));

// ── Method 2: Environment variables (minimal) ─────────────────────────────────
// process.env.PRIVATE_KEY = "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP8..."
// Better than hardcoding, but anyone with server access can read env vars
const envVarApproach = {
  pros: "Not in code, not in git, not in DB",
  cons: "Anyone with server shell access can read it with `printenv`",
  useCase: "Small projects, dev environments"
};
console.log("\n⚠️  ENV VAR APPROACH:", envVarApproach);

// ── Method 3: AES-256 Encryption (what most cloud wallets use) ───────────────
// AES-256-GCM: encrypt private key with a master secret before storing in DB
// The master secret itself must be kept secure (env var, KMS, etc.)

const MASTER_ENCRYPTION_KEY = crypto.randomBytes(32); // 256-bit key
const IV_LENGTH = 16; // AES block size

function encryptPrivateKey(privateKeyBase58) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", MASTER_ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(privateKeyBase58, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Store: iv:encrypted (need IV to decrypt later)
  return iv.toString("hex") + ":" + encrypted;
}

function decryptPrivateKey(encryptedString) {
  const [ivHex, encrypted] = encryptedString.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", MASTER_ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Demo
const fakePrivateKey = "5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP8BaseFakeKey";
const encrypted = encryptPrivateKey(fakePrivateKey);
const decrypted = decryptPrivateKey(encrypted);

console.log("\n✅ AES-256 ENCRYPTION:");
console.log("  Original:  ", fakePrivateKey);
console.log("  Encrypted: ", encrypted.slice(0, 40) + "...");
console.log("  Decrypted: ", decrypted);
console.log("  Match:     ", fakePrivateKey === decrypted ? "✅ YES" : "❌ NO");

// ── Method 4: HSM (Hardware Security Module) ──────────────────────────────────
// A physical device (like a USB stick) that:
//   - Stores cryptographic keys internally
//   - Signs data without ever exposing the key
//   - Tamper-resistant hardware
// Simulated below (real HSMs use PKCS#11 interface)

console.log("\n🔒 HSM CONCEPT (simulated):");
console.log({
  device: "AWS CloudHSM / Thales Luna / YubiHSM",
  operation: "Sign transaction bytes",
  keyLocation: "Inside hardware — key NEVER leaves the device",
  api: "signWithHSM(txBytes) → signature",
  cost: "~$1,500/month (dedicated HSM) or ~$0.003/operation (cloud HSM)",
  useCase: "Exchanges, high-value wallets, BonkBot at scale"
});

// ── Method 5: KMS (Key Management System) ─────────────────────────────────────
// Cloud-based key management: AWS KMS, Google Cloud KMS, HashiCorp Vault
// Similar to HSM but accessed via API

console.log("\n🔑 KMS CONCEPT:");
console.log(`
  AWS KMS Flow:
  1. Create a Customer Master Key (CMK) in AWS KMS
  2. Use CMK to encrypt your private key: aws.kms.encrypt(privateKey)
  3. Store the ENCRYPTED private key in your DB
  4. When signing: aws.kms.decrypt(encryptedKey) → sign tx → broadcast
  
  Key insight: The CMK never leaves AWS KMS
  Even if your DB is compromised, attacker gets encrypted bytes, not the key
`);

// ── Security Comparison ────────────────────────────────────────────────────────
const securityLevels = [
  { method: "Plain text in DB",          security: "❌",     risk: "Anyone with DB access steals everything" },
  { method: "Environment variable",       security: "⚠️",     risk: "Anyone with server shell access" },
  { method: "AES-256 + env master key",   security: "✅",     risk: "Attacker needs both DB + server access" },
  { method: "AES-256 + KMS master key",   security: "✅✅",   risk: "Attacker needs DB + AWS IAM credentials" },
  { method: "HSM",                        security: "✅✅✅", risk: "Physical hardware tamper resistance" },
];

console.log("\n🛡️  PRIVATE KEY SECURITY LEVELS:");
console.log("─".repeat(75));
securityLevels.forEach(({ method, security, risk }) => {
  console.log(`  ${security.padEnd(5)} ${method.padEnd(35)} | ${risk}`);
});

/*
KEY CONCEPTS:
- BonkBot = custodial cloud wallet for Solana automation
- Custodial wallets: service holds the key, signs for you (convenience)
- Non-custodial: you hold the key, sign every tx manually (sovereignty)
- Private key storage options (safest to least):
    HSM > KMS > AES-256 encrypted > env var > plain text
- Cloud wallets ALWAYS encrypt private keys at rest before storing in DB
- The master encryption key itself must be protected (KMS or env)
- BonkBot likely uses: encrypted storage + strict access controls + monitoring
*/
