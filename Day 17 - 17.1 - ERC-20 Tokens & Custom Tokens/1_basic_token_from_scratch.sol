// Lecture Code - 1_basic_token_from_scratch.sol
// Topic: Basic ERC-20 token implementation from scratch
// Day 17.1 - ERC-20 Tokens & Custom Tokens
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What is an ERC-20 Token? ──────────────────────────────────────────────────
//
// ERC-20 is a standard for FUNGIBLE TOKENS on Ethereum
// Fungible = Interchangeable (like dollars: 1 USDC = 1 USDC)
//
// Real-Life Analogy: Gift Cards
//   - Each $10 Amazon gift card is the same as another $10 card
//   - You can transfer balance, check balance, redeem
//
// Custom Token vs Native Token:
//   - Native (ETH): Stored in account balance (World State)
//   - Custom (USDC, DAI): Stored in contract storage (mapping)

// ══════════════════════════════════════════════════════════════════════════════
// BASIC TOKEN CONTRACT
// ══════════════════════════════════════════════════════════════════════════════

contract BasicToken {
  // ── Token Metadata ────────────────────────────────────────────────────────────
  
  string public name = "KiratCoin";
  string public symbol = "KRAT";
  uint8 public decimals = 18; // 1 token = 1 * 10^18 smallest units
  
  // ── Token Economics ───────────────────────────────────────────────────────────
  
  uint256 public totalSupply;
  address public owner;
  
  // ── Balance Tracking ──────────────────────────────────────────────────────────
  
  // This mapping is WHERE custom token balances are stored
  // Not in account balance like ETH, but in contract storage
  mapping(address => uint256) public balanceOf;
  
  // ── Events ────────────────────────────────────────────────────────────────────
  
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Mint(address indexed to, uint256 value);
  event Burn(address indexed from, uint256 value);
  
  // ── Constructor ───────────────────────────────────────────────────────────────
  
  constructor() {
    owner = msg.sender;
    // Could mint initial supply here:
    // _mint(msg.sender, 1000000 * 10**decimals);
  }
  
  // ── Modifier ──────────────────────────────────────────────────────────────────
  
  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner can call this");
    _;
  }
  
  // ── Mint Function ─────────────────────────────────────────────────────────────
  // CREATE new tokens and assign to an address
  
  function mint(address to, uint256 amount) public onlyOwner {
    require(to != address(0), "Cannot mint to zero address");
    
    balanceOf[to] += amount;
    totalSupply += amount;
    
    emit Mint(to, amount);
    emit Transfer(address(0), to, amount); // Mint = transfer from zero address
  }
  
  // ── Transfer Function ─────────────────────────────────────────────────────────
  // MOVE tokens from sender to recipient
  
  function transfer(address to, uint256 amount) public returns (bool) {
    require(to != address(0), "Cannot transfer to zero address");
    require(balanceOf[msg.sender] >= amount, "Insufficient balance");
    
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    
    emit Transfer(msg.sender, to, amount);
    return true;
  }
  
  // ── Burn Function ─────────────────────────────────────────────────────────────
  // DESTROY tokens and reduce total supply
  
  function burn(uint256 amount) public {
    require(balanceOf[msg.sender] >= amount, "Insufficient balance to burn");
    
    balanceOf[msg.sender] -= amount;
    totalSupply -= amount;
    
    emit Burn(msg.sender, amount);
    emit Transfer(msg.sender, address(0), amount); // Burn = transfer to zero address
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REWARD POINTS EXAMPLE (Real-World Use Case)
// ══════════════════════════════════════════════════════════════════════════════

contract RewardPoints {
  string public name = "Company Reward Points";
  string public symbol = "PTS";
  uint8 public decimals = 0; // Points are whole numbers
  
  uint256 public totalSupply;
  address public company;
  
  mapping(address => uint256) public balanceOf;
  
  event Transfer(address indexed from, address indexed to, uint256 value);
  event PointsEarned(address indexed customer, uint256 amount);
  event PointsRedeemed(address indexed customer, uint256 amount);
  
  constructor() {
    company = msg.sender;
  }
  
  modifier onlyCompany() {
    require(msg.sender == company, "Only company can call this");
    _;
  }
  
  // Company awards points to customers
  function earnPoints(address customer, uint256 amount) public onlyCompany {
    balanceOf[customer] += amount;
    totalSupply += amount;
    
    emit PointsEarned(customer, amount);
    emit Transfer(address(0), customer, amount);
  }
  
  // Customers spend/redeem points
  function redeemPoints(uint256 amount) public {
    require(balanceOf[msg.sender] >= amount, "Insufficient points");
    
    balanceOf[msg.sender] -= amount;
    totalSupply -= amount;
    
    emit PointsRedeemed(msg.sender, amount);
    emit Transfer(msg.sender, address(0), amount);
  }
  
  // Customers can gift points to others
  function transferPoints(address to, uint256 amount) public returns (bool) {
    require(balanceOf[msg.sender] >= amount, "Insufficient points");
    require(to != address(0), "Invalid recipient");
    
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    
    emit Transfer(msg.sender, to, amount);
    return true;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY CONCEPTS
// ══════════════════════════════════════════════════════════════════════════════

/*
ERC-20 = Standard for fungible tokens on Ethereum
FUNGIBLE = Interchangeable (1 USDC = 1 USDC)
BALANCEOF = Mapping that stores how many tokens each address owns
TOTALSUPPLY = Total number of tokens in existence
MINT = Create new tokens (increases supply)
BURN = Destroy tokens (decreases supply)
TRANSFER = Move tokens from one address to another
DECIMALS = Number of decimal places (18 is standard)
EVENTS = Logs emitted for off-chain tracking
OWNER = Address with special permissions (usually creator)

IMPORTANT: Custom token balances are stored in CONTRACT STORAGE, not in the
account's native balance like ETH. Your wallet queries the contract to display
your token balance.

Real-World Comparison:
  Native ETH = Cash in your wallet
  Custom Tokens = Gift cards/loyalty points managed by a company (contract)
*/

// ── Decimals Explanation ──────────────────────────────────────────────────────

/*
DECIMALS = 18 (Standard for ERC-20)

What this means:
  1 token = 1 * 10^18 smallest units
  1 token = 1,000,000,000,000,000,000 wei

Example with decimals = 18:
  To send 1 token:   transfer(to, 1 * 10^18)
  To send 0.5 token: transfer(to, 0.5 * 10^18) = 500000000000000000
  To send 100 tokens: transfer(to, 100 * 10^18)

Why 18 decimals?
  - Matches ETH (1 ETH = 10^18 wei)
  - Allows fractional amounts
  - Avoids floating point issues in smart contracts

Example with decimals = 0 (like reward points):
  1 token = 1 unit (no fractions)
  To send 1 point: transfer(to, 1)
  To send 100 points: transfer(to, 100)
*/

// ── Storage Comparison ────────────────────────────────────────────────────────

/*
┌────────────────────────────────────────────────────────────────────────┐
│                    WHERE BALANCES ARE STORED                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  NATIVE ETH (World State):                                             │
│    Address: 0xAlice                                                    │
│      ├─ Nonce: 5                                                       │
│      ├─ Balance: 10 ETH  ← Stored directly in account                 │
│      └─ Code Hash                                                      │
│                                                                        │
│  CUSTOM TOKEN (Contract Storage):                                      │
│    Contract Address: 0xTokenContract                                   │
│      ├─ Storage:                                                       │
│      │   └─ balanceOf[0xAlice] = 100 USDC  ← Stored in mapping        │
│      │   └─ balanceOf[0xBob] = 50 USDC                                │
│      └─ Code: Token contract logic                                     │
│                                                                        │
│  Alice's wallet shows:                                                 │
│    - 10 ETH (from World State)                                         │
│    - 100 USDC (queries TokenContract.balanceOf(0xAlice))              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
*/
