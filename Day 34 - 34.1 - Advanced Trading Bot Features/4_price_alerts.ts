// Lecture Code - 4_price_alerts.ts
// Topic: Price Alerts System with Database Integration
// Day 34.1 - Advanced Trading Bot Features
//
// To run:
// 1. npm install telegraf @solana/web3.js pg dotenv
// 2. Set up PostgreSQL database
// 3. npx ts-node 4_price_alerts.ts

import { Telegraf, Markup } from 'telegraf';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ── What are Price Alerts? ───────────────────────────────────────────────────
//
// Price alerts notify users when a token reaches a target price.
//
// Real-Life Analogy: Like STOCK PRICE NOTIFICATIONS on your phone:
// - You set: "Alert me when AAPL hits $150"
// - App monitors price continuously
// - When price hits target → You get notification
// - You can then decide to buy/sell
//
// Why use price alerts?
//   1. AUTOMATION - Don't need to constantly check prices
//   2. OPPORTUNITIES - Catch good entry/exit points
//   3. DISCIPLINE - Execute planned strategies automatically
//   4. CONVENIENCE - Get notified wherever you are

// ══════════════════════════════════════════════════════════════════════════════
// DATABASE SETUP
// ══════════════════════════════════════════════════════════════════════════════

// ── PostgreSQL Connection Pool ───────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://localhost:5432/telegram_trading_bot'
});

// ── Database Schema ──────────────────────────────────────────────────────────
/*
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  token_mint VARCHAR(44) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  condition VARCHAR(10) NOT NULL,  -- 'above' or 'below'
  target_price DECIMAL(20, 10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMP
);

CREATE INDEX idx_active_alerts ON price_alerts(triggered, token_mint)
  WHERE triggered = FALSE;
*/

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN required');

const bot = new Telegraf(BOT_TOKEN);

interface UserWallet {
  keypair: Keypair;
}

const USERS: Record<string, UserWallet> = {};

// ══════════════════════════════════════════════════════════════════════════════
// PRICE ALERT DATA STRUCTURES
// ══════════════════════════════════════════════════════════════════════════════

interface PriceAlert {
  id?: number;
  telegramUserId: number;
  tokenMint: string;
  tokenSymbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  triggered: boolean;
  createdAt?: Date;
  triggeredAt?: Date;
}

// ── Popular Tokens for Alerts ────────────────────────────────────────────────
const ALERT_TOKENS: Record<string, { mint: string; symbol: string }> = {
  'SOL': { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  'USDC': { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
  'BONK': { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
};

// ══════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Create Alert ─────────────────────────────────────────────────────────────
async function createAlert(alert: PriceAlert): Promise<number> {
  const query = `
    INSERT INTO price_alerts 
      (telegram_user_id, token_mint, token_symbol, condition, target_price)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  
  const values = [
    alert.telegramUserId,
    alert.tokenMint,
    alert.tokenSymbol,
    alert.condition,
    alert.targetPrice
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0].id;
}

// ── Get User's Alerts ────────────────────────────────────────────────────────
async function getUserAlerts(telegramUserId: number): Promise<PriceAlert[]> {
  const query = `
    SELECT * FROM price_alerts
    WHERE telegram_user_id = $1 AND triggered = FALSE
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [telegramUserId]);
  return result.rows.map(row => ({
    id: row.id,
    telegramUserId: row.telegram_user_id,
    tokenMint: row.token_mint,
    tokenSymbol: row.token_symbol,
    condition: row.condition,
    targetPrice: parseFloat(row.target_price),
    triggered: row.triggered,
    createdAt: row.created_at
  }));
}

// ── Get All Active Alerts ────────────────────────────────────────────────────
async function getAllActiveAlerts(): Promise<PriceAlert[]> {
  const query = `
    SELECT * FROM price_alerts
    WHERE triggered = FALSE
    ORDER BY token_mint, target_price
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => ({
    id: row.id,
    telegramUserId: row.telegram_user_id,
    tokenMint: row.token_mint,
    tokenSymbol: row.token_symbol,
    condition: row.condition,
    targetPrice: parseFloat(row.target_price),
    triggered: row.triggered
  }));
}

// ── Mark Alert as Triggered ──────────────────────────────────────────────────
async function markAlertTriggered(alertId: number): Promise<void> {
  const query = `
    UPDATE price_alerts
    SET triggered = TRUE, triggered_at = NOW()
    WHERE id = $1
  `;
  
  await pool.query(query, [alertId]);
}

// ── Delete Alert ─────────────────────────────────────────────────────────────
async function deleteAlert(alertId: number): Promise<void> {
  const query = `DELETE FROM price_alerts WHERE id = $1`;
  await pool.query(query, [alertId]);
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICE MONITORING SERVICE
// ══════════════════════════════════════════════════════════════════════════════

class PriceAlertService {
  private bot: Telegraf;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  constructor(bot: Telegraf) {
    this.bot = bot;
  }
  
  // ── Start Price Monitoring ─────────────────────────────────────────────────
  start() {
    console.log('🚀 Starting price alert monitoring...');
    
    // Check prices every 60 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllAlerts();
    }, 60000);
    
    // Also check immediately on start
    this.checkAllAlerts();
  }
  
  // ── Stop Monitoring ──────────────────────────────────────────────────────
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('⏹️  Stopped price monitoring');
    }
  }
  
  // ── Check All Active Alerts ──────────────────────────────────────────────
  private async checkAllAlerts() {
    try {
      console.log('\n=== Checking Price Alerts ===');
      
      const alerts = await getAllActiveAlerts();
      
      if (alerts.length === 0) {
        console.log('No active alerts to check');
        return;
      }
      
      console.log(`Checking ${alerts.length} alerts...`);
      
      // Group alerts by token mint for efficient price fetching
      const alertsByToken: Record<string, PriceAlert[]> = {};
      
      for (const alert of alerts) {
        if (!alertsByToken[alert.tokenMint]) {
          alertsByToken[alert.tokenMint] = [];
        }
        alertsByToken[alert.tokenMint].push(alert);
      }
      
      // Check each token's price
      for (const [tokenMint, tokenAlerts] of Object.entries(alertsByToken)) {
        const currentPrice = await this.fetchTokenPrice(tokenMint);
        
        if (currentPrice === 0) {
          console.log(`⚠️  Could not fetch price for ${tokenMint}`);
          continue;
        }
        
        console.log(`${tokenAlerts[0].tokenSymbol}: $${currentPrice}`);
        
        // Check each alert for this token
        for (const alert of tokenAlerts) {
          const shouldTrigger = this.shouldTriggerAlert(alert, currentPrice);
          
          if (shouldTrigger) {
            console.log(`🚨 Alert triggered! #${alert.id}`);
            await this.triggerAlert(alert, currentPrice);
          }
        }
      }
      
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }
  
  // ── Fetch Token Price ────────────────────────────────────────────────────
  private async fetchTokenPrice(tokenMint: string): Promise<number> {
    try {
      const response = await fetch(
        `https://price.jup.ag/v4/price?ids=${tokenMint}`
      );
      
      if (!response.ok) return 0;
      
      const data = await response.json();
      return data.data[tokenMint]?.price || 0;
      
    } catch (error) {
      console.error(`Price fetch error for ${tokenMint}:`, error);
      return 0;
    }
  }
  
  // ── Check if Alert Should Trigger ────────────────────────────────────────
  private shouldTriggerAlert(alert: PriceAlert, currentPrice: number): boolean {
    if (alert.condition === 'above') {
      return currentPrice >= alert.targetPrice;
    } else { // 'below'
      return currentPrice <= alert.targetPrice;
    }
  }
  
  // ── Trigger Alert (Send Notification) ────────────────────────────────────
  private async triggerAlert(alert: PriceAlert, currentPrice: number) {
    try {
      // Mark as triggered in database
      await markAlertTriggered(alert.id!);
      
      // Send Telegram notification
      const message = `
🚨 **Price Alert Triggered!**

${alert.tokenSymbol} is now ${alert.condition} your target!

Target: $${alert.targetPrice}
Current: $${currentPrice}

${currentPrice > alert.targetPrice ? '📈 Price increased!' : '📉 Price decreased!'}

Time to take action! 🚀
`;
      
      await this.bot.telegram.sendMessage(
        alert.telegramUserId,
        message,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💱 Swap Now', 'swap_tokens')],
            [Markup.button.callback('📊 View Portfolio', 'view_portfolio')]
          ])
        }
      );
      
      console.log(`✅ Notification sent to user ${alert.telegramUserId}`);
      
    } catch (error) {
      console.error(`Error triggering alert #${alert.id}:`, error);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TELEGRAM BOT - ALERT CREATION
// ══════════════════════════════════════════════════════════════════════════════

interface AlertState {
  step: 'idle' | 'select_token' | 'select_condition' | 'enter_price';
  tokenMint?: string;
  tokenSymbol?: string;
  condition?: 'above' | 'below';
}

const ALERT_STATES: Record<string, AlertState> = {};

// ── Step 1: Start Alert Creation ─────────────────────────────────────────────
bot.action('set_price_alert', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  await ctx.answerCbQuery('Creating alert...');
  
  ALERT_STATES[userId] = { step: 'select_token' };
  
  await ctx.editMessageText(
    '🚨 **Create Price Alert**\n\n' +
    '📝 Step 1: Select token to monitor',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('SOL', 'alert_token_SOL')],
        [Markup.button.callback('BONK', 'alert_token_BONK')],
        [Markup.button.callback('❌ Cancel', 'cancel_alert')]
      ])
    }
  );
});

// ── Step 2: Select Token ─────────────────────────────────────────────────────
bot.action(/^alert_token_(.+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const tokenSymbol = ctx.match[1];
  const tokenInfo = ALERT_TOKENS[tokenSymbol];
  
  const state = ALERT_STATES[userId];
  state.tokenMint = tokenInfo.mint;
  state.tokenSymbol = tokenInfo.symbol;
  state.step = 'select_condition';
  
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    `🚨 **Create Price Alert**\n\n` +
    `Token: ${tokenSymbol}\n\n` +
    `📝 Step 2: Alert me when price goes...`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📈 Above', 'alert_condition_above')],
        [Markup.button.callback('📉 Below', 'alert_condition_below')],
        [Markup.button.callback('❌ Cancel', 'cancel_alert')]
      ])
    }
  );
});

// ── Step 3: Select Condition ─────────────────────────────────────────────────
bot.action(/^alert_condition_(.+)$/, async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const condition = ctx.match[1] as 'above' | 'below';
  
  const state = ALERT_STATES[userId];
  state.condition = condition;
  state.step = 'enter_price';
  
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    `🚨 **Create Price Alert**\n\n` +
    `Token: ${state.tokenSymbol}\n` +
    `Condition: ${condition}\n\n` +
    `📝 Step 3: Enter target price\n\n` +
    `Example: \`150\` or \`0.00001\``,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Cancel', 'cancel_alert')]
      ])
    }
  );
});

// ── Step 4: Enter Price and Create Alert ─────────────────────────────────────
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const state = ALERT_STATES[userId];
  
  if (state?.step === 'enter_price') {
    const text = ctx.message.text.trim();
    const price = parseFloat(text);
    
    if (isNaN(price) || price <= 0) {
      return ctx.reply('❌ Invalid price. Please enter a positive number.');
    }
    
    try {
      // Create alert in database
      const alertId = await createAlert({
        telegramUserId: userId,
        tokenMint: state.tokenMint!,
        tokenSymbol: state.tokenSymbol!,
        condition: state.condition!,
        targetPrice: price,
        triggered: false
      });
      
      await ctx.reply(
        `✅ **Alert Created!**\n\n` +
        `Token: ${state.tokenSymbol}\n` +
        `Condition: ${state.condition}\n` +
        `Target: $${price}\n\n` +
        `You'll be notified when ${state.tokenSymbol} goes ${state.condition} $${price}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📋 View My Alerts', 'view_alerts')],
            [Markup.button.callback('🏠 Main Menu', 'main_menu')]
          ])
        }
      );
      
      // Reset state
      ALERT_STATES[userId] = { step: 'idle' };
      
    } catch (error: any) {
      console.error('Error creating alert:', error);
      ctx.reply(`❌ Failed to create alert: ${error.message}`);
    }
  }
});

// ── View Alerts ──────────────────────────────────────────────────────────────
bot.action('view_alerts', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  await ctx.answerCbQuery('Loading alerts...');
  
  const alerts = await getUserAlerts(userId);
  
  if (alerts.length === 0) {
    return ctx.sendMessage(
      '📋 **Your Price Alerts**\n\n' +
      'You have no active alerts.\n\n' +
      'Create one to get notified!',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🚨 Create Alert', 'set_price_alert')]
        ])
      }
    );
  }
  
  let message = `📋 **Your Price Alerts** (${alerts.length})\n\n`;
  
  for (const alert of alerts) {
    message += `${alert.tokenSymbol} ${alert.condition} $${alert.targetPrice}\n`;
    message += `  Created: ${alert.createdAt?.toLocaleString()}\n`;
    message += `  ID: ${alert.id}\n\n`;
  }
  
  message += `Use /delete <ID> to remove an alert`;
  
  ctx.sendMessage(message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚨 Create Alert', 'set_price_alert')],
      [Markup.button.callback('🏠 Main Menu', 'main_menu')]
    ])
  });
});

bot.action('cancel_alert', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  
  await ctx.answerCbQuery('Cancelled');
  ALERT_STATES[userId] = { step: 'idle' };
  ctx.editMessageText('❌ Alert creation cancelled.');
});

// ══════════════════════════════════════════════════════════════════════════════
// BOT STARTUP
// ══════════════════════════════════════════════════════════════════════════════

bot.start((ctx) => {
  ctx.reply(
    '🤖 **Price Alert Bot**\n\n' +
    'Get notified when tokens hit your targets!',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🚨 Create Alert', 'set_price_alert')],
        [Markup.button.callback('📋 View Alerts', 'view_alerts')]
      ])
    }
  );
});

// Start price monitoring service
const alertService = new PriceAlertService(bot);
alertService.start();

bot.catch((err) => console.error('Bot error:', err));
bot.launch({ allowedUpdates: ['message', 'callback_query'] });
console.log('✅ Price alert bot running!');

process.once('SIGINT', () => {
  alertService.stop();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  alertService.stop();
  bot.stop('SIGTERM');
});

/*
KEY CONCEPTS:
──────────────────────────────────────────────────────────────────────────────

Price Alert = Notification when token hits target price

Database Persistence = Alerts survive bot restarts

PostgreSQL = Robust relational database for production

Connection Pool = Reusable database connections (efficient)

Monitoring Interval = How often to check prices (60 seconds)

Alert Conditions = 'above' (notify when price rises) or 'below' (notify when drops)

Trigger = When alert condition is met

Mark as Triggered = Prevent duplicate notifications

Batch Processing = Group alerts by token for efficient price fetching

Real-time Monitoring = Continuously checking prices vs targets

*/
