// Lecture Code - 1_dex_vs_cex_and_orderbook.js
// Topic: DEX vs CEX concepts + Orderbook simulation
// Day 9.1 - DEX, CEX, Orderbooks, AMM & DeFi Jargon

// ── DEX vs CEX — Key Differences ─────────────────────────────────────────────
console.log(`
DEX vs CEX:
═══════════════════════════════════════════════════════════════
DEX (Decentralized Exchange)         CEX (Centralized Exchange)
───────────────────────────────────────────────────────────────
Farmer's market                      Supermarket
You hold private key                 You delegate assets to company
No middleman                         Company acts as middleman
Smart contracts execute trades       Order matching by company server
No KYC required                      KYC / government censorship possible
No custody risk (you keep funds)     Exchange can be hacked (they hold funds)
Manual private key management        Easier UX, no key management

Examples:
  DEX: Uniswap, SushiSwap, ORCA, Raydium, Meteora
  CEX: Binance, Coinbase, CoinDCX
═══════════════════════════════════════════════════════════════
`);

// ── Orderbook Simulation ──────────────────────────────────────────────────────
// An orderbook is like a restaurant menu board:
//   - Bids (green) = buyers' offers, sorted highest → lowest
//   - Asks (red)   = sellers' offers, sorted lowest → highest
//   - Spread       = lowest ask - highest bid
//   - Market makers place both bids and asks to earn the spread

class Orderbook {
  constructor(pair) {
    this.pair = pair;  // e.g., "ETH/USDT"
    this.bids = [];    // [{ price, quantity, trader }] sorted high → low
    this.asks = [];    // [{ price, quantity, trader }] sorted low → high
    this.trades = [];  // executed trades history
  }

  // Add a new bid (buy order)
  addBid(price, quantity, trader = "anonymous") {
    this.bids.push({ price, quantity, trader });
    this.bids.sort((a, b) => b.price - a.price); // high → low
    this.matchOrders();
  }

  // Add a new ask (sell order)
  addAsk(price, quantity, trader = "anonymous") {
    this.asks.push({ price, quantity, trader });
    this.asks.sort((a, b) => a.price - b.price); // low → high
    this.matchOrders();
  }

  // Match orders when highest bid >= lowest ask
  matchOrders() {
    while (
      this.bids.length > 0 &&
      this.asks.length > 0 &&
      this.bids[0].price >= this.asks[0].price
    ) {
      const bid = this.bids[0];
      const ask = this.asks[0];
      const tradePrice = ask.price; // trade executes at ask price
      const tradeQty = Math.min(bid.quantity, ask.quantity);

      this.trades.push({
        price: tradePrice,
        quantity: tradeQty,
        buyer: bid.trader,
        seller: ask.trader,
        timestamp: new Date().toISOString()
      });

      bid.quantity -= tradeQty;
      ask.quantity -= tradeQty;

      if (bid.quantity === 0) this.bids.shift();
      if (ask.quantity === 0) this.asks.shift();
    }
  }

  // Get current spread
  getSpread() {
    if (this.bids.length === 0 || this.asks.length === 0) return null;
    return {
      highestBid: this.bids[0].price,
      lowestAsk: this.asks[0].price,
      spread: this.asks[0].price - this.bids[0].price,
      spreadPercent: ((this.asks[0].price - this.bids[0].price) / this.asks[0].price * 100).toFixed(4) + "%"
    };
  }

  // Display orderbook
  display() {
    console.log(`\n=== ORDERBOOK: ${this.pair} ===`);
    console.log("ASKS (sellers):");
    this.asks.slice(0, 5).forEach(a =>
      console.log(`  $${a.price.toFixed(2)} | ${a.quantity} | ${a.trader}`)
    );
    const spread = this.getSpread();
    if (spread) {
      console.log(`  ── Spread: $${spread.spread.toFixed(2)} (${spread.spreadPercent}) ──`);
    }
    console.log("BIDS (buyers):");
    this.bids.slice(0, 5).forEach(b =>
      console.log(`  $${b.price.toFixed(2)} | ${b.quantity} | ${b.trader}`)
    );
    if (this.trades.length > 0) {
      console.log(`\nLast trade: $${this.trades[this.trades.length-1].price} x ${this.trades[this.trades.length-1].quantity}`);
    }
  }
}

// ── Demo ──────────────────────────────────────────────────────────────────────
const orderbook = new Orderbook("ETH/USDT");

// Market makers add both bids and asks (they profit from the spread)
orderbook.addAsk(135.00, 10, "MarketMaker1");
orderbook.addAsk(134.50, 20, "MarketMaker1");
orderbook.addAsk(134.00, 15, "MarketMaker2");

orderbook.addBid(133.50, 12, "MarketMaker1");
orderbook.addBid(133.00, 25, "MarketMaker2");
orderbook.addBid(132.50, 30, "Trader1");

orderbook.display();
console.log("\nSpread info:", orderbook.getSpread());

// A trader places a bid that matches → trade executes
console.log("\n--- Trader places bid at $134 (matches MarketMaker2's ask) ---");
orderbook.addBid(134.00, 10, "Trader2");
orderbook.display();
console.log("Executed trades:", orderbook.trades);

/*
KEY CONCEPTS:
- Orderbook: sorted list of all bids (buy orders) and asks (sell orders)
- Bid: buyer's max price → sorted high to low
- Ask: seller's min price → sorted low to high
- Spread: lowestAsk - highestBid → smaller = more liquid market
- Match: when highest bid >= lowest ask → trade executes at ask price
- Market makers: place both sides to earn the spread, keep market liquid
- DEX has NO orderbook → uses AMM (liquidity pools + x*y=k formula) instead
*/
