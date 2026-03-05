// Lecture Code - 3_impermanent_loss.js
// Topic: Impermanent Loss — full worked example + calculator
// Day 12.1 - Liquidity Pools on Solana, Raydium, ETH vs Solana

// ── What is Impermanent Loss? ─────────────────────────────────────────────────
//
// When you deposit two tokens into a liquidity pool, the AMM automatically
// rebalances the pool as traders swap. If prices diverge from when you entered,
// you end up with fewer of the appreciated token than if you'd just held it.
//
// Called "impermanent" because:
//   - If prices return to original ratio → loss disappears
//   - If you withdraw when prices are different → loss becomes permanent
//
// Analogy: You lend your apples and oranges to a juice shop.
//   - Shop uses apples heavily (high demand), replaces them with oranges
//   - When you take back your share: fewer apples, more oranges
//   - Apples went up in value → you wish you'd just kept them!

// ── Lecture Example: ETH/USDC Pool ───────────────────────────────────────────
function impermanentLossExample() {
  console.log("=== LECTURE EXAMPLE: ETH/USDC Pool ===\n");

  // Initial state
  const initialETH = 1;
  const initialUSDC = 2000;
  const initialETHPrice = 2000; // 1 ETH = $2,000
  const k = initialETH * initialUSDC; // = 2000

  console.log("INITIAL DEPOSIT:");
  console.log(`  You deposit: ${initialETH} ETH + ${initialUSDC} USDC`);
  console.log(`  ETH price:   $${initialETHPrice}`);
  console.log(`  Total value: $${initialETH * initialETHPrice + initialUSDC}`);
  console.log(`  k = ${initialETH} × ${initialUSDC} = ${k}`);

  // ETH price jumps to $8,000
  const newETHPrice = 8000;
  console.log(`\n--- ETH PRICE JUMPS: $${initialETHPrice} → $${newETHPrice} ---`);
  console.log("People rush to buy cheap ETH from the pool...");

  // After rebalancing: pool adjusts to new price
  // New pool: x * y = k AND y/x = newPrice (price = USDC/ETH ratio)
  // From x * y = k and y = newPrice * x:
  //   x * (newPrice * x) = k
  //   x² = k / newPrice
  //   x = sqrt(k / newPrice)
  const newETHinPool = Math.sqrt(k / newETHPrice);
  const newUSDCinPool = k / newETHinPool;

  console.log(`\nPOOL AFTER REBALANCING:`);
  console.log(`  ETH in pool:  ${newETHinPool.toFixed(4)} ETH`);
  console.log(`  USDC in pool: ${newUSDCinPool.toFixed(2)} USDC`);
  console.log(`  k check:      ${(newETHinPool * newUSDCinPool).toFixed(2)} (should be ${k})`);

  // Your pool share value
  const poolValue = newETHinPool * newETHPrice + newUSDCinPool;
  console.log(`\nYOUR POOL SHARE VALUE:`);
  console.log(`  ${newETHinPool.toFixed(4)} ETH × $${newETHPrice} = $${(newETHinPool * newETHPrice).toFixed(2)}`);
  console.log(`  ${newUSDCinPool.toFixed(2)} USDC              = $${newUSDCinPool.toFixed(2)}`);
  console.log(`  Total pool value:  $${poolValue.toFixed(2)}`);

  // HODLing comparison
  const hodlValue = initialETH * newETHPrice + initialUSDC;
  console.log(`\nIF YOU JUST HELD (never entered pool):`);
  console.log(`  ${initialETH} ETH × $${newETHPrice} = $${initialETH * newETHPrice}`);
  console.log(`  ${initialUSDC} USDC            = $${initialUSDC}`);
  console.log(`  Total HODL value:  $${hodlValue}`);

  // The loss
  const loss = poolValue - hodlValue;
  const lossPercent = (loss / hodlValue * 100).toFixed(2);
  console.log(`\nIMPERMANENT LOSS:`);
  console.log(`  Pool value:  $${poolValue.toFixed(2)}`);
  console.log(`  HODL value:  $${hodlValue}`);
  console.log(`  Difference:  $${loss.toFixed(2)} (${lossPercent}%)`);
  console.log(`  You lost:    $${Math.abs(loss).toFixed(2)} by providing liquidity vs just holding!`);
}

// ── Impermanent Loss Calculator ───────────────────────────────────────────────
function calculateImpermanentLoss(initialPriceA, finalPriceA, initialReserveA, initialReserveB) {
  // Using the CPMM formula to calculate post-rebalance state
  const k = initialReserveA * initialReserveB;
  const priceRatio = finalPriceA / initialPriceA; // how much token A's price changed

  // New reserves after rebalancing (AMM finds new equilibrium)
  const newReserveA = Math.sqrt(k / priceRatio);
  const newReserveB = k / newReserveA;

  // Pool value at new prices
  const poolValue = newReserveA * finalPriceA + newReserveB;

  // HODL value: if you'd just kept the initial amounts
  const hodlValue = initialReserveA * finalPriceA + initialReserveB;

  const impermanentLoss = (poolValue / hodlValue - 1) * 100;

  return {
    priceChange: `${priceRatio.toFixed(2)}x`,
    poolValue: poolValue.toFixed(4),
    hodlValue: hodlValue.toFixed(4),
    impermanentLoss: impermanentLoss.toFixed(4) + "%",
    lossAmount: (poolValue - hodlValue).toFixed(4),
    newReserveA: newReserveA.toFixed(6),
    newReserveB: newReserveB.toFixed(4)
  };
}

// ── IL at various price changes ───────────────────────────────────────────────
function showILTable() {
  console.log("\n=== IMPERMANENT LOSS TABLE (ETH/USDC, initial: 1 ETH at $2000) ===");
  console.log("Price Change | Pool Value | HODL Value | IL %");
  console.log("─".repeat(55));

  const scenarios = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0, 8.0, 10.0];

  scenarios.forEach(multiplier => {
    const newPrice = 2000 * multiplier;
    const result = calculateImpermanentLoss(2000, newPrice, 1, 2000);
    const direction = multiplier >= 1 ? "↑" : "↓";
    console.log(
      `  ${multiplier}x (${direction}${Math.abs((multiplier-1)*100).toFixed(0)}%)`.padEnd(15) +
      `| $${result.poolValue.padEnd(12)}` +
      `| $${result.hodlValue.padEnd(12)}` +
      `| ${result.impermanentLoss}`
    );
  });

  console.log("\nNote: IL is symmetric — price going up 4x = same IL as price going down to 0.25x");
  console.log("The more prices diverge from entry, the greater the impermanent loss.");
}

// ── When impermanent loss disappears ─────────────────────────────────────────
function reversalDemo() {
  console.log("\n=== IMPERMANENT LOSS REVERSAL ===");
  console.log("If ETH goes back to $2,000, pool rebalances back to original:");
  const result = calculateImpermanentLoss(2000, 2000, 1, 2000);
  console.log(`IL = ${result.impermanentLoss}`);  // Should be 0%
  console.log("→ Loss disappears if price returns to entry point");
  console.log("→ This is why it's called IMPERMANENT");
  console.log("→ It only becomes PERMANENT when you withdraw at a different price");
}

// Run all demos
impermanentLossExample();
showILTable();
reversalDemo();

/*
KEY CONCEPTS:
- IL = loss from pool rebalancing vs simply holding
- Formula: IL% = (pool value / HODL value - 1) × 100
- IL is always negative (you always do worse in pool vs HODL when prices move)
- But: swap fees offset IL → if fees > IL, providing liquidity is profitable
- IL becomes permanent only when you withdraw
- Largest IL scenarios: one token goes to 0 or one token moons (high volatility pairs)
- Safest pools for LP: stablecoin pairs (USDC/USDT) — prices barely move → minimal IL
- Raydium shows estimated APY from fees — compare against potential IL
*/
