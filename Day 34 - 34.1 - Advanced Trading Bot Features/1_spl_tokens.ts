// Lecture Code - 1_spl_tokens.ts
// Topic: SPL Token Balance Checking and Transfers
// Day 34.1 - Advanced Trading Bot Features
//
// To run:
// 1. npm install telegraf @solana/web3.js @solana/spl-token dotenv
// 2. npx ts-node 1_spl_tokens.ts

import { Telegraf, Markup } from 'telegraf';
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, clusterApiUrl } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

// ── What are SPL Tokens? ─────────────────────────────────────────────────────
//
// SPL (Solana Program Library) Tokens are Solana's token standard, similar to
// ERC-20 on Ethereum. They represent fungible assets like USDC, BONK, etc.
//
// Real-Life Analogy: If SOL is CASH in your wallet, SPL tokens are GIFT CARDS:
// - You can have multiple gift cards (tokens) in one wallet
// - Each gift card type needs its own "slot" (Associated Token Account)
// - You can transfer gift cards to others
// - Each card has a balance independent of your cash (SOL)
//
// Why SPL tokens?
//   1. STABLECOINS - USDC, USDT for stable value
//   2. MEME COINS - BONK, WIF for speculation
//   3. DeFi TOKENS - Governance, rewards, liquidity
//   4. WRAPPED ASSETS - Wrapped Bitcoin, Ethereum on Solana

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN required');

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const bot = new Telegraf(BOT_TOKEN);

// ── Popular Token Mints (Devnet) ─────────────────────────────────────────────
// These are example devnet tokens. For mainnet, use actual token addresses.

const DEVNET_TOKENS: Record<string, { mint: string; symbol: string; decimals: number }> = {
  'USDC_DEV': {
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',  // Devnet USDC example
    symbol: 'USDC',
    decimals: 6
  },
  // Add more devnet tokens as needed
};

interface UserWallet {
  keypair: Keypair;
  createdAt: Date;
}

const USERS: Record<string, UserWallet> = {};

function getUserWallet(userId: number): UserWallet | null {
  return USERS[userId] || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// SPL TOKEN BALANCE CHECKING
// ══════════════════════════════════════════════════════════════════════════════

// ── Understanding Associated Token Accounts (ATA) ────────────────────────────
//
// Unlike SOL (which is stored directly in your wallet), SPL tokens require a
// separate "Associated Token Account" for each token type.
//
// ATA Address Formula:
//   ATA = DerivedAddress(WalletPublicKey, TokenMint, TokenProgram)
//
// This means:
// - Your wallet + USDC mint → Always the same USDC ATA
// - Your wallet + BONK mint → Always the same BONK ATA
// - Deterministic and predictable

async function getTokenBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  tokenMint: string,
  tokenSymbol: string,
  decimals: number
): Promise<{ balance: number; ata: string } | null> {
  try {
    console.log(`Checking ${tokenSymbol} balance for ${walletPublicKey.toBase58()}`);
    
    // ── Step 1: Get Token Mint PublicKey ─────────────────────────────────────
    const mintPublicKey = new PublicKey(tokenMint);
    
    // ── Step 2: Calculate ATA Address ────────────────────────────────────────
    // This is deterministic - same wallet + same token = same ATA every time
    const ata = await getAssociatedTokenAddress(
      mintPublicKey,      // The token mint
      walletPublicKey,    // The wallet owner
      false,              // allowOwnerOffCurve (usually false)
      TOKEN_PROGRAM_ID    // Token program (standard is TOKEN_PROGRAM_ID)
    );
    
    console.log(`  ATA address: ${ata.toBase58()}`);
    
    // ── Step 3: Try to Get Account Info ──────────────────────────────────────
    // This will throw an error if the account doesn't exist
    const accountInfo = await getAccount(
      connection,
      ata,
      'confirmed'
    );
    
    console.log(`  Raw amount: ${accountInfo.amount}`);
    
    // ── Step 4: Convert to Human-Readable Amount ─────────────────────────────
    // Tokens are stored as integers with decimals places
    // Example: USDC has 6 decimals
    //   1 USDC = 1,000,000 raw units
    //   Raw: 1000000 → Display: 1.000000
    
    const balance = Number(accountInfo.amount) / Math.pow(10, decimals);
    
    console.log(`  Balance: ${balance} ${tokenSymbol}`);
    
    return {
      balance,
      ata: ata.toBase58()
    };
    
  } catch (error: any) {
    // ── Handle Account Not Found ─────────────────────────────────────────────
    // If the ATA doesn't exist, it means the user has never received this token
    // Balance = 0
    
    if (error.message?.includes('could not find account')) {
      console.log(`  Account not found - balance is 0`);
      return null;
    }
    
    console.error(`  Error checking balance:`, error);
    throw error;
  }
}

bot.action('check_token_balance', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const wallet = getUserWallet(userId);
    if (!wallet) {
      await ctx.answerCbQuery('No wallet');
      return ctx.reply('Generate a wallet first.');
    }
    
    await ctx.answerCbQuery('Checking token balances...');
    
    let message = '💰 **Token Balances**\n\n';
    
    // Check each token
    for (const [key, tokenInfo] of Object.entries(DEVNET_TOKENS)) {
      const result = await getTokenBalance(
        connection,
        wallet.keypair.publicKey,
        tokenInfo.mint,
        tokenInfo.symbol,
        tokenInfo.decimals
      );
      
      if (result) {
        message += `${tokenInfo.symbol}: ${result.balance.toFixed(tokenInfo.decimals)}\n`;
        message += `  ATA: \`${result.ata}\`\n\n`;
      } else {
        message += `${tokenInfo.symbol}: 0 (no account)\n\n`;
      }
    }
    
    ctx.sendMessage(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'check_token_balance')],
        [Markup.button.callback('🏠 Menu', 'main_menu')]
      ])
    });
    
  } catch (error: any) {
    console.error('Error checking token balances:', error);
    await ctx.answerCbQuery('❌ Error');
    ctx.reply('Failed to check balances. Try again.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SPL TOKEN TRANSFERS
// ══════════════════════════════════════════════════════════════════════════════

// ── Transfer Flow ────────────────────────────────────────────────────────────
//
// Transferring SPL tokens is more complex than SOL because:
// 1. Must check if sender has enough tokens
// 2. Must check if recipient has an ATA for this token
// 3. If no ATA, must create it first (costs ~0.002 SOL)
// 4. Then transfer tokens from sender ATA → recipient ATA

async function sendSPLToken(
  connection: Connection,
  senderKeypair: Keypair,
  recipientAddress: string,
  tokenMint: string,
  amount: number,
  decimals: number
): Promise<string> {
  console.log(`\n=== Sending SPL Token ===`);
  console.log(`From: ${senderKeypair.publicKey.toBase58()}`);
  console.log(`To: ${recipientAddress}`);
  console.log(`Amount: ${amount}`);
  
  const mintPublicKey = new PublicKey(tokenMint);
  const recipientPublicKey = new PublicKey(recipientAddress);
  
  // ── Step 1: Convert Amount to Raw Units ──────────────────────────────────
  // User enters "1.5 USDC", we need to convert to 1,500,000 raw units
  const rawAmount = Math.floor(amount * Math.pow(10, decimals));
  console.log(`Raw amount: ${rawAmount}`);
  
  // ── Step 2: Get Sender's ATA ─────────────────────────────────────────────
  const senderATA = await getAssociatedTokenAddress(
    mintPublicKey,
    senderKeypair.publicKey
  );
  
  console.log(`Sender ATA: ${senderATA.toBase58()}`);
  
  // ── Step 3: Check Sender Has Sufficient Balance ──────────────────────────
  const senderAccount = await getAccount(connection, senderATA);
  
  if (Number(senderAccount.amount) < rawAmount) {
    throw new Error('Insufficient token balance');
  }
  
  // ── Step 4: Get Recipient's ATA ──────────────────────────────────────────
  const recipientATA = await getAssociatedTokenAddress(
    mintPublicKey,
    recipientPublicKey
  );
  
  console.log(`Recipient ATA: ${recipientATA.toBase58()}`);
  
  // ── Step 5: Check if Recipient ATA Exists ────────────────────────────────
  const recipientAccountInfo = await connection.getAccountInfo(recipientATA);
  const needsATACreation = recipientAccountInfo === null;
  
  if (needsATACreation) {
    console.log('⚠️  Recipient ATA does not exist - will create it');
  }
  
  // ── Step 6: Build Transaction ────────────────────────────────────────────
  const transaction = new Transaction();
  
  // If recipient doesn't have ATA, create it first
  if (needsATACreation) {
    console.log('Adding ATA creation instruction...');
    
    const createATAIx = createAssociatedTokenAccountInstruction(
      senderKeypair.publicKey,  // Payer (sender pays rent)
      recipientATA,              // ATA address to create
      recipientPublicKey,        // Owner of the ATA
      mintPublicKey              // Token mint
    );
    
    transaction.add(createATAIx);
  }
  
  // Add transfer instruction
  console.log('Adding transfer instruction...');
  
  const transferIx = createTransferInstruction(
    senderATA,                   // Source (sender's ATA)
    recipientATA,                // Destination (recipient's ATA)
    senderKeypair.publicKey,     // Owner of source account
    rawAmount                    // Amount to transfer
  );
  
  transaction.add(transferIx);
  
  // ── Step 7: Send and Confirm ─────────────────────────────────────────────
  console.log('Sending transaction...');
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [senderKeypair],
    { commitment: 'confirmed' }
  );
  
  console.log(`✅ Transfer successful!`);
  console.log(`Signature: ${signature}`);
  
  return signature;
}

// ── Token Send UI Flow (Simplified) ──────────────────────────────────────────
// In production, implement full multi-step flow like Day 33's send SOL

bot.command('sendtoken', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const wallet = getUserWallet(userId);
  if (!wallet) {
    return ctx.reply('Generate a wallet first.');
  }
  
  ctx.reply(
    '💸 **Send SPL Token**\n\n' +
    'To send tokens, use this format:\n' +
    '`/send <token> <amount> <address>`\n\n' +
    'Example:\n' +
    '`/send USDC 10 7xJ9qJxmQ8ZHqGnxF4hP3vN2kD5tL1wY9aB6cR8eT3mK`\n\n' +
    '⚠️ Note: If recipient doesn\'t have a token account, ~0.002 SOL will be deducted for creation.',
    { parse_mode: 'Markdown' }
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPER COMMANDS
// ══════════════════════════════════════════════════════════════════════════════

bot.action('generate_wallet', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const keypair = Keypair.generate();
  USERS[userId] = { keypair, createdAt: new Date() };
  
  await ctx.answerCbQuery('Wallet generated!');
  ctx.editMessageText(
    `✅ Wallet Created\n\n\`${keypair.publicKey.toBase58()}\`\n\n` +
    'Now you can check token balances!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💰 Check Token Balances', 'check_token_balance')],
        [Markup.button.callback('💸 Send Tokens', 'send_token_info')]
      ])
    }
  );
});

bot.action('send_token_info', (ctx) => {
  ctx.answerCbQuery();
  ctx.sendMessage(
    '💸 To send tokens, use:\n' +
    '`/sendtoken`\n\n' +
    'Then follow the instructions.',
    { parse_mode: 'Markdown' }
  );
});

bot.start((ctx) => {
  ctx.reply(
    '🤖 **SPL Token Bot**\n\n' +
    'Features:\n' +
    '✅ Check SPL token balances\n' +
    '✅ Send SPL tokens\n' +
    '✅ Auto-create recipient token accounts',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')],
        [Markup.button.callback('💰 Check Balances', 'check_token_balance')]
      ])
    }
  );
});

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Error occurred').catch(console.error);
});

bot.launch({ allowedUpdates: ['message', 'callback_query'] });
console.log('✅ SPL Token bot running!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

SPL Token = Solana's token standard (like ERC-20)

Associated Token Account (ATA) = Special account that holds SPL tokens for a wallet

getAssociatedTokenAddress() = Calculates ATA address deterministically

getAccount() = Fetches token account info (balance, owner, etc.)

getMint() = Fetches token mint info (decimals, supply, etc.)

Decimals = Number of decimal places (USDC=6, BONK=5, SOL=9)

Raw Amount = Integer representation (1 USDC = 1,000,000 raw)

createAssociatedTokenAccountInstruction() = Creates new ATA (costs ~0.002 SOL rent)

createTransferInstruction() = Transfers tokens between ATAs

ATA Creation Cost = ~0.002 SOL (rent-exempt minimum), paid by transaction sender

TOKEN_PROGRAM_ID = Standard SPL token program address

──────────────────────────────────────────────────────────────────────────────

IMPORTANT DIFFERENCES: SOL vs SPL TOKENS
──────────────────────────────────────────────────────────────────────────────

SOL (Native):
- Balance stored directly in wallet
- One account per wallet
- Transfer with SystemProgram.transfer()
- No account creation needed

SPL Tokens:
- Balance stored in Associated Token Account (ATA)
- One ATA per token type per wallet
- Transfer with Token Program instructions
- Must create ATA if recipient doesn't have one
- Creating ATA costs ~0.002 SOL

──────────────────────────────────────────────────────────────────────────────

TESTING TIPS:
──────────────────────────────────────────────────────────────────────────────

1. Use Solana devnet for testing
2. Find devnet tokens at: https://spl.solana.com/token
3. Or create your own token for testing
4. Airdrop devnet SOL for gas fees
5. Test ATA creation with fresh wallets

*/
