// Lecture Codes 2-4: Complete Client-Side ETH Examples
// Day 21.1 - Client-Side ETH
// This file contains multiple examples for browser-based contract interactions

// ══════════════════════════════════════════════════════════════════════════════
// LECTURE CODE 2: Wagmi Configuration and Setup
// ══════════════════════════════════════════════════════════════════════════════

// File: config/wagmi.ts
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, base, baseSepolia } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [sepolia, baseSepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
})

// ══════════════════════════════════════════════════════════════════════════════
// LECTURE CODE 3: useWriteContract - Writing to Blockchain
// ══════════════════════════════════════════════════════════════════════════════

// File: components/ApproveAndDeposit.tsx
import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'

const USDT_ADDRESS = '0xYourUSDTAddress'
const BRIDGE_ADDRESS = '0xYourBridgeAddress'

const USDT_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ type: 'bool' }]
}]

const BRIDGE_ABI = [{
  name: 'deposit',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'amount', type: 'uint256' }],
  outputs: []
}]

export function ApproveAndDeposit() {
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'approve' | 'deposit' | 'done'>('approve')
  
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  async function handleApprove() {
    writeContract({
      address: USDT_ADDRESS,
      abi: USDT_ABI,
      functionName: 'approve',
      args: [BRIDGE_ADDRESS, parseUnits(amount, 6)]
    })
  }
  
  async function handleDeposit() {
    writeContract({
      address: BRIDGE_ADDRESS,
      abi: BRIDGE_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)]
    })
  }
  
  return (
    <div>
      <h2>Bridge USDT</h2>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      
      {step === 'approve' && (
        <button onClick={handleApprove} disabled={isLoading}>
          {isLoading ? 'Approving...' : 'Approve USDT'}
        </button>
      )}
      
      {step === 'deposit' && (
        <button onClick={handleDeposit} disabled={isLoading}>
          {isLoading ? 'Depositing...' : 'Deposit to Bridge'}
        </button>
      )}
      
      {hash && <div>Transaction: {hash}</div>}
      {isSuccess && <div>Success!</div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LECTURE CODE 4: useReadContract - Reading from Blockchain
// ══════════════════════════════════════════════════════════════════════════════

// File: components/BalanceDisplay.tsx
import { useReadContract, useAccount } from 'wagmi'
import { formatUnits } from 'viem'

const BALANCE_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }]
}]

export function BalanceDisplay() {
  const { address } = useAccount()
  
  // Read USDT balance
  const { data: balance, isLoading } = useReadContract({
    address: USDT_ADDRESS,
    abi: BALANCE_ABI,
    functionName: 'balanceOf',
    args: [address!],
  })
  
  if (isLoading) return <div>Loading balance...</div>
  
  return (
    <div>
      <h3>Your USDT Balance</h3>
      <p>{balance ? formatUnits(balance, 6) : '0'} USDT</p>
    </div>
  )
}

/*
KEY PATTERNS DEMONSTRATED:

1. WAGMI CONFIGURATION:
   - Multi-chain support
   - Multiple wallet connectors
   - HTTP transports for RPC

2. WRITING TO CONTRACTS:
   - useWriteContract for transactions
   - useWaitForTransactionReceipt for confirmation
   - Proper argument parsing with viem

3. READING FROM CONTRACTS:
   - useReadContract for view functions
   - Automatic re-fetching
   - Format display values properly

4. STATE MANAGEMENT:
   - Track transaction steps
   - Handle loading states
   - Show success/error feedback
*/
