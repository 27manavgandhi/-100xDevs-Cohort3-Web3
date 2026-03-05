// Lecture Code - 2_liquidity_pools_and_cpmm.js
// Topic: Liquidity Pools, x*y=k formula, Raydium on Solana
// Day 12.1 - Liquidity Pools on Solana, Raydium, ETH vs Solana

// ── What is a Liquidity Pool? ─────────────────────────────────────────────────
//
// A liquidity pool = smart contract (or Solana program account) holding 2 tokens
// → people can swap one token for the other, any time, 24/7
// → swap fees go to the liquidity providers (LPs) who deposited the tokens
//
// Real-life analogy: Money exchange booth
//   - You provide USD + Euros to the booth
//   - Tourists come to exchange one for the other
//   - You earn a small fee on every exchange

// ── Constant Product Market Maker (CPMM) — x * y = k ─────────────────────────
class LiquidityPool {
  constructor(tokenA, tokenB, reserveA, reserveB, feePercent = 0.003) {
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.reserveA = reserveA;
    this.reserveB = reserveB;
    this.k = reserveA * reserveB; // CONSTANT — never changes
    this.feePercent = feePercent; // 0.3% default (Raydium standard)
    this.feesEarned = { A: 0, B: 0 };
  }

  // Price of A in terms of B
  getPriceAinB() { return this.reserveB / this.reserveA; }
  getPriceBinA() { return this.reserveA / this.reserveB; }

  // Add liquidity (both tokens in equal value)
  addLiquidity(amountA, provider = "LP") {
    // Must add proportionally to maintain price
    const ratio = this.reserveB / this.reserveA;
    const amountB = amountA * ratio;

    this.reserveA += amountA;
    this.reserveB += amountB;
    this.k = this.reserveA * this.reserveB; // k grows when LP adds liquidity

    console.log(`\n💧 ${provider} added liquidity:`);
    console.log(`   +${amountA} ${this.tokenA} + ${amountB.toFixed(2)} ${this.tokenB}`);
    console.log(`   New reserves: ${this.reserveA} ${this.tokenA} / ${this.reserveB.toFixed(2)} ${this.tokenB}`);
  }

  // Swap tokenB for tokenA (buyer gets tokenA, pays tokenB)
  swapBforA(amountBIn, swapper = "trader") {
    const fee = amountBIn * this.feePercent;
    const amountBAfterFee = amountBIn - fee;

    const newReserveB = this.reserveB + amountBAfterFee;
    const newReserveA = this.k / newReserveB; // maintain k
    const amountAOut = this.reserveA - newReserveA;

    const priceBefore = this.getPriceAinB();

    this.reserveA = newReserveA;
    this.reserveB = newReserveB + fee; // fee stays in pool for LPs
    this.feesEarned.B += fee;

    const priceAfter = this.getPriceAinB();
    const priceImpact = Math.abs((priceAfter - priceBefore) / priceBefore * 100);

    console.log(`\n🔄 Swap: ${swapper} sends ${amountBIn} ${this.tokenB} → gets ${amountAOut.toFixed(4)} ${this.tokenA}`);
    console.log(`   Fee paid:     ${fee.toFixed(4)} ${this.tokenB} (${(this.feePercent * 100)}%)`);
    console.log(`   Price before: 1 ${this.tokenA} = ${priceBefore.toFixed(4)} ${this.tokenB}`);
    console.log(`   Price after:  1 ${this.tokenA} = ${priceAfter.toFixed(4)} ${this.tokenB}`);
    console.log(`   Price impact: ${priceImpact.toFixed(4)}%`);
    return amountAOut;
  }

  displayPool() {
    console.log(`\n${"─".repeat(55)}`);
    console.log(`Pool: ${this.tokenA}/${this.tokenB}`);
    console.log(`  ${this.tokenA} reserve:  ${this.reserveA.toFixed(4)}`);
    console.log(`  ${this.tokenB} reserve: ${this.reserveB.toFixed(4)}`);
    console.log(`  k (constant): ${this.k.toFixed(0)}`);
    console.log(`  Price:        1 ${this.tokenA} = ${this.getPriceAinB().toFixed(4)} ${this.tokenB}`);
    console.log(`  Fees earned:  ${this.feesEarned.A.toFixed(4)} ${this.tokenA} / ${this.feesEarned.B.toFixed(4)} ${this.tokenB}`);
    console.log(`${"─".repeat(55)}`);
  }
}

// ── Lecture Example: SOL/USDC Pool ───────────────────────────────────────────
console.log("=== LECTURE EXAMPLE: SOL/USDC Liquidity Pool ===\n");
console.log("You have 10,000 USDC and 2,000 SOL.");
console.log("Assuming 1 SOL = 5 USDC (both sides = $10,000 value)");
console.log("You add them both to a liquidity pool.\n");

const pool = new LiquidityPool("SOL", "USDC", 2000, 10000);
pool.displayPool();

// k = 2000 * 10000 = 20,000,000
// Price: 1 SOL = 5 USDC ✓

// Someone swaps 500 USDC for SOL (from lecture)
console.log("\nSomeone swaps 500 USDC for SOL:");
const solReceived = pool.swapBforA(500, "Trader1");
pool.displayPool();

// The lecture says: pool now has 10,500 USDC and slightly fewer SOL
// SOL removed ≈ 95.24, so pool has ≈ 1904.76 SOL
// Lecture formula: New SOL = 20,000,000 ÷ 10,500 ≈ 1,904.76 SOL

console.log("\nMore swaps — showing price impact growing:");
pool.swapBforA(500, "Trader2");  // same size swap but more price impact now
pool.swapBforA(2000, "Trader3"); // large swap — high price impact!
pool.displayPool();

// ── Add Liquidity Example ──────────────────────────────────────────────────────
console.log("\n=== A new LP joins and adds liquidity ===");
const pool2 = new LiquidityPool("SOL", "USDC", 2000, 10000);
console.log("Original pool state:");
pool2.displayPool();

pool2.addLiquidity(1000, "NewLP"); // adds 1000 SOL + proportional USDC
console.log("After adding liquidity (pool is now larger):");
pool2.displayPool();

// Same size swap now has LESS price impact because pool is larger
console.log("\nSame 500 USDC swap on LARGER pool:");
pool2.swapBforA(500, "Trader");
pool2.displayPool();
// Notice: price impact is smaller with more liquidity!

/*
KEY CONCEPTS:
- Liquidity pool = two token reserves + the x*y=k rule
- k never changes during swaps (only when LP adds/removes liquidity)
- Buying token A → A reserve decreases → price of A increases
- Large pool = small price impact (better for traders)
- Small pool = large price impact (worse for traders, more impermanent loss risk)
- Fee (0.3%) stays in pool → LP's share grows with every swap
- Raydium uses this exact CPMM model on Solana
- Raydium CP-Swap: https://github.com/raydium-io/raydium-cp-swap
*/
