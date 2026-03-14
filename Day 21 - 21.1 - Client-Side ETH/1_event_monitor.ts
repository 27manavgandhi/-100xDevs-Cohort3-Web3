// Lecture Code - 1_event_monitor.ts
// Topic: Monitoring Blockchain Events with ethers.js from Node.js
// Day 21.1 - Client-Side ETH
//
// To run: ts-node src/1_event_monitor.ts
// Prerequisites: npm install ethers dotenv

// ══════════════════════════════════════════════════════════════════════════════
// WHAT IS EVENT MONITORING?
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Event monitoring allows backend services to listen for blockchain events
 * and react to them automatically.
 * 
 * Real-Life Analogy: Security Camera System
 *   - Cameras (smart contracts) record events
 *   - Monitoring service (this code) watches the feed
 *   - When something happens (event emitted), take action
 * 
 * Use Cases:
 *   - Bridge operators processing transfers
 *   - Notification services alerting users
 *   - Analytics tracking contract activity
 *   - Automated market makers adjusting prices
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// ── Configuration ─────────────────────────────────────────────────────────────

const BRIDGE_CONTRACT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const RPC_URL = process.env.ETH_RPC || 'https://eth-mainnet.g.alchemycom/v2/YOUR_KEY';

// ── Contract ABI (Simplified) ─────────────────────────────────────────────────

const BRIDGE_ABI = [
  'event TokensLocked(address indexed user, uint256 amount, uint256 timestamp, bytes32 indexed transferId)',
  'event TokensReleased(address indexed user, uint256 amount, bytes32 indexed burnTxHash, uint256 timestamp)'
];

// ══════════════════════════════════════════════════════════════════════════════
// METHOD 1: POLLING FOR EVENTS (getLogs)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Polling retrieves historical events within a block range.
 * Good for: Catching up on past events, batch processing
 * 
 * How it works:
 * 1. Specify a block range (fromBlock, toBlock)
 * 2. Filter by contract address
 * 3. Filter by event signature (topics)
 * 4. Process returned logs
 */

async function pollForEvents() {
  console.log('📊 Polling for events...\n');
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Get current block number
  const currentBlock = await provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);
  
  // Define block range to search
  const fromBlock = currentBlock - 100; // Last 100 blocks
  const toBlock = currentBlock;
  
  // Get event signature hash
  // "Transfer(address,address,uint256)" becomes a topic
  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  
  try {
    // Fetch logs
    const logs = await provider.getLogs({
      address: BRIDGE_CONTRACT_ADDRESS,
      fromBlock: fromBlock,
      toBlock: toBlock,
      topics: [transferTopic] // Filter for Transfer events only
    });
    
    console.log(`\nFound ${logs.length} Transfer events in blocks ${fromBlock}-${toBlock}\n`);
    
    // Process each log
    logs.forEach((log, index) => {
      console.log(`Event ${index + 1}:`);
      console.log(`  Block: ${log.blockNumber}`);
      console.log(`  Tx Hash: ${log.transactionHash}`);
      console.log(`  Data: ${log.data}`);
      console.log(`  Topics: ${log.topics}\n`);
    });
    
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// METHOD 2: LISTENING FOR EVENTS (Real-Time)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Event listeners react to events as they happen in real-time.
 * Good for: Bridge operators, notification services, live dashboards
 * 
 * How it works:
 * 1. Create contract instance with ABI
 * 2. Attach event listener with .on()
 * 3. Callback function runs when event is emitted
 * 4. Process event data
 */

async function listenForEvents() {
  console.log('👂 Starting real-time event listener...\n');
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Create contract instance
  const contract = new ethers.Contract(
    BRIDGE_CONTRACT_ADDRESS,
    BRIDGE_ABI,
    provider
  );
  
  // ── Listen for TokensLocked event ─────────────────────────────────────────
  
  contract.on(
    'TokensLocked',
    (user, amount, timestamp, transferId, event) => {
      console.log('🔒 TokensLocked Event Detected!');
      console.log(`  User: ${user}`);
      console.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDT`);
      console.log(`  Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
      console.log(`  Transfer ID: ${transferId}`);
      console.log(`  Block: ${event.log.blockNumber}`);
      console.log(`  Tx Hash: ${event.log.transactionHash}\n`);
      
      // TODO: Trigger mint on destination chain
      // await mintOnDestinationChain(user, amount, transferId);
    }
  );
  
  // ── Listen for TokensReleased event ───────────────────────────────────────
  
  contract.on(
    'TokensReleased',
    (user, amount, burnTxHash, timestamp, event) => {
      console.log('🔓 TokensReleased Event Detected!');
      console.log(`  User: ${user}`);
      console.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDT`);
      console.log(`  Burn Tx Hash: ${burnTxHash}`);
      console.log(`  Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
      console.log(`  Block: ${event.log.blockNumber}\n`);
    }
  );
  
  console.log('✅ Event listeners active. Waiting for events...\n');
  
  // Keep process running
  process.stdin.resume();
}

// ══════════════════════════════════════════════════════════════════════════════
// METHOD 3: FILTERING EVENTS BY USER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Filter events to only show activity for specific addresses.
 * Good for: User-specific dashboards, personalized notifications
 */

async function filterEventsByUser(userAddress: string) {
  console.log(`🔍 Filtering events for user: ${userAddress}\n`);
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(BRIDGE_CONTRACT_ADDRESS, BRIDGE_ABI, provider);
  
  // Create filter for specific user
  const filter = contract.filters.TokensLocked(userAddress);
  
  // Get past events for this user
  const events = await contract.queryFilter(filter, -1000); // Last 1000 blocks
  
  console.log(`Found ${events.length} events for ${userAddress}\n`);
  
  events.forEach((event, index) => {
    const args = event.args;
    console.log(`Event ${index + 1}:`);
    console.log(`  Amount: ${ethers.formatUnits(args.amount, 6)} USDT`);
    console.log(`  Transfer ID: ${args.transferId}`);
    console.log(`  Block: ${event.blockNumber}\n`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// METHOD 4: BATCH PROCESSING WITH PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Process large numbers of historical events in batches.
 * Good for: Initial sync, analytics, generating reports
 */

async function batchProcessEvents(fromBlock: number, toBlock: number, batchSize: number = 1000) {
  console.log(`📦 Batch processing events from block ${fromBlock} to ${toBlock}\n`);
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(BRIDGE_CONTRACT_ADDRESS, BRIDGE_ABI, provider);
  
  let currentBlock = fromBlock;
  let totalEvents = 0;
  
  while (currentBlock <= toBlock) {
    const endBlock = Math.min(currentBlock + batchSize, toBlock);
    
    console.log(`Processing blocks ${currentBlock} to ${endBlock}...`);
    
    try {
      // Get events for this batch
      const filter = contract.filters.TokensLocked();
      const events = await contract.queryFilter(filter, currentBlock, endBlock);
      
      console.log(`  Found ${events.length} events`);
      totalEvents += events.length;
      
      // Process events
      for (const event of events) {
        // TODO: Save to database, send notifications, etc.
        // await saveToDatabase(event);
      }
      
      currentBlock = endBlock + 1;
      
      // Rate limiting - don't overwhelm the RPC
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  Error processing batch:`, error);
      // Continue with next batch
      currentBlock = endBlock + 1;
    }
  }
  
  console.log(`\n✅ Batch processing complete. Total events: ${totalEvents}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🌐 Ethereum Event Monitor\n');
  console.log('Choose a method:');
  console.log('1. Poll for historical events');
  console.log('2. Listen for real-time events');
  console.log('3. Filter events by user');
  console.log('4. Batch process events\n');
  
  // Example: Run polling
  // await pollForEvents();
  
  // Example: Run listener
  await listenForEvents();
  
  // Example: Filter by user
  // await filterEventsByUser('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
  
  // Example: Batch process
  // const currentBlock = await provider.getBlockNumber();
  // await batchProcessEvents(currentBlock - 10000, currentBlock, 1000);
}

// Run the main function
main().catch(console.error);

/*
KEY CONCEPTS:
- EVENT = Signal emitted by smart contract when something happens
- TOPICS = Indexed event parameters for efficient filtering
- LOG = Record of emitted event stored on blockchain
- POLLING = Periodically checking for new events
- LISTENING = Real-time event detection via WebSocket/subscription
- FILTER = Criteria to narrow down which events to retrieve
- BLOCK RANGE = Span of blocks to search for events
- KECCAK256 = Hash function used to generate event signatures
- QUERY FILTER = Method to retrieve past events
- BATCH PROCESSING = Handling large numbers of events in chunks
*/
