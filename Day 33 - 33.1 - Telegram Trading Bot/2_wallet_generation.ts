// Lecture Code - 2_wallet_generation.ts
// Topic: Generating and Managing Solana Wallets
// Day 33.1 - Telegram Trading Bot
//
// To run:
// 1. npm install telegraf @solana/web3.js dotenv
// 2. Create .env file with BOT_TOKEN=your_token_here
// 3. npx ts-node 2_wallet_generation.ts

import { Telegraf, Markup } from 'telegraf';
import { Keypair, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import * as bs58 from 'bs58';

dotenv.config();

// ── What is a Solana Keypair? ────────────────────────────────────────────────
//
// A Keypair is a cryptographic key pair consisting of:
// 1. PUBLIC KEY (32 bytes) - Your wallet address (like an email address)
// 2. PRIVATE KEY (64 bytes) - Your signature authority (like a password)
//
// Real-Life Analogy: Think of a Keypair like a SAFE DEPOSIT BOX:
// - Public Key = The box number (everyone can see it, use it to send you items)
// - Private Key = The key to open the box (only you should have it)
//
// Why separate keys?
//   1. RECEIVE FUNDS - Share public key freely, anyone can send you SOL
//   2. SEND FUNDS - Private key proves ownership, signs transactions
//   3. SECURITY - Even if someone knows your address, they can't steal funds

// ══════════════════════════════════════════════════════════════════════════════
// USER DATA STORAGE
// ══════════════════════════════════════════════════════════════════════════════

// ── In-Memory Storage ────────────────────────────────────────────────────────
// For this demo, we store keypairs in memory (NOT suitable for production!)
// In production, you'd use:
// 1. Encrypted database (PostgreSQL with pgcrypto)
// 2. Hardware Security Modules (HSM)
// 3. Key Management Services (AWS KMS, Google Cloud KMS)

interface UserWallet {
  keypair: Keypair;
  createdAt: Date;
  lastAccessed: Date;
}

// Map of Telegram User ID → Wallet Data
const USERS: Record<string, UserWallet> = {};

// ── Helper Function: Get or Create Wallet ────────────────────────────────────
function getUserWallet(userId: number): UserWallet | null {
  const wallet = USERS[userId];
  
  if (wallet) {
    wallet.lastAccessed = new Date();
  }
  
  return wallet || null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOT SETUP
// ══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided in .env file');
}

const bot = new Telegraf(BOT_TOKEN);

// ── Main Menu Keyboard (Reusable) ────────────────────────────────────────────
const getMainMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')],
    [
      Markup.button.callback('👁️ View Address', 'view_address'),
      Markup.button.callback('🔐 Export Private Key', 'export_private_key')
    ],
    [
      Markup.button.callback('💰 Check Balance', 'check_balance'),
      Markup.button.callback('📊 Transaction History', 'tx_history')
    ],
    [
      Markup.button.callback('💸 Send SOL', 'send_sol_menu'),
      Markup.button.callback('🪙 Send Token', 'send_token_menu')
    ]
  ]);
};

// ══════════════════════════════════════════════════════════════════════════════
// WALLET GENERATION
// ══════════════════════════════════════════════════════════════════════════════

bot.action('generate_wallet', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) {
      await ctx.answerCbQuery('❌ Could not identify user');
      return;
    }
    
    console.log(`🔑 User ${userId} requested wallet generation`);
    
    // ── Check if user already has a wallet ──────────────────────────────────
    const existingWallet = getUserWallet(userId);
    
    if (existingWallet) {
      console.log(`⚠️  User ${userId} already has a wallet`);
      
      // Show confirmation keyboard
      await ctx.answerCbQuery('⚠️ You already have a wallet!');
      
      await ctx.editMessageText(
        '⚠️ **Wallet Already Exists!**\n\n' +
        'You already have a wallet. Generating a new one will **permanently delete** ' +
        'your current wallet and any funds in it.\n\n' +
        '**Current Wallet:**\n' +
        `Address: \`${existingWallet.keypair.publicKey.toBase58()}\`\n` +
        `Created: ${existingWallet.createdAt.toLocaleString()}\n\n` +
        '**Are you sure you want to continue?**',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Yes, Generate New', 'confirm_generate_wallet'),
              Markup.button.callback('❌ Cancel', 'cancel_generate')
            ]
          ])
        }
      );
      
      return;
    }
    
    // ── Generate new wallet ──────────────────────────────────────────────────
    await generateNewWallet(ctx, userId);
    
  } catch (error) {
    console.error('Error in generate_wallet:', error);
    await ctx.answerCbQuery('❌ Failed to generate wallet');
    return ctx.reply('❌ An error occurred. Please try again.');
  }
});

// ── Confirmed Wallet Generation ──────────────────────────────────────────────
bot.action('confirm_generate_wallet', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) return;
    
    console.log(`✅ User ${userId} confirmed wallet regeneration`);
    
    await ctx.answerCbQuery('Generating new wallet...');
    await generateNewWallet(ctx, userId);
    
  } catch (error) {
    console.error('Error in confirm_generate_wallet:', error);
    await ctx.answerCbQuery('❌ Error generating wallet');
  }
});

// ── Cancel Generation ────────────────────────────────────────────────────────
bot.action('cancel_generate', async (ctx) => {
  await ctx.answerCbQuery('Cancelled');
  
  await ctx.editMessageText(
    '✅ **Wallet Generation Cancelled**\n\n' +
    'Your existing wallet is safe. Use the menu below:',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
});

// ── Wallet Generation Logic ──────────────────────────────────────────────────
async function generateNewWallet(ctx: any, userId: number): Promise<void> {
  // ── Step 1: Generate Keypair ─────────────────────────────────────────────
  // Keypair.generate() creates a random 512-bit keypair
  // Uses Ed25519 elliptic curve cryptography
  
  const keypair = Keypair.generate();
  
  console.log('🔐 Generated new keypair:');
  console.log(`   Public Key: ${keypair.publicKey.toBase58()}`);
  console.log(`   Secret Key Length: ${keypair.secretKey.length} bytes`);
  
  // ── Step 2: Store in Memory ──────────────────────────────────────────────
  USERS[userId] = {
    keypair: keypair,
    createdAt: new Date(),
    lastAccessed: new Date()
  };
  
  console.log(`💾 Stored wallet for user ${userId}`);
  
  // ── Step 3: Get Public Key in Base58 Format ──────────────────────────────
  // Base58 is like Base64 but removes confusing characters (0, O, I, l)
  // Example: 7xJ9qJxmQ8ZHqGnxF4hP3vN2kD5tL1wY9aB6cR8eT3mK
  
  const publicKeyBase58 = keypair.publicKey.toBase58();
  
  // ── Step 4: Send Success Message ─────────────────────────────────────────
  const successMessage = `
✅ **Wallet Generated Successfully!**

🔑 **Your Solana Address:**
\`${publicKeyBase58}\`

**Important Information:**
• This is your PUBLIC address (safe to share)
• Use it to RECEIVE SOL and tokens
• Copy it by tapping the address above
• Fund it using Solana faucet or transfers

**Security Reminder:**
⚠️ Your private key is stored securely
⚠️ Export it using the 'Export Private Key' button
⚠️ NEVER share your private key with anyone

**What's Next?**
1. Fund your wallet (use devnet faucet for testing)
2. Check your balance
3. Send SOL to other addresses

Use the menu below to continue:
`;

  await ctx.editMessageText(successMessage, {
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard()
  });
  
  console.log(`✅ Wallet generation complete for user ${userId}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// VIEW WALLET ADDRESS
// ══════════════════════════════════════════════════════════════════════════════

bot.action('view_address', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) return;
    
    console.log(`👁️  User ${userId} viewing address`);
    
    // ── Check if wallet exists ───────────────────────────────────────────────
    const wallet = getUserWallet(userId);
    
    if (!wallet) {
      await ctx.answerCbQuery('⚠️ No wallet found');
      
      return ctx.sendMessage(
        '❌ **No Wallet Found**\n\n' +
        'You don\'t have a wallet yet. Please generate one first.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')]
          ])
        }
      );
    }
    
    await ctx.answerCbQuery('Getting public key...');
    
    // ── Get Public Key ───────────────────────────────────────────────────────
    const publicKey = wallet.keypair.publicKey.toBase58();
    
    // ── Create QR Code-style Display ─────────────────────────────────────────
    const addressMessage = `
📋 **Your Wallet Address**

\`${publicKey}\`

**How to Use:**
• Tap the address above to copy it
• Share this to receive SOL or tokens
• Use it on block explorers to view transactions
• Fund it using faucets or transfers

**Quick Links:**
🔍 [View on Solscan](https://solscan.io/account/${publicKey}?cluster=devnet)
🚰 [Get Devnet SOL](https://solfaucet.com/)

**Wallet Info:**
Created: ${wallet.createdAt.toLocaleString()}
Last Accessed: ${wallet.lastAccessed.toLocaleString()}
`;

    ctx.sendMessage(addressMessage, {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    });
    
    console.log(`✅ Displayed address for user ${userId}`);
    
  } catch (error) {
    console.error('Error in view_address:', error);
    await ctx.answerCbQuery('❌ Failed to get address');
    return ctx.reply('❌ An error occurred. Please try again.');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT PRIVATE KEY
// ══════════════════════════════════════════════════════════════════════════════

bot.action('export_private_key', async (ctx) => {
  try {
    const userId = ctx.from?.id;
    
    if (!userId) return;
    
    console.log(`🔐 User ${userId} exporting private key`);
    
    // ── Check if wallet exists ───────────────────────────────────────────────
    const wallet = getUserWallet(userId);
    
    if (!wallet) {
      await ctx.answerCbQuery('⚠️ No wallet found');
      return ctx.reply('Please generate a wallet first.');
    }
    
    // ── Show Security Warning ────────────────────────────────────────────────
    await ctx.answerCbQuery('⚠️ Private key is HIGHLY sensitive!');
    
    // ── Convert Secret Key to Different Formats ──────────────────────────────
    
    // Format 1: Array of numbers (most common for importing)
    const secretKeyArray = Array.from(wallet.keypair.secretKey);
    const secretKeyJSON = JSON.stringify(secretKeyArray);
    
    // Format 2: Base58 (used by some wallets)
    const secretKeyBase58 = bs58.encode(wallet.keypair.secretKey);
    
    // Format 3: Hex (alternative format)
    const secretKeyHex = Buffer.from(wallet.keypair.secretKey).toString('hex');
    
    // ── Send Private Key with STRONG Warnings ────────────────────────────────
    const exportMessage = `
🔐 **PRIVATE KEY EXPORT**

⚠️ **CRITICAL SECURITY WARNING** ⚠️

**DO NOT:**
❌ Share this with ANYONE
❌ Post it online or in groups
❌ Screenshot and save unencrypted
❌ Send via unsecured channels

**DO:**
✅ Save it in a password manager
✅ Write it down and store securely
✅ Delete this message after saving
✅ Use it only for wallet recovery

────────────────────────────────

**Format 1: Array (Recommended)**
\`${secretKeyJSON}\`

**Format 2: Base58**
\`${secretKeyBase58}\`

────────────────────────────────

**How to Import:**
1. Copy the array format above
2. Use in code: \`Keypair.fromSecretKey(new Uint8Array([...]))\`
3. Or import in wallet apps that support it

⚠️ **Delete this message immediately after saving!**
`;

    // Send as a reply that can be easily deleted
    const sentMessage = await ctx.reply(exportMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ Delete This Message', 'delete_private_key_message')]
      ])
    });
    
    // Store message ID for deletion
    ctx.session = { ...ctx.session, privateKeyMessageId: sentMessage.message_id };
    
    console.log(`⚠️  Private key exported for user ${userId}`);
    
  } catch (error) {
    console.error('Error in export_private_key:', error);
    await ctx.answerCbQuery('❌ Failed to export key');
    return ctx.reply('❌ An error occurred. Please try again.');
  }
});

// ── Delete Private Key Message ───────────────────────────────────────────────
bot.action('delete_private_key_message', async (ctx) => {
  try {
    await ctx.answerCbQuery('Deleting message...');
    
    // Delete the message containing private key
    await ctx.deleteMessage();
    
    console.log('🗑️  Deleted private key message');
    
    // Send confirmation
    ctx.reply(
      '✅ Private key message deleted.\n\n' +
      'Make sure you saved it securely!',
      getMainMenuKeyboard()
    );
    
  } catch (error) {
    console.error('Error deleting message:', error);
    await ctx.answerCbQuery('Could not delete message');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER HANDLERS (Implemented in next files)
// ══════════════════════════════════════════════════════════════════════════════

bot.action('check_balance', async (ctx) => {
  await ctx.answerCbQuery('Feature coming in next lecture!');
  ctx.reply(
    '💰 **Balance Checking**\n\n' +
    'This feature will be implemented in lecture code 3!\n' +
    'It will connect to Solana RPC and fetch your balance.',
    getMainMenuKeyboard()
  );
});

bot.action('tx_history', async (ctx) => {
  await ctx.answerCbQuery('Feature coming soon!');
  ctx.reply('📊 Transaction history will be implemented next!', getMainMenuKeyboard());
});

bot.action('send_sol_menu', async (ctx) => {
  await ctx.answerCbQuery('Feature coming in lecture 4!');
  ctx.reply('💸 Send SOL will be implemented in lecture code 4!', getMainMenuKeyboard());
});

bot.action('send_token_menu', async (ctx) => {
  await ctx.answerCbQuery('Advanced feature!');
  ctx.reply('🪙 SPL token support is an advanced bonus feature!', getMainMenuKeyboard());
});

// ══════════════════════════════════════════════════════════════════════════════
// START COMMAND
// ══════════════════════════════════════════════════════════════════════════════

bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || 'there';
  
  console.log(`📥 User ${username} (ID: ${userId}) started the bot`);
  
  const welcomeMessage = `
🤖 **Welcome to Solana Wallet Bot, ${username}!**

Your secure Solana wallet manager.

**What's New in This Version:**
✅ Wallet generation with Solana keypairs
✅ View your public address
✅ Export private keys (with security warnings)
✅ Wallet confirmation before regeneration

**Coming Soon:**
⏳ Balance checking via Solana RPC
⏳ Transaction history
⏳ Send SOL functionality

Choose an option below:
`;

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard()
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING & BOT LAUNCH
// ══════════════════════════════════════════════════════════════════════════════

bot.catch((err, ctx) => {
  console.error('❌ Bot Error:', err);
  ctx.reply('❌ An unexpected error occurred.').catch(console.error);
});

async function startBot(): Promise<void> {
  try {
    await bot.launch({ allowedUpdates: ['message', 'callback_query'] });
    console.log('✅ Bot started with wallet management features!');
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

Keypair.generate() = Creates a new random Ed25519 keypair (public + private key)

keypair.publicKey = 32-byte public address (safe to share, receives funds)

keypair.secretKey = 64-byte private key (NEVER share, signs transactions)

toBase58() = Converts public key to human-readable format (no confusing chars)

bs58.encode() = Converts secret key to Base58 format (alternative to array)

USERS Record = In-memory storage mapping Telegram ID → wallet data

getUserWallet() = Helper to retrieve and update wallet access time

Confirmation Dialog = Ask user before destructive actions (regenerating wallet)

ctx.editMessageText() = Update existing message (better UX than sending new one)

Multi-Format Export = Provide private key in different formats for compatibility

Security Warnings = CRITICAL for private key exports - protect user funds

Delete Message = Allow users to remove sensitive data from chat history

──────────────────────────────────────────────────────────────────────────────

REAL-WORLD PRODUCTION CONSIDERATIONS:
──────────────────────────────────────────────────────────────────────────────

1. ENCRYPTION
   - Encrypt private keys before storing in database
   - Use strong algorithms (AES-256-GCM)
   - Store encryption keys in secure vaults (AWS KMS, HashiCorp Vault)

2. DATABASE
   - Use PostgreSQL with pgcrypto extension
   - Never store private keys in plain text
   - Implement automatic backups

3. 2FA FOR EXPORTS
   - Require additional authentication for private key exports
   - SMS verification or authenticator apps
   - Rate limit export attempts

4. AUDIT LOGGING
   - Log all wallet creation events
   - Log private key exports (NOT the keys themselves!)
   - Monitor for suspicious activity

5. LEGAL COMPLIANCE
   - Implement KYC for production trading bots
   - Comply with financial regulations (varies by jurisdiction)
   - Add terms of service acceptance

──────────────────────────────────────────────────────────────────────────────

TESTING CHECKLIST:
──────────────────────────────────────────────────────────────────────────────

✅ Generate wallet for new user
✅ View address shows correct public key
✅ Export private key in all formats
✅ Regeneration shows confirmation dialog
✅ Cancel regeneration preserves wallet
✅ Confirmed regeneration creates new wallet
✅ Private key message can be deleted
✅ Error handling works for missing wallets

*/
