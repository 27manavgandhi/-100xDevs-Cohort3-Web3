// Lecture Code - 3_bridge_operator.ts
// Topic: Complete Bridge Operator Service
// Day 20.1 - Building a Web3 Bridge
//
// To run: ts-node src/bridge_operator.ts
// Prerequisites: npm install ethers mongoose dotenv

// ══════════════════════════════════════════════════════════════════════════════
// WHAT IS A BRIDGE OPERATOR?
// ══════════════════════════════════════════════════════════════════════════════

/**
 * The Bridge Operator is the "brain" of the bridge system.
 * It connects the two blockchains and processes transfers automatically.
 * 
 * Real-Life Analogy: International Money Transfer Service
 *   - You deposit money at Bank A
 *   - Transfer service (operator) sees the deposit
 *   - Transfer service instructs Bank B to give you equivalent currency
 *   - When you return currency to Bank B, service tells Bank A to return original
 * 
 * What it does:
 *   1. LISTEN: Monitor events on both Ethereum and Base
 *   2. VALIDATE: Verify transfers are legitimate
 *   3. PROCESS: Trigger minting or releasing on destination chain
 *   4. TRACK: Store all transfers in database
 *   5. RECOVER: Handle failures and retry
 *   6. MONITOR: Check health and alert on issues
 */

import { ethers } from 'ethers';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ── Configuration ─────────────────────────────────────────────────────────────

const config = {
    // RPC URLs
    ethRpc: process.env.ETH_RPC || 'https://sepolia.infura.io/v3/YOUR_KEY',
    baseRpc: process.env.BASE_RPC || 'https://base-sepolia.g.alchemy.com/v2/YOUR_KEY',
    
    // Contract addresses
    ethBridgeAddress: process.env.ETH_BRIDGE_ADDRESS || '',
    baseBridgeAddress: process.env.BASE_BRIDGE_ADDRESS || '',
    
    // Operator wallet
    operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY || '',
    
    // Database
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/bridge',
    
    // Confirmations to wait
    ethConfirmations: 3,
    baseConfirmations: 3,
    
    // Health check interval (5 minutes)
    healthCheckInterval: 5 * 60 * 1000,
};

// ── Database Models ───────────────────────────────────────────────────────────

/**
 * Transfer Model - Tracks Ethereum → Base transfers
 */
const transferSchema = new mongoose.Schema({
    transferId: { type: String, required: true, unique: true },
    user: { type: String, required: true },
    amount: { type: String, required: true },
    status: {
        type: String,
        enum: ['locked', 'minting', 'completed', 'failed'],
        default: 'locked'
    },
    lockTxHash: { type: String, required: true },
    mintTxHash: { type: String },
    sourceChain: { type: String, default: 'ethereum' },
    destChain: { type: String, default: 'base' },
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

const Transfer = mongoose.model('Transfer', transferSchema);

/**
 * Burn Model - Tracks Base → Ethereum returns
 */
const burnSchema = new mongoose.Schema({
    burnId: { type: String, required: true, unique: true },
    user: { type: String, required: true },
    amount: { type: String, required: true },
    status: {
        type: String,
        enum: ['burned', 'releasing', 'completed', 'failed'],
        default: 'burned'
    },
    burnTxHash: { type: String, required: true },
    releaseTxHash: { type: String },
    sourceChain: { type: String, default: 'base' },
    destChain: { type: String, default: 'ethereum' },
    error: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

const Burn = mongoose.model('Burn', burnSchema);

// ── Contract ABIs (simplified) ────────────────────────────────────────────────

const BRIDGE_ETH_ABI = [
    'event TokensLocked(address indexed user, uint256 amount, uint256 timestamp, bytes32 indexed transferId)',
    'event TokensReleased(address indexed user, uint256 amount, bytes32 indexed burnTxHash, uint256 timestamp)',
    'function releaseTokens(address user, uint256 amount, bytes32 burnTxHash) external'
];

const BRIDGE_BASE_ABI = [
    'event TokensMinted(address indexed user, uint256 amount, bytes32 indexed transferId, uint256 timestamp)',
    'event TokensBurned(address indexed user, uint256 amount, bytes32 indexed burnId, uint256 timestamp)',
    'function mintTokens(address user, uint256 amount, bytes32 transferId) external'
];

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE OPERATOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

class BridgeOperator {
    private ethProvider: ethers.JsonRpcProvider;
    private baseProvider: ethers.JsonRpcProvider;
    private ethBridge: ethers.Contract;
    private baseBridge: ethers.Contract;
    private wallet: ethers.Wallet;
    private isRunning: boolean = false;
    
    constructor() {
        console.log('🔧 Initializing Bridge Operator...');
        
        // Initialize providers
        this.ethProvider = new ethers.JsonRpcProvider(config.ethRpc);
        this.baseProvider = new ethers.JsonRpcProvider(config.baseRpc);
        
        // Initialize wallet
        this.wallet = new ethers.Wallet(config.operatorPrivateKey);
        
        // Initialize contracts with wallet signers
        this.ethBridge = new ethers.Contract(
            config.ethBridgeAddress,
            BRIDGE_ETH_ABI,
            this.wallet.connect(this.ethProvider)
        );
        
        this.baseBridge = new ethers.Contract(
            config.baseBridgeAddress,
            BRIDGE_BASE_ABI,
            this.wallet.connect(this.baseProvider)
        );
        
        console.log('✅ Operator initialized');
        console.log(`   Operator address: ${this.wallet.address}`);
    }
    
    /**
     * Start the bridge operator service
     */
    async start() {
        try {
            // Connect to database
            console.log('📊 Connecting to database...');
            await mongoose.connect(config.mongoUri);
            console.log('✅ Database connected');
            
            // Verify wallet has funds
            await this.checkBalances();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start health check
            this.startHealthCheck();
            
            this.isRunning = true;
            console.log('🌉 Bridge Operator is now running!');
            console.log('   Listening for events on both chains...');
            
        } catch (error) {
            console.error('❌ Failed to start operator:', error);
            process.exit(1);
        }
    }
    
    /**
     * Set up event listeners for both chains
     */
    private setupEventListeners() {
        console.log('👂 Setting up event listeners...');
        
        // ── Listen for TokensLocked on Ethereum ───────────────────────────────
        
        this.ethBridge.on(
            'TokensLocked',
            async (user, amount, timestamp, transferId, event) => {
                console.log('\n🔒 TokensLocked Event Detected!');
                console.log(`   User: ${user}`);
                console.log(`   Amount: ${ethers.formatUnits(amount, 6)} USDT`);
                console.log(`   Transfer ID: ${transferId}`);
                
                await this.handleTokensLocked(user, amount, timestamp, transferId, event);
            }
        );
        
        // ── Listen for TokensBurned on Base ───────────────────────────────────
        
        this.baseBridge.on(
            'TokensBurned',
            async (user, amount, burnId, timestamp, event) => {
                console.log('\n🔥 TokensBurned Event Detected!');
                console.log(`   User: ${user}`);
                console.log(`   Amount: ${ethers.formatUnits(amount, 6)} BUSDT`);
                console.log(`   Burn ID: ${burnId}`);
                
                await this.handleTokensBurned(user, amount, burnId, timestamp, event);
            }
        );
        
        console.log('✅ Event listeners active');
    }
    
    /**
     * Handle TokensLocked event (Ethereum → Base)
     */
    private async handleTokensLocked(
        user: string,
        amount: bigint,
        timestamp: bigint,
        transferId: string,
        event: ethers.Log
    ) {
        try {
            // Check if already processed
            const existing = await Transfer.findOne({ transferId });
            if (existing) {
                console.log('⚠️  Transfer already in database, skipping');
                return;
            }
            
            // Save to database
            const transfer = new Transfer({
                transferId,
                user,
                amount: amount.toString(),
                status: 'locked',
                lockTxHash: event.transactionHash
            });
            await transfer.save();
            console.log('💾 Transfer saved to database');
            
            // Wait for confirmations
            console.log(`⏳ Waiting for ${config.ethConfirmations} confirmations...`);
            await this.waitForConfirmations(
                this.ethProvider,
                event.transactionHash,
                config.ethConfirmations
            );
            console.log('✅ Confirmations received');
            
            // Update status
            transfer.status = 'minting';
            await transfer.save();
            
            // Mint on Base
            console.log('🏭 Minting tokens on Base...');
            const tx = await this.baseBridge.mintTokens(user, amount, transferId);
            console.log(`   Tx submitted: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`✅ Tokens minted! Block: ${receipt.blockNumber}`);
            
            // Update database
            transfer.status = 'completed';
            transfer.mintTxHash = tx.hash;
            transfer.completedAt = new Date();
            await transfer.save();
            
            console.log('🎉 Transfer completed successfully!');
            
        } catch (error) {
            console.error('❌ Error processing lock:', error);
            
            // Update database with error
            await Transfer.updateOne(
                { transferId },
                { status: 'failed', error: (error as Error).message }
            );
        }
    }
    
    /**
     * Handle TokensBurned event (Base → Ethereum)
     */
    private async handleTokensBurned(
        user: string,
        amount: bigint,
        burnId: string,
        timestamp: bigint,
        event: ethers.Log
    ) {
        try {
            // Check if already processed
            const existing = await Burn.findOne({ burnId });
            if (existing) {
                console.log('⚠️  Burn already in database, skipping');
                return;
            }
            
            // Save to database
            const burn = new Burn({
                burnId,
                user,
                amount: amount.toString(),
                status: 'burned',
                burnTxHash: event.transactionHash
            });
            await burn.save();
            console.log('💾 Burn saved to database');
            
            // Wait for confirmations
            console.log(`⏳ Waiting for ${config.baseConfirmations} confirmations...`);
            await this.waitForConfirmations(
                this.baseProvider,
                event.transactionHash,
                config.baseConfirmations
            );
            console.log('✅ Confirmations received');
            
            // Update status
            burn.status = 'releasing';
            await burn.save();
            
            // Release on Ethereum
            console.log('🔓 Releasing tokens on Ethereum...');
            const tx = await this.ethBridge.releaseTokens(user, amount, burnId);
            console.log(`   Tx submitted: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`✅ Tokens released! Block: ${receipt.blockNumber}`);
            
            // Update database
            burn.status = 'completed';
            burn.releaseTxHash = tx.hash;
            burn.completedAt = new Date();
            await burn.save();
            
            console.log('🎉 Burn completed successfully!');
            
        } catch (error) {
            console.error('❌ Error processing burn:', error);
            
            // Update database with error
            await Burn.updateOne(
                { burnId },
                { status: 'failed', error: (error as Error).message }
            );
        }
    }
    
    /**
     * Wait for transaction confirmations
     */
    private async waitForConfirmations(
        provider: ethers.JsonRpcProvider,
        txHash: string,
        confirmations: number
    ): Promise<void> {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
            throw new Error('Transaction not found');
        }
        
        const currentBlock = await provider.getBlockNumber();
        const confirmationsReceived = currentBlock - receipt.blockNumber + 1;
        
        if (confirmationsReceived >= confirmations) {
            return; // Already confirmed
        }
        
        // Wait for remaining confirmations
        return new Promise((resolve) => {
            const checkConfirmations = async () => {
                const latest = await provider.getBlockNumber();
                const confirmed = latest - receipt.blockNumber + 1;
                
                if (confirmed >= confirmations) {
                    resolve();
                } else {
                    setTimeout(checkConfirmations, 5000); // Check every 5 seconds
                }
            };
            checkConfirmations();
        });
    }
    
    /**
     * Check operator wallet balances
     */
    private async checkBalances() {
        const ethBalance = await this.ethProvider.getBalance(this.wallet.address);
        const baseBalance = await this.baseProvider.getBalance(this.wallet.address);
        
        console.log('\n💰 Operator Balances:');
        console.log(`   Ethereum: ${ethers.formatEther(ethBalance)} ETH`);
        console.log(`   Base: ${ethers.formatEther(baseBalance)} ETH`);
        
        // Warn if low
        const minBalance = ethers.parseEther('0.1');
        if (ethBalance < minBalance) {
            console.warn('⚠️  WARNING: Low ETH balance on Ethereum!');
        }
        if (baseBalance < minBalance) {
            console.warn('⚠️  WARNING: Low ETH balance on Base!');
        }
    }
    
    /**
     * Start periodic health checks
     */
    private startHealthCheck() {
        setInterval(async () => {
            try {
                await this.healthCheck();
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, config.healthCheckInterval);
    }
    
    /**
     * Perform health check
     */
    private async healthCheck() {
        console.log('\n🏥 Health Check...');
        
        // Check balances
        await this.checkBalances();
        
        // Check pending transfers
        const pendingTransfers = await Transfer.countDocuments({
            status: { $in: ['locked', 'minting'] }
        });
        
        const pendingBurns = await Burn.countDocuments({
            status: { $in: ['burned', 'releasing'] }
        });
        
        console.log(`   Pending transfers: ${pendingTransfers}`);
        console.log(`   Pending burns: ${pendingBurns}`);
        
        if (pendingTransfers > 10) {
            console.warn('⚠️  WARNING: High number of pending transfers!');
        }
        
        if (pendingBurns > 10) {
            console.warn('⚠️  WARNING: High number of pending burns!');
        }
        
        console.log('✅ Health check complete\n');
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('\n🛑 Shutting down...');
        this.isRunning = false;
        
        // Remove event listeners
        this.ethBridge.removeAllListeners();
        this.baseBridge.removeAllListeners();
        
        // Close database
        await mongoose.disconnect();
        
        console.log('✅ Shutdown complete');
        process.exit(0);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// START THE SERVICE
// ══════════════════════════════════════════════════════════════════════════════

const operator = new BridgeOperator();

// Start operator
operator.start().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

// Handle shutdown signals
process.on('SIGINT', () => operator.shutdown());
process.on('SIGTERM', () => operator.shutdown());

/*
KEY CONCEPTS:
- EVENT LISTENER = Function that triggers when blockchain event occurs
- CONFIRMATION = Number of blocks after transaction for finality
- DATABASE PERSISTENCE = Storing state in MongoDB for recovery
- RETRY LOGIC = Handling failures and retrying operations
- HEALTH CHECK = Periodic monitoring of system status
- GRACEFUL SHUTDOWN = Clean exit on termination signals
- PROVIDER = Connection to blockchain RPC endpoint
- SIGNER = Wallet that can sign and send transactions
- TRANSACTION RECEIPT = Confirmation of transaction execution
- BLOCK NUMBER = Height of blockchain at specific point
- GAS PRICE = Fee paid for transaction execution
- NONCE = Transaction sequence number for account
*/
