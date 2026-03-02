// Lecture Code - 4_dex_vs_aggregator.js
// Topic: DEX vs DEX Aggregator — why aggregators give better prices
// Day 9.1 - DEX, CEX, Orderbooks, AMM & DeFi Jargon

// ── DEX vs DEX Aggregator ─────────────────────────────────────────────────────
//
// DEX:         Single liquidity pool per platform
//              You manually choose which DEX to trade on
//              Price depends only on that DEX's pool ratio
//
// DEX Aggregator: Scans multiple DEXs simultaneously
//              Finds the best price + route
//              Can split trades across multiple pools to reduce slippage
//              Example: Jupiter (Solana), 1inch (Ethereum)
//
// Analogy:
//   DEX       = buying groceries at ONE store
//   Aggregator = using a shopping assistant that checks ALL nearby stores
//                and automatically buys from the cheapest ones

// ── Simulate DEX Aggregator Logic ────────────────────────────────────────────

class SimpleDEX {
  constructor(name, tokenA, tokenB, reserveA, reserveB) {
    this.name = name;
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.reserveA = reserveA;
    this.reserveB = reserveB;
    this.k = reserveA * reserveB;
    this.fee = 0.003; // 0.3% fee
  }

  // Get how much tokenB you pay for `amountA` of tokenA (without executing)
  quoteForA(amountA) {
    if (amountA >= this.reserveA) return null; // not enough liquidity
    const newReserveA = this.reserveA - amountA;
    const newReserveB = this.k / newReserveA;
    const amountBIn = (newReserveB - this.reserveB) * (1 + this.fee);
    const priceImpact = ((newReserveB / newReserveA - this.reserveB / this.reserveA) / (this.reserveB / this.reserveA)) * 100;
    return {
      dex: this.name,
      amountAOut: amountA,
      amountBIn: amountBIn,
      effectivePrice: amountBIn / amountA,
      priceImpact: priceImpact.toFixed(4) + "%",
      liquidity: this.reserveA,
    };
  }
}

// ── Scenario: Buy 10 SOL across 3 different DEXs ─────────────────────────────
// Each DEX has a different pool size → different prices

const raydium   = new SimpleDEX("Raydium",  "SOL", "USDC", 500,   75000);  // medium pool
const orca      = new SimpleDEX("ORCA",     "SOL", "USDC", 200,   29000);  // small pool
const meteora   = new SimpleDEX("Meteora",  "SOL", "USDC", 2000, 300000);  // large pool

const dexes = [raydium, orca, meteora];
const wantToBuy = 10; // 10 SOL

console.log(`=== BUYING ${wantToBuy} SOL — Quotes from 3 DEXs ===\n`);

const quotes = dexes
  .map(dex => dex.quoteForA(wantToBuy))
  .filter(q => q !== null)
  .sort((a, b) => a.amountBIn - b.amountBIn); // cheapest first

quotes.forEach(q => {
  console.log(`${q.dex.padEnd(12)}: Pay ${q.amountBIn.toFixed(2)} USDC | Effective price: ${q.effectivePrice.toFixed(2)} USDC/SOL | Impact: ${q.priceImpact}`);
});

const bestSingle = quotes[0];
console.log(`\n✅ Best single DEX: ${bestSingle.dex} → Pay ${bestSingle.amountBIn.toFixed(2)} USDC`);

// ── Aggregator: Split the trade for even better price ─────────────────────────
// Jupiter-style: split 10 SOL across multiple DEXs to minimize slippage
function aggregatorQuote(dexes, totalAmountA) {
  // Simple split: proportional to pool size (larger pool = bigger share)
  const totalLiquidity = dexes.reduce((sum, d) => sum + d.reserveA, 0);

  const splits = dexes.map(dex => ({
    dex: dex.name,
    share: dex.reserveA / totalLiquidity,
    amount: (dex.reserveA / totalLiquidity) * totalAmountA
  }));

  let totalBIn = 0;
  console.log("\n=== AGGREGATOR SPLIT TRADE ===");
  splits.forEach(split => {
    const q = dexes.find(d => d.name === split.dex).quoteForA(split.amount);
    if (q) {
      totalBIn += q.amountBIn;
      console.log(`  ${split.dex.padEnd(12)}: Buy ${split.amount.toFixed(2)} SOL → Pay ${q.amountBIn.toFixed(2)} USDC (${(split.share * 100).toFixed(1)}% of trade)`);
    }
  });
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Total paid:  ${totalBIn.toFixed(2)} USDC`);
  console.log(`  Saving vs best single DEX: ${(bestSingle.amountBIn - totalBIn).toFixed(2)} USDC`);
}

aggregatorQuote(dexes, wantToBuy);

// ── Comparison Table ──────────────────────────────────────────────────────────
console.log(`
\n=== DEX vs DEX AGGREGATOR ===
${"─".repeat(70)}
Aspect            DEX (single)               DEX Aggregator
─────────────────────────────────────────────────────────────────────
Liquidity         One pool per platform      Pulls from ALL DEXs
Price             Depends on one pool        Best across all pools
Slippage          High for large trades      Reduced by splitting trades
Price efficiency  Varies by DEX liquidity    Aggregates best prices
User effort       Must choose DEX manually   Auto-optimized
Example (Solana)  Raydium, ORCA, Meteora     Jupiter
Example (Ethereum) Uniswap, SushiSwap        1inch, Paraswap
${"─".repeat(70)}
→ DEX  = single store
→ Aggregator = shopping assistant that checks all stores automatically
`);

/*
KEY CONCEPTS:
- DEX: single liquidity pool, one platform, manual selection
- DEX Aggregator: scans multiple DEXs, finds best route, can split trades
- Why aggregators give better prices:
  1. More total liquidity = smaller price impact
  2. Trade splitting spreads impact across multiple pools
  3. Auto-finds arbitrage opportunities across pools
- Jupiter (Solana): aggregates Raydium, ORCA, Meteora, and 20+ others
- 1inch (Ethereum): aggregates Uniswap, SushiSwap, Curve, Balancer, etc.
- Splitting trade = reduces slippage by using multiple smaller swaps
*/
