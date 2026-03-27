// Lecture Code - 2_jupiter_swaps.ts
// Topic: Jupiter Aggregator Integration for Token Swaps
// Day 34.1 - Advanced Trading Bot Features
//
// To run:
// 1. npm install telegraf @solana/web3.js dotenv
// 2. npx ts-node 2_jupiter_swaps.ts

import { Telegraf, Markup } from 'telegraf';
import { Connection, Keypair, VersionedTransaction, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// ── What is Jupiter Aggregator? ──────────────────────────────────────────────
//
// Jupiter is a DEX aggregator that finds the BEST PRICE for token swaps by
// checking multiple decentralized exchanges (Orca, Raydium, Meteora, etc.).
//
// Real-Life Analogy: Jupiter is like GOOGLE FLIGHTS for crypto:
// - You want to swap SOL for USDC
// - Instead of manually checking each DEX, Jupiter checks them ALL
// - Shows you the best route (might split across multiple DEXs)
// - Executes the trade in one transaction
//
// Why use Jupiter?
//   1. BEST PRICE - Automatically finds optimal route
//   2. ONE CLICK - Complex multi-hop swaps in single transaction
//   3. AGGREGATION - Access to all Solana DEX liquidity
//   4. SLIPPAGE PROTECTION - Set max acceptable slippage

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN required');

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const bot = new Telegraf(BOT_TOKEN);

// ── Token Mints ──────────────────────────────────────────────────────────────
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',  // Native SOL
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC (mainnet)
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK (mainnet)
};

interface UserWallet {
  keypair: Keypair;
}

const USERS: Record<string, UserWallet> = {};

// ══════════════════════════════════════════════════════════════════════════════
// JUPITER API - QUOTE FETCHING
// ══════════════════════════════════════════════════════════════════════════════

// ── Quote Parameters ─────────────────────────────────────────────────────────
interface JupiterQuoteParams {
  inputMint: string;      // Token you're selling
  outputMint: string;     // Token you're buying
  amount: number;         // Amount in smallest units (lamports for SOL)
  slippageBps?: number;   // Max slippage in basis points (50 = 0.5%)
}

// ── Fetching Quote from Jupiter ──────────────────────────────────────────────
async function getJupiterQuote(params: JupiterQuoteParams) {
  const { inputMint, outputMint, amount, slippageBps = 50 } = params;
  
  console.log(`\n=== Getting Jupiter Quote ===`);
  console.log(`Input: ${inputMint}`);
  console.log(`Output: ${outputMint}`);
  console.log(`Amount: ${amount}`);
  console.log(`Slippage: ${slippageBps} bps (${slippageBps / 100}%)`);
  
  // ── Build Query Parameters ───────────────────────────────────────────────
  const queryParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
  });
  
  // ── Call Jupiter Quote API ───────────────────────────────────────────────
  // Endpoint: https://quote-api.jup.ag/v6/quote
  const url = `https://quote-api.jup.ag/v6/quote?${queryParams}`;
  
  console.log(`Calling: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter API error: ${error}`);
  }
  
  const quote = await response.json();
  
  console.log(`✅ Quote received`);
  console.log(`  Input: ${quote.inAmount}`);
  console.log(`  Output: ${quote.outAmount}`);
  console.log(`  Price Impact: ${quote.priceImpactPct}%`);
  
  return quote;
}

// ── Understanding Quote Response ─────────────────────────────────────────────
/*
Quote Response Structure:

{
  "inputMint": "So11111111111111111111111111111111111111112",
  "inAmount": "1000000000",           // 1 SOL in lamports
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "outAmount": "195320000",           // ~195.32 USDC (6 decimals)
  "otherAmountThreshold": "194346600", // Min you'll get (with slippage)
  "swapMode": "ExactIn",
  "slippageBps": 50,                  // 0.5%
  "priceImpactPct": 0.12,             // Your trade moves price by 0.12%
  "routePlan": [                      // Which DEXs will be used
    {
      "swapInfo": {
        "ammKey": "...",
        "label": "Orca",              // Trading on Orca
        "inputMint": "So11...",
        "outputMint": "EPjF...",
        "inAmount": "1000000000",
        "outAmount": "195320000",
        "feeAmount": "25000",
        "feeMint": "So11..."
      }
    }
  ]
}

Key Fields:
- inAmount: What you're selling (in smallest units)
- outAmount: What you'll get (in smallest units)
- otherAmountThreshold: Minimum you'll accept (with slippage)
- priceImpactPct: How much your trade affects the price
- routePlan: Which DEXs are used (might be multiple)
*/

// ══════════════════════════════════════════════════════════════════════════════
// JUPITER API - SWAP EXECUTION
// ══════════════════════════════════════════════════════════════════════════════

async function executeJupiterSwap(
  connection: Connection,
  userKeypair: Keypair,
  quote: any
): Promise<string> {
  console.log(`\n=== Executing Swap ===`);
  
  // ── Step 1: Get Swap Transaction from Jupiter ────────────────────────────
  // The swap endpoint returns a serialized transaction ready to sign
  
  const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userKeypair.publicKey.toString(),
      wrapAndUnwrapSol: true,           // Auto wrap/unwrap SOL to WSOL
      dynamicComputeUnitLimit: true,    // Optimize compute units
      prioritizationFeeLamports: 'auto' // Auto-calculate priority fee
    })
  });
  
  if (!swapResponse.ok) {
    const error = await swapResponse.text();
    throw new Error(`Jupiter swap error: ${error}`);
  }
  
  const { swapTransaction } = await swapResponse.json();
  
  console.log('✅ Swap transaction received');
  
  // ── Step 2: Deserialize Transaction ──────────────────────────────────────
  // Jupiter returns the transaction as base64-encoded bytes
  
  const transactionBuf = Buffer.from(swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuf);
  
  console.log('✅ Transaction deserialized');
  
  // ── Step 3: Sign Transaction ─────────────────────────────────────────────
  transaction.sign([userKeypair]);
  
  console.log('✅ Transaction signed');
  
  // ── Step 4: Send Transaction ─────────────────────────────────────────────
  const rawTransaction = transaction.serialize();
  
  console.log('📤 Sending transaction...');
  
  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,  // Don't simulate first (faster but riskier)
    maxRetries: 2
  });
  
  console.log(`✅ Transaction sent: ${txid}`);
  
  // ── Step 5: Confirm Transaction ──────────────────────────────────────────
  console.log('⏳ Waiting for confirmation...');
  
  await connection.confirmTransaction(txid, 'confirmed');
  
  console.log(`✅ Transaction confirmed!`);
  
  return txid;
}

// ══════════════════════════════════════════════════════════════════════════════
// TELEGRAM BOT SWAP FLOW
// ══════════════════════════════════════════════════════════════════════════════

// ── Swap State Management ────────────────────────────────────────────────────
interface SwapState {
  step: 'idle' | 'select_input' | 'select_output' | 'enter_amount' | 'confirm';
  inputToken?: string;
  outputToken?: string;
  amount?: number;
  quote?: any;
}

const SWAP_STATES: Record<string, SwapState> = {};

function getSwapState(userId: number): SwapState {
  if (!SWAP_STATES[userId]) {
    SWAP_STATES[userId] = { step: 'idle' };
  }
  return SWAP_STATES[userId];
}

function resetSwapState(userId: number) {
  SWAP_STATES[userId] = { step: 'idle' };
}

// ── Step 1: Initiate Swap ────────────────────────────────────────────────────
bot.action('swap_tokens', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !USERS[userId]) {
    await ctx.answerCbQuery('No wallet');
    return ctx.reply('Generate a wallet first.');
  }
  
  await ctx.answerCbQuery('Starting swap...');
  
  const state = getSwapState(userId);
  state.step = 'select_input';
  
  await ctx.editMessageText(
    '💱 **Swap Tokens**\n\n' +
    '📝 Step 1: Select token to SELL',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('SOL', 'swap_input_SOL')],
        [Markup.button.callback('USDC', 'swap_input_USDC')],
        [Markup.button.callback('❌ Cancel', 'cancel_swap')]
      ])
    }
  );
});

// ── Step 2: Select Input Token ───────────────────────────────────────────────
bot.action(/^swap_input_(.+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const token = ctx.match[1];
  const state = getSwapState(userId);
  state.inputToken = token;
  state.step = 'select_output';
  
  await ctx.answerCbQuery(`Selling ${token}`);
  
  await ctx.editMessageText(
    `💱 **Swap Tokens**\n\n` +
    `Selling: ${token}\n\n` +
    `📝 Step 2: Select token to BUY`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('SOL', 'swap_output_SOL')],
        [Markup.button.callback('USDC', 'swap_output_USDC')],
        [Markup.button.callback('❌ Cancel', 'cancel_swap')]
      ])
    }
  );
});

// ── Step 3: Select Output Token ──────────────────────────────────────────────
bot.action(/^swap_output_(.+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const token = ctx.match[1];
  const state = getSwapState(userId);
  
  if (token === state.inputToken) {
    await ctx.answerCbQuery('❌ Cannot swap same token!');
    return;
  }
  
  state.outputToken = token;
  state.step = 'enter_amount';
  
  await ctx.answerCbQuery(`Buying ${token}`);
  
  await ctx.editMessageText(
    `💱 **Swap Tokens**\n\n` +
    `Swap: ${state.inputToken} → ${state.outputToken}\n\n` +
    `📝 Step 3: Enter amount of ${state.inputToken} to sell\n\n` +
    `Example: \`1\` or \`0.5\``,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'cancel_swap')]
      ])
    }
  );
});

// ── Step 4: Enter Amount and Get Quote ───────────────────────────────────────
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const state = getSwapState(userId);
  
  if (state.step === 'enter_amount') {
    const text = ctx.message.text.trim();
    const amount = parseFloat(text);
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply('❌ Invalid amount. Please enter a number.');
    }
    
    state.amount = amount;
    
    try {
      await ctx.reply('⏳ Fetching quote from Jupiter...');
      
      // Convert to lamports/raw units (assuming SOL = 9 decimals, USDC = 6)
      const decimals = state.inputToken === 'SOL' ? 9 : 6;
      const rawAmount = Math.floor(amount * Math.pow(10, decimals));
      
      const inputMint = TOKENS[state.inputToken as keyof typeof TOKENS];
      const outputMint = TOKENS[state.outputToken as keyof typeof TOKENS];
      
      const quote = await getJupiterQuote({
        inputMint,
        outputMint,
        amount: rawAmount,
        slippageBps: 50
      });
      
      state.quote = quote;
      state.step = 'confirm';
      
      // Calculate output amount (USDC = 6 decimals, SOL = 9 decimals)
      const outputDecimals = state.outputToken === 'SOL' ? 9 : 6;
      const outputAmount = Number(quote.outAmount) / Math.pow(10, outputDecimals);
      const minOutput = Number(quote.otherAmountThreshold) / Math.pow(10, outputDecimals);
      
      await ctx.reply(
        `📊 **Swap Quote**\n\n` +
        `Selling: ${amount} ${state.inputToken}\n` +
        `Receiving: ~${outputAmount.toFixed(6)} ${state.outputToken}\n` +
        `Minimum: ${minOutput.toFixed(6)} ${state.outputToken}\n\n` +
        `Price Impact: ${quote.priceImpactPct}%\n` +
        `Slippage: 0.5%\n\n` +
        `Route: ${quote.routePlan[0]?.swapInfo?.label || 'Multiple DEXs'}\n\n` +
        `⚠️ **Confirm this swap?**`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Confirm', 'confirm_swap'),
              Markup.button.callback('❌ Cancel', 'cancel_swap')
            ]
          ])
        }
      );
      
    } catch (error: any) {
      console.error('Quote error:', error);
      await ctx.reply(`❌ Failed to get quote: ${error.message}`);
      resetSwapState(userId);
    }
  }
});

// ── Step 5: Execute Swap ─────────────────────────────────────────────────────
bot.action('confirm_swap', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !USERS[userId]) return;
  
  const state = getSwapState(userId);
  
  if (state.step !== 'confirm' || !state.quote) {
    await ctx.answerCbQuery('❌ Invalid state');
    return;
  }
  
  await ctx.answerCbQuery('Executing swap...');
  await ctx.editMessageText('⏳ **Executing Swap...**\n\nPlease wait...');
  
  try {
    const signature = await executeJupiterSwap(
      connection,
      USERS[userId].keypair,
      state.quote
    );
    
    await ctx.editMessageText(
      `✅ **Swap Successful!**\n\n` +
      `Swapped: ${state.amount} ${state.inputToken} → ${state.outputToken}\n\n` +
      `Transaction:\n\`${signature}\`\n\n` +
      `🔍 [View on Solscan](https://solscan.io/tx/${signature})`,
      { parse_mode: 'Markdown' }
    );
    
    resetSwapState(userId);
    
  } catch (error: any) {
    console.error('Swap execution error:', error);
    await ctx.editMessageText(
      `❌ **Swap Failed**\n\n` +
      `Error: ${error.message}\n\n` +
      `Please try again.`,
      { parse_mode: 'Markdown' }
    );
    resetSwapState(userId);
  }
});

bot.action('cancel_swap', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  await ctx.answerCbQuery('Cancelled');
  resetSwapState(userId);
  
  ctx.editMessageText('❌ Swap cancelled.');
});

// ══════════════════════════════════════════════════════════════════════════════
// BASIC BOT SETUP
// ══════════════════════════════════════════════════════════════════════════════

bot.action('generate_wallet', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const keypair = Keypair.generate();
  USERS[userId] = { keypair };
  
  await ctx.answerCbQuery('Wallet generated!');
  ctx.editMessageText(
    `✅ Wallet Created\n\n\`${keypair.publicKey.toBase58()}\``,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💱 Swap Tokens', 'swap_tokens')]
      ])
    }
  );
});

bot.start((ctx) => {
  ctx.reply(
    '🤖 **Jupiter Swap Bot**\n\n' +
    'Swap tokens with best prices!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')],
        [Markup.button.callback('💱 Swap Tokens', 'swap_tokens')]
      ])
    }
  );
});

bot.catch((err) => console.error('Bot error:', err));
bot.launch({ allowedUpdates: ['message', 'callback_query'] });
console.log('✅ Jupiter swap bot running!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

Jupiter Aggregator = DEX aggregator finding best swap routes

Quote = Price estimate before executing swap

Slippage = Acceptable price change during execution (in basis points)

Price Impact = How much your trade moves the market price

Route Plan = Which DEXs will execute parts of your swap

Basis Points (bps) = 1/100th of a percent (50 bps = 0.5%)

VersionedTransaction = New Solana transaction format (supports lookup tables)

wrapAndUnwrapSol = Automatically handle SOL ↔ WSOL conversion

dynamicComputeUnitLimit = Let Jupiter optimize compute units needed

prioritizationFeeLamports = Extra fee to prioritize your transaction

*/
