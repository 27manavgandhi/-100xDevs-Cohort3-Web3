// Lecture Code - 4_viem_direct.ts
// Topic: Viem — low-level Ethereum client, direct RPC calls without React
// Day 11.1 - Wallets in ETH, Wallet Adapter, Wagmi, TanStack & Viem
//
// npm install viem

// ── What is Viem? ─────────────────────────────────────────────────────────────
//
// Viem is the TypeScript library that sits BELOW Wagmi.
// Wagmi = React hooks  (useAccount, useBalance, useSendTransaction...)
// Viem  = raw client   (getBalance, getBlock, readContract, writeContract...)
//
// You use Viem directly when:
//   - You're NOT in React (Node.js scripts, backend, CLI tools)
//   - You need low-level control over transactions
//   - You want to read/write contracts without hooks
//   - Building scripts or bots

import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  isAddress,
  getAddress,
} from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// ── Public Client — READ operations (no signing needed) ───────────────────────
// createPublicClient: for reading blockchain data
//   getBalance, getBlock, getTransaction, readContract, getLogs...

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
  // For production, use your own RPC:
  // transport: http('https://mainnet.infura.io/v3/YOUR_KEY')
})

// ── Read blockchain data ───────────────────────────────────────────────────────
async function readBlockchainData() {
  // 1. Get ETH balance of any address
  const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const balance = await publicClient.getBalance({ address: vitalikAddress })
  console.log('Vitalik ETH balance:', formatEther(balance), 'ETH')
  console.log('In wei:', balance.toString())

  // 2. Get latest block
  const block = await publicClient.getBlock()
  console.log('Latest block number:', block.number)
  console.log('Block timestamp:', new Date(Number(block.timestamp) * 1000).toISOString())
  console.log('Txs in block:', block.transactions.length)

  // 3. Get transaction count (= nonce) of an address
  const txCount = await publicClient.getTransactionCount({ address: vitalikAddress })
  console.log('Vitalik tx count (nonce):', txCount)

  // 4. Get gas price
  const gasPrice = await publicClient.getGasPrice()
  console.log('Current gas price:', formatEther(gasPrice * 21000n), 'ETH for a simple transfer')

  // 5. Check if an address is a contract or EOA
  // EOA: bytecode = '0x' (empty), Contract: bytecode = deployed code
  const bytecode = await publicClient.getBytecode({ address: vitalikAddress })
  console.log('Is Vitalik a contract?', bytecode !== undefined && bytecode !== '0x')
}

// ── Read a smart contract ──────────────────────────────────────────────────────
// readContract = call a view/pure function on a deployed contract (no gas, no signing)
async function readContract() {
  // USDC contract on mainnet
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

  // Minimal ERC-20 ABI (just the functions we need)
  const erc20Abi = [
    {
      name: 'name',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }],
    },
    {
      name: 'symbol',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string' }],
    },
    {
      name: 'decimals',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint8' }],
    },
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    {
      name: 'totalSupply',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    },
  ] as const

  const name = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'name',
  })

  const symbol = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol',
  })

  const decimals = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals',
  })

  const totalSupply = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'totalSupply',
  })

  console.log('\n=== USDC Contract ===')
  console.log('Name:', name)
  console.log('Symbol:', symbol)
  console.log('Decimals:', decimals)
  console.log('Total Supply:', Number(totalSupply) / 10 ** Number(decimals), symbol)
}

// ── Wallet Client — WRITE operations (signing required) ───────────────────────
// createWalletClient: for sending transactions and signing messages
// In Node.js: use privateKeyToAccount (NEVER hardcode in production!)
// In browser: use window.ethereum (MetaMask)

async function writeExample() {
  // WARNING: In real apps, NEVER hardcode private keys!
  // Use environment variables: process.env.PRIVATE_KEY
  const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY_HERE' as `0x${string}`)

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  })

  // Sign a message (no gas cost, no on-chain tx)
  const signature = await walletClient.signMessage({
    message: 'Hello from Viem!',
  })
  console.log('Signature:', signature)

  // Send ETH
  const hash = await walletClient.sendTransaction({
    to: '0xRecipientAddress' as `0x${string}`,
    value: parseEther('0.001'), // 0.001 ETH
  })
  console.log('TX Hash:', hash)

  // Wait for confirmation using publicClient
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('Confirmed in block:', receipt.blockNumber)
}

// ── Viem utility functions ─────────────────────────────────────────────────────
function utilityDemo() {
  // isAddress — validate Ethereum addresses
  console.log(isAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')) // true
  console.log(isAddress('not-an-address'))  // false

  // getAddress — normalize to checksum address (EIP-55)
  const checksummed = getAddress('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  console.log('Checksummed:', checksummed)
  // 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

  // parseEther / formatEther
  const oneEth = parseEther('1')   // 1000000000000000000n
  console.log('1 ETH in wei:', oneEth)
  console.log('Back to ETH:', formatEther(oneEth)) // '1.0'
}

// Run demos
readBlockchainData().catch(console.error)
readContract().catch(console.error)
utilityDemo()

/*
KEY CONCEPTS:
- publicClient  → READ-ONLY operations (no private key needed)
  → getBalance, getBlock, getTransaction, readContract, getLogs
- walletClient  → WRITE operations (requires private key or MetaMask)
  → sendTransaction, signMessage, writeContract
- Wagmi hooks (useBalance, useSendTransaction) are wrappers around these Viem clients
- formatEther(bigint) → human-readable ETH string
- parseEther(string)  → BigInt in wei (ALWAYS use for ETH math!)
- isAddress(string)   → validate any ETH address
- readContract()      → call view/pure functions (free, no gas)
- writeContract()     → call state-changing functions (costs gas)
*/
