// Lecture Code - 2_polling_arbitrage_bot.ts
// Topic: Polling-Based Price Monitoring and Arbitrage Detection
// Day 32.1 - Indexing Solana Accounts
//
// To run: npx ts-node 2_polling_arbitrage_bot.ts

// ── What is Polling? ──────────────────────────────────────────────────────────
//
// Polling is repeatedly checking for data at regular intervals.
// Like refreshing a webpage every 5 seconds to see if something changed.
//
// Real-Life Analogy: Checking your mailbox every hour to see if mail arrived.
// You might miss quick deliveries, and you waste energy checking empty boxes.
//
// Why use it? (Despite limitations)
//   1. SIMPLE - Easy to implement and understand
//   2. NO INFRASTRUCTURE - Doesn't require webhook servers or validators
//   3. WORKS ANYWHERE - Just need RPC endpoint access
//   4. DEBUGGING - Easy to see exactly what's happening

// ── Why Polling is BAD for Trading ───────────────────────────────────────────
//
// Problems:
//   1. LATENCY - Always behind by polling interval (5s delay = you're too late)
//   2. RATE LIMITS - RPC providers limit requests (can't poll too frequently)
//   3. MISSED EVENTS - Might miss rapid changes between polls
//   4. RESOURCE WASTE - Constantly querying even when nothing changes
//   5. INCONSISTENT - Network issues cause variable response times

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ══════════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const SOL_VAULT = 'DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz';
const USDC_VAULT = 'HLmqeL62xR1QoZ1HKKbXRrdN1p3phKpxRMb2VVopvBBz';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ── Polling Configuration ─────────────────────────────────────────────────────

const POLL_INTERVAL = 5000;           // Poll every 5 seconds (5000ms)
const ARBITRAGE_THRESHOLD = 0.5;      // Alert if price differs by > 0.5%
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

// ── RPC Connection ────────────────────────────────────────────────────────────

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (From Previous Lecture)
// ══════════════════════════════════════════════════════════════════════════════

async function getSOLBalance(vaultAddress: string) {
  const publicKey = new PublicKey(vaultAddress);
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

async function getUSDCBalance(vaultAddress: string) {
  const publicKey = new PublicKey(vaultAddress);
  const accountInfo = await connection.getParsedAccountInfo(publicKey);
  
  if (!accountInfo.value || !('parsed' in accountInfo.value.data)) {
    throw new Error('Invalid token account');
  }
  
  return accountInfo.value.data.parsed.info.tokenAmount.uiAmount;
}

async function getPoolPrice() {
  const [solBalance, usdcBalance] = await Promise.all([
    getSOLBalance(SOL_VAULT),
    getUSDCBalance(USDC_VAULT)
  ]);
  
  return {
    price: usdcBalance / solBalance,
    solReserve: solBalance,
    usdcReserve: usdcBalance,
    timestamp: Date.now()
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 1: FETCH CEX PRICE (From CoinGecko)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the current SOL price from CoinGecko API
 * 
 * CoinGecko aggregates prices from many centralized exchanges
 * This represents the "true market price" we'll compare against
 * 
 * @returns Current SOL price in USD
 */
async function fetchCEXPrice(): Promise<number> {
  try {
    // ── Make HTTP Request ─────────────────────────────────────────────────────
    //
    // CoinGecko provides a simple REST API
    // No authentication required for basic price queries
    
    const response = await fetch(COINGECKO_API);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    // ── Parse Response ────────────────────────────────────────────────────────
    //
    // Response format:
    // {
    //   "solana": {
    //     "usd": 150.23
    //   }
    // }
    
    const data = await response.json();
    const price = data.solana.usd;
    
    if (!price) {
      throw new Error('Price not found in API response');
    }
    
    return price;
    
  } catch (error) {
    console.error('❌ Error fetching CEX price:', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 2: CALCULATE ARBITRAGE OPPORTUNITY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Compares CEX and DEX prices to find arbitrage opportunities
 * 
 * Arbitrage exists when:
 * - CEX Price > DEX Price → Buy on DEX, sell on CEX
 * - DEX Price > CEX Price → Buy on CEX, sell on DEX
 * 
 * @param cexPrice - Price from centralized exchange
 * @param dexPrice - Price from Raydium pool
 * @returns Arbitrage analysis object
 */
function calculateArbitrage(cexPrice: number, dexPrice: number) {
  // ── Calculate Absolute Difference ─────────────────────────────────────────
  //
  // Example:
  //   CEX: $150
  //   DEX: $148
  //   Difference: $2
  
  const difference = cexPrice - dexPrice;
  
  // ── Calculate Percentage Difference ───────────────────────────────────────
  //
  // Formula: (difference / cexPrice) * 100
  // Example: ($2 / $150) * 100 = 1.33%
  
  const percentageDiff = (difference / cexPrice) * 100;
  
  // ── Determine Trade Direction ─────────────────────────────────────────────
  //
  // If CEX > DEX: Buy on DEX (cheaper), sell on CEX (expensive)
  // If DEX > CEX: Buy on CEX (cheaper), sell on DEX (expensive)
  
  let direction: 'BUY_DEX_SELL_CEX' | 'BUY_CEX_SELL_DEX' | 'NO_ARBITRAGE';
  
  if (Math.abs(percentageDiff) < ARBITRAGE_THRESHOLD) {
    direction = 'NO_ARBITRAGE';
  } else if (difference > 0) {
    direction = 'BUY_DEX_SELL_CEX';
  } else {
    direction = 'BUY_CEX_SELL_DEX';
  }
  
  return {
    cexPrice,
    dexPrice,
    difference: Math.abs(difference),
    percentageDiff: Math.abs(percentageDiff),
    direction,
    isOpportunity: Math.abs(percentageDiff) >= ARBITRAGE_THRESHOLD
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 3: SINGLE POLL CYCLE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Executes one complete poll cycle
 * 
 * Steps:
 * 1. Fetch CEX price
 * 2. Fetch DEX price from pool
 * 3. Calculate arbitrage
 * 4. Log results
 * 5. Alert if opportunity found
 */
async function pollCycle() {
  const cycleStartTime = Date.now();
  
  try {
    console.log('\n─────────────────────────────────────────────────────────');
    console.log(`⏰ Poll Cycle: ${new Date().toLocaleTimeString()}`);
    
    // ── Step 1: Fetch Both Prices in Parallel ─────────────────────────────────
    //
    // Using Promise.all for efficiency
    // Sequential would take: cexTime + dexTime
    // Parallel takes: max(cexTime, dexTime)
    
    const [cexPrice, poolData] = await Promise.all([
      fetchCEXPrice(),
      getPoolPrice()
    ]);
    
    const dexPrice = poolData.price;
    
    // ── Step 2: Calculate Arbitrage ───────────────────────────────────────────
    
    const arb = calculateArbitrage(cexPrice, dexPrice);
    
    // ── Step 3: Display Results ───────────────────────────────────────────────
    
    console.log(`\n💱 Prices:`);
    console.log(`   CEX (CoinGecko): $${cexPrice.toFixed(2)}`);
    console.log(`   DEX (Raydium):   $${dexPrice.toFixed(2)}`);
    console.log(`   Difference:      $${arb.difference.toFixed(2)} (${arb.percentageDiff.toFixed(3)}%)`);
    
    // ── Step 4: Alert if Opportunity Found ────────────────────────────────────
    
    if (arb.isOpportunity) {
      console.log(`\n🚨 ARBITRAGE OPPORTUNITY DETECTED! 🚨`);
      console.log(`   Direction: ${arb.direction}`);
      console.log(`   Profit Potential: ${arb.percentageDiff.toFixed(2)}%`);
      
      // ── Calculate Estimated Profit ──────────────────────────────────────────
      //
      // Example with 1 SOL trade:
      //   Buy at DEX: $148
      //   Sell at CEX: $150
      //   Gross Profit: $2
      //   Minus fees (~0.5%): $1.25 net
      
      const tradeSizeSOL = 1; // Example: 1 SOL
      const grossProfit = arb.difference * tradeSizeSOL;
      const estimatedFees = grossProfit * 0.005; // 0.5% fees
      const netProfit = grossProfit - estimatedFees;
      
      console.log(`   Estimated Profit (1 SOL trade): $${netProfit.toFixed(2)}`);
    }
    
    // ── Step 5: Performance Metrics ───────────────────────────────────────────
    
    const cycleTime = Date.now() - cycleStartTime;
    console.log(`\n⚡ Cycle completed in ${cycleTime}ms`);
    
  } catch (error) {
    console.error('❌ Error in poll cycle:', error);
    // Don't throw - keep polling even if one cycle fails
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 4: START POLLING BOT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Starts the continuous polling bot
 * 
 * This runs indefinitely until manually stopped (Ctrl+C)
 * Each cycle waits POLL_INTERVAL milliseconds before the next poll
 */
function startPollingBot() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  POLLING BOT - Raydium SOL/USDC Arbitrage Detector');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Poll Interval: ${POLL_INTERVAL / 1000} seconds`);
  console.log(`   Arbitrage Threshold: ${ARBITRAGE_THRESHOLD}%`);
  console.log(`   CEX Source: CoinGecko`);
  console.log(`   DEX Source: Raydium SOL/USDC Pool`);
  console.log(`\n🚀 Starting bot... (Press Ctrl+C to stop)\n`);
  
  // ── Execute First Poll Immediately ────────────────────────────────────────
  
  pollCycle();
  
  // ── Set Up Recurring Polls ────────────────────────────────────────────────
  //
  // setInterval() executes the function every N milliseconds
  // It keeps running until process is killed or clearInterval() is called
  //
  // Warning: This is BLOCKING - the process won't exit normally
  
  const intervalId = setInterval(() => {
    pollCycle();
  }, POLL_INTERVAL);
  
  // ── Graceful Shutdown Handler ─────────────────────────────────────────────
  //
  // Listen for Ctrl+C (SIGINT signal) to clean up before exit
  
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Stopping polling bot...');
    clearInterval(intervalId);
    console.log('✅ Bot stopped gracefully');
    process.exit(0);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 5: DEMONSTRATE LATENCY PROBLEM
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Shows why polling is too slow for real arbitrage
 * 
 * Simulates what happens when a price change occurs:
 * - Instant: Price changes on blockchain
 * - +5000ms: You poll and discover the change
 * - +5100ms: You submit transaction
 * - Result: Someone else already took the arbitrage
 */
async function demonstrateLatencyProblem() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEMONSTRATION: Why Polling is Too Slow');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('📊 Timeline of Events:\n');
  console.log('   t=0ms     : Arbitrage opportunity appears on blockchain');
  console.log('   t=0ms     : Bot using Geyser gets instant notification');
  console.log('   t=50ms    : Geyser bot submits transaction');
  console.log('   t=5000ms  : Your polling bot discovers the opportunity');
  console.log('   t=5100ms  : Your polling bot tries to submit transaction');
  console.log('   t=5100ms  : ❌ TOO LATE - Geyser bot already won\n');
  
  console.log('⚡ Latency Comparison:\n');
  console.log('   Polling:              5000ms (you are here)');
  console.log('   Webhooks:             500ms');
  console.log('   Geyser/Yellowstone:   <100ms');
  console.log('   Running own validator: <50ms\n');
  
  console.log('💡 Conclusion: Polling is educational but not competitive\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  // First demonstrate the latency problem
  await demonstrateLatencyProblem();
  
  // Then start the actual polling bot
  // (Commented out by default - uncomment to run)
  // startPollingBot();
  
  // For demo purposes, just run a few cycles
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Running 3 demo poll cycles...');
  console.log('═══════════════════════════════════════════════════════════');
  
  for (let i = 0; i < 3; i++) {
    await pollCycle();
    if (i < 2) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between polls
    }
  }
  
  console.log('\n✅ Demo complete!');
  console.log('💡 Uncomment startPollingBot() in main() to run continuously');
}

main().catch(console.error);

/*
KEY CONCEPTS:

- POLLING = Repeatedly checking for data at fixed intervals
- LATENCY = Time delay between event occurring and you knowing about it
- ARBITRAGE = Profiting from price differences between markets
- CEX = Centralized Exchange (Binance, Coinbase, etc.)
- DEX = Decentralized Exchange (Raydium, Orca, etc.)
- GROSS PROFIT = Total price difference before fees
- NET PROFIT = Profit after accounting for transaction fees and gas
- SETINTERVAL = JavaScript function that repeats code at intervals
- RATE LIMITING = API restrictions on requests per second/minute
- COINGECKO = Price aggregation API for crypto assets
- THRESHOLD = Minimum price difference to consider profitable
- SLIPPAGE = Price change during transaction execution

WHY POLLING FAILS FOR TRADING:
1. 5-second delay means you're always last to know
2. Others with better infrastructure execute trades first
3. By the time you act, the opportunity is gone
4. Can't poll fast enough without hitting rate limits
5. Network issues create unpredictable delays

BETTER ALTERNATIVES:
1. Webhooks (covered in next lecture)
2. Geyser plugin + Yellowstone gRPC
3. Running your own validator
4. Using professional indexing services (Helius, Shyft)

WHEN POLLING IS ACCEPTABLE:
- Learning and understanding blockchain data
- Non-time-sensitive monitoring (portfolio tracking)
- Backup system when webhooks fail
- Development and testing environments
*/
