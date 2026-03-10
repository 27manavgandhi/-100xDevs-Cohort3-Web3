// Lecture Code - 2_token_with_allowances.sol
// Topic: ERC-20 allowances - approve, transferFrom, delegation
// Day 17.1 - ERC-20 Tokens & Custom Tokens
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What are Allowances? ──────────────────────────────────────────────────────
//
// ALLOWANCE = Permission for another address to spend your tokens
//
// Real-Life Analogy: ATM Card
//   - You (Harkirat) give your card + PIN to a friend (Raman)
//   - They can withdraw up to $100 (allowance)
//   - They can't access your full balance
//
// Why useful?
//   - DeFi protocols need to spend your tokens
//   - DEX (Uniswap) needs allowance to swap your tokens
//   - Lending platforms need allowance to take collateral

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN WITH ALLOWANCES
// ══════════════════════════════════════════════════════════════════════════════

contract TokenWithAllowances {
  // ── Token Metadata ────────────────────────────────────────────────────────────
  
  string public name = "KiratCoin";
  string public symbol = "KRAT";
  uint8 public decimals = 18;
  
  // ── Token Economics ───────────────────────────────────────────────────────────
  
  uint256 public totalSupply;
  address public owner;
  
  // ── Balance and Allowance Storage ─────────────────────────────────────────────
  
  mapping(address => uint256) public balanceOf;
  
  // Allowances: owner => (spender => amount)
  // allowance[Alice][Bob] = 100 means Bob can spend 100 of Alice's tokens
  mapping(address => mapping(address => uint256)) public allowance;
  
  // ── Events ────────────────────────────────────────────────────────────────────
  
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  
  // ── Constructor ───────────────────────────────────────────────────────────────
  
  constructor(uint256 initialSupply) {
    owner = msg.sender;
    balanceOf[msg.sender] = initialSupply;
    totalSupply = initialSupply;
  }
  
  // ── Transfer Function ─────────────────────────────────────────────────────────
  
  function transfer(address to, uint256 amount) public returns (bool) {
    require(to != address(0), "Invalid recipient");
    require(balanceOf[msg.sender] >= amount, "Insufficient balance");
    
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    
    emit Transfer(msg.sender, to, amount);
    return true;
  }
  
  // ── Approve Function ──────────────────────────────────────────────────────────
  // GRANT permission for spender to use your tokens
  
  function approve(address spender, uint256 amount) public returns (bool) {
    require(spender != address(0), "Invalid spender");
    
    allowance[msg.sender][spender] = amount;
    
    emit Approval(msg.sender, spender, amount);
    return true;
  }
  
  // ── TransferFrom Function ─────────────────────────────────────────────────────
  // SPEND someone else's tokens (if you have allowance)
  
  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public returns (bool) {
    require(from != address(0), "Invalid sender");
    require(to != address(0), "Invalid recipient");
    require(balanceOf[from] >= amount, "Insufficient balance");
    require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
    
    // Update balances
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    
    // Decrease allowance
    allowance[from][msg.sender] -= amount;
    
    emit Transfer(from, to, amount);
    return true;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ALLOWANCE USAGE EXAMPLE: DEX (Decentralized Exchange)
// ══════════════════════════════════════════════════════════════════════════════

// Simple DEX that swaps tokens
contract SimpleDEX {
  TokenWithAllowances public tokenA;
  TokenWithAllowances public tokenB;
  
  uint256 public rateAToB = 2; // 1 A = 2 B
  uint256 public rateBToA = 1; // 2 B = 1 A
  
  constructor(address _tokenA, address _tokenB) {
    tokenA = TokenWithAllowances(_tokenA);
    tokenB = TokenWithAllowances(_tokenB);
  }
  
  // Swap Token A for Token B
  function swapAForB(uint256 amountA) public {
    uint256 amountB = amountA * rateAToB;
    
    // User must have approved this DEX to spend their Token A
    // User calls: tokenA.approve(addressOfDEX, amountA)
    
    // DEX uses transferFrom to take user's Token A
    require(
      tokenA.transferFrom(msg.sender, address(this), amountA),
      "Transfer A failed"
    );
    
    // DEX sends Token B to user
    require(
      tokenB.transfer(msg.sender, amountB),
      "Transfer B failed"
    );
  }
  
  // Swap Token B for Token A
  function swapBForA(uint256 amountB) public {
    require(amountB % 2 == 0, "Must swap even amount of B");
    uint256 amountA = amountB / 2;
    
    // User must approve DEX first
    require(
      tokenB.transferFrom(msg.sender, address(this), amountB),
      "Transfer B failed"
    );
    
    require(
      tokenA.transfer(msg.sender, amountA),
      "Transfer A failed"
    );
  }
  
  // Owner can add liquidity
  function addLiquidityA(uint256 amount) public {
    tokenA.transferFrom(msg.sender, address(this), amount);
  }
  
  function addLiquidityB(uint256 amount) public {
    tokenB.transferFrom(msg.sender, address(this), amount);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ALLOWANCE PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

/*
PATTERN 1: DEX Trading
  1. User approves DEX: tokenA.approve(dexAddress, 1000)
  2. DEX can now spend up to 1000 of user's tokenA
  3. When user trades, DEX calls transferFrom to take tokens
  4. Allowance decreases with each trade

PATTERN 2: Staking
  1. User approves staking contract: token.approve(stakingContract, amount)
  2. Staking contract calls transferFrom to lock tokens
  3. After lock period, contract returns tokens

PATTERN 3: Recurring Payments
  1. User approves subscription contract: token.approve(subContract, monthlyFee * 12)
  2. Each month, contract calls transferFrom to collect payment
  3. Allowance decreases each month

PATTERN 4: Lending
  1. Borrower approves lending platform
  2. Platform calls transferFrom to take collateral
  3. After loan repaid, platform returns collateral
*/

// ── Allowance Visual Example ─────────────────────────────────────────────────

/*
Initial State:
  Harkirat's balance: 1000 KRAT
  Raman's balance: 0 KRAT
  allowance[Harkirat][Raman] = 0

Step 1: Harkirat approves Raman
  Harkirat calls: approve(Raman, 100)
  
  Result:
    Harkirat's balance: 1000 KRAT (unchanged)
    allowance[Harkirat][Raman] = 100

Step 2: Raman spends 50 of Harkirat's tokens
  Raman calls: transferFrom(Harkirat, Kirat, 50)
  
  Result:
    Harkirat's balance: 950 KRAT
    Kirat's balance: 50 KRAT
    allowance[Harkirat][Raman] = 50 (decreased)

Step 3: Raman tries to spend 60 more
  Raman calls: transferFrom(Harkirat, Kirat, 60)
  
  Result:
    ❌ REVERTS - "Insufficient allowance"
    Raman only has allowance of 50 left

Step 4: Harkirat increases allowance
  Harkirat calls: approve(Raman, 200)
  
  Result:
    allowance[Harkirat][Raman] = 200 (replaces old value)

Step 5: Harkirat revokes allowance
  Harkirat calls: approve(Raman, 0)
  
  Result:
    allowance[Harkirat][Raman] = 0
    Raman can no longer spend Harkirat's tokens
*/

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY CONSIDERATIONS
// ══════════════════════════════════════════════════════════════════════════════

contract SecureTokenWithAllowances {
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  
  // ✅ GOOD: Safe approve pattern
  function approve(address spender, uint256 amount) public returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }
  
  // ✅ GOOD: Increase allowance safely
  function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
    _approve(msg.sender, spender, allowance[msg.sender][spender] + addedValue);
    return true;
  }
  
  // ✅ GOOD: Decrease allowance safely
  function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
    uint256 currentAllowance = allowance[msg.sender][spender];
    require(currentAllowance >= subtractedValue, "Decreased below zero");
    
    _approve(msg.sender, spender, currentAllowance - subtractedValue);
    return true;
  }
  
  // Internal approve function
  function _approve(address owner, address spender, uint256 amount) internal {
    require(owner != address(0), "Approve from zero address");
    require(spender != address(0), "Approve to zero address");
    
    allowance[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }
}

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
ALLOWANCE = Permission to spend someone else's tokens
APPROVE = Grant spending permission
TRANSFERFROM = Spend tokens using allowance
DELEGATION = Allowing another address to act on your behalf
SPENDER = Address with permission to spend tokens
OWNER = Address whose tokens can be spent

Common Use Cases:
  - DEX: User approves DEX to swap tokens
  - Staking: User approves staking contract to lock tokens
  - Lending: User approves lending platform for collateral
  - Subscriptions: User approves recurring payments

Security Notes:
  - Always check allowance before transferFrom
  - Decrease allowance after each transferFrom
  - User can revoke allowance anytime with approve(spender, 0)
  - Use increaseAllowance/decreaseAllowance to avoid race conditions
*/
