// Lecture Code - 2_wagmi_hooks.tsx
// Topic: Core Wagmi hooks — useAccount, useBalance, useConnect, useDisconnect
// Day 11.1 - Wallets in ETH, Wallet Adapter, Wagmi, TanStack & Viem

import { useAccount, useBalance, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { formatEther } from 'viem'

// ── useAccount — who is connected? ───────────────────────────────────────────
// Returns: address, isConnected, isConnecting, isDisconnected, chain, connector
export function WalletInfo() {
  const {
    address,        // '0x1234...' | undefined
    isConnected,    // true when wallet is connected
    isConnecting,   // true during connection attempt
    isDisconnected, // true when no wallet connected
    chain,          // current chain object { id, name, ... }
    connector,      // which connector is active (MetaMask, Coinbase, etc.)
  } = useAccount()

  if (isConnecting) return <p>Connecting...</p>
  if (isDisconnected) return <p>No wallet connected</p>

  return (
    <div>
      <h3>Connected Wallet</h3>
      <p>Address: {address}</p>
      <p>Chain: {chain?.name} (ID: {chain?.id})</p>
      <p>Connector: {connector?.name}</p>
    </div>
  )
}

// ── useBalance — how much ETH does the connected wallet have? ─────────────────
// Works for native ETH AND ERC-20 tokens (pass `token` address for ERC-20)
export function WalletBalance() {
  const { address } = useAccount()

  // Native ETH balance
  const {
    data: ethBalance,
    isLoading,
    isError
  } = useBalance({
    address,          // whose balance to fetch
    // token: '0xA0b...' ← add this for ERC-20 token balance
  })

  if (!address) return <p>Connect wallet to see balance</p>
  if (isLoading) return <p>Loading balance...</p>
  if (isError) return <p>Error fetching balance</p>

  return (
    <div>
      <h3>Balance</h3>
      {/* ethBalance.value = BigInt in wei, .formatted = human-readable string */}
      <p>{ethBalance?.formatted} {ethBalance?.symbol}</p>
      <p>In Wei: {ethBalance?.value?.toString()}</p>
    </div>
  )
}

// ── useConnect — show wallet options and connect ──────────────────────────────
// connectors = list of available connectors from your wagmi config
// connect({ connector }) = triggers the wallet popup
export function ConnectWallet() {
  const { connect, connectors, isPending, error } = useConnect()
  const { isConnected } = useAccount()

  if (isConnected) return null // hide if already connected

  return (
    <div>
      <h3>Connect Wallet</h3>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
        >
          {isPending ? 'Connecting...' : `Connect ${connector.name}`}
        </button>
      ))}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
    </div>
  )
}

// ── useDisconnect — disconnect the wallet ─────────────────────────────────────
export function DisconnectWallet() {
  const { disconnect } = useDisconnect()
  const { isConnected, address } = useAccount()

  if (!isConnected) return null

  return (
    <div>
      <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}

// ── useSwitchChain — switch between networks ──────────────────────────────────
export function ChainSwitcher() {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  return (
    <div>
      <p>Current Chain ID: {chainId}</p>
      <button
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isPending || chainId === sepolia.id}
      >
        Switch to Sepolia Testnet
      </button>
      <button
        onClick={() => switchChain({ chainId: mainnet.id })}
        disabled={isPending || chainId === mainnet.id}
      >
        Switch to Mainnet
      </button>
    </div>
  )
}

// ── Full Wallet Dashboard component ───────────────────────────────────────────
export function WalletDashboard() {
  const { isConnected } = useAccount()

  return (
    <div style={{ padding: 20 }}>
      <h2>ETH Wallet Dashboard</h2>
      {!isConnected ? (
        <ConnectWallet />
      ) : (
        <>
          <WalletInfo />
          <WalletBalance />
          <ChainSwitcher />
          <DisconnectWallet />
        </>
      )}
    </div>
  )
}

export default WalletDashboard

/*
KEY HOOKS SUMMARY:
  useAccount()         → { address, isConnected, chain, connector }
  useBalance()         → { data: { value, formatted, symbol }, isLoading }
  useConnect()         → { connect, connectors, isPending }
  useDisconnect()      → { disconnect }
  useChainId()         → current chain ID (number)
  useSwitchChain()     → { switchChain, isPending }

All hooks automatically:
  - Re-render when wallet state changes
  - Handle loading/error states
  - Cache results via TanStack Query
  - Update when chain/account changes
*/
