// Lecture Code - 2_amm_cpmm_formula.js
// Topic: Automated Market Maker — Constant Product Formula x * y = k
// Day 9.1 - DEX, CEX, Orderbooks, AMM & DeFi Jargon

// ── The Core Formula: x * y = k ──────────────────────────────────────────────
//
// x = quantity of Token A in the pool (e.g., ETH)
// y = quantity of Token B in the pool (e.g., USDT)
// k = constant product (NEVER changes, regardless of trades)
//
// When someone buys Token A:
//   - x decreases (less Token A in pool)
//   - y must increase (trader adds Token B to keep k constant)
//   - Price of Token A goes UP (scarcer → more expensive)
//
// When someone sells Token A:
//   - x increases (more Token A in pool)
//   - y decreases
//   - Price of Token A goes DOWN

class LiquidityPool {
  constructor(tokenA, tokenB, reserveA, reserveB) {
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.reserveA = reserveA;
    this.reserveB = reserveB;
    this.k = reserveA * reserveB; // constant product — never changes
    this.feePercent = 0.003; // 0.3% typical DEX fee (like Uniswap)
  }

  // Get current price of Token A in terms of Token B
  getPriceAinB() {
    return this.reserveB / this.reserveA;
  }

  // Get current price of Token B in terms of Token A
  getPriceBinA() {
    return this.reserveA / this.reserveB;
  }

  // Calculate how much Token B you need to pay to get `amountAOut` of Token A
  getAmountBForA(amountAOut) {
    if (amountAOut >= this.reserveA) throw new Error("Not enough liquidity!");

    const newReserveA = this.reserveA - amountAOut;
    const newReserveB = this.k / newReserveA;
    const amountBIn = newReserveB - this.reserveB;

    // Apply fee (fee goes to liquidity providers)
    const amountBWithFee = amountBIn * (1 + this.feePercent);

    return {
      amountBIn,
      amountBWithFee,
      newReserveA,
      newReserveB
    };
  }

  // Execute a swap: buy `amountAOut` of Token A, pay Token B
  swapBforA(amountAOut, trader = "trader") {
    const { amountBIn, amountBWithFee, newReserveA, newReserveB } = this.getAmountBForA(amountAOut);

    const priceBefore = this.getPriceAinB();

    // Update reserves
    this.reserveA = newReserveA;
    this.reserveB = newReserveB;

    const priceAfter = this.getPriceAinB();
    const priceImpact = ((priceAfter - priceBefore) / priceBefore) * 100;
    const slippage = priceAfter - priceBefore;

    console.log(`\n=== SWAP: ${trader} buys ${amountAOut} ${this.tokenA} ===`);
    console.log(`  Pays:         ${amountBWithFee.toFixed(4)} ${this.tokenB} (incl. 0.3% fee)`);
    console.log(`  Price before: 1 ${this.tokenA} = ${priceBefore.toFixed(4)} ${this.tokenB}`);
    console.log(`  Price after:  1 ${this.tokenA} = ${priceAfter.toFixed(4)} ${this.tokenB}`);
    console.log(`  Price impact: ${priceImpact.toFixed(4)}%`);
    console.log(`  Slippage:     ${slippage.toFixed(4)} ${this.tokenB} per ${this.tokenA}`);
    console.log(`  New reserves: ${this.reserveA} ${this.tokenA} / ${this.reserveB.toFixed(4)} ${this.tokenB}`);
    console.log(`  k check:      ${(this.reserveA * this.reserveB).toFixed(0)} (should be ~${this.k})`);

    return { amountBPaid: amountBWithFee, priceAfter, priceImpact };
  }

  displayPool() {
    console.log(`\n--- Pool State: ${this.tokenA}/${this.tokenB} ---`);
    console.log(`  ${this.tokenA} reserve: ${this.reserveA}`);
    console.log(`  ${this.tokenB} reserve: ${this.reserveB.toFixed(4)}`);
    console.log(`  k = ${this.k.toFixed(0)}`);
    console.log(`  Price: 1 ${this.tokenA} = ${this.getPriceAinB().toFixed(4)} ${this.tokenB}`);
  }
}

// ── Example from lecture: ETH/USDT pool ──────────────────────────────────────
console.log("=== LECTURE EXAMPLE: ETH/USDT Pool ===");
const pool = new LiquidityPool("ETH", "USDT", 100, 10000);
pool.displayPool();

// k = 100 × 10,000 = 1,000,000
// Initial price: 1 ETH = 100 USDT

// Trade 1: Someone buys 10 ETH
pool.swapBforA(10, "Trader1");
pool.displayPool();
// After: 90 ETH, 11,111.11 USDT → 1 ETH = 123.46 USDT

// Trade 2: Someone buys another 10 ETH (price is now higher)
pool.swapBforA(10, "Trader2");
pool.displayPool();
// Price increases further — the more you buy, the more expensive it gets

// ── Small pool vs Large pool — slippage comparison ───────────────────────────
console.log("\n\n=== SLIPPAGE: Small Pool vs Large Pool ===");

// Small pool: 10 ETH / 1,000 USDT
const smallPool = new LiquidityPool("ETH", "USDT", 10, 1000);
// Large pool: 10,000 ETH / 1,000,000 USDT  
const largePool = new LiquidityPool("ETH", "USDT", 10000, 1000000);

console.log("\nBuying 1 ETH from SMALL pool (10 ETH total):");
smallPool.swapBforA(1, "SmallPoolTrader");

console.log("\nBuying 1 ETH from LARGE pool (10,000 ETH total):");
largePool.swapBforA(1, "LargePoolTrader");
// Large pool → much smaller price impact (slippage)
// This is why large pools provide better price stability!

// ── Slippage tolerance explained ─────────────────────────────────────────────
console.log(`
\n=== SLIPPAGE TOLERANCE ===
Scenario: You want to swap 10 ETH for USDT
Quote says: you'll receive 1,000 USDT

With 1% slippage tolerance:
  → Transaction will succeed if you receive ≥ 990 USDT (1000 × 0.99)
  → If price moves so much you'd get < 990 USDT → transaction REVERTS

High tolerance (5%): Trade almost always goes through, but you might get much less
Low tolerance (0.1%): Protects you but trade might fail in volatile conditions

Recommendation: 0.5% - 1% for stables, 1% - 3% for volatile pairs
`);

/*
KEY CONCEPTS:
- x * y = k → Constant Product Market Maker (CPMM)
- k never changes — it's maintained by adjusting token ratios when trades happen
- Buying Token A → Token A decreases in pool → price of Token A INCREASES
- Selling Token A → Token A increases in pool → price of Token A DECREASES
- Price impact = how much a single trade moves the price
- Large pool → small price impact per trade → better for users
- Small pool → large price impact → more slippage → worse for users
- DEX fee (0.3%) goes to liquidity providers as reward for providing liquidity
- Slippage tolerance = protection setting: "cancel if I get less than X%"
*/
