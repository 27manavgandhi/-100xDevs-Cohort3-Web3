// Lecture Code - 1_vault_balance_query.ts
// Topic: Querying Solana Account Balances (SOL and Token Accounts)
// Day 32.1 - Indexing Solana Accounts
//
// To run: npx ts-node 1_vault_balance_query.ts

// ── What is Account Querying? ─────────────────────────────────────────────────
//
// Account querying is the process of fetching data from Solana's blockchain
// about specific accounts - their balances, token holdings, or program state.
//
// Real-Life Analogy: Like checking your bank account balance through an ATM.
// The ATM queries the bank's database and returns your current balance.
//
// Why use it?
//   1. MONITOR BALANCES - Track SOL and token holdings in real-time
//   2. DEX PRICE DISCOVERY - Query liquidity pool reserves to calculate prices
//   3. ARBITRAGE OPPORTUNITIES - Compare prices across different pools/exchanges
//   4. PORTFOLIO TRACKING - Monitor user holdings across multiple accounts

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ══════════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - RAYDIUM SOL/USDC POOL VAULTS
// ══════════════════════════════════════════════════════════════════════════════

// These are the actual Raydium pool vault addresses on mainnet
// Pool: https://solscan.io/account/7SX8LvXAwgCt1XWfJv4BAjXKqfSzdEBw3nyP9QsmAjM8

const SOL_VAULT = 'DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz';
const USDC_VAULT = 'HLmqeL62xR1QoZ1HKKbXRrdN1p3phKpxRMb2VVopvBBz';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ── Connection Setup ──────────────────────────────────────────────────────────
//
// Connection object is your gateway to the Solana blockchain.
// It handles all RPC communication with Solana nodes.
//
// Think of it like a phone line to the blockchain - you need it open to make calls.

const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  'confirmed' // Commitment level: 'confirmed' is good balance between speed/certainty
);

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 1: GET SOL BALANCE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the SOL balance of an account
 * 
 * @param vaultAddress - The Solana address to query
 * @returns Object containing balance information
 */
async function getSOLBalance(vaultAddress: string) {
  try {
    // ── Step 1: Create PublicKey Object ───────────────────────────────────────
    //
    // PublicKey is a class that represents Solana addresses
    // It validates the address format and provides utility methods
    
    const publicKey = new PublicKey(vaultAddress);
    
    // ── Step 2: Query the Balance ─────────────────────────────────────────────
    //
    // getBalance() returns the account's SOL balance in LAMPORTS
    // Lamports are the smallest unit of SOL (like satoshis for Bitcoin)
    // 1 SOL = 1,000,000,000 (10^9) lamports
    
    const balance = await connection.getBalance(publicKey);
    
    // ── Step 3: Convert Lamports to SOL ───────────────────────────────────────
    //
    // Divide by LAMPORTS_PER_SOL constant (10^9) for human-readable format
    // Example: 5,000,000,000 lamports = 5 SOL
    
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    // ── Step 4: Return Structured Data ────────────────────────────────────────
    
    return {
      address: vaultAddress,
      balance: solBalance,              // Human-readable (5.5 SOL)
      balanceInLamports: balance,       // Raw blockchain units
      token: 'SOL'
    };
    
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 2: GET TOKEN BALANCE (USDC)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the token balance from a token account
 * 
 * Token accounts are different from wallet accounts:
 * - Wallet accounts hold SOL directly
 * - Token accounts hold SPL tokens and are "owned" by wallets
 * 
 * @param vaultAddress - The token account address
 * @returns Object containing token balance information
 */
async function getUSDCBalance(vaultAddress: string) {
  try {
    const publicKey = new PublicKey(vaultAddress);
    
    // ── Step 1: Get Parsed Account Info ───────────────────────────────────────
    //
    // getParsedAccountInfo() is a helper that automatically parses token account data
    // It's easier than manually decoding the raw account data buffer
    //
    // Think of it like asking for a translated document vs. raw bytes
    
    const accountInfo = await connection.getParsedAccountInfo(publicKey);
    
    // ── Step 2: Validate Account Exists ───────────────────────────────────────
    
    if (!accountInfo.value || !('parsed' in accountInfo.value.data)) {
      throw new Error('Invalid token account or account not found');
    }
    
    const parsedData = accountInfo.value.data.parsed;
    
    // ── Step 3: Verify It's a Token Account ──────────────────────────────────
    //
    // Token accounts have type: 'account'
    // Program accounts have type: 'program'
    
    if (parsedData.type !== 'account') {
      throw new Error('Address is not a token account');
    }
    
    // ── Step 4: Extract Token Information ─────────────────────────────────────
    //
    // Token account structure:
    // {
    //   info: {
    //     mint: "EPjFW...",           // Token type (USDC mint)
    //     owner: "9CgSi...",          // Who owns this token account
    //     tokenAmount: {
    //       amount: "45678123456",    // Raw amount (with decimals)
    //       decimals: 6,              // How many decimal places
    //       uiAmount: 45678.123456    // Human-readable amount
    //     }
    //   }
    // }
    
    const balance = parsedData.info.tokenAmount.uiAmount;
    const balanceInBaseUnits = parsedData.info.tokenAmount.amount;
    const decimals = parsedData.info.tokenAmount.decimals;
    const mint = parsedData.info.mint;
    
    // ── Step 5: Return Comprehensive Data ─────────────────────────────────────
    
    return {
      address: vaultAddress,
      balance: balance,                           // 45678.123456 USDC
      balanceInBaseUnits: balanceInBaseUnits,     // "45678123456" (string for big numbers)
      token: mint === USDC_MINT ? 'USDC' : 'Unknown Token',
      mint: mint,
      decimals: decimals
    };
    
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 3: GET BOTH VAULT BALANCES SIMULTANEOUSLY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Queries both vaults in parallel for efficiency
 * 
 * Why parallel?
 * - Querying sequentially: 500ms + 500ms = 1000ms
 * - Querying in parallel: max(500ms, 500ms) = 500ms
 * 
 * In trading, every millisecond counts!
 */
async function getVaultBalances() {
  try {
    // ── Promise.all for Parallel Execution ────────────────────────────────────
    //
    // Promise.all() runs multiple async operations simultaneously
    // It waits for ALL to complete and returns array of results
    //
    // [solBalance, usdcBalance] = destructuring the results array
    
    const [solBalance, usdcBalance] = await Promise.all([
      getSOLBalance(SOL_VAULT),
      getUSDCBalance(USDC_VAULT)
    ]);
    
    return {
      sol: solBalance,
      usdc: usdcBalance,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error in getVaultBalances:', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTION 4: CALCULATE POOL PRICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates the current price in the Raydium SOL/USDC pool
 * 
 * Price formula: Price = USDC Reserve / SOL Reserve
 * 
 * Real-Life Analogy: If a currency exchange has:
 * - $150,000 USD
 * - 1,000 EUR
 * Then: 1 EUR = $150 USD (150,000 / 1,000)
 */
async function getPoolPrice() {
  const vaults = await getVaultBalances();
  
  const solBalance = vaults.sol.balance;
  const usdcBalance = vaults.usdc.balance;
  
  // ── Calculate Price ───────────────────────────────────────────────────────
  //
  // Price is the ratio of reserves
  // Example:
  //   SOL: 1,000 SOL
  //   USDC: 150,000 USDC
  //   Price: 150,000 / 1,000 = 150 USDC per SOL
  
  const priceUSDCperSOL = usdcBalance / solBalance;
  const priceSOLperUSDC = solBalance / usdcBalance;
  
  return {
    solReserve: solBalance,
    usdcReserve: usdcBalance,
    priceUSDCperSOL: priceUSDCperSOL,
    priceSOLperUSDC: priceSOLperUSDC,
    timestamp: vaults.timestamp,
    formattedPrice: `1 SOL = ${priceUSDCperSOL.toFixed(2)} USDC`
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Raydium SOL/USDC Pool - Vault Balance Query');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // ── Test 1: Individual SOL Balance ────────────────────────────────────────
  console.log('1️⃣  Querying SOL Vault...');
  const solData = await getSOLBalance(SOL_VAULT);
  console.log(`   Balance: ${solData.balance.toFixed(4)} SOL`);
  console.log(`   Lamports: ${solData.balanceInLamports.toLocaleString()}\n`);
  
  // ── Test 2: Individual USDC Balance ───────────────────────────────────────
  console.log('2️⃣  Querying USDC Vault...');
  const usdcData = await getUSDCBalance(USDC_VAULT);
  console.log(`   Balance: ${usdcData.balance.toFixed(2)} USDC`);
  console.log(`   Decimals: ${usdcData.decimals}`);
  console.log(`   Mint: ${usdcData.mint}\n`);
  
  // ── Test 3: Both Vaults Simultaneously ────────────────────────────────────
  console.log('3️⃣  Querying Both Vaults (Parallel)...');
  const startTime = Date.now();
  const vaults = await getVaultBalances();
  const queryTime = Date.now() - startTime;
  console.log(`   ⚡ Query completed in ${queryTime}ms`);
  console.log(`   SOL: ${vaults.sol.balance.toFixed(4)}`);
  console.log(`   USDC: ${vaults.usdc.balance.toFixed(2)}\n`);
  
  // ── Test 4: Calculate Pool Price ──────────────────────────────────────────
  console.log('4️⃣  Calculating Pool Price...');
  const price = await getPoolPrice();
  console.log(`   ${price.formattedPrice}`);
  console.log(`   SOL Reserve: ${price.solReserve.toFixed(2)}`);
  console.log(`   USDC Reserve: ${price.usdcReserve.toFixed(2)}`);
  
  console.log('\n═══════════════════════════════════════════════════════════');
}

// Run the main function
main().catch(console.error);

/*
KEY CONCEPTS:

- LAMPORTS = Smallest unit of SOL (1 SOL = 10^9 lamports), like satoshis for Bitcoin
- TOKEN ACCOUNT = Specialized account that holds SPL tokens, owned by a wallet
- MINT = The token type identifier (e.g., USDC has a specific mint address)
- VAULT = In AMM context, accounts holding pool reserves
- PARSED ACCOUNT INFO = RPC method that auto-decodes token account data
- PROMISE.ALL = Run multiple async operations in parallel for efficiency
- COMMITMENT LEVEL = How finalized a transaction must be ('confirmed', 'finalized')
- UI AMOUNT = Human-readable token amount (vs. base units with decimals)
- POOL PRICE = Ratio of token reserves (USDC/SOL in this case)
- PARALLEL QUERIES = Querying multiple accounts simultaneously to reduce latency

REAL-WORLD USE CASES:
1. Trading bots need pool prices to find arbitrage opportunities
2. Portfolio apps query token balances to show user holdings
3. DEX aggregators compare prices across multiple pools
4. Liquidation bots monitor vault balances in lending protocols
5. Analytics dashboards track pool reserve changes over time
*/
