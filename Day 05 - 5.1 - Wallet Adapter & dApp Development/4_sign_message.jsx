// Lecture Code - 4_sign_message.jsx
// Topic: Sign a Message with Connected Wallet (Proof of Ownership)
// Day 5.1 - Wallet Adapter & dApp Development
// npm install @noble/curves

import { useWallet } from "@solana/wallet-adapter-react";
import { ed25519 } from "@noble/curves/ed25519";
import { useState, useCallback } from "react";

// ── Why Sign a Message? ────────────────────────────────────────────────────────
// Signing a message proves that you OWN a wallet without spending any SOL.
// No transaction is sent to the blockchain.
//
// Use cases:
// - Login with wallet (Web3 auth — no password needed)
// - Prove ownership of an NFT or token
// - Sign terms of service
// - Off-chain voting / governance
//
// Process:
// 1. Encode the message as bytes (UTF-8)
// 2. wallet.signMessage(bytes) → prompts user to sign in their wallet
// 3. Verify the signature using ed25519 cryptography
//    → signature must match: ed25519.verify(sig, msg, publicKey)

export function SignMessage() {
  const { publicKey, signMessage } = useWallet();
  const [status, setStatus] = useState("");
  const [signature, setSignature] = useState("");
  const [verified, setVerified] = useState(null);

  const handleSign = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setStatus("Please connect a wallet that supports message signing");
      return;
    }

    const message = document.getElementById("sign-message").value.trim();
    if (!message) {
      setStatus("Enter a message to sign");
      return;
    }

    try {
      setStatus("Waiting for signature...");
      setVerified(null);

      // Encode the message to bytes
      const encodedMessage = new TextEncoder().encode(message);

      // Ask the wallet to sign (triggers Phantom/Backpack popup)
      const sig = await signMessage(encodedMessage);

      // sig is a Uint8Array — convert to hex for display
      const hexSig = Buffer.from(sig).toString("hex");
      setSignature(hexSig);

      // Verify the signature using ed25519
      // This proves the message was signed by the holder of this publicKey
      const isValid = ed25519.verify(sig, encodedMessage, publicKey.toBytes());
      setVerified(isValid);

      if (isValid) {
        setStatus("✅ Message signed and verified successfully!");
      } else {
        setStatus("❌ Signature verification failed!");
      }
    } catch (err) {
      setStatus("❌ Signing failed: " + err.message);
    }
  }, [publicKey, signMessage]);

  const shortPubkey = publicKey
    ? publicKey.toBase58().slice(0, 8) + "..." + publicKey.toBase58().slice(-6)
    : "Not connected";

  return (
    <div style={{ padding: "20px" }}>
      <h2>✍️ Sign Message</h2>
      <p>Wallet: <strong>{shortPubkey}</strong></p>

      <div>
        <input
          id="sign-message"
          type="text"
          placeholder="Enter message to sign..."
          style={{ display: "block", marginBottom: "8px", padding: "8px", width: "400px" }}
        />
        <button onClick={handleSign} disabled={!publicKey}>
          Sign Message
        </button>
      </div>

      {status && <p style={{ marginTop: "10px" }}>{status}</p>}

      {signature && (
        <div style={{ marginTop: "10px" }}>
          <strong>Signature (hex):</strong>
          <p style={{ fontSize: "12px", wordBreak: "break-all", fontFamily: "monospace" }}>
            {signature}
          </p>
        </div>
      )}

      {verified !== null && (
        <p style={{ color: verified ? "green" : "red" }}>
          Verification: {verified ? "✅ Valid" : "❌ Invalid"}
        </p>
      )}
    </div>
  );
}

// ── How verification works ────────────────────────────────────────────────────
//
// ed25519.verify(signature, message, publicKey)
//
// This is the same ed25519 algorithm we studied in Week 2!
// The wallet uses the PRIVATE KEY to sign.
// Anyone can verify using just the PUBLIC KEY — no private key needed.
//
// This is the foundation of "Login with Wallet" / Web3 Auth:
// 1. Server sends a random challenge (nonce)
// 2. User signs it with their wallet
// 3. Server verifies signature against the user's public key
// 4. If valid → user is authenticated as the owner of that wallet address

/*
KEY CONCEPTS:
- signMessage() → no SOL spent, no blockchain transaction
- TextEncoder().encode(string) → converts string to Uint8Array (bytes)
- ed25519.verify(sig, msg, pubkey) → cryptographic proof of ownership
- useCallback: memoizes the function to avoid re-creating on every render
- Difference from sendTransaction:
  - signMessage: off-chain only, no fees, used for auth/ownership proof
  - sendTransaction: on-chain, costs fees, changes blockchain state
*/
