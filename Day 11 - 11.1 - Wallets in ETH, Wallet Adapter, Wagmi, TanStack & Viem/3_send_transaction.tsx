// Lecture Code - 3_send_transaction.tsx
// Topic: useSendTransaction — send ETH with Wagmi + Viem
// Day 11.1 - Wallets in ETH, Wallet Adapter, Wagmi, TanStack & Viem

import { useState } from 'react'
import { useSendTransaction, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther, isAddress } from 'viem'

// ── useSendTransaction ────────────────────────────────────────────────────────
// sendTransaction({ to, value }) → triggers MetaMask popup for user to approve
// Returns: hash (tx hash), isPending, isSuccess, isError
//
// useWaitForTransactionReceipt → polls until tx is mined
// Returns: receipt, isLoading (mining), isSuccess (mined)

export function SendETH() {
  const { isConnected } = useAccount()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState('')

  // Step 1: Send the transaction (triggers wallet popup)
  const {
    sendTransaction,
    data: txHash,
    isPending,     // waiting for user to approve in wallet
    isError,
    error,
    reset,
  } = useSendTransaction()

  // Step 2: Wait for the transaction to be mined
  const {
    isLoading: isConfirming,   // tx is in mempool, waiting for block
    isSuccess: isConfirmed,    // tx has been included in a block
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash })

  function validate() {
    if (!isAddress(to)) {
      setValidationError('Invalid Ethereum address')
      return false
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setValidationError('Enter a valid amount')
      return false
    }
    setValidationError('')
    return true
  }

  function handleSend() {
    if (!validate()) return

    // parseEther converts "0.01" → BigInt(10000000000000000) wei
    sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(amount),
    })
  }

  function handleReset() {
    reset()
    setTo('')
    setAmount('')
  }

  if (!isConnected) {
    return <p>Connect your wallet first</p>
  }

  return (
    <div style={{ padding: 20 }}>
      <h3>Send ETH</h3>

      <input
        value={to}
        onChange={e => setTo(e.target.value)}
        placeholder="Recipient address (0x...)"
        style={{ display: 'block', width: 400, marginBottom: 8 }}
      />
      <input
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Amount in ETH (e.g. 0.01)"
        style={{ display: 'block', width: 200, marginBottom: 8 }}
      />

      {validationError && <p style={{ color: 'red' }}>{validationError}</p>}

      <button onClick={handleSend} disabled={isPending || isConfirming}>
        {isPending ? '⏳ Waiting for approval...' : isConfirming ? '⛏ Mining...' : 'Send ETH'}
      </button>

      {/* Transaction flow states */}
      {txHash && (
        <div style={{ marginTop: 16 }}>
          <p>📤 TX Hash: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank">{txHash.slice(0, 20)}...</a></p>
        </div>
      )}

      {isConfirming && <p>⛏️ Waiting for block confirmation...</p>}

      {isConfirmed && (
        <div>
          <p>✅ Transaction confirmed!</p>
          <p>Block: {receipt?.blockNumber?.toString()}</p>
          <p>Gas used: {receipt?.gasUsed?.toString()}</p>
          <button onClick={handleReset}>Send Another</button>
        </div>
      )}

      {isError && (
        <div>
          <p style={{ color: 'red' }}>❌ Error: {error?.message}</p>
          <button onClick={handleReset}>Try Again</button>
        </div>
      )}
    </div>
  )
}

// ── Transaction State Machine ─────────────────────────────────────────────────
/*
  idle
    ↓ user clicks "Send"
  isPending = true  (wallet popup open, waiting for user approval)
    ↓ user approves in MetaMask
  txHash available  (tx broadcast to network)
    ↓
  isConfirming = true  (tx in mempool, waiting to be mined)
    ↓
  isConfirmed = true  (tx included in a block, receipt available)

  At any point → isError = true if something goes wrong
  (user rejects, insufficient gas, network error, etc.)
*/

// ── parseEther vs parseUnits ──────────────────────────────────────────────────
/*
  parseEther("1")        → 1000000000000000000n  (1 ETH in wei)
  parseEther("0.01")     → 10000000000000000n    (0.01 ETH in wei)
  parseUnits("100", 6)   → 100000000n            (100 USDC, 6 decimals)
  formatEther(bigint)    → "1.0"                 (wei → ETH string)
  formatUnits(bigint, 6) → "100.0"               (USDC raw → decimal)

  Always use parseEther/parseUnits — NEVER use floating point math with ETH!
  0.1 + 0.2 = 0.30000000000000004 in JS → wrong on-chain values
*/

export default SendETH
