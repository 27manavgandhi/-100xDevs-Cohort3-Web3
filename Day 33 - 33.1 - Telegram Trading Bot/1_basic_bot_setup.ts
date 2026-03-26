// Lecture Code - 1_basic_bot_setup.ts
// Topic: Setting up a Telegram Bot with Telegraf
// Day 33.1 - Telegram Trading Bot
//
// To run: 
// 1. npm install telegraf dotenv
// 2. Create .env file with BOT_TOKEN=your_token_here
// 3. npx ts-node 1_basic_bot_setup.ts

import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

// ── What is a Telegram Bot? ──────────────────────────────────────────────────
//
// A Telegram Bot is an automated program that runs on Telegram servers and can:
// - Respond to user messages
// - Send notifications
// - Process payments
// - Interact with external APIs
// - Manage group chats
//
// Real-Life Analogy: A Telegram bot is like a customer service chatbot on a 
// website, but it lives inside Telegram. Instead of visiting a website, users 
// just chat with the bot.
//
// Why use Telegram bots for trading?
//   1. CONVENIENCE - Users don't need to download separate apps
//   2. MOBILE-FIRST - Perfect for quick trades on the go
//   3. RICH UI - Inline keyboards make interactions intuitive
//   4. PUSH NOTIFICATIONS - Alert users of price changes instantly

// ══════════════════════════════════════════════════════════════════════════════
// BASIC BOT CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// ── Retrieving Bot Token ─────────────────────────────────────────────────────
// The bot token is your bot's password. Get it from @BotFather on Telegram.
// Format: 123456789:ABCdefGhIjKlMnOpQrStUvWxYz
// 
// SECURITY RULE: NEVER hardcode the token. Always use environment variables.

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN not found in environment variables!');
  console.log('💡 Create a .env file with: BOT_TOKEN=your_token_here');
  process.exit(1);
}

// ── Creating Bot Instance ────────────────────────────────────────────────────
// The Telegraf class is your bot's brain. It handles all Telegram API calls.

const bot = new Telegraf(BOT_TOKEN);

console.log('🤖 Bot instance created successfully!');

// ══════════════════════════════════════════════════════════════════════════════
// HANDLING THE /start COMMAND
// ══════════════════════════════════════════════════════════════════════════════

// ── What is the /start command? ──────────────────────────────────────────────
//
// The /start command is automatically triggered when:
// 1. A user opens your bot for the first time
// 2. A user clicks a deep link (t.me/yourbot?start=referral_code)
// 3. A user types /start manually
//
// Think of it as the "homepage" of your bot.

bot.start(async (ctx) => {
  // ── Context Object (ctx) ───────────────────────────────────────────────────
  // The ctx object contains everything about the current interaction:
  // - ctx.from: User information (ID, username, language)
  // - ctx.chat: Chat information (type, ID)
  // - ctx.message: The message that triggered this handler
  // - ctx.reply(): Method to send a response
  
  const userId = ctx.from?.id;
  const username = ctx.from?.username || 'there';
  
  console.log(`📥 User ${username} (ID: ${userId}) started the bot`);
  
  // ── Crafting Welcome Message ───────────────────────────────────────────────
  // Use Markdown for formatting:
  // **bold**, *italic*, `code`, [link](url)
  
  const welcomeMessage = `
🤖 **Welcome to Solana Wallet Bot, ${username}!**

Your secure, easy-to-use Solana wallet manager directly in Telegram.

**What can I do?**
• 🔑 Generate new Solana wallets
• 💰 Check your SOL balance
• 📊 View transaction history
• 💸 Send SOL to other addresses
• 🔐 Securely manage your private keys

**Security Notice:**
⚠️ This bot stores private keys locally for demonstration.
⚠️ For production use, implement proper encryption!
⚠️ Test on devnet before using real funds.

**Choose an option below to get started:**
`;

  // ── Creating Inline Keyboard ──────────────────────────────────────────────
  // Inline keyboards are interactive button menus that appear below messages.
  // Each button can trigger a callback query when clicked.
  
  const keyboard = Markup.inlineKeyboard([
    // Row 1: Primary action
    [Markup.button.callback('🔑 Generate Wallet', 'generate_wallet')],
    
    // Row 2: View options
    [
      Markup.button.callback('👁️ View Address', 'view_address'),
      Markup.button.callback('🔐 Export Key', 'export_private_key')
    ],
    
    // Row 3: Balance and history
    [
      Markup.button.callback('💰 Check Balance', 'check_balance'),
      Markup.button.callback('📊 Transaction History', 'tx_history')
    ],
    
    // Row 4: Send functionality
    [
      Markup.button.callback('💸 Send SOL', 'send_sol_menu'),
      Markup.button.callback('🪙 Send Token', 'send_token_menu')
    ]
  ]);
  
  // ── Sending Response ───────────────────────────────────────────────────────
  // parse_mode: 'Markdown' enables text formatting
  // ...keyboard spreads the inline keyboard into the reply options
  
  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...keyboard
  });
  
  console.log('✅ Sent welcome message with keyboard');
});

// ══════════════════════════════════════════════════════════════════════════════
// HANDLING CALLBACK QUERIES (BUTTON CLICKS)
// ══════════════════════════════════════════════════════════════════════════════

// ── What is a Callback Query? ────────────────────────────────────────────────
//
// When a user clicks an inline keyboard button, Telegram sends a "callback query"
// to your bot with the button's data (the second parameter in button.callback()).
//
// CRITICAL RULE: You MUST call ctx.answerCbQuery() within 30 seconds, or the
// button will show a loading spinner forever!

bot.action('generate_wallet', async (ctx) => {
  console.log('📥 User clicked: Generate Wallet');
  
  // ── Step 1: Answer the callback query ─────────────────────────────────────
  // This removes the loading spinner and optionally shows a toast notification
  await ctx.answerCbQuery('Generating wallet... (feature coming soon!)');
  
  // ── Step 2: Respond to the user ───────────────────────────────────────────
  await ctx.reply(
    '🔑 **Wallet Generation**\n\n' +
    'This feature will be implemented in the next lecture code file!\n\n' +
    'It will:\n' +
    '1. Generate a new Solana keypair\n' +
    '2. Store it securely\n' +
    '3. Display your public address',
    { parse_mode: 'Markdown' }
  );
});

bot.action('view_address', async (ctx) => {
  console.log('📥 User clicked: View Address');
  await ctx.answerCbQuery('Feature coming soon!');
  await ctx.reply('👁️ View Address feature will be implemented next!');
});

bot.action('export_private_key', async (ctx) => {
  console.log('📥 User clicked: Export Private Key');
  await ctx.answerCbQuery('⚠️ Security feature - handle with care!');
  await ctx.reply('🔐 Export feature coming soon with security warnings!');
});

bot.action('check_balance', async (ctx) => {
  console.log('📥 User clicked: Check Balance');
  await ctx.answerCbQuery('Checking balance...');
  await ctx.reply('💰 Balance checking will connect to Solana RPC!');
});

bot.action('tx_history', async (ctx) => {
  console.log('📥 User clicked: Transaction History');
  await ctx.answerCbQuery('Fetching history...');
  await ctx.reply('📊 Transaction history feature coming soon!');
});

bot.action('send_sol_menu', async (ctx) => {
  console.log('📥 User clicked: Send SOL');
  await ctx.answerCbQuery('Opening send menu...');
  await ctx.reply('💸 Send SOL will use multi-step flow!');
});

bot.action('send_token_menu', async (ctx) => {
  console.log('📥 User clicked: Send Token');
  await ctx.answerCbQuery('SPL tokens coming soon!');
  await ctx.reply('🪙 SPL token support is an advanced feature!');
});

// ══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL COMMANDS
// ══════════════════════════════════════════════════════════════════════════════

// ── Help Command ─────────────────────────────────────────────────────────────
bot.help((ctx) => {
  const helpText = `
📖 **Available Commands:**

/start - Start the bot and see main menu
/help - Show this help message

**Using the Bot:**
1. Click 'Generate Wallet' to create a new wallet
2. Your wallet is stored locally in this bot
3. Use the buttons to check balance, send SOL, etc.

**Need Support?**
Contact the developer or check the documentation.
`;
  
  ctx.reply(helpText, { parse_mode: 'Markdown' });
});

// ── Text Message Handler (Fallback) ──────────────────────────────────────────
// This catches any text messages that aren't commands
bot.on('text', (ctx) => {
  const message = ctx.message.text;
  
  console.log(`💬 Received text: "${message}"`);
  
  ctx.reply(
    '🤔 I didn\'t understand that.\n\n' +
    'Try /start to see available options or /help for commands.'
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

// ── Global Error Handler ─────────────────────────────────────────────────────
// Catches any unhandled errors in the bot
bot.catch((err, ctx) => {
  console.error('❌ Bot Error:', err);
  
  // Log error details
  console.error('Error Context:', {
    updateType: ctx.updateType,
    chatId: ctx.chat?.id,
    userId: ctx.from?.id
  });
  
  // Inform user gracefully
  ctx.reply(
    '❌ Oops! Something went wrong.\n' +
    'The error has been logged and our team will look into it.\n\n' +
    'Please try again or use /start to reset.'
  ).catch(console.error);
});

// ══════════════════════════════════════════════════════════════════════════════
// STARTING THE BOT
// ══════════════════════════════════════════════════════════════════════════════

async function startBot(): Promise<void> {
  try {
    console.log('🚀 Starting Telegram bot...');
    
    // ── Bot Launch Options ─────────────────────────────────────────────────
    // allowedUpdates: Specify which update types to receive
    // This improves performance by ignoring irrelevant updates
    
    await bot.launch({
      allowedUpdates: ['message', 'callback_query']
    });
    
    console.log('✅ Bot started successfully!');
    console.log('🔗 Open Telegram and search for your bot');
    console.log('📱 Send /start to begin');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────
// Handle SIGINT (Ctrl+C) and SIGTERM (process kill) gracefully

process.once('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. Stopping bot...');
  bot.stop('SIGINT');
  console.log('✅ Bot stopped gracefully');
});

process.once('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Stopping bot...');
  bot.stop('SIGTERM');
  console.log('✅ Bot stopped gracefully');
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════════════════════

startBot();

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

BOT_TOKEN = Secret credential from BotFather to authenticate your bot

Telegraf = Modern Node.js framework for building Telegram bots (like Express for HTTP)

Context (ctx) = Object containing all information about the current update/interaction

bot.start() = Handler for the /start command (bot's "homepage")

Inline Keyboard = Interactive button menu displayed below bot messages

Markup.button.callback() = Creates a button that triggers a callback query when clicked

Callback Query = Event sent when user clicks an inline keyboard button

ctx.answerCbQuery() = REQUIRED function to acknowledge button clicks (removes spinner)

parse_mode: 'Markdown' = Enables text formatting (**bold**, *italic*, `code`)

allowedUpdates = Array specifying which update types to receive (optimization)

Graceful Shutdown = Properly closing connections when stopping the bot (SIGINT/SIGTERM)

──────────────────────────────────────────────────────────────────────────────

COMMON PITFALLS TO AVOID:
──────────────────────────────────────────────────────────────────────────────

❌ Hardcoding BOT_TOKEN in code → Use environment variables
❌ Forgetting ctx.answerCbQuery() → Infinite loading spinner on buttons
❌ Not handling errors → Bot crashes on any unexpected issue
❌ Ignoring graceful shutdown → Leaves connections open
❌ Using synchronous code → Blocks the event loop
❌ Not validating user input → Security vulnerabilities

──────────────────────────────────────────────────────────────────────────────

NEXT STEPS:
──────────────────────────────────────────────────────────────────────────────

In the next lecture code, we'll implement:
1. Wallet generation with Solana Web3.js
2. User data storage (wallet keypairs)
3. Viewing public addresses
4. Exporting private keys securely

*/
