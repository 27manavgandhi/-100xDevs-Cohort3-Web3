// Lecture Code - 1_staking_and_validators.js
// Topic: What is Staking, Proof of Stake, Validators, Delegators, LSTs
// Day 13.1 - Liquid Staking Tokens, Validators, Indexer & Building a Centralized LST

// ── What is Staking? ──────────────────────────────────────────────────────────
//
// Staking = locking up your crypto to help secure a Proof of Stake blockchain
//           in exchange for earning staking rewards (like interest)
//
// Real-life analogy: Fixed deposit at a bank
//   - You deposit money (crypto) for a period
//   - Bank (blockchain) uses it for operations
//   - You earn interest (staking rewards)
//
// Three pillars of staking:
//   1. Lock tokens          → shows commitment, qualifies you for rewards
//   2. Secure the network   → your stake backs validator's honesty
//   3. Earn rewards         → ~6-8% APY on Solana, ~4% on Ethereum

console.log(`
${"═".repeat(65)}
PROOF OF STAKE vs PROOF OF WORK
${"═".repeat(65)}
                PoW (Bitcoin)              PoS (Solana, ETH2)
────────────────────────────────────────────────────────────────
Block creator   Miners (use GPU/ASIC)     Validators (stake crypto)
Selection       Most compute wins         Most stake wins (+ random)
Energy          Very high                 Very low
Security        Expensive hardware        Locked stake (slashing risk)
Examples        Bitcoin, Litecoin         Solana, Ethereum, Cardano
${"═".repeat(65)}
`);

// ── Validator and Delegator Model ─────────────────────────────────────────────
class Validator {
  constructor(name, commissionRate = 0.033) {
    this.name = name;
    this.commissionRate = commissionRate; // % of rewards they keep
    this.delegations = {};               // delegator → amount staked
    this.totalStaked = 0;
  }

  // User delegates SOL to this validator
  delegate(user, amount) {
    this.delegations[user] = (this.delegations[user] || 0) + amount;
    this.totalStaked += amount;
    console.log(`  ${user} delegated ${amount} SOL to ${this.name}`);
  }

  // Distribute staking rewards at end of epoch
  distributeRewards(epochAPY = 0.07) {
    const epochReward = this.totalStaked * (epochAPY / 365); // daily
    const validatorCut = epochReward * this.commissionRate;
    const delegatorPool = epochReward - validatorCut;

    console.log(`\n⚡ Epoch rewards for ${this.name}:`);
    console.log(`   Total staked:       ${this.totalStaked.toFixed(2)} SOL`);
    console.log(`   Total reward:       ${epochReward.toFixed(4)} SOL`);
    console.log(`   Validator cut (${(this.commissionRate*100).toFixed(1)}%): ${validatorCut.toFixed(4)} SOL`);
    console.log(`   Delegator pool:     ${delegatorPool.toFixed(4)} SOL`);

    const rewards = {};
    for (const [user, stake] of Object.entries(this.delegations)) {
      const share = stake / this.totalStaked;
      rewards[user] = delegatorPool * share;
      console.log(`   ${user.padEnd(10)} earns: ${rewards[user].toFixed(6)} SOL (${(share * 100).toFixed(1)}% share)`);
    }
    return rewards;
  }

  displayStats() {
    console.log(`\nValidator: ${this.name}`);
    console.log(`  Commission: ${(this.commissionRate * 100).toFixed(1)}%`);
    console.log(`  Total staked: ${this.totalStaked.toLocaleString()} SOL`);
    console.log(`  Delegators: ${Object.keys(this.delegations).length}`);
  }
}

// ── Helius — the biggest Solana validator with 0% commission ─────────────────
console.log("=== CURRENT STAKE POOLS — Helius vs Others ===\n");

const helius = new Validator("Helius", 0.00);   // 0% commission — unique!
const marinade = new Validator("Marinade", 0.05); // 5% commission
const typical = new Validator("Generic Validator", 0.033); // 3.3%

// Delegators stake with Helius (from lecture: manages 12,853,102 SOL)
helius.delegate("Alice", 100);
helius.delegate("Bob", 200);
helius.delegate("Charlie", 250);
helius.delegate("Dave", 25000);
// ... in reality 12,853,102 SOL from thousands of delegators

helius.displayStats();
helius.distributeRewards();

typical.delegate("Eve", 1000);
typical.distributeRewards();

console.log(`
KEY INSIGHT ABOUT HELIUS:
  - Helius charges 0% commission — all rewards go back to delegators
  - Most validators: 3.3%–10% commission (this is their business model)
  - Helius makes money from their RPC/API business, not from validator fees
  - This makes Helius uniquely attractive for delegators
  - Try it: https://app.sanctum.so/trade/SOL-hSOL
`);

// ── LST Exchange Rate — Why 1 SOL ≠ 1 hSOL ───────────────────────────────────
console.log("=== WHY DO I NOT GET 1:1 HSOL FOR SOL? ===\n");

class LSTProtocol {
  constructor(name, tokenSymbol) {
    this.name = name;
    this.tokenSymbol = tokenSymbol;
    this.totalSOL = 0;         // total SOL held in the protocol
    this.totalTokens = 0;      // total LST tokens issued
  }

  // Exchange rate: how much SOL each LST token is worth
  get exchangeRate() {
    if (this.totalTokens === 0) return 1;
    return this.totalSOL / this.totalTokens; // SOL per token
  }

  // Stake SOL → get LST tokens
  stake(solAmount) {
    // tokens = SOL / exchangeRate
    // (since each token is worth more SOL over time, you get fewer tokens)
    const tokensToMint = solAmount / this.exchangeRate;
    this.totalSOL += solAmount;
    this.totalTokens += tokensToMint;
    console.log(`  Staked ${solAmount} SOL → received ${tokensToMint.toFixed(4)} ${this.tokenSymbol}`);
    console.log(`  Exchange rate: 1 ${this.tokenSymbol} = ${this.exchangeRate.toFixed(4)} SOL`);
    return tokensToMint;
  }

  // Accrue staking rewards (SOL held grows, tokens stay same → rate increases)
  accrueRewards(annualAPY = 0.07, days = 1) {
    const reward = this.totalSOL * (annualAPY / 365) * days;
    this.totalSOL += reward;
    // totalTokens stays same — this is what makes LST value increase!
  }

  displayRate() {
    console.log(`\n${this.name} (${this.tokenSymbol}):`);
    console.log(`  Total SOL:    ${this.totalSOL.toFixed(4)}`);
    console.log(`  Total tokens: ${this.totalTokens.toFixed(4)}`);
    console.log(`  Rate:         1 ${this.tokenSymbol} = ${this.exchangeRate.toFixed(6)} SOL`);
    console.log(`  (Inversely:   1 SOL = ${(1/this.exchangeRate).toFixed(6)} ${this.tokenSymbol})`);
  }
}

// Fresh protocol — 1:1 at start
const hSOL = new LSTProtocol("Helius Staked SOL", "hSOL");
const mSOL = new LSTProtocol("Marinade SOL", "mSOL");

// Day 1: initial staking
hSOL.stake(1000);
mSOL.stake(1000);

// Simulate 365 days of rewards accruing
hSOL.accrueRewards(0.07, 365);  // 7% APY
mSOL.accrueRewards(0.085, 365); // 8.5% APY (Marinade usually slightly higher)

hSOL.displayRate();
mSOL.displayRate();

console.log(`\nNow if you stake 1 SOL today:`);
console.log(`  → You get ${(1/hSOL.exchangeRate).toFixed(4)} hSOL (less than 1, because hSOL is worth more)`);
console.log(`  → You get ${(1/mSOL.exchangeRate).toFixed(4)} mSOL (even less, mSOL has more value baked in)`);
console.log(`\nAnalogy: 1 SOL (USB drive) → 0.96 hSOL (basic cloud sub) → 0.81 mSOL (premium cloud sub)`);

/*
KEY CONCEPTS:
- Staking = lock crypto, earn rewards, secure PoS network
- Validator = node operator who processes transactions, earns commission
- Delegator = user who stakes with a validator (no need to run a node)
- Helius = biggest Solana validator (12.8M SOL), 0% commission (unique!)
- LST exchange rate increases over time as rewards accrue
- 1 SOL < 1 hSOL in quantity but equal in value (hSOL is worth more per unit)
- "Coffee shop gift card" analogy: card accrues value, you get fewer cards for same money
*/
