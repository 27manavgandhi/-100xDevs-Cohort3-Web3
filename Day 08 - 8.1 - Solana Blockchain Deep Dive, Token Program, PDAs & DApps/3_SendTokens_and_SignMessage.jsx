// Lecture Code - 3_SendTokens_and_SignMessage.jsx
// Topic: Send SOL transaction + Sign and verify a message
// Day 8.1 - Solana Blockchain Deep Dive, Token Program, PDAs & DApps
//
// npm install @noble/curves bs58

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";
import { ed25519 } from '@noble/curves/ed25519';
import bs58 from 'bs58';
import React, { useState } from 'react';

// ── SendTokens ────────────────────────────────────────────────────────────────
// Sends SOL from the connected wallet to another address
// wallet.sendTransaction() → signs + broadcasts (triggers Phantom popup)
//
// Steps:
// 1. Build Transaction with SystemProgram.transfer instruction
// 2. wallet.sendTransaction(tx, connection) → user approves in their wallet
// 3. Confirmation

export function SendTokens() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState("");

  async function sendTokens() {
    if (!wallet.publicKey) {
      setStatus("Connect wallet first!");
      return;
    }

    const to = document.getElementById("to").value.trim();
    const amount = document.getElementById("amount").value;

    if (!to || !amount) {
      setStatus("Fill in all fields");
      return;
    }

    try {
      setStatus("Building transaction...");
      let toPubkey;
      try {
        toPubkey = new PublicKey(to);
      } catch {
        setStatus("Invalid recipient address");
        return;
      }

      // Build the transaction — one instruction: transfer SOL
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      setStatus("Waiting for wallet approval...");

      // wallet.sendTransaction:
      //   1. Sets recentBlockhash automatically
      //   2. Sets feePayer = wallet.publicKey automatically
      //   3. Pops up Phantom/Backpack approval modal
      //   4. Signs + broadcasts to network
      await wallet.sendTransaction(transaction, connection);

      setStatus(`✅ Sent ${amount} SOL to ${to}`);
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h3>Send SOL</h3>
      <input id="to" type="text" placeholder="To (recipient address)" style={{ display: 'block', margin: '8px 0', width: 400 }} />
      <input id="amount" type="text" placeholder="Amount (SOL)" style={{ display: 'block', margin: '8px 0' }} />
      <button onClick={sendTokens}>Send</button>
      {status && <p>{status}</p>}
    </div>
  );
}

// ── SignMessage ───────────────────────────────────────────────────────────────
// Signs a message with the connected wallet — NO transaction, NO fees
// Used for: "Login with wallet" / Web3 auth / proving ownership
//
// Steps:
// 1. Encode message string to bytes (TextEncoder)
// 2. wallet.signMessage(bytes) → wallet signs (Phantom popup, no fee)
// 3. ed25519.verify(signature, message, publicKey) → cryptographic verification

export function SignMessage() {
  const { publicKey, signMessage } = useWallet();
  const [status, setStatus] = useState("");

  async function onClick() {
    if (!publicKey) {
      setStatus("Wallet not connected!");
      return;
    }
    if (!signMessage) {
      setStatus("Wallet does not support message signing!");
      return;
    }

    const message = document.getElementById("message").value;
    if (!message) {
      setStatus("Enter a message to sign");
      return;
    }

    try {
      setStatus("Waiting for signature...");

      // Encode the message string to bytes
      const encodedMessage = new TextEncoder().encode(message);

      // Ask the wallet to sign — triggers Phantom popup (no fee!)
      const signature = await signMessage(encodedMessage);

      // Verify the signature using ed25519
      // ed25519.verify(signature, message, publicKey) → true if valid
      if (!ed25519.verify(signature, encodedMessage, publicKey.toBytes())) {
        throw new Error('Message signature invalid!');
      }

      // bs58.encode(signature) → display as base58 string
      setStatus(`✅ Success! Signature: ${bs58.encode(signature).slice(0, 20)}...`);
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h3>Sign Message</h3>
      <input id="message" type="text" placeholder="Message to sign" style={{ display: 'block', margin: '8px 0', width: 400 }} />
      <button onClick={onClick}>Sign Message</button>
      {status && <p>{status}</p>}
    </div>
  );
}

/*
KEY CONCEPTS:

SendTokens:
- SystemProgram.transfer({ fromPubkey, toPubkey, lamports }) → transfer instruction
- wallet.sendTransaction(tx, connection) → signs + broadcasts (Phantom popup)
  → connection auto-sets recentBlockhash + feePayer
- Costs ~0.000005 SOL in network fees

SignMessage:
- new TextEncoder().encode(string) → converts string to Uint8Array
- wallet.signMessage(encodedMessage) → signs bytes (NO transaction, NO fees)
- ed25519.verify(sig, msg, pubkey) → cryptographic proof of ownership
- bs58.encode(signature) → human-readable base58 display of signature
- Use case: "Sign in with Solana" — server verifies signature against publicKey
  → proves user owns the wallet without spending any SOL
*/
