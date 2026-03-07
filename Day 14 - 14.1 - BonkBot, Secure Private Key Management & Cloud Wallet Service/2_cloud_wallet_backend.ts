// Lecture Code - 2_cloud_wallet_backend.ts
// Topic: Cloud Wallet Service — Express API (signup, signin, sign txn, status)
// Day 14.1 - BonkBot, Secure Private Key Management & Cloud Wallet Service
//
// npm install express jsonwebtoken bcrypt @solana/web3.js
// npm install -D typescript @types/express @types/jsonwebtoken @types/bcrypt @types/node ts-node

import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  Keypair,
  Connection,
  Transaction,
  clusterApiUrl,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";

const app = express();
app.use(express.json());

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── Config (in production: use .env) ──────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_change_in_prod";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ENCRYPTION_KEY_BYTES = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"));

// ── In-memory "database" (replace with PostgreSQL/Prisma in production) ───────
interface User {
  id: string;
  username: string;
  passwordHash: string;
  encryptedPrivateKey: string;  // AES-256 encrypted
  publicKey: string;
}

interface TxnRecord {
  id: string;
  userId: string;
  signatures: string[];
  status: "processing" | "success" | "failed";
  createdAt: Date;
}

const users = new Map<string, User>();           // username → User
const txnRecords = new Map<string, TxnRecord>(); // txnId → TxnRecord

// ── Encryption helpers ─────────────────────────────────────────────────────────
function encryptPrivateKey(privateKeyBase58: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY_BYTES, iv);
  let encrypted = cipher.update(privateKeyBase58, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptPrivateKey(encryptedString: string): string {
  const [ivHex, encrypted] = encryptedString.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY_BYTES, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Convert base58 private key string → Keypair
function keypairFromEncryptedKey(encryptedKey: string): Keypair {
  const privateKeyBase58 = decryptPrivateKey(encryptedKey);
  // Hint from lecture: String private key to Uint8Array
  // Reference: https://gist.github.com/XavierS9/b0b216f003b8e54db53c39397e98cd70
  const privateKeyBytes = Buffer.from(privateKeyBase58, "base64");
  return Keypair.fromSecretKey(privateKeyBytes);
}

// ── Auth Middleware ────────────────────────────────────────────────────────────
interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// ── POST /api/v1/signup ───────────────────────────────────────────────────────
// User signs up → gets a Solana wallet created for them
app.post("/api/v1/signup", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: "Username and password required" });
    return;
  }

  // Check duplicate
  if (users.has(username)) {
    res.status(400).json({ message: "User already exists" });
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate Solana keypair for this user
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Encrypt private key before storing
  // secretKey is a Uint8Array — convert to base64 string for storage
  const privateKeyBase64 = Buffer.from(keypair.secretKey).toString("base64");
  const encryptedPrivateKey = encryptPrivateKey(privateKeyBase64);

  // Store user
  const userId = crypto.randomUUID();
  users.set(username, {
    id: userId,
    username,
    passwordHash,
    encryptedPrivateKey,
    publicKey,
  });

  console.log(`✅ New user created: ${username} | Public key: ${publicKey.slice(0, 8)}...`);

  // Return public key — user can share this to receive SOL
  res.status(200).json({ publicKey });
});

// ── POST /api/v1/signin ───────────────────────────────────────────────────────
// User signs in → gets a JWT
app.post("/api/v1/signin", async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  const user = users.get(username);
  if (!user) {
    res.status(401).json({ message: "Incorrect credentials" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ message: "Incorrect credentials" });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log(`🔑 User signed in: ${username}`);
  res.status(200).json({ jwt: token });
});

// ── POST /api/v1/txn/sign ─────────────────────────────────────────────────────
// User asks backend to sign + broadcast a transaction on their behalf
app.post("/api/v1/txn/sign", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, retry } = req.body;
  // `message` = base64 serialized Solana Transaction from client
  // `retry`   = true if user wants to retry a previously failed tx

  if (!message) {
    res.status(400).json({ message: "Transaction message required" });
    return;
  }

  const user = [...users.values()].find(u => u.id === req.userId);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }

  // Generate tracking ID
  const txnId = crypto.randomUUID();

  // Store initial status (we'll update after broadcast)
  txnRecords.set(txnId, {
    id: txnId,
    userId: req.userId!,
    signatures: [],
    status: "processing",
    createdAt: new Date(),
  });

  // Return ID immediately — let signing/broadcast happen async
  res.status(200).json({ id: txnId });

  // Process transaction asynchronously
  (async () => {
    try {
      // Step 1: Reconstruct keypair from encrypted stored key
      const keypair = keypairFromEncryptedKey(user.encryptedPrivateKey);

      // Step 2: Deserialize the transaction
      // Client sent: tx.serialize({ requireAllSignatures: false }) → base64
      const txBuffer = Buffer.from(message, "base64");
      const tx = Transaction.from(txBuffer);

      // Step 3: Sign the transaction with the user's keypair
      tx.sign(keypair);

      // Step 4: Get the raw serialized + signed transaction bytes
      const rawTx = tx.serialize();

      // Step 5: Broadcast to Solana network
      const signature = await sendAndConfirmRawTransaction(connection, rawTx, {
        commitment: "confirmed",
      });

      // Step 6: Update status to success
      txnRecords.set(txnId, {
        ...txnRecords.get(txnId)!,
        signatures: [signature],
        status: "success",
      });

      console.log(`✅ TX confirmed: ${signature.slice(0, 20)}... | User: ${user.username}`);

    } catch (err) {
      console.error(`❌ TX failed for ${user.username}:`, err);
      txnRecords.set(txnId, {
        ...txnRecords.get(txnId)!,
        status: "failed",
      });
    }
  })();
});

// ── GET /api/v1/txn?id=id ─────────────────────────────────────────────────────
// Check the status of a transaction
app.get("/api/v1/txn", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.query as { id: string };

  if (!id) {
    res.status(400).json({ message: "Transaction ID required" });
    return;
  }

  const record = txnRecords.get(id);
  if (!record) {
    res.status(404).json({ message: "Transaction not found" });
    return;
  }

  // Only show to the owner
  if (record.userId !== req.userId) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  res.status(200).json({
    signatures: record.signatures,
    status: record.status,   // "processing" | "success" | "failed"
  });
});

app.listen(3000, () => {
  console.log(`
🚀 Cloud Wallet Backend running on port 3000

API Endpoints:
  POST /api/v1/signup       → Create wallet, returns publicKey
  POST /api/v1/signin       → Login, returns jwt
  POST /api/v1/txn/sign     → Sign + broadcast tx (needs JWT)
  GET  /api/v1/txn?id=<id>  → Check tx status (needs JWT)

Test with curl:
  curl -X POST http://localhost:3000/api/v1/signup \\
    -H "Content-Type: application/json" \\
    -d '{"username":"alice","password":"secret123"}'
  `);
});

export default app;
