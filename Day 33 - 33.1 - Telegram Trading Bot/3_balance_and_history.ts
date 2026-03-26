// Lecture Code - 3_balance_and_history.ts
// Topic: Checking Balances and Transaction History on Solana
// Day 33.1 - Telegram Trading Bot
//
// To run:
// 1. npm install telegraf @solana/web3.js dotenv
// 2. Create .env file with BOT_TOKEN and optional SOLANA_RPC_URL
// 3. npx ts-node 3_balance_and_history.ts

import { Telegraf, Markup } from 'telegraf';
import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey,
  clusterApiUrl
} from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// ── What is Solana RPC? ──────────────────────────────────────────────────────
//
// RPC (Remote Procedure Call) is how your bot talks to the Solana blockchain.
// It's like a phone line to Solana - you ask questions, it gives you answers.
//
// Real-Life Analogy: Think of RPC like calling your BANK'S AUTOMATED SYSTEM:
// - You call (connect to RPC)
// - Press 1 for balance (getBalance)
// - Press 2 for recent transactions (getSignaturesForAddress)
// - The system responds with your data
//
// Why use RPC?
//   1. READ BLOCKCHAIN DATA - Get balances, transactions, account info
//   2. SEND TRANSACTIONS - Submit signed transactions to the network
//   3. LISTEN TO EVENTS - Subscribe to real-time blockchain updates

// ══════════════════════════════════════════════════════════════════════════════
// SOLANA CONNECTION SETUP
// ══════════════════════════════════════════════════════════════════════════════

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

console.log(`🔗 Connected to Solana: ${SOLANA_RPC_URL}`);

// ══════════════════════════════════════════════════════════════════════════════
// USER WALLET STORAGE
// ══════════════════════════════════════════════════════════════════════════════

interface UserWallet {
  keypair: Keypair;
  createdAt: Date;
  lastAccessed: Date;
}

const USERS: Record<string, UserWallet> = {};

function getUserWallet(userId: number): UserWallet | null {
  const wallet = USERS[userId];
  if (wallet) wallet.lastAccessed = new Date();
  return wallet || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOT SETUP
// ══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN required');

const bot = new Telegraf(BOT_TOKEN);

const getMainMenuKeyboard = () => Markup.inlineKeyboard([
  [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')],
  [
    Markup.button.callback('👁️ View Address', 'view_address'),
    Markup.button.callback('💰 Check Balance', 'check_balance')
  ],
  [
    Markup.button.callback('📊 Transaction History', 'tx_history'),
    Markup.button.callback('💸 Send SOL', 'send_sol_menu')
  ]
]);

// ══════════════════════════════════════════════════════════════════════════════
// BALANCE CHECKING
// ══════════════════════════════════════════════════════════════════════════════

bot.action('check_balance', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    console.log(`💰 User ${userId} checking balance`);
    
    const wallet = getUserWallet(userId);
    if (!wallet) {
      await ctx.answerCbQuery('⚠️ No wallet found');
      return ctx.sendMessage('Generate a wallet first.', 
        Markup.inlineKeyboard([[Markup.button.callback('🔑 Generate', 'generate_wallet')]]));
    }
    
    await ctx.answerCbQuery('Fetching balance...');
    
    const publicKey = wallet.keypair.publicKey;
    const balanceLamports = await connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
    
    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
    const isRentExempt = balanceLamports >= rentExempt;
    
    const balanceMessage = `
💰 **Wallet Balance**

\`${publicKey.toBase58()}\`

**Balance:** ${balanceSOL.toFixed(6)} SOL
**Lamports:** ${balanceLamports.toLocaleString()}

**Status:** ${isRentExempt ? '✅ Rent Exempt' : '⚠️ Below Rent Exemption'}
${!isRentExempt ? `Need ${((rentExempt - balanceLamports) / LAMPORTS_PER_SOL).toFixed(6)} SOL more` : ''}

🔍 [View on Solscan](https://solscan.io/account/${publicKey.toBase58()}?cluster=devnet)
`;

    ctx.sendMessage(balanceMessage, { parse_mode: 'Markdown', ...getMainMenuKeyboard() });
    
  } catch (error: any) {
    console.error('Balance check error:', error);
    await ctx.answerCbQuery('❌ RPC Error');
    ctx.reply(`❌ Failed: ${error.message || 'Network issue'}`, getMainMenuKeyboard());
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTION HISTORY
// ══════════════════════════════════════════════════════════════════════════════

bot.action('tx_history', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    console.log(`📊 User ${userId} viewing transaction history`);
    
    const wallet = getUserWallet(userId);
    if (!wallet) {
      await ctx.answerCbQuery('⚠️ No wallet');
      return ctx.sendMessage('Generate a wallet first.');
    }
    
    await ctx.answerCbQuery('Fetching transactions...');
    
    const publicKey = wallet.keypair.publicKey;
    
    const signatures = await connection.getSignaturesForAddress(
      publicKey,
      { limit: 10 }
    );
    
    if (signatures.length === 0) {
      return ctx.sendMessage(
        '📊 **No Transactions Found**\n\n' +
        'This wallet hasn\'t made or received any transactions yet.\n\n' +
        '💡 Fund it using: https://solfaucet.com/',
        { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
      );
    }
    
    let message = `📊 **Recent Transactions** (Last ${signatures.length})\n\n`;
    
    for (const sig of signatures) {
      const status = sig.err ? '❌ Failed' : '✅ Success';
      const date = sig.blockTime 
        ? new Date(sig.blockTime * 1000).toLocaleString()
        : 'Unknown';
      const shortSig = `${sig.signature.slice(0, 8)}...${sig.signature.slice(-8)}`;
      
      message += `${status} \`${shortSig}\`\n`;
      message += `   📅 ${date}\n`;
      message += `   🔍 [View](https://solscan.io/tx/${sig.signature}?cluster=devnet)\n\n`;
    }
    
    ctx.sendMessage(message, { parse_mode: 'Markdown', ...getMainMenuKeyboard() });
    
  } catch (error: any) {
    console.error('TX history error:', error);
    await ctx.answerCbQuery('❌ Error');
    ctx.reply('❌ Failed to fetch history', getMainMenuKeyboard());
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WALLET GENERATION (Simple version)
// ══════════════════════════════════════════════════════════════════════════════

bot.action('generate_wallet', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const keypair = Keypair.generate();
  USERS[userId] = { keypair, createdAt: new Date(), lastAccessed: new Date() };
  
  await ctx.answerCbQuery('Wallet generated!');
  ctx.editMessageText(
    `✅ Wallet Created\n\n\`${keypair.publicKey.toBase58()}\``,
    { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
  );
});

bot.action('view_address', async (ctx) => {
  const wallet = getUserWallet(ctx.from?.id!);
  if (!wallet) {
    await ctx.answerCbQuery('No wallet');
    return ctx.reply('Generate wallet first.');
  }
  
  await ctx.answerCbQuery();
  ctx.sendMessage(
    `📋 Address:\n\`${wallet.keypair.publicKey.toBase58()}\``,
    { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// START & ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

bot.start(ctx => ctx.reply(
  '🤖 Solana Wallet Bot\n\nFeatures:\n✅ Balance checking\n✅ Transaction history',
  getMainMenuKeyboard()
));

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Error occurred').catch(console.error);
});

bot.launch({ allowedUpdates: ['message', 'callback_query'] });
console.log('✅ Bot with balance & history features running!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

connection.getBalance() = Returns balance in lamports (smallest unit)

LAMPORTS_PER_SOL = 1,000,000,000 (1 billion lamports = 1 SOL)

connection.getSignaturesForAddress() = Fetches transaction signatures for address

Rent Exemption = Minimum SOL needed to keep account alive on Solana

Commitment Level = How "final" a transaction must be ('confirmed' is good default)

blockTime = Unix timestamp when transaction was confirmed

*/
