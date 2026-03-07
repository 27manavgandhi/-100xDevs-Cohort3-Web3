// Lecture Code - 3_cloud_wallet_frontend.tsx
// Topic: Cloud Wallet React frontend — build tx, serialize, send to backend
// Day 14.1 - BonkBot, Secure Private Key Management & Cloud Wallet Service
//
// npm create vite@latest cloud-wallet -- --template react-ts
// npm install axios @solana/web3.js
// npm install -D vite-plugin-node-polyfills
//
// vite.config.ts — required for Buffer/crypto in browser:
// import { nodePolyfills } from 'vite-plugin-node-polyfills'
// plugins: [react(), nodePolyfills()]
//
// Hint from lecture:
//   Node polyfills: https://www.npmjs.com/package/vite-plugin-node-polyfills
//   Serializing: Call tx.serialize({ requireAllSignatures: false })

import { useState } from "react";
import axios from "axios";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

const API = "http://localhost:3000/api/v1";
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// ── App ───────────────────────────────────────────────────────────────────────
export default function CloudWalletApp() {
  const [view, setView] = useState<"signup" | "signin" | "wallet">("signup");
  const [jwt, setJwt] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  if (view === "wallet" && jwt && publicKey) {
    return <WalletDashboard jwt={jwt} publicKey={publicKey} />;
  }
  if (view === "signin") {
    return <SignIn onSuccess={(jwt) => { setJwt(jwt); setView("wallet"); }} onSwitch={() => setView("signup")} />;
  }
  return (
    <SignUp
      onSuccess={(pk) => { setPublicKey(pk); setView("signin"); }}
      onSwitch={() => setView("signin")}
    />
  );
}

// ── Sign Up ───────────────────────────────────────────────────────────────────
function SignUp({ onSuccess, onSwitch }: { onSuccess: (pk: string) => void; onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/signup`, { username, password });
      setPublicKey(data.publicKey);
      onSuccess(data.publicKey);
    } catch (err: any) {
      setError(err.response?.data?.message || "Signup failed");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 400 }}>
      <h2>☁️ Create Cloud Wallet</h2>
      <p>A Solana wallet will be created and securely stored for you.</p>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
      <button onClick={handleSignup} disabled={loading} style={btnStyle}>
        {loading ? "Creating..." : "Create Wallet"}
      </button>
      {publicKey && <p style={{ color: "green" }}>✅ Wallet created! Public key: <code>{publicKey.slice(0, 12)}...</code></p>}
      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      <p><button onClick={onSwitch} style={{ background: "none", border: "none", cursor: "pointer", color: "blue" }}>Already have an account? Sign in</button></p>
    </div>
  );
}

// ── Sign In ───────────────────────────────────────────────────────────────────
function SignIn({ onSuccess, onSwitch }: { onSuccess: (jwt: string) => void; onSwitch: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignin() {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/signin`, { username, password });
      onSuccess(data.jwt);
    } catch (err: any) {
      setError(err.response?.data?.message || "Sign in failed");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 400 }}>
      <h2>🔑 Sign In to Cloud Wallet</h2>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
      <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
      <button onClick={handleSignin} disabled={loading} style={btnStyle}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      <p><button onClick={onSwitch} style={{ background: "none", border: "none", cursor: "pointer", color: "blue" }}>No account? Sign up</button></p>
    </div>
  );
}

// ── Wallet Dashboard ──────────────────────────────────────────────────────────
function WalletDashboard({ jwt, publicKey }: { jwt: string; publicKey: string }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [txnId, setTxnId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Build transaction client-side, serialize it, send to backend
  async function sendTransaction() {
    setLoading(true);
    setError("");
    setTxnId(null);
    setStatus(null);

    try {
      // Validate recipient address
      const recipientPubkey = new PublicKey(recipient);

      // Get recent blockhash (needed for transaction validity)
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      // Build the Solana transaction
      // We're sending SOL from the user's cloud wallet to recipient
      const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer: new PublicKey(publicKey), // our cloud wallet pays fees
      }).add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(publicKey),
          toPubkey: recipientPubkey,
          lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
        })
      );

      // Serialize the transaction WITHOUT signing
      // (the backend will sign it with the stored private key)
      // requireAllSignatures: false = OK to serialize unsigned
      const serialized = tx.serialize({ requireAllSignatures: false });
      const base64Message = Buffer.from(serialized).toString("base64");

      // Send serialized tx to backend for signing + broadcasting
      const { data } = await axios.post(
        `${API}/txn/sign`,
        { message: base64Message, retry: false },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      setTxnId(data.id);
      setStatus("processing");

      // Poll for status
      pollStatus(data.id);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Transaction failed");
    }
    setLoading(false);
  }

  async function pollStatus(id: string) {
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/txn?id=${id}`, {
          headers: { Authorization: `Bearer ${jwt}` }
        });
        setStatus(data.status);
        setSignatures(data.signatures);

        if (data.status !== "processing") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000); // poll every 2 seconds
  }

  return (
    <div style={{ padding: 24, maxWidth: 500 }}>
      <h2>☁️ Cloud Wallet</h2>
      <p>Your public key: <code style={{ fontSize: 11 }}>{publicKey}</code></p>

      <h3>Send SOL</h3>
      <input placeholder="Recipient address (0x...)" value={recipient} onChange={e => setRecipient(e.target.value)} style={{ ...inputStyle, width: 420 }} />
      <input placeholder="Amount in SOL (e.g. 0.01)" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, width: 200 }} />
      <button onClick={sendTransaction} disabled={loading} style={btnStyle}>
        {loading ? "Sending..." : "Send SOL 🚀"}
      </button>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {txnId && (
        <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5" }}>
          <p>Tracking ID: <code>{txnId.slice(0, 12)}...</code></p>
          <p>Status: <strong>{status}</strong></p>
          {signatures.length > 0 && (
            <p>
              Signature: <a href={`https://explorer.solana.com/tx/${signatures[0]}?cluster=devnet`} target="_blank">
                {signatures[0].slice(0, 20)}... ↗
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = { display: "block", marginBottom: 8, padding: "8px 12px", width: "100%", boxSizing: "border-box" as const };
const btnStyle = { padding: "8px 20px", cursor: "pointer", background: "#512da8", color: "white", border: "none", borderRadius: 4 };

/*
KEY CONCEPTS:
- Frontend NEVER sees the private key (it's encrypted on the server)
- Client builds the transaction (knows from/to/amount)
- tx.serialize({ requireAllSignatures: false }) = send unsigned tx bytes as base64
- Backend receives base64 → deserializes → signs with stored key → broadcasts
- tx.from(buffer) deserializes, tx.sign(keypair) signs, sendAndConfirmRawTransaction broadcasts
- vite-plugin-node-polyfills is REQUIRED for Buffer/crypto to work in Vite/browser
- Poll /txn?id=<id> every ~2s to check if tx went from "processing" → "success"|"failed"
*/
