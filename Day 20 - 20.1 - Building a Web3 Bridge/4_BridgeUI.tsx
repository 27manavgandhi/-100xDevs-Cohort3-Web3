// Lecture Code - 4_BridgeUI.tsx
// Topic: Complete React Frontend for Web3 Bridge
// Day 20.1 - Building a Web3 Bridge
//
// To run: npm run dev
// Prerequisites: npm install ethers react

// ══════════════════════════════════════════════════════════════════════════════
// WHAT IS THIS COMPONENT?
// ══════════════════════════════════════════════════════════════════════════════

/**
 * BridgeUI is a complete React component for bridging tokens between chains.
 * 
 * Real-Life Analogy: ATM Machine Interface
 *   - Shows your balance
 *   - Lets you enter amount
 *   - Confirms transaction
 *   - Shows transfer status
 *   - Displays transaction history
 * 
 * Features:
 *   1. Wallet connection (MetaMask)
 *   2. Network switching
 *   3. Token approval
 *   4. Lock tokens (Ethereum → Base)
 *   5. Burn tokens (Base → Ethereum)
 *   6. Real-time status updates
 *   7. Transaction history
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// ── Configuration ─────────────────────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const BASE_SEPOLIA_CHAIN_ID = '0x14a34'; // 84532 in hex

const CONTRACTS = {
    sepolia: {
        usdt: '0x...', // USDT address on Sepolia
        bridge: '0x...', // BridgeETH address
    },
    baseSepolia: {
        busdt: '0x...', // BUSDT address on Base Sepolia
        bridge: '0x...', // BridgeBase address
    }
};

// ── Contract ABIs (simplified) ────────────────────────────────────────────────

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
];

const BRIDGE_ETH_ABI = [
    'function lockTokens(uint256 amount) external returns (bytes32)',
    'function getLockedBalance(address user) external view returns (uint256)',
];

const BRIDGE_BASE_ABI = [
    'function burnTokens(uint256 amount) external returns (bytes32)',
    'function getBurnedBalance(address user) external view returns (uint256)',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transfer {
    id: string;
    direction: 'eth-to-base' | 'base-to-eth';
    amount: string;
    status: 'pending' | 'completed' | 'failed';
    timestamp: number;
    txHash?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE UI COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function BridgeUI() {
    
    // ── State Variables ───────────────────────────────────────────────────────
    
    const [account, setAccount] = useState<string>('');
    const [chainId, setChainId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [balance, setBalance] = useState<string>('0');
    const [status, setStatus] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    
    // ── Connect Wallet ────────────────────────────────────────────────────────
    
    /**
     * Connect to MetaMask wallet
     */
    async function connectWallet() {
        try {
            if (!window.ethereum) {
                alert('Please install MetaMask!');
                return;
            }
            
            setStatus('Connecting wallet...');
            
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            setAccount(accounts[0]);
            
            // Get current chain ID
            const chain = await window.ethereum.request({
                method: 'eth_chainId'
            });
            
            setChainId(chain);
            
            setStatus('Wallet connected!');
            
            // Load balance
            await loadBalance(accounts[0], chain);
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
            setStatus('Failed to connect wallet');
        }
    }
    
    // ── Load Balance ──────────────────────────────────────────────────────────
    
    /**
     * Load user's token balance
     */
    async function loadBalance(address: string, chain: string) {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            let tokenAddress: string;
            
            if (chain === SEPOLIA_CHAIN_ID) {
                tokenAddress = CONTRACTS.sepolia.usdt;
            } else if (chain === BASE_SEPOLIA_CHAIN_ID) {
                tokenAddress = CONTRACTS.baseSepolia.busdt;
            } else {
                setBalance('0');
                return;
            }
            
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const bal = await token.balanceOf(address);
            
            setBalance(ethers.formatUnits(bal, 6)); // USDT has 6 decimals
            
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    }
    
    // ── Switch Network ────────────────────────────────────────────────────────
    
    /**
     * Switch to specified network
     */
    async function switchNetwork(targetChainId: string) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChainId }],
            });
            
            setChainId(targetChainId);
            await loadBalance(account, targetChainId);
            
        } catch (error: any) {
            // Chain not added to MetaMask
            if (error.code === 4902) {
                alert('Please add this network to MetaMask');
            }
            console.error('Error switching network:', error);
        }
    }
    
    // ── Bridge to Base ────────────────────────────────────────────────────────
    
    /**
     * Bridge tokens from Ethereum to Base
     */
    async function bridgeToBase() {
        try {
            // Validation
            if (!amount || parseFloat(amount) <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            if (chainId !== SEPOLIA_CHAIN_ID) {
                await switchNetwork(SEPOLIA_CHAIN_ID);
                return;
            }
            
            setIsLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // ── Step 1: Approve ───────────────────────────────────────────────
            
            setStatus('Approving tokens...');
            
            const token = new ethers.Contract(
                CONTRACTS.sepolia.usdt,
                ERC20_ABI,
                signer
            );
            
            const amountWei = ethers.parseUnits(amount, 6);
            
            // Check current allowance
            const currentAllowance = await token.allowance(account, CONTRACTS.sepolia.bridge);
            
            if (currentAllowance < amountWei) {
                const approveTx = await token.approve(
                    CONTRACTS.sepolia.bridge,
                    amountWei
                );
                
                setStatus('Waiting for approval...');
                await approveTx.wait();
            }
            
            // ── Step 2: Lock Tokens ───────────────────────────────────────────
            
            setStatus('Locking tokens...');
            
            const bridge = new ethers.Contract(
                CONTRACTS.sepolia.bridge,
                BRIDGE_ETH_ABI,
                signer
            );
            
            const lockTx = await bridge.lockTokens(amountWei);
            
            setStatus('Waiting for confirmation...');
            const receipt = await lockTx.wait();
            
            // ── Step 3: Get Transfer ID ───────────────────────────────────────
            
            // Parse events to get transferId
            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = bridge.interface.parseLog(log);
                    return parsed?.name === 'TokensLocked';
                } catch {
                    return false;
                }
            });
            
            let transferId = '';
            if (event) {
                const parsed = bridge.interface.parseLog(event);
                transferId = parsed?.args.transferId;
            }
            
            // ── Step 4: Track Status ──────────────────────────────────────────
            
            setStatus(`Bridging... Transfer ID: ${transferId}`);
            
            // Add to transfers list
            const newTransfer: Transfer = {
                id: transferId,
                direction: 'eth-to-base',
                amount,
                status: 'pending',
                timestamp: Date.now(),
                txHash: lockTx.hash
            };
            
            setTransfers(prev => [newTransfer, ...prev]);
            
            // Poll for completion
            await pollTransferStatus(transferId);
            
            // Update UI
            setAmount('');
            await loadBalance(account, chainId);
            setStatus('✅ Bridge complete!');
            
        } catch (error) {
            console.error('Error bridging to Base:', error);
            setStatus('❌ Bridge failed');
        } finally {
            setIsLoading(false);
        }
    }
    
    // ── Bridge to Ethereum ────────────────────────────────────────────────────
    
    /**
     * Bridge tokens from Base to Ethereum
     */
    async function bridgeToEthereum() {
        try {
            // Validation
            if (!amount || parseFloat(amount) <= 0) {
                alert('Please enter a valid amount');
                return;
            }
            
            if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
                await switchNetwork(BASE_SEPOLIA_CHAIN_ID);
                return;
            }
            
            setIsLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // ── Step 1: Burn Tokens ───────────────────────────────────────────
            
            setStatus('Burning tokens...');
            
            const bridge = new ethers.Contract(
                CONTRACTS.baseSepolia.bridge,
                BRIDGE_BASE_ABI,
                signer
            );
            
            const amountWei = ethers.parseUnits(amount, 6);
            const burnTx = await bridge.burnTokens(amountWei);
            
            setStatus('Waiting for confirmation...');
            const receipt = await burnTx.wait();
            
            // ── Step 2: Get Burn ID ───────────────────────────────────────────
            
            const event = receipt.logs.find((log: any) => {
                try {
                    const parsed = bridge.interface.parseLog(log);
                    return parsed?.name === 'TokensBurned';
                } catch {
                    return false;
                }
            });
            
            let burnId = '';
            if (event) {
                const parsed = bridge.interface.parseLog(event);
                burnId = parsed?.args.burnId;
            }
            
            // ── Step 3: Track Status ──────────────────────────────────────────
            
            setStatus(`Releasing tokens... Burn ID: ${burnId}`);
            
            // Add to transfers list
            const newTransfer: Transfer = {
                id: burnId,
                direction: 'base-to-eth',
                amount,
                status: 'pending',
                timestamp: Date.now(),
                txHash: burnTx.hash
            };
            
            setTransfers(prev => [newTransfer, ...prev]);
            
            // Poll for completion
            await pollBurnStatus(burnId);
            
            // Update UI
            setAmount('');
            await loadBalance(account, chainId);
            setStatus('✅ Bridge complete!');
            
        } catch (error) {
            console.error('Error bridging to Ethereum:', error);
            setStatus('❌ Bridge failed');
        } finally {
            setIsLoading(false);
        }
    }
    
    // ── Poll Transfer Status ──────────────────────────────────────────────────
    
    /**
     * Poll backend API for transfer status
     */
    async function pollTransferStatus(transferId: string) {
        return new Promise<void>((resolve) => {
            const interval = setInterval(async () => {
                try {
                    const response = await fetch(`http://localhost:3000/api/transfer/${transferId}`);
                    const data = await response.json();
                    
                    if (data.status === 'completed') {
                        // Update transfers list
                        setTransfers(prev =>
                            prev.map(t =>
                                t.id === transferId
                                    ? { ...t, status: 'completed' }
                                    : t
                            )
                        );
                        
                        clearInterval(interval);
                        resolve();
                    } else if (data.status === 'failed') {
                        setTransfers(prev =>
                            prev.map(t =>
                                t.id === transferId
                                    ? { ...t, status: 'failed' }
                                    : t
                            )
                        );
                        
                        clearInterval(interval);
                        resolve();
                    }
                } catch (error) {
                    console.error('Error polling status:', error);
                }
            }, 5000); // Check every 5 seconds
            
            // Timeout after 10 minutes
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 10 * 60 * 1000);
        });
    }
    
    /**
     * Poll backend API for burn status
     */
    async function pollBurnStatus(burnId: string) {
        // Similar to pollTransferStatus
        return pollTransferStatus(burnId); // Reuse same logic
    }
    
    // ── Effects ───────────────────────────────────────────────────────────────
    
    useEffect(() => {
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                setAccount(accounts[0] || '');
                if (accounts[0]) {
                    loadBalance(accounts[0], chainId);
                }
            });
            
            window.ethereum.on('chainChanged', (chain: string) => {
                setChainId(chain);
                if (account) {
                    loadBalance(account, chain);
                }
            });
        }
    }, [account, chainId]);
    
    // ── Render ────────────────────────────────────────────────────────────────
    
    return (
        <div className="bridge-container">
            <h1>🌉 Cross-Chain Bridge</h1>
            
            {/* Wallet Connection */}
            {!account ? (
                <button onClick={connectWallet} className="connect-button">
                    Connect Wallet
                </button>
            ) : (
                <div className="wallet-info">
                    <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
                    <p>Balance: {balance} {chainId === SEPOLIA_CHAIN_ID ? 'USDT' : 'BUSDT'}</p>
                </div>
            )}
            
            {/* Network Display */}
            {account && (
                <div className="network-info">
                    <p>Network: {
                        chainId === SEPOLIA_CHAIN_ID ? 'Ethereum Sepolia' :
                        chainId === BASE_SEPOLIA_CHAIN_ID ? 'Base Sepolia' :
                        'Unknown'
                    }</p>
                </div>
            )}
            
            {/* Bridge Interface */}
            {account && (
                <div className="bridge-form">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        disabled={isLoading}
                    />
                    
                    <div className="button-group">
                        <button
                            onClick={bridgeToBase}
                            disabled={isLoading || chainId !== SEPOLIA_CHAIN_ID}
                        >
                            Bridge to Base →
                        </button>
                        
                        <button
                            onClick={bridgeToEthereum}
                            disabled={isLoading || chainId !== BASE_SEPOLIA_CHAIN_ID}
                        >
                            ← Bridge to Ethereum
                        </button>
                    </div>
                    
                    {status && <p className="status">{status}</p>}
                </div>
            )}
            
            {/* Transfer History */}
            {transfers.length > 0 && (
                <div className="transfer-history">
                    <h2>Recent Transfers</h2>
                    {transfers.map(transfer => (
                        <div key={transfer.id} className="transfer-item">
                            <p>
                                {transfer.direction === 'eth-to-base' ? '→' : '←'} {transfer.amount} USDT
                            </p>
                            <p className={`status-${transfer.status}`}>
                                {transfer.status}
                            </p>
                            <p className="timestamp">
                                {new Date(transfer.timestamp).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/*
KEY CONCEPTS:
- BROWSER PROVIDER = Ethers.js connection to MetaMask
- SIGNER = Wallet that can sign transactions
- ALLOWANCE = Permission for contract to spend tokens
- TRANSACTION RECEIPT = Confirmation and logs from transaction
- EVENT PARSING = Extracting data from transaction logs
- POLLING = Periodically checking for status updates
- CHAIN ID = Unique identifier for blockchain network
- STATE MANAGEMENT = React hooks for UI state
- ASYNC/AWAIT = Handling asynchronous operations
- ERROR HANDLING = Try/catch for robust error management
*/
