import { useState } from 'react'
import { mnemonicToSeed } from 'bip39'
import { Wallet, HDNodeWallet, JsonRpcProvider, formatEther } from 'ethers'

// Get RPC URL from .env: VITE_ALCHEMY_RPC_URL
const RPC_URL = import.meta.env.VITE_ALCHEMY_RPC_URL || ""

export const ETHWallet = ({ mnemonic }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wallets, setWallets] = useState([]) // [{address, privateKey, balance}]
  const [showPrivKey, setShowPrivKey] = useState({})
  const [loadingBalance, setLoadingBalance] = useState({})

  // ── Add a new ETH wallet derived from the mnemonic ──────────────────────────
  async function addWallet() {
    const seed = await mnemonicToSeed(mnemonic)
    const derivationPath = `m/44'/60'/${currentIndex}'/0'`
    const hdNode = HDNodeWallet.fromSeed(seed)
    const child = hdNode.derivePath(derivationPath)
    const wallet = new Wallet(child.privateKey)

    setCurrentIndex(currentIndex + 1)
    setWallets([
      ...wallets,
      {
        address: wallet.address,
        privateKey: child.privateKey,
        balance: null,
        path: derivationPath,
        index: currentIndex,
      },
    ])
  }

  // ── Fetch balance for one wallet via Alchemy RPC ─────────────────────────────
  async function fetchBalance(address, idx) {
    if (!RPC_URL) {
      alert("Please add VITE_ALCHEMY_RPC_URL to your .env file")
      return
    }
    setLoadingBalance(prev => ({ ...prev, [idx]: true }))
    try {
      const provider = new JsonRpcProvider(RPC_URL)
      const balWei = await provider.getBalance(address)
      const balEth = formatEther(balWei)
      setWallets(prev =>
        prev.map((w, i) => (i === idx ? { ...w, balance: balEth } : w))
      )
    } catch (err) {
      console.error("Balance fetch error:", err)
      alert("Error fetching balance. Check your RPC URL.")
    } finally {
      setLoadingBalance(prev => ({ ...prev, [idx]: false }))
    }
  }

  // ── Toggle private key visibility ────────────────────────────────────────────
  function togglePrivKey(idx) {
    setShowPrivKey(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // ── Delete a wallet ──────────────────────────────────────────────────────────
  function deleteWallet(idx) {
    setWallets(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h3>⟠ Ethereum Wallets</h3>
        <button className="btn btn-primary" onClick={addWallet}>
          + Add ETH Wallet
        </button>
      </div>

      {wallets.length === 0 && (
        <p className="empty-state">No wallets yet. Click "Add ETH Wallet" to derive your first account.</p>
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

            {/* Address */}
            <div className="wallet-field">
              <label>Address</label>
              <div className="copy-field">
                <span className="address">{w.address}</span>
                <button
                  className="btn-copy"
                  onClick={() => navigator.clipboard.writeText(w.address)}
                  title="Copy address"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Private Key */}
            <div className="wallet-field">
              <label>Private Key</label>
              <div className="copy-field">
                <span className="privkey">
                  {showPrivKey[idx] ? w.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                </span>
                <button
                  className="btn-copy"
                  onClick={() => togglePrivKey(idx)}
                  title={showPrivKey[idx] ? "Hide" : "Show"}
                >
                  {showPrivKey[idx] ? '🙈' : '👁️'}
                </button>
                {showPrivKey[idx] && (
                  <button
                    className="btn-copy"
                    onClick={() => navigator.clipboard.writeText(w.privateKey)}
                    title="Copy"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>

            {/* Balance */}
            <div className="wallet-field balance-field">
              <label>Balance</label>
              <div className="balance-row">
                <span className="balance">
                  {w.balance !== null ? `${parseFloat(w.balance).toFixed(6)} ETH` : '—'}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchBalance(w.address, idx)}
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
