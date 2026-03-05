// Lecture Code - 4_token_launchpad_solana.jsx
// Topic: Creating a Token on Solana — Mint, ATA, Mint Tokens
// Day 12.1 - Liquidity Pools on Solana, Raydium, ETH vs Solana
//
// Token Launchpad Steps (from lecture):
// 1. Initialise a React project
// 2. Add wallet adapter to it
// 3. Add a polyfill that lets you access node functions
// 4. Figure out the calls to create a mint
// 5. Figure out the calls to create an ATA
// 6. Figure out the calls to mint a token
//
// npm install @solana/web3.js @solana/spl-token
// npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui
// npm install @solana/wallet-adapter-wallets @solana/wallet-adapter-base
//
// Reference: https://github.com/100xdevs-cohort-3/week-12-create-token

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

// ── Main Token Launchpad Component ────────────────────────────────────────────
export default function TokenLaunchpad() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Form state
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [decimals, setDecimals] = useState(6);
  const [mintAmount, setMintAmount] = useState(1000000);

  // Result state
  const [mintAddress, setMintAddress] = useState("");
  const [ataAddress, setAtaAddress] = useState("");
  const [txSig, setTxSig] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // ── STEP 4: Create Mint Account ─────────────────────────────────────────────
  // A Mint Account = the token's "blueprint"
  //   - Stores: decimals, mintAuthority, freezeAuthority, totalSupply
  //   - Once created, its address IS the token's identity
  async function createMint() {
    if (!wallet.publicKey) return alert("Connect wallet first!");
    setLoading(true);
    setStatus("Creating mint...");

    try {
      // Generate a new keypair for the mint account
      // This keypair's public key becomes the token's address
      const mintKeypair = Keypair.generate();

      // Calculate rent-exempt minimum balance (Solana charges rent for accounts)
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      const tx = new Transaction().add(
        // Instruction 1: Create the account and fund it with rent-exempt lamports
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,   // fee payer
          newAccountPubkey: mintKeypair.publicKey,
          lamports,                        // rent-exempt balance
          space: MINT_SIZE,                // 82 bytes for a mint account
          programId: TOKEN_PROGRAM_ID,     // owned by Token Program
        }),

        // Instruction 2: Initialize the account as a Mint
        createInitializeMintInstruction(
          mintKeypair.publicKey,  // the mint address
          decimals,               // number of decimal places (e.g., 6 for USDC-like)
          wallet.publicKey,       // mintAuthority — who can mint tokens
          wallet.publicKey,       // freezeAuthority — who can freeze accounts (optional)
          TOKEN_PROGRAM_ID
        )
      );

      // Both the wallet AND the mintKeypair must sign
      // (wallet pays, mintKeypair owns the new account)
      const sig = await wallet.sendTransaction(tx, connection, {
        signers: [mintKeypair],
      });
      await connection.confirmTransaction(sig, "confirmed");

      setMintAddress(mintKeypair.publicKey.toBase58());
      setStatus(`✅ Mint created! Address: ${mintKeypair.publicKey.toBase58()}`);
      console.log("Mint address:", mintKeypair.publicKey.toBase58());

    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
    setLoading(false);
  }

  // ── STEP 5: Create ATA (Associated Token Account) ──────────────────────────
  // ATA = the specific "pocket" for holding this token in your wallet
  //   - Derived deterministically from [wallet, TOKEN_PROGRAM_ID, mint]
  //   - Each wallet has one ATA per token
  //   - Must exist before minting tokens to you
  async function createATA() {
    if (!wallet.publicKey) return alert("Connect wallet first!");
    if (!mintAddress) return alert("Create a mint first!");
    setLoading(true);
    setStatus("Creating ATA...");

    try {
      const { PublicKey } = await import("@solana/web3.js");
      const mintPubkey = new PublicKey(mintAddress);

      // Derive the ATA address — deterministic, same result every time
      const ata = await getAssociatedTokenAddress(
        mintPubkey,         // which token
        wallet.publicKey,   // whose wallet
      );

      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,  // fee payer
          ata,               // ATA address (derived above)
          wallet.publicKey,  // ATA owner
          mintPubkey,        // which mint
        )
      );

      const sig = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setAtaAddress(ata.toBase58());
      setStatus(`✅ ATA created! Address: ${ata.toBase58()}`);
      console.log("ATA address:", ata.toBase58());

    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
    setLoading(false);
  }

  // ── STEP 6: Mint Tokens ──────────────────────────────────────────────────────
  // mintTo = create new tokens and send to an ATA
  // Only the mintAuthority (set in step 4) can call this
  async function mintTokens() {
    if (!wallet.publicKey) return alert("Connect wallet first!");
    if (!mintAddress) return alert("Create a mint first!");
    if (!ataAddress) return alert("Create ATA first!");
    setLoading(true);
    setStatus("Minting tokens...");

    try {
      const { PublicKey } = await import("@solana/web3.js");

      // Amount must account for decimals
      // e.g., to mint 1,000,000 tokens with 6 decimals = 1,000,000 * 10^6 raw units
      const rawAmount = mintAmount * (10 ** decimals);

      const tx = new Transaction().add(
        createMintToInstruction(
          new PublicKey(mintAddress),  // the mint
          new PublicKey(ataAddress),   // destination ATA
          wallet.publicKey,            // mintAuthority
          rawAmount,                   // amount in raw units (with decimals)
        )
      );

      const sig = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setTxSig(sig);
      setStatus(`✅ Minted ${mintAmount} ${tokenSymbol || "tokens"}!`);
      console.log("Mint tx:", sig);

    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
    setLoading(false);
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2>🚀 Solana Token Launchpad</h2>
      <p style={{ color: "#888" }}>6-step process: Init → Wallet → Polyfill → Mint → ATA → MintTo</p>

      {/* Step 2: Wallet Adapter */}
      <WalletMultiButton />

      {wallet.publicKey && (
        <p>Connected: {wallet.publicKey.toBase58().slice(0, 8)}...</p>
      )}

      {/* Token Info */}
      <div style={{ marginTop: 20 }}>
        <h3>Token Details</h3>
        <input placeholder="Token Name (e.g. Kirat)" value={tokenName} onChange={e => setTokenName(e.target.value)} style={{ display: "block", marginBottom: 8, width: 300 }} />
        <input placeholder="Symbol (e.g. KRT)" value={tokenSymbol} onChange={e => setTokenSymbol(e.target.value)} style={{ display: "block", marginBottom: 8, width: 300 }} />
        <input type="number" placeholder="Decimals (e.g. 6)" value={decimals} onChange={e => setDecimals(Number(e.target.value))} style={{ display: "block", marginBottom: 8, width: 150 }} />
      </div>

      {/* Step 4: Create Mint */}
      <div style={{ marginTop: 16 }}>
        <h3>Step 4: Create Mint</h3>
        <button onClick={createMint} disabled={loading || !wallet.publicKey}>
          Create Mint Account
        </button>
        {mintAddress && <p>✅ Mint: <code>{mintAddress.slice(0, 20)}...</code></p>}
      </div>

      {/* Step 5: Create ATA */}
      <div style={{ marginTop: 16 }}>
        <h3>Step 5: Create ATA</h3>
        <button onClick={createATA} disabled={loading || !mintAddress}>
          Create Associated Token Account
        </button>
        {ataAddress && <p>✅ ATA: <code>{ataAddress.slice(0, 20)}...</code></p>}
      </div>

      {/* Step 6: Mint Tokens */}
      <div style={{ marginTop: 16 }}>
        <h3>Step 6: Mint Tokens</h3>
        <input type="number" placeholder="Amount to mint" value={mintAmount} onChange={e => setMintAmount(Number(e.target.value))} style={{ display: "block", marginBottom: 8, width: 200 }} />
        <button onClick={mintTokens} disabled={loading || !ataAddress}>
          Mint Tokens 🪙
        </button>
      </div>

      {/* Status */}
      {status && <p style={{ marginTop: 16, padding: 12, background: "#f0f0f0" }}>{status}</p>}
      {txSig && (
        <p>
          <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank">
            View on Solana Explorer ↗
          </a>
        </p>
      )}
    </div>
  );
}

/*
KEY CONCEPTS:
Token Launchpad 6-step process:
  1. Initialise React project (npm create vite)
  2. Add Wallet Adapter (WalletProvider, WalletModalProvider)
  3. Add node polyfills (vite.config.js: nodePolyfills())
  4. Create Mint — SystemProgram.createAccount + createInitializeMintInstruction
  5. Create ATA — getAssociatedTokenAddress + createAssociatedTokenAccountInstruction
  6. Mint tokens — createMintToInstruction (only mintAuthority can call)

Mint Account fields: decimals, mintAuthority, freezeAuthority, supply
ATA fields: mint, owner, amount, delegate, state (165 bytes, IS a PDA)
To make your token tradeable: create pool on Raydium → add liquidity → share pool link
*/
