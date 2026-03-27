// Lecture Code - 3_portfolio_tracking.ts
// Topic: Portfolio Tracking with Token Holdings and Prices
// Day 34.1 - Advanced Trading Bot Features
//
// To run:
// 1. npm install telegraf @solana/web3.js @solana/spl-token dotenv
// 2. npx ts-node 3_portfolio_tracking.ts

import { Telegraf, Markup } from 'telegraf';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

// ── What is Portfolio Tracking? ──────────────────────────────────────────────
//
// Portfolio tracking shows ALL assets a wallet holds with their current values.
//
// Real-Life Analogy: Like your STOCK PORTFOLIO APP (Robinhood, E*TRADE):
// - Shows all your holdings (stocks, crypto, etc.)
// - Current value of each
// - Total portfolio value
// - Percentage allocation
// - Gains/losses (if you track cost basis)
//
// Why track portfolio?
//   1. OVERVIEW - See total net worth at a glance
//   2. ALLOCATION - Know how diversified you are
//   3. DECISIONS - Help decide when to rebalance
//   4. TRACKING - Monitor performance over time

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN required');

const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
const bot = new Telegraf(BOT_TOKEN);

interface UserWallet {
  keypair: Keypair;
}

const USERS: Record<string, UserWallet> = {};

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN METADATA
// ══════════════════════════════════════════════════════════════════════════════

// ── Known Token Information ──────────────────────────────────────────────────
// In production, fetch from Solana Token List API
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana', decimals: 9 },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat', decimals: 6 },
};

function getTokenInfo(mint: string) {
  return KNOWN_TOKENS[mint] || { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 0 };
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE FETCHING
// ══════════════════════════════════════════════════════════════════════════════

// ── Fetch Token Price from Jupiter ───────────────────────────────────────────
async function getTokenPrice(tokenMint: string): Promise<number> {
  try {
    // Jupiter Price API v4
    const response = await fetch(
      `https://price.jup.ag/v4/price?ids=${tokenMint}`
    );
    
    if (!response.ok) {
      console.log(`Failed to fetch price for ${tokenMint}`);
      return 0;
    }
    
    const data = await response.json();
    const price = data.data[tokenMint]?.price || 0;
    
    return price;
    
  } catch (error) {
    console.error(`Error fetching price for ${tokenMint}:`, error);
    return 0;
  }
}

// ── Batch Fetch Multiple Token Prices ────────────────────────────────────────
async function getMultipleTokenPrices(tokenMints: string[]): Promise<Record<string, number>> {
  try {
    // Join mints with commas
    const mints = tokenMints.join(',');
    
    const response = await fetch(
      `https://price.jup.ag/v4/price?ids=${mints}`
    );
    
    if (!response.ok) {
      return {};
    }
    
    const data = await response.json();
    const prices: Record<string, number> = {};
    
    for (const mint of tokenMints) {
      prices[mint] = data.data[mint]?.price || 0;
    }
    
    return prices;
    
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    return {};
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DATA STRUCTURE
// ══════════════════════════════════════════════════════════════════════════════

interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  price: number;
  value: number;
}

interface Portfolio {
  solBalance: number;
  solPrice: number;
  solValue: number;
  tokenHoldings: TokenHolding[];
  totalValue: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO FETCHING
// ══════════════════════════════════════════════════════════════════════════════

async function getUserPortfolio(
  connection: Connection,
  walletPublicKey: PublicKey
): Promise<Portfolio> {
  console.log(`\n=== Fetching Portfolio ===`);
  console.log(`Wallet: ${walletPublicKey.toBase58()}`);
  
  // ── Step 1: Get SOL Balance ──────────────────────────────────────────────
  const solBalanceLamports = await connection.getBalance(walletPublicKey);
  const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;
  
  console.log(`SOL Balance: ${solBalance}`);
  
  // ── Step 2: Get All Token Accounts ───────────────────────────────────────
  // This fetches ALL SPL token accounts owned by the wallet
  
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  
  console.log(`Found ${tokenAccounts.value.length} token accounts`);
  
  // ── Step 3: Process Token Holdings ───────────────────────────────────────
  const holdings: TokenHolding[] = [];
  const tokenMints: string[] = [];
  
  for (const { account } of tokenAccounts.value) {
    const parsedInfo = account.data.parsed.info;
    
    // Skip empty accounts
    if (parsedInfo.tokenAmount.uiAmount === 0) {
      console.log(`  Skipping empty account: ${parsedInfo.mint}`);
      continue;
    }
    
    const mint = parsedInfo.mint;
    const amount = parsedInfo.tokenAmount.uiAmount;
    const decimals = parsedInfo.tokenAmount.decimals;
    const tokenInfo = getTokenInfo(mint);
    
    holdings.push({
      mint,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      amount,
      decimals,
      price: 0,  // Will fetch prices in next step
      value: 0
    });
    
    tokenMints.push(mint);
    
    console.log(`  ${tokenInfo.symbol}: ${amount}`);
  }
  
  // ── Step 4: Fetch Prices ─────────────────────────────────────────────────
  console.log('\nFetching prices...');
  
  // Add SOL mint to price fetch
  const allMints = ['So11111111111111111111111111111111111111112', ...tokenMints];
  const prices = await getMultipleTokenPrices(allMints);
  
  const solPrice = prices['So11111111111111111111111111111111111111112'] || 0;
  
  console.log(`SOL Price: $${solPrice}`);
  
  // ── Step 5: Calculate Values ─────────────────────────────────────────────
  for (const holding of holdings) {
    holding.price = prices[holding.mint] || 0;
    holding.value = holding.amount * holding.price;
    
    console.log(`  ${holding.symbol} Price: $${holding.price}`);
    console.log(`  ${holding.symbol} Value: $${holding.value.toFixed(2)}`);
  }
  
  // ── Step 6: Sort by Value ────────────────────────────────────────────────
  holdings.sort((a, b) => b.value - a.value);
  
  // ── Step 7: Calculate Total Value ────────────────────────────────────────
  const solValue = solBalance * solPrice;
  const tokensValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalValue = solValue + tokensValue;
  
  console.log(`\nTotal Portfolio Value: $${totalValue.toFixed(2)}`);
  
  return {
    solBalance,
    solPrice,
    solValue,
    tokenHoldings: holdings,
    totalValue
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DISPLAY
// ══════════════════════════════════════════════════════════════════════════════

function formatPortfolioMessage(portfolio: Portfolio): string {
  const { solBalance, solPrice, solValue, tokenHoldings, totalValue } = portfolio;
  
  // ── Header ────────────────────────────────────────────────────────────────
  let message = `💼 **Your Portfolio**\n\n`;
  message += `**Total Value:** $${totalValue.toFixed(2)}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // ── SOL Balance ───────────────────────────────────────────────────────────
  const solPercentage = totalValue > 0 ? (solValue / totalValue) * 100 : 0;
  
  message += `🪙 **SOL**: ${solBalance.toFixed(4)}\n`;
  message += `   $${solValue.toFixed(2)} (${solPercentage.toFixed(1)}%)\n`;
  message += `   @$${solPrice.toFixed(2)}\n\n`;
  
  // ── Token Holdings ────────────────────────────────────────────────────────
  if (tokenHoldings.length > 0) {
    for (const holding of tokenHoldings) {
      const percentage = totalValue > 0 ? (holding.value / totalValue) * 100 : 0;
      
      // Use emoji based on token symbol
      let emoji = '🪙';
      if (holding.symbol.includes('USDC') || holding.symbol.includes('USDT')) emoji = '💵';
      if (holding.symbol.includes('BONK')) emoji = '🐕';
      if (holding.symbol.includes('WIF')) emoji = '🐶';
      
      message += `${emoji} **${holding.symbol}**: ${holding.amount.toFixed(holding.decimals)}\n`;
      message += `   $${holding.value.toFixed(2)} (${percentage.toFixed(1)}%)\n`;
      message += `   @$${holding.price.toFixed(6)}\n\n`;
    }
  } else {
    message += `_No token holdings_\n\n`;
  }
  
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Last updated: ${new Date().toLocaleTimeString()}`;
  
  return message;
}

// ══════════════════════════════════════════════════════════════════════════════
// TELEGRAM BOT
// ══════════════════════════════════════════════════════════════════════════════

bot.action('view_portfolio', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId || !USERS[userId]) {
      await ctx.answerCbQuery('No wallet');
      return ctx.reply('Generate a wallet first.');
    }
    
    await ctx.answerCbQuery('Fetching portfolio...');
    
    // Show loading message
    const loadingMsg = await ctx.reply('⏳ Loading portfolio...');
    
    // Fetch portfolio
    const portfolio = await getUserPortfolio(
      connection,
      USERS[userId].keypair.publicKey
    );
    
    // Format message
    const message = formatPortfolioMessage(portfolio);
    
    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);
    
    // Send portfolio
    await ctx.sendMessage(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'view_portfolio')],
        [Markup.button.callback('📊 Detailed View', 'portfolio_detailed')],
        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
      ])
    });
    
  } catch (error: any) {
    console.error('Portfolio error:', error);
    await ctx.answerCbQuery('❌ Error');
    ctx.reply(`Failed to fetch portfolio: ${error.message}`);
  }
});

// ── Detailed Portfolio View ──────────────────────────────────────────────────
bot.action('portfolio_detailed', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !USERS[userId]) {
    await ctx.answerCbQuery('No wallet');
    return;
  }
  
  await ctx.answerCbQuery('Loading details...');
  
  const portfolio = await getUserPortfolio(
    connection,
    USERS[userId].keypair.publicKey
  );
  
  let message = `📊 **Detailed Portfolio Analysis**\n\n`;
  
  // Asset Allocation
  message += `**Asset Allocation:**\n`;
  message += `SOL: ${((portfolio.solValue / portfolio.totalValue) * 100).toFixed(1)}%\n`;
  
  for (const holding of portfolio.tokenHoldings) {
    const percentage = (holding.value / portfolio.totalValue) * 100;
    message += `${holding.symbol}: ${percentage.toFixed(1)}%\n`;
  }
  
  message += `\n**Diversification:**\n`;
  const assetCount = 1 + portfolio.tokenHoldings.length;
  message += `Holdings: ${assetCount} assets\n`;
  
  if (assetCount >= 5) {
    message += `Status: ✅ Well diversified\n`;
  } else if (assetCount >= 3) {
    message += `Status: ⚠️ Moderately diversified\n`;
  } else {
    message += `Status: ⚠️ Consider diversifying\n`;
  }
  
  ctx.sendMessage(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('← Back', 'view_portfolio')]
    ])
  });
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
        [Markup.button.callback('💼 View Portfolio', 'view_portfolio')]
      ])
    }
  );
});

bot.start((ctx) => {
  ctx.reply(
    '🤖 **Portfolio Tracker Bot**\n\n' +
    'Track all your Solana holdings!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')],
        [Markup.button.callback('💼 View Portfolio', 'view_portfolio')]
      ])
    }
  );
});

bot.catch((err) => console.error('Bot error:', err));
bot.launch({ allowedUpdates: ['message', 'callback_query'] });
console.log('✅ Portfolio tracker bot running!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

getParsedTokenAccountsByOwner() = Fetches all SPL token accounts for a wallet

Token Account = Account holding SPL tokens (separate from wallet)

Portfolio = Complete view of all holdings (SOL + tokens) with values

Asset Allocation = How portfolio is distributed across different assets

Diversification = Spreading holdings across multiple assets (reduces risk)

Jupiter Price API = Service providing real-time token prices

Batch Price Fetching = Getting multiple prices in one API call (efficient)

Total Value = Sum of all holdings valued in USD

Percentage Allocation = (Asset Value / Total Value) × 100

Real-time Pricing = Current market prices (not historical)

*/
