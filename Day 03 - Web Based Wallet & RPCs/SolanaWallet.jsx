import { useState } from 'react'
import { mnemonicToSeed } from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import nacl from 'tweetnacl'

// Public Solana devnet RPC (no API key needed for testing)
const SOL_RPC_URL = "https://api.devnet.solana.com"

export function SolanaWallet({ mnemonic }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wallets, setWallets] = useState([]) // [{publicKey, secretKey, balance, path}]
  const [showPrivKey, setShowPrivKey] = useState({})
  const [loadingBalance, setLoadingBalance] = useState({})

  // ── Derive a new Solana wallet ───────────────────────────────────────────────
  async function addWallet() {
    const seed = await mnemonicToSeed(mnemonic)
    const path = `m/44'/501'/${currentIndex}'/0'`
    const derivedSeed = derivePath(path, seed.toString('hex')).key

    const keypair = Keypair.fromSecretKey(
      nacl.sign.keyPair.fromSeed(derivedSeed).secretKey
    )

    setCurrentIndex(currentIndex + 1)
    setWallets([
      ...wallets,
      {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Buffer.from(keypair.secretKey).toString('hex'),
        balance: null,
        path,
        index: currentIndex,
      },
    ])
  }

  // ── Fetch SOL balance via devnet ─────────────────────────────────────────────
  async function fetchBalance(publicKeyStr, idx) {
    setLoadingBalance(prev => ({ ...prev, [idx]: true }))
    try {
      const connection = new Connection(SOL_RPC_URL, 'confirmed')
      const { PublicKey } = await import('@solana/web3.js')
      const pubKey = new PublicKey(publicKeyStr)
      const balance = await connection.getBalance(pubKey)
      const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(6)
      setWallets(prev =>
        prev.map((w, i) => (i === idx ? { ...w, balance: solBalance } : w))
      )
    } catch (err) {
      console.error("Solana balance error:", err)
      alert("Error fetching Solana balance.")
    } finally {
      setLoadingBalance(prev => ({ ...prev, [idx]: false }))
    }
  }

  function togglePrivKey(idx) {
    setShowPrivKey(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  function deleteWallet(idx) {
    setWallets(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h3>◎ Solana Wallets</h3>
        <button className="btn btn-primary" onClick={addWallet}>
          + Add SOL Wallet
        </button>
      </div>

      {wallets.length === 0 && (
        <p className="empty-state">No wallets yet. Click "Add SOL Wallet" to derive your first Solana account.</p>
      )}

      <div className="wallet-list">
        {wallets.map((w, idx) => (
          <div key={idx} className="wallet-card">
            <div className="wallet-card-header">
              <span className="wallet-label">Wallet {w.index + 1}</span>
              <span className="wallet-path">{w.path}</span>
              <button className="btn-icon btn-danger" onClick={() => deleteWallet(idx)} title="Delete">
                🗑️
              </button>
            </div>

            {/* Public Key */}
            <div className="wallet-field">
              <label>Public Key</label>
              <div className="copy-field">
                <span className="address">{w.publicKey}</span>
                <button
                  className="btn-copy"
                  onClick={() => navigator.clipboard.writeText(w.publicKey)}
                  title="Copy"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Private Key */}
            <div className="wallet-field">
              <label>Private Key (hex)</label>
              <div className="copy-field">
                <span className="privkey">
                  {showPrivKey[idx]
                    ? w.secretKey
                    : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                </span>
                <button
                  className="btn-copy"
                  onClick={() => togglePrivKey(idx)}
                  title={showPrivKey[idx] ? 'Hide' : 'Show'}
                >
                  {showPrivKey[idx] ? '🙈' : '👁️'}
                </button>
                {showPrivKey[idx] && (
                  <button
                    className="btn-copy"
                    onClick={() => navigator.clipboard.writeText(w.secretKey)}
                    title="Copy"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>

            {/* Balance */}
            <div className="wallet-field balance-field">
              <label>Balance (Devnet)</label>
              <div className="balance-row">
                <span className="balance">
                  {w.balance !== null ? `${w.balance} SOL` : '—'}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchBalance(w.publicKey, idx)}
                  disabled={loadingBalance[idx]}
                >
                  {loadingBalance[idx] ? '⏳' : '🔄 Refresh'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
