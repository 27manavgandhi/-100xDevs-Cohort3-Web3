// Lecture Code - 3_dex_jargon_demo.js
// Topic: DEX Jargon — Markets, Swap, Quote, Slippage, Slippage Tolerance
// Day 9.1 - DEX, CEX, Orderbooks, AMM & DeFi Jargon
//
// Uses Jupiter API — Solana's leading DEX aggregator
// No npm install needed for fetch (Node 18+)

// ── DEX Jargon Summary ────────────────────────────────────────────────────────
console.log(`
DEX JARGON:
═══════════════════════════════════════════════════════════
Market       → A trading pair, e.g., SOL/USDC
               Each market has its own liquidity pool
               Price depends on ratio of tokens in the pool

Swap         → The action of exchanging one token for another
               You put Token A in, get Token B out
               Executed via smart contracts in the liquidity pool

Quote        → Estimated output before you confirm the swap
               "If you give us 100 USDC, you'll get ~0.85 SOL"
               Changes by the time tx actually confirms (→ slippage)

Slippage     → Difference between quoted price and actual price received
               Happens because: price moves while tx is processing
               OR: your trade size is large vs pool size

Slippage     → Max % price change you'll accept
Tolerance      If exceeded → transaction auto-reverts (you pay gas but keep tokens)
               0.5% = safe for stablecoins
               1-3% = typical for volatile pairs
═══════════════════════════════════════════════════════════
`);

// ── Jupiter API — get a real quote from Solana's DEX aggregator ───────────────
// Jupiter aggregates across all Solana DEXs (Raydium, ORCA, Meteora, etc.)
// and finds the best route for your swap

const TOKENS = {
  SOL:  "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP:  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
};

async function getJupiterQuote(inputMint, outputMint, amountIn, slippageBps = 50) {
  // amountIn is in raw units (lamports for SOL = amount × 10^9)
  // slippageBps = slippage in basis points (50 bps = 0.5%)
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountIn}&slippageBps=${slippageBps}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quote = await response.json();
    return quote;
  } catch (err) {
    console.error("Jupiter API error:", err.message);
    return null;
  }
}

function displayQuote(quote, inputSymbol, outputSymbol, inputAmount) {
  if (!quote) {
    console.log("Could not fetch quote (check network / API)");
    return;
  }

  const inAmount = Number(quote.inAmount);
  const outAmount = Number(quote.outAmount);
  const priceImpact = parseFloat(quote.priceImpactPct) * 100;

  console.log(`\n=== JUPITER QUOTE: ${inputSymbol} → ${outputSymbol} ===`);
  console.log(`  Input:        ${inAmount / 1e9} ${inputSymbol}`);
  console.log(`  Output:       ${outputSymbol === "USDC" ? (outAmount / 1e6).toFixed(4) : (outAmount / 1e9).toFixed(6)} ${outputSymbol}`);
  console.log(`  Price impact: ${priceImpact.toFixed(4)}%`);
  console.log(`  Slippage bps: ${quote.slippageBps} (${quote.slippageBps / 100}%)`);
  console.log(`  Route:        ${quote.routePlan?.map(r => r.swapInfo?.label).join(" → ") || "N/A"}`);
}

// ── Manual CPMM quote (no API needed) ────────────────────────────────────────
function getManualQuote(reserveA, reserveB, tokenA, tokenB, amountAOut) {
  const k = reserveA * reserveB;
  const newReserveA = reserveA - amountAOut;
  if (newReserveA <= 0) return console.log("Error: not enough liquidity");
  const newReserveB = k / newReserveA;
  const amountBIn = newReserveB - reserveB;
  const feeAmount = amountBIn * 0.003;
  const priceImpact = ((newReserveB / newReserveA - reserveB / reserveA) / (reserveB / reserveA)) * 100;

  console.log(`\n=== MANUAL QUOTE: ${tokenA}/${tokenB} Pool ===`);
  console.log(`  Pool reserves:  ${reserveA} ${tokenA} / ${reserveB} ${tokenB}`);
  console.log(`  k:              ${k.toLocaleString()}`);
  console.log(`  You get:        ${amountAOut} ${tokenA}`);
  console.log(`  You pay:        ${(amountBIn + feeAmount).toFixed(4)} ${tokenB} (incl. 0.3% fee)`);
  console.log(`  Quoted price:   1 ${tokenA} = ${(reserveB / reserveA).toFixed(4)} ${tokenB}`);
  console.log(`  Actual price:   1 ${tokenA} = ${((amountBIn + feeAmount) / amountAOut).toFixed(4)} ${tokenB}`);
  console.log(`  Price impact:   ${priceImpact.toFixed(4)}%`);
  console.log(`  Slippage:       ${((amountBIn / amountAOut) - (reserveB / reserveA)).toFixed(4)} ${tokenB}/unit`);
}

// Manual quotes — always available, no API needed
getManualQuote(100, 10000, "ETH", "USDT", 10);
getManualQuote(1000, 100000, "SOL", "USDC", 10);

// Jupiter live quotes (requires internet)
async function main() {
  console.log("\n--- Fetching live Jupiter quotes ---");

  // Quote: 1 SOL → USDC
  const solToUsdc = await getJupiterQuote(
    TOKENS.SOL,
    TOKENS.USDC,
    1_000_000_000, // 1 SOL in lamports
    50             // 0.5% slippage tolerance
  );
  displayQuote(solToUsdc, "SOL", "USDC", 1);

  // Quote: 10 SOL → USDC (larger trade → more slippage)
  const solToUsdcLarge = await getJupiterQuote(
    TOKENS.SOL,
    TOKENS.USDC,
    10_000_000_000, // 10 SOL
    100             // 1% slippage tolerance
  );
  displayQuote(solToUsdcLarge, "SOL", "USDC", 10);
}

main().catch(console.error);

/*
KEY CONCEPTS:
- Market = trading pair (SOL/USDC) — each has its own liquidity pool
- Swap = exchange one token for another via AMM (no orderbook, no matching)
- Quote = pre-trade estimate: "you'll get ~X output for Y input"
- Slippage = quoted vs actual — happens due to price movement or large trade size
- Slippage tolerance (BPS) = protection limit: 50 bps = 0.5%, 100 bps = 1%
- Jupiter = DEX aggregator → finds best route across Raydium, ORCA, Meteora etc.
- Price impact % = how much YOUR trade moves the market price
- Larger pool → smaller price impact → better quotes for traders
*/
