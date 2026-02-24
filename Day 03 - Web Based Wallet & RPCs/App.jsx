import { useState } from 'react'
import { generateMnemonic } from 'bip39'
import { SolanaWallet } from './components/SolanaWallet'
import { ETHWallet } from './components/ETHWallet'
import './App.css'

function App() {
  const [mnemonic, setMnemonic] = useState("")
  const [activeTab, setActiveTab] = useState("eth") // 'eth' | 'sol'

  async function createMnemonic() {
    const mn = await generateMnemonic()
    setMnemonic(mn)
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🦊</span>
          <h1>OptiMask</h1>
        </div>
        <p className="subtitle">Your Web3 Wallet — Powered by 100xDevs</p>
      </header>

      {/* Mnemonic Section */}
      <section className="card mnemonic-section">
        <h2>🔑 Seed Phrase</h2>
        <p className="hint">
          Your seed phrase is the master key to all your wallets. Never share it with anyone.
        </p>

        <button className="btn btn-primary" onClick={createMnemonic}>
          ✨ Generate Seed Phrase
        </button>

        {mnemonic && (
          <div className="mnemonic-display">
            <div className="mnemonic-grid">
              {mnemonic.split(" ").map((word, i) => (
                <div key={i} className="mnemonic-word">
                  <span className="word-num">{i + 1}</span>
                  <span className="word-text">{word}</span>
                </div>
              ))}
            </div>
            <input
              className="mnemonic-input"
              type="text"
              value={mnemonic}
              readOnly
              onClick={(e) => {
                e.target.select()
                navigator.clipboard.writeText(mnemonic)
              }}
              title="Click to copy"
              placeholder="Seed phrase will appear here..."
            />
            <p className="copy-hint">Click the input above to copy</p>
          </div>
        )}
      </section>

      {/* Wallet Section */}
      {mnemonic && (
        <section className="card wallet-section">
          {/* Tab Switcher */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'eth' ? 'active' : ''}`}
              onClick={() => setActiveTab('eth')}
            >
              ⟠ Ethereum
            </button>
            <button
              className={`tab ${activeTab === 'sol' ? 'active' : ''}`}
              onClick={() => setActiveTab('sol')}
            >
              ◎ Solana
            </button>
          </div>

          {/* Wallet Components */}
          {activeTab === 'eth' ? (
            <ETHWallet mnemonic={mnemonic} />
          ) : (
            <SolanaWallet mnemonic={mnemonic} />
          )}
        </section>
      )}

      <footer className="app-footer">
        <p>Built during <strong>100xDevs Cohort 3.0 — Web3 Track</strong> | Day 3.1</p>
        <p>
          <a href="https://github.com/27manavgandhi/OptiMask-Wallet" target="_blank" rel="noreferrer">
            GitHub
          </a>
          {" · "}
          <a href="https://optimask-wallet-chi.vercel.app/" target="_blank" rel="noreferrer">
            Live Demo
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
