// Lecture Code - 2_TokenLaunchpad.jsx
// Topic: Token Launchpad — full createToken implementation using Wallet Adapter
// Day 6.1 - Token Launchpad in React
//
// npm install @solana/wallet-adapter-base @solana/wallet-adapter-react
//             @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
//             @solana/web3.js @solana/spl-token
// npm install --save-dev vite-plugin-node-polyfills

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Keypair,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from '@solana/spl-token';
import { useState } from 'react';

// ── Why we build the transaction manually ─────────────────────────────────────
//
// In Day 4, we used: createMint(connection, payer, mintAuthority, ...)
// → This works in Node.js scripts where WE have the private key (payer)
//
// In a dApp, the END USER must sign and pay.
// We CANNOT create our own Keypair and sign on their behalf.
// So we build the transaction manually and call wallet.sendTransaction()
// → This pops up Phantom/Backpack approval modal for the user

export function TokenLaunchpad() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [mintAddress, setMintAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function createToken() {
    // Guard: wallet must be connected
    if (!wallet.publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    const name = document.getElementById('name').value.trim();
    const symbol = document.getElementById('symbol').value.trim();
    const image = document.getElementById('image').value.trim();
    const initialSupply = parseFloat(document.getElementById('initialSupply').value);
    const decimals = 9; // standard for most tokens (like SOL itself)

    if (!name || !symbol || isNaN(initialSupply) || initialSupply <= 0) {
      alert('Please fill in all fields correctly');
      return;
    }

    try {
      setLoading(true);
      setStatus('Building transaction...');

      // ── Step 1: Generate a fresh keypair for the mint account ──────────────
      // This keypair IS the token's identity on-chain.
      // Its public key becomes the "Mint Address" / "Token Address"
      const mintKeypair = Keypair.generate();

      // ── Step 2: Get minimum lamports for rent exemption ────────────────────
      // Accounts must hold enough lamports to be rent-exempt or they get deleted
      // MINT_SIZE = 82 bytes (fixed size for all mint accounts)
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      // ── Step 3: Derive the ATA address for the connected wallet ────────────
      // ATA = Associated Token Account
      // One per user per token — deterministically derived (it's a PDA)
      const associatedToken = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,  // which token
        wallet.publicKey,       // who owns the ATA
        false,
        TOKEN_PROGRAM_ID
      );

      setStatus('Requesting wallet approval...');

      // ── Step 4: Build transaction with 4 instructions ─────────────────────
      const transaction = new Transaction().add(

        // Instruction 1: Create the mint account (allocate bytes on-chain)
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,       // user pays for account creation
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,                   // 82 bytes
          lamports,                           // rent-exempt deposit
          programId: TOKEN_PROGRAM_ID,        // owned by Token Program
        }),

        // Instruction 2: Initialize the mint with decimals + authorities
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,             // 9 decimals = 10^9 raw units per token
          wallet.publicKey,     // mint authority = user (can mint more tokens)
          wallet.publicKey,     // freeze authority = user (can freeze ATAs)
          TOKEN_PROGRAM_ID
        ),

        // Instruction 3: Create the ATA for the connected user
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,         // payer
          associatedToken,          // new ATA address (derived PDA)
          wallet.publicKey,         // ATA owner
          mintKeypair.publicKey     // which mint this ATA is for
        ),

        // Instruction 4: Mint initial supply to the user's ATA
        createMintToInstruction(
          mintKeypair.publicKey,    // mint
          associatedToken,          // destination ATA
          wallet.publicKey,         // mint authority (must sign)
          initialSupply * (10 ** decimals) // amount in raw units
        )
      );

      // ── Step 5: Send transaction via Wallet Adapter ───────────────────────
      // wallet.sendTransaction() does:
      //   1. Sets recentBlockhash + feePayer automatically
      //   2. Adds user's signature via their wallet (Phantom popup)
      //   3. Broadcasts to the network
      //
      // signers: [mintKeypair] → the new account must co-sign its own creation
      const signature = await wallet.sendTransaction(transaction, connection, {
        signers: [mintKeypair]
      });

      setStatus('Confirming transaction...');
      await connection.confirmTransaction(signature);

      setMintAddress(mintKeypair.publicKey.toBase58());
      setStatus(`✅ Token created successfully!`);

      console.log('Mint address:', mintKeypair.publicKey.toBase58());
      console.log('ATA address:', associatedToken.toBase58());
      console.log('TX:', signature);

    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <h1>Solana Token Launchpad</h1>

      <input id='name' className='inputText' type='text' placeholder='Name' />
      <input id='symbol' className='inputText' type='text' placeholder='Symbol' />
      <input id='image' className='inputText' type='text' placeholder='Image URL' />
      <input id='initialSupply' className='inputText' type='text' placeholder='Initial Supply' />

      <button
        onClick={createToken}
        className='btn'
        disabled={loading || !wallet.publicKey}
      >
        {loading ? 'Creating...' : 'Create a token'}
      </button>

      {status && <p>{status}</p>}

      {mintAddress && (
        <div>
          <p>Mint Address: <code>{mintAddress}</code></p>
          <a
            href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
          >
            View on Solscan ↗
          </a>
        </div>
      )}
    </div>
  );
}

/*
KEY CONCEPTS:
- We generate a fresh Keypair for the mint — its publicKey IS the token's address
- MINT_SIZE = 82 bytes, always the same for any token mint
- getMinimumBalanceForRentExemptMint() → lamports needed to keep the account alive
- 4 instructions bundled in ONE transaction (atomic — all pass or all fail):
    1. createAccount → allocate mint account
    2. initializeMint → set decimals, mintAuthority, freezeAuthority
    3. createAssociatedTokenAccount → create ATA for the creator
    4. mintTo → mint initial supply to creator's ATA
- wallet.sendTransaction(tx, connection, { signers: [mintKeypair] })
    → user signs via Phantom (pays fees + mint authority)
    → mintKeypair also signs (new account creation requires co-signature)
- getAssociatedTokenAddressSync() → derives the ATA address deterministically (PDA)
*/
