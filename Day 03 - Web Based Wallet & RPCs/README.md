# OptiMask Wallet 🦊

> **100xDevs Cohort 3.0 — Web3 Track | Day 3.1 Assignment Solution**

OptiMask is a MetaMask-like web wallet built with React, ethers.js, and Solana web3.js. It allows users to generate a mnemonic seed phrase and derive multiple Ethereum and Solana wallets from a single seed.

🔗 **Live Demo**: https://optimask-wallet-chi.vercel.app/  
📚 **Course**: https://projects.100xdevs.com/tracks/web-wallet-rpc/
🚀 **Notes**: https://feather-lion-ff2.notion.site/Week-3-1-150cf5450c6d4f4c81549c1c15932361/

---

## ✨ Features

- **Mnemonic Generation** — Generate a cryptographically secure 12-word BIP39 seed phrase
- **Multi-Chain Support** — Derive wallets for both Ethereum and Solana
- **HD Wallet Derivation** — Follows BIP44 standard (`m/44'/60'/index'/0'` for ETH, `m/44'/501'/index'/0'` for SOL)
- **Balance Checking** — Query live ETH balance via Alchemy RPC; SOL balance via devnet
- **Private Key Management** — Show/hide private keys with copy support
- **Dark UI** — Clean MetaMask-inspired dark interface

---

## 🛠️ Tech Stack

| Tech | Purpose |
|------|---------|
| React + Vite | Frontend framework |
| bip39 | Mnemonic generation & seed conversion |
| ethers.js v6 | Ethereum wallet derivation & RPC calls |
| @solana/web3.js | Solana wallet & RPC |
| ed25519-hd-key | HD derivation for Solana (ed25519) |
| tweetnacl | Low-level Solana keypair generation |
| vite-plugin-node-polyfills | Browser compatibility for crypto libs |
| Alchemy API | ETH RPC endpoint |

---

## 🚀 Setup & Run

### 1. Clone
```bash
git clone https://github.com/27manavgandhi/OptiMask-Wallet.git
cd OptiMask-Wallet
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and add your Alchemy API key:
# VITE_ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

Get a free API key at: https://www.alchemy.com/

### 4. Run
```bash
npm run dev
```

---

## 📁 Project Structure

```
optimask-wallet/
├── src/
│   ├── App.jsx              # Root component — mnemonic + tabs
│   ├── App.css              # All styles
│   ├── main.jsx             # React entry point
│   ├── index.css            # Base body styles
│   └── components/
│       ├── ETHWallet.jsx    # Ethereum wallet derivation + balance
│       └── SolanaWallet.jsx # Solana wallet derivation + balance
├── .env.example             # Environment variable template
├── vite.config.js           # Vite + node polyfills config
└── package.json
```

---

## 📖 Key Concepts Covered (Day 3)

- **Keccak-256** — How Ethereum derives addresses from public keys
- **JSON-RPC** — Protocol used to communicate with blockchain nodes
- **RPC Server** — Alchemy/Quicknode/Helius as intermediaries to the blockchain
- **Wei & Lamports** — Smallest denominations of ETH (10^-18) and SOL (10^-9)
- **HD Wallet Derivation** — BIP32/BIP44 derivation paths for multi-account wallets

---

## ⚠️ Security Notice

This is an **educational project**. Never use wallets generated here to store real funds on mainnet without understanding the security implications. Never share your seed phrase or private keys.
