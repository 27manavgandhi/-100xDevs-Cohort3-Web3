// Lecture Code - 4_send_sol.ts
// Topic: Sending SOL Transactions with Multi-Step Flow
// Day 33.1 - Telegram Trading Bot
//
// To run:
// 1. npm install telegraf @solana/web3.js dotenv
// 2. Fund your wallet with devnet SOL: https://solfaucet.com/
// 3. npx ts-node 4_send_sol.ts

import { Telegraf, Markup } from 'telegraf';
import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl
} from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// ── What is a Solana Transaction? ───────────────────────────────────────────
//
// A transaction is like a LETTER you send to the blockchain containing:
// 1. Instructions (what to do: transfer SOL, call program, etc.)
// 2. Signatures (proof you authorized it)
// 3. Recent blockhash (timestamp to prevent replays)
//
// Real-Life Analogy: Think of it like SENDING MONEY via BANK TRANSFER:
// - You fill out a form (create transaction)
// - You sign it (add your signature with private key)
// - Bank processes it (blockchain validators confirm)
// - Money moves (state changes on-chain)
//
// Why use transactions?
//   1. ATOMIC - All instructions succeed or all fail (no partial execution)
//   2. SIGNED - Cryptographically proven you authorized it
//   3. PERMANENT - Immutable record on blockchain

// ══════════════════════════════════════════════════════════════════════════════
// SOLANA CONNECTION
// ══════════════════════════════════════════════════════════════════════════════

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// ══════════════════════════════════════════════════════════════════════════════
// USER STATE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

interface UserWallet {
  keypair: Keypair;
  createdAt: Date;
}

// ── Send Flow State Machine ──────────────────────────────────────────────────
// Users go through stages when sending SOL:
// idle → waiting_address → waiting_amount → confirming → sending

type SendStep = 'idle' | 'waiting_address' | 'waiting_amount' | 'confirming';

interface UserSendState {
  step: SendStep;
  recipientAddress?: string;
  amount?: number;
}

const USERS: Record<string, UserWallet> = {};
const SEND_STATES: Record<string, UserSendState> = {};

function getUserWallet(userId: number): UserWallet | null {
  return USERS[userId] || null;
}

function getSendState(userId: number): UserSendState {
  if (!SEND_STATES[userId]) {
    SEND_STATES[userId] = { step: 'idle' };
  }
  return SEND_STATES[userId];
}

function resetSendState(userId: number): void {
  SEND_STATES[userId] = { step: 'idle' };
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
    Markup.button.callback('💰 Check Balance', 'check_balance'),
    Markup.button.callback('📊 History', 'tx_history')
  ],
  [Markup.button.callback('💸 Send SOL', 'send_sol_menu')]
]);

// ══════════════════════════════════════════════════════════════════════════════
// SEND SOL - STEP 1: INITIATE SEND
// ══════════════════════════════════════════════════════════════════════════════

bot.action('send_sol_menu', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const wallet = getUserWallet(userId);
    if (!wallet) {
      await ctx.answerCbQuery('No wallet');
      return ctx.reply('Generate a wallet first.', getMainMenuKeyboard());
    }
    
    // Check balance before allowing send
    const balance = await connection.getBalance(wallet.keypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    if (balance === 0) {
      await ctx.answerCbQuery('⚠️ Zero balance!');
      return ctx.reply(
        '❌ **Insufficient Balance**\n\n' +
        'Your wallet has 0 SOL. Fund it first:\n' +
        'https://solfaucet.com/',
        { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
      );
    }
    
    await ctx.answerCbQuery('Starting send flow...');
    
    // Set state to waiting for address
    const state = getSendState(userId);
    state.step = 'waiting_address';
    
    await ctx.editMessageText(
      `💸 **Send SOL**\n\n` +
      `Your balance: ${balanceSOL.toFixed(6)} SOL\n\n` +
      `📝 Step 1 of 3: Enter Recipient Address\n\n` +
      `Please send the Solana address you want to send to.\n\n` +
      `Example:\n\`7xJ9qJxmQ8ZHqGnxF4hP3vN2kD5tL1wY9aB6cR8eT3mK\`\n\n` +
      `Or click Cancel to abort.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_send')]
        ])
      }
    );
    
    console.log(`💸 User ${userId} started send flow`);
    
  } catch (error: any) {
    console.error('Send init error:', error);
    await ctx.answerCbQuery('❌ Error');
    ctx.reply('Failed to initiate send', getMainMenuKeyboard());
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEND SOL - STEP 2: RECEIVE ADDRESS
// ══════════════════════════════════════════════════════════════════════════════

bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const state = getSendState(userId);
  const text = ctx.message.text.trim();
  
  // ── Handle Address Input ─────────────────────────────────────────────────
  if (state.step === 'waiting_address') {
    console.log(`📝 User ${userId} sent address: ${text}`);
    
    // Validate Solana address
    try {
      const recipientPubkey = new PublicKey(text);
      
      // Additional validation: check if address is valid and not own address
      const wallet = getUserWallet(userId);
      if (!wallet) {
        resetSendState(userId);
        return ctx.reply('Wallet not found. Please start over.');
      }
      
      if (recipientPubkey.equals(wallet.keypair.publicKey)) {
        return ctx.reply(
          '❌ **Cannot Send to Yourself**\n\n' +
          'Please enter a different address.',
          Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'cancel_send')]
          ])
        );
      }
      
      // Save address and move to next step
      state.recipientAddress = text;
      state.step = 'waiting_amount';
      
      const balance = await connection.getBalance(wallet.keypair.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
      const maxSend = Math.max(0, (balance - rentExempt - 5000) / LAMPORTS_PER_SOL);
      
      await ctx.reply(
        `✅ **Address Validated**\n\n` +
        `Sending to:\n\`${text.slice(0, 8)}...${text.slice(-8)}\`\n\n` +
        `📝 Step 2 of 3: Enter Amount\n\n` +
        `Your balance: ${balanceSOL.toFixed(6)} SOL\n` +
        `Max you can send: ~${maxSend.toFixed(6)} SOL\n` +
        `(Keeping rent + fee)\n\n` +
        `How much SOL do you want to send?\n\n` +
        `Examples: \`0.1\`, \`0.5\`, \`1.0\``,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'cancel_send')]
          ])
        }
      );
      
    } catch (error) {
      return ctx.reply(
        '❌ **Invalid Solana Address**\n\n' +
        'Please enter a valid Solana address.\n\n' +
        'Example:\n\`7xJ9qJxmQ8ZHqGnxF4hP3vN2kD5tL1wY9aB6cR8eT3mK\`',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'cancel_send')]
          ])
        }
      );
    }
  }
  
  // ── Handle Amount Input ──────────────────────────────────────────────────
  else if (state.step === 'waiting_amount') {
    console.log(`💵 User ${userId} entered amount: ${text}`);
    
    // Parse and validate amount
    const amount = parseFloat(text);
    
    if (isNaN(amount) || amount <= 0) {
      return ctx.reply(
        '❌ **Invalid Amount**\n\n' +
        'Please enter a positive number.\n\n' +
        'Examples: \`0.1\`, \`0.5\`, \`1.0\`',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'cancel_send')]
          ])
        }
      );
    }
    
    const wallet = getUserWallet(userId);
    if (!wallet) {
      resetSendState(userId);
      return ctx.reply('Wallet not found.');
    }
    
    const balance = await connection.getBalance(wallet.keypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
    
    // Estimate transaction fee (5000 lamports is typical)
    const estimatedFee = 5000;
    const totalNeeded = (amount * LAMPORTS_PER_SOL) + rentExempt + estimatedFee;
    
    if (totalNeeded > balance) {
      return ctx.reply(
        `❌ **Insufficient Balance**\n\n` +
        `You're trying to send: ${amount} SOL\n` +
        `Your balance: ${balanceSOL.toFixed(6)} SOL\n\n` +
        `Remember to keep:\n` +
        `• Rent exemption: ${(rentExempt / LAMPORTS_PER_SOL).toFixed(6)} SOL\n` +
        `• Transaction fee: ~0.000005 SOL\n\n` +
        `Please enter a smaller amount.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'cancel_send')]
          ])
        }
      );
    }
    
    // Save amount and show confirmation
    state.amount = amount;
    state.step = 'confirming';
    
    await ctx.reply(
      `📝 **Confirm Transaction**\n\n` +
      `From: \`${wallet.keypair.publicKey.toBase58().slice(0, 8)}...${wallet.keypair.publicKey.toBase58().slice(-8)}\`\n` +
      `To: \`${state.recipientAddress!.slice(0, 8)}...${state.recipientAddress!.slice(-8)}\`\n` +
      `Amount: **${amount} SOL**\n\n` +
      `Fee: ~0.000005 SOL\n` +
      `New balance: ~${(balanceSOL - amount - 0.000005).toFixed(6)} SOL\n\n` +
      `⚠️ **This action cannot be undone!**\n\n` +
      `Are you sure you want to send?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Confirm Send', 'confirm_send'),
            Markup.button.callback('❌ Cancel', 'cancel_send')
          ]
        ])
      }
    );
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEND SOL - STEP 3: EXECUTE TRANSACTION
// ══════════════════════════════════════════════════════════════════════════════

bot.action('confirm_send', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const state = getSendState(userId);
    
    if (state.step !== 'confirming' || !state.recipientAddress || !state.amount) {
      await ctx.answerCbQuery('❌ Invalid state');
      return ctx.reply('Send flow error. Please start over.', getMainMenuKeyboard());
    }
    
    const wallet = getUserWallet(userId);
    if (!wallet) {
      await ctx.answerCbQuery('❌ No wallet');
      resetSendState(userId);
      return ctx.reply('Wallet not found.', getMainMenuKeyboard());
    }
    
    await ctx.answerCbQuery('Sending transaction...');
    await ctx.editMessageText('⏳ **Sending Transaction...**\n\nPlease wait...');
    
    console.log(`📤 Executing send for user ${userId}: ${state.amount} SOL to ${state.recipientAddress}`);
    
    // ── Create Transaction ───────────────────────────────────────────────────
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.keypair.publicKey,
        toPubkey: new PublicKey(state.recipientAddress),
        lamports: Math.floor(state.amount * LAMPORTS_PER_SOL)
      })
    );
    
    // ── Send and Confirm ─────────────────────────────────────────────────────
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet.keypair],
      {
        commitment: 'confirmed'
      }
    );
    
    console.log(`✅ Transaction successful: ${signature}`);
    
    // ── Get Updated Balance ──────────────────────────────────────────────────
    const newBalance = await connection.getBalance(wallet.keypair.publicKey);
    const newBalanceSOL = newBalance / LAMPORTS_PER_SOL;
    
    // ── Send Success Message ─────────────────────────────────────────────────
    await ctx.editMessageText(
      `✅ **Transaction Successful!**\n\n` +
      `Sent: ${state.amount} SOL\n` +
      `To: \`${state.recipientAddress.slice(0, 8)}...${state.recipientAddress.slice(-8)}\`\n\n` +
      `Transaction:\n\`${signature}\`\n\n` +
      `🔍 [View on Solscan](https://solscan.io/tx/${signature}?cluster=devnet)\n\n` +
      `New balance: ${newBalanceSOL.toFixed(6)} SOL`,
      {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      }
    );
    
    // Reset state
    resetSendState(userId);
    
  } catch (error: any) {
    console.error('Send transaction error:', error);
    await ctx.answerCbQuery('❌ Transaction failed');
    
    await ctx.editMessageText(
      `❌ **Transaction Failed**\n\n` +
      `Error: ${error.message || 'Unknown error'}\n\n` +
      `Common causes:\n` +
      `• Insufficient balance\n` +
      `• Network congestion\n` +
      `• RPC timeout\n\n` +
      `Please try again.`,
      {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      }
    );
    
    resetSendState(userId);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CANCEL SEND
// ══════════════════════════════════════════════════════════════════════════════

bot.action('cancel_send', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  await ctx.answerCbQuery('Cancelled');
  resetSendState(userId);
  
  await ctx.editMessageText(
    '❌ **Send Cancelled**\n\n' +
    'No funds were transferred.',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// BASIC HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

bot.action('generate_wallet', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const keypair = Keypair.generate();
  USERS[userId] = { keypair, createdAt: new Date() };
  
  await ctx.answerCbQuery('Wallet generated!');
  ctx.editMessageText(
    `✅ Wallet Created\n\n\`${keypair.publicKey.toBase58()}\`\n\n` +
    `Fund it: https://solfaucet.com/`,
    { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
  );
});

bot.action('check_balance', async (ctx) => {
  const wallet = getUserWallet(ctx.from?.id!);
  if (!wallet) {
    await ctx.answerCbQuery('No wallet');
    return ctx.reply('Generate wallet first.', getMainMenuKeyboard());
  }
  
  const balance = await connection.getBalance(wallet.keypair.publicKey);
  await ctx.answerCbQuery();
  ctx.sendMessage(
    `💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
    getMainMenuKeyboard()
  );
});

bot.start(ctx => ctx.reply('🤖 Solana Wallet Bot with Send Feature', getMainMenuKeyboard()));

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Error occurred').catch(console.error);
});

bot.launch({ allowedUpdates: ['message', 'callback_query'] });
console.log('✅ Bot with full send functionality running!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

SystemProgram.transfer() = Creates instruction to transfer SOL between accounts

Transaction = Container for instructions to be executed atomically

sendAndConfirmTransaction() = Sends transaction and waits for confirmation

State Machine = Track user progress through multi-step flow (waiting_address → waiting_amount → confirming)

Input Validation = CRITICAL: validate address format, amount, balance before sending

Rent Exemption = Must keep minimum balance in account to prevent deletion

Transaction Fee = Small fee (5000 lamports) paid to validators

Signature = Unique transaction ID that can be used to look up transaction on explorers

*/
