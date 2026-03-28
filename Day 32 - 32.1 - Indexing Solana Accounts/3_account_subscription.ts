// Lecture Code - 3_account_subscription.ts
// Topic: Real-Time Account Monitoring with WebSocket Subscriptions
// Day 32.1 - Indexing Solana Accounts
//
// To run: npx ts-node 3_account_subscription.ts

// ── What is Account Subscription? ────────────────────────────────────────────
//
// Instead of polling (asking "did it change?"), subscriptions use WebSockets
// to get pushed notifications immediately when an account changes.
//
// Real-Life Analogy: 
// - Polling: Checking your mailbox every 5 minutes
// - Subscription: Having the mail carrier ring your doorbell when mail arrives
//
// Why use subscriptions?
//   1. INSTANT NOTIFICATIONS - Know immediately when accounts change
//   2. LOWER LATENCY - Sub-second response vs. 5+ seconds with polling
//   3. EFFICIENT - Server only sends data when something actually changes
//   4. RELIABLE - Maintained connection ensures you don't miss updates

// ── How WebSocket Subscriptions Work ─────────────────────────────────────────
//
// Flow:
// 1. Client opens WebSocket connection to RPC node
// 2. Client sends subscription request with account address
// 3. Server monitors that account on blockchain
// 4. When account changes → Server immediately sends update to client
// 5. Client processes update in callback function
//
// This is PUSH-based (server pushes to you) vs. PULL-based (you poll server)

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ══════════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const SOL_VAULT = 'DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz';
const USDC_VAULT = 'HLmqeL62xR1QoZ1HKKbXRrdN1p3phKpxRMb2VVopvBBz';

// ── Connection with WebSocket Support ─────────────────────────────────────────
//
// Solana's RPC supports both HTTP and WebSocket protocols
// The Connection object automatically uses WebSocket for subscriptions

const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com/' // WebSocket endpoint
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATE TRACKING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Track the latest balances from both vaults
 * Updated by subscription callbacks
 */
let latestBalances = {
  sol: 0,
  usdc: 0,
  lastUpdate: {
    sol: 0,
    usdc: 0
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 1: SUBSCRIBE TO SOL VAULT CHANGES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribes to balance changes in the SOL vault
 * 
 * Whenever a swap happens in the Raydium pool, the SOL vault balance changes.
 * This subscription will immediately notify us of that change.
 * 
 * @returns Subscription ID (used to unsubscribe later)
 */
function subscribeToSOLVault(): number {
  const vaultPubkey = new PublicKey(SOL_VAULT);
  
  console.log(`🔔 Subscribing to SOL Vault: ${SOL_VAULT}`);
  
  // ── onAccountChange() ─────────────────────────────────────────────────────
  //
  // This is the key method for account subscriptions
  // 
  // Parameters:
  //   1. publicKey - Account to monitor
  //   2. callback - Function called when account changes
  //   3. commitment - How finalized the update should be
  
  const subscriptionId = connection.onAccountChange(
    vaultPubkey,
    (accountInfo, context) => {
      // ── Callback Executes When Account Changes ────────────────────────────
      //
      // accountInfo contains:
      //   - lamports: Current SOL balance
      //   - data: Account data buffer
      //   - owner: Program that owns this account
      //   - executable: Whether it's executable
      //
      // context contains:
      //   - slot: Blockchain slot number where change occurred
      
      const balance = accountInfo.lamports / LAMPORTS_PER_SOL;
      const timestamp = Date.now();
      
      // ── Update Global State ───────────────────────────────────────────────
      
      const previousBalance = latestBalances.sol;
      latestBalances.sol = balance;
      latestBalances.lastUpdate.sol = timestamp;
      
      // ── Calculate Change ──────────────────────────────────────────────────
      
      const change = balance - previousBalance;
      const changePercent = previousBalance > 0 
        ? ((change / previousBalance) * 100).toFixed(4) 
        : '0.0000';
      
      // ── Log Update ────────────────────────────────────────────────────────
      
      console.log('\n┌─────────────────────────────────────────────────────┐');
      console.log('│ 🟢 SOL VAULT UPDATE                                │');
      console.log('└─────────────────────────────────────────────────────┘');
      console.log(`  Slot:           ${context.slot}`);
      console.log(`  New Balance:    ${balance.toFixed(6)} SOL`);
      console.log(`  Change:         ${change >= 0 ? '+' : ''}${change.toFixed(6)} SOL (${changePercent}%)`);
      console.log(`  Timestamp:      ${new Date(timestamp).toLocaleTimeString()}`);
      
      // ── Check if Both Vaults Updated (Calculate Price) ───────────────────
      
      if (latestBalances.sol > 0 && latestBalances.usdc > 0) {
        const price = latestBalances.usdc / latestBalances.sol;
        console.log(`  Current Price:  1 SOL = ${price.toFixed(2)} USDC`);
      }
    },
    'confirmed' // Commitment level
  );
  
  console.log(`✅ SOL Vault subscription active (ID: ${subscriptionId})\n`);
  
  return subscriptionId;
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 2: SUBSCRIBE TO USDC VAULT CHANGES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribes to balance changes in the USDC vault
 * 
 * Note: USDC vault is a TOKEN account, not a SOL account
 * The accountInfo.data contains encoded token account data
 * 
 * @returns Subscription ID
 */
function subscribeToUSDCVault(): number {
  const vaultPubkey = new PublicKey(USDC_VAULT);
  
  console.log(`🔔 Subscribing to USDC Vault: ${USDC_VAULT}`);
  
  const subscriptionId = connection.onAccountChange(
    vaultPubkey,
    async (accountInfo, context) => {
      // ── Token Account Data Parsing ────────────────────────────────────────
      //
      // Token accounts have complex encoded data
      // We need to fetch parsed account info to get the balance
      //
      // Why? The raw accountInfo.data is a Buffer with encoded token data
      // We'd need to manually decode it following the SPL Token program layout
      
      try {
        // Fetch current parsed data
        const parsedAccountInfo = await connection.getParsedAccountInfo(vaultPubkey);
        
        if (!parsedAccountInfo.value || !('parsed' in parsedAccountInfo.value.data)) {
          console.error('❌ Failed to parse USDC vault data');
          return;
        }
        
        const balance = parsedAccountInfo.value.data.parsed.info.tokenAmount.uiAmount;
        const timestamp = Date.now();
        
        // ── Update Global State ───────────────────────────────────────────────
        
        const previousBalance = latestBalances.usdc;
        latestBalances.usdc = balance;
        latestBalances.lastUpdate.usdc = timestamp;
        
        // ── Calculate Change ──────────────────────────────────────────────────
        
        const change = balance - previousBalance;
        const changePercent = previousBalance > 0 
          ? ((change / previousBalance) * 100).toFixed(4) 
          : '0.0000';
        
        // ── Log Update ────────────────────────────────────────────────────────
        
        console.log('\n┌─────────────────────────────────────────────────────┐');
        console.log('│ 🔵 USDC VAULT UPDATE                               │');
        console.log('└─────────────────────────────────────────────────────┘');
        console.log(`  Slot:           ${context.slot}`);
        console.log(`  New Balance:    ${balance.toFixed(2)} USDC`);
        console.log(`  Change:         ${change >= 0 ? '+' : ''}${change.toFixed(2)} USDC (${changePercent}%)`);
        console.log(`  Timestamp:      ${new Date(timestamp).toLocaleTimeString()}`);
        
        // ── Calculate Price if Both Updated ───────────────────────────────────
        
        if (latestBalances.sol > 0 && latestBalances.usdc > 0) {
          const price = latestBalances.usdc / latestBalances.sol;
          console.log(`  Current Price:  1 SOL = ${price.toFixed(2)} USDC`);
        }
        
      } catch (error) {
        console.error('❌ Error parsing USDC vault update:', error);
      }
    },
    'confirmed'
  );
  
  console.log(`✅ USDC Vault subscription active (ID: ${subscriptionId})\n`);
  
  return subscriptionId;
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 3: INITIALIZE CURRENT BALANCES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches initial balances before starting subscriptions
 * 
 * This gives us a baseline to compare changes against
 */
async function initializeBalances() {
  console.log('📊 Fetching initial balances...\n');
  
  try {
    // ── Fetch SOL Balance ─────────────────────────────────────────────────────
    
    const solPubkey = new PublicKey(SOL_VAULT);
    const solLamports = await connection.getBalance(solPubkey);
    latestBalances.sol = solLamports / LAMPORTS_PER_SOL;
    latestBalances.lastUpdate.sol = Date.now();
    
    console.log(`  SOL Vault:  ${latestBalances.sol.toFixed(6)} SOL`);
    
    // ── Fetch USDC Balance ────────────────────────────────────────────────────
    
    const usdcPubkey = new PublicKey(USDC_VAULT);
    const usdcAccountInfo = await connection.getParsedAccountInfo(usdcPubkey);
    
    if (usdcAccountInfo.value && 'parsed' in usdcAccountInfo.value.data) {
      latestBalances.usdc = usdcAccountInfo.value.data.parsed.info.tokenAmount.uiAmount;
      latestBalances.lastUpdate.usdc = Date.now();
      
      console.log(`  USDC Vault: ${latestBalances.usdc.toFixed(2)} USDC`);
    }
    
    // ── Calculate Initial Price ───────────────────────────────────────────────
    
    const price = latestBalances.usdc / latestBalances.sol;
    console.log(`  Price:      1 SOL = ${price.toFixed(2)} USDC\n`);
    
  } catch (error) {
    console.error('❌ Error initializing balances:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 4: SUBSCRIPTION HEALTH MONITOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Periodically checks that subscriptions are still receiving updates
 * 
 * If no updates for 60 seconds, something might be wrong
 */
function startHealthMonitor() {
  const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds
  const MAX_AGE = 120000; // 2 minutes
  
  setInterval(() => {
    const now = Date.now();
    const solAge = now - latestBalances.lastUpdate.sol;
    const usdcAge = now - latestBalances.lastUpdate.usdc;
    
    console.log('\n💊 Health Check:');
    console.log(`  Last SOL update:  ${Math.floor(solAge / 1000)}s ago`);
    console.log(`  Last USDC update: ${Math.floor(usdcAge / 1000)}s ago`);
    
    if (solAge > MAX_AGE) {
      console.warn('⚠️  WARNING: SOL vault subscription might be stale');
    }
    if (usdcAge > MAX_AGE) {
      console.warn('⚠️  WARNING: USDC vault subscription might be stale');
    }
    
  }, HEALTH_CHECK_INTERVAL);
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 5: START MONITORING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Main function to start the subscription monitoring system
 */
async function startMonitoring() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  REAL-TIME VAULT MONITOR - WebSocket Subscriptions');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // ── Step 1: Initialize Current State ──────────────────────────────────────
  
  await initializeBalances();
  
  // ── Step 2: Subscribe to Both Vaults ──────────────────────────────────────
  
  const solSubId = subscribeToSOLVault();
  const usdcSubId = subscribeToUSDCVault();
  
  // ── Step 3: Start Health Monitoring ───────────────────────────────────────
  
  console.log('🏥 Starting health monitor...\n');
  startHealthMonitor();
  
  // ── Step 4: Keep Process Alive ────────────────────────────────────────────
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Monitoring active. Waiting for vault changes...');
  console.log('   Press Ctrl+C to stop');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Stopping subscriptions...');
    
    // Unsubscribe from both accounts
    await connection.removeAccountChangeListener(solSubId);
    await connection.removeAccountChangeListener(usdcSubId);
    
    console.log('✅ Unsubscribed successfully');
    process.exit(0);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPARISON: SUBSCRIPTION VS POLLING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Demonstrates the latency difference between approaches
 */
async function compareApproaches() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  COMPARISON: Subscription vs. Polling');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 Latency Comparison:\n');
  console.log('┌─────────────────────┬──────────────┬─────────────────┐');
  console.log('│ Approach            │ Latency      │ Reliability     │');
  console.log('├─────────────────────┼──────────────┼─────────────────┤');
  console.log('│ Polling (5s)        │ 0-5000ms     │ Can miss events │');
  console.log('│ WebSocket Sub       │ 100-1000ms   │ High            │');
  console.log('│ Geyser/Yellowstone  │ <100ms       │ Very High       │');
  console.log('└─────────────────────┴──────────────┴─────────────────┘\n');
  
  console.log('✅ Subscription Advantages:');
  console.log('   • Instant notifications');
  console.log('   • Lower resource usage');
  console.log('   • More reliable');
  console.log('   • Better for time-sensitive apps\n');
  
  console.log('⚠️  Subscription Limitations:');
  console.log('   • Requires persistent connection');
  console.log('   • Still slower than Geyser');
  console.log('   • RPC provider dependent');
  console.log('   • Can disconnect/need reconnection logic\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  // Show comparison first
  await compareApproaches();
  
  // Then start actual monitoring
  await startMonitoring();
}

main().catch(console.error);

/*
KEY CONCEPTS:

- WEBSOCKET = Persistent two-way communication channel between client and server
- SUBSCRIPTION = Request to be notified when specific data changes
- ONACCOUNTCHANGE = Solana method to subscribe to account updates
- CALLBACK = Function that executes when subscribed event occurs
- PUSH NOTIFICATION = Server sends data to client (vs. client requesting)
- COMMITMENT LEVEL = How finalized blockchain data should be
- SUBSCRIPTION ID = Unique identifier for each subscription
- SLOT = Blockchain block number in Solana
- HEALTH MONITOR = System to detect stale/broken subscriptions
- GRACEFUL SHUTDOWN = Properly cleaning up before exiting

SUBSCRIPTION LIFECYCLE:
1. Open WebSocket connection
2. Send subscription request with parameters
3. Receive subscription ID confirmation
4. Server monitors blockchain for matching events
5. Server pushes updates to client when events occur
6. Client processes updates in callback
7. Client can unsubscribe using subscription ID

COMMITMENT LEVELS:
- processed: Fastest, least finalized (can be rolled back)
- confirmed: Good balance (used in most apps)
- finalized: Slowest, fully finalized (can't be rolled back)

WHEN TO USE SUBSCRIPTIONS:
- Real-time price monitoring
- Wallet balance tracking
- Transaction confirmation watching
- DeFi protocol state monitoring
- NFT mint detection

LIMITATIONS:
- Still slower than Geyser/Yellowstone
- Depends on RPC provider reliability
- Need reconnection logic for production
- Limited by RPC subscription limits
- Can't subscribe to ALL accounts efficiently
*/
