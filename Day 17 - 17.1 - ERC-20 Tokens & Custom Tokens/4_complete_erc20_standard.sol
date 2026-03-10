// Lecture Code - 4_complete_erc20_standard.sol
// Topic: Complete ERC-20 standard implementation with all required functions
// Day 17.1 - ERC-20 Tokens & Custom Tokens

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ══════════════════════════════════════════════════════════════════════════════
// COMPLETE ERC-20 IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

contract CompleteERC20 {
  // ── ERC-20 Required State Variables ──────────────────────────────────────────
  
  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 public totalSupply;
  
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  
  // ── ERC-20 Required Events ────────────────────────────────────────────────────
  
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  
  // ── Constructor ───────────────────────────────────────────────────────────────
  
  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint256 _initialSupply
  ) {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    totalSupply = _initialSupply * 10**_decimals;
    balanceOf[msg.sender] = totalSupply;
    emit Transfer(address(0), msg.sender, totalSupply);
  }
  
  // ── ERC-20 Required Functions ─────────────────────────────────────────────────
  
  function transfer(address to, uint256 value) public returns (bool) {
    require(to != address(0), "Invalid recipient");
    require(balanceOf[msg.sender] >= value, "Insufficient balance");
    
    balanceOf[msg.sender] -= value;
    balanceOf[to] += value;
    
    emit Transfer(msg.sender, to, value);
    return true;
  }
  
  function approve(address spender, uint256 value) public returns (bool) {
    require(spender != address(0), "Invalid spender");
    
    allowance[msg.sender][spender] = value;
    
    emit Approval(msg.sender, spender, value);
    return true;
  }
  
  function transferFrom(address from, address to, uint256 value) public returns (bool) {
    require(from != address(0), "Invalid sender");
    require(to != address(0), "Invalid recipient");
    require(balanceOf[from] >= value, "Insufficient balance");
    require(allowance[from][msg.sender] >= value, "Insufficient allowance");
    
    balanceOf[from] -= value;
    balanceOf[to] += value;
    allowance[from][msg.sender] -= value;
    
    emit Transfer(from, to, value);
    return true;
  }
}

/*
ERC-20 STANDARD SPECIFICATION:

REQUIRED FUNCTIONS:
✅ totalSupply() → uint256
✅ balanceOf(address) → uint256
✅ transfer(address, uint256) → bool
✅ transferFrom(address, address, uint256) → bool
✅ approve(address, uint256) → bool
✅ allowance(address, address) → uint256

REQUIRED EVENTS:
✅ Transfer(address indexed from, address indexed to, uint256 value)
✅ Approval(address indexed owner, address indexed spender, uint256 value)

OPTIONAL (but recommended):
✅ name → string
✅ symbol → string
✅ decimals → uint8

Reference: https://eips.ethereum.org/EIPS/eip-20
*/
