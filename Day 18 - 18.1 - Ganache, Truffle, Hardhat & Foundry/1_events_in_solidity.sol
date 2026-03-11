// Lecture Code - 1_events_in_solidity.sol
// Topic: Events in Solidity - declaring, emitting, and using events for logging
// Day 18.1 - Ganache, Truffle, Hardhat & Foundry

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What are Events? ──────────────────────────────────────────────────────────
//
// EVENTS = Logs emitted by contracts to record important actions
//
// Why use events?
//   1. GAS EFFICIENT - Cheaper than storing in contract storage
//   2. OFF-CHAIN TRACKING - Frontend can listen to events
//   3. SEARCHABLE - Indexed parameters allow filtering
//   4. HISTORICAL RECORD - Permanent blockchain log

// ══════════════════════════════════════════════════════════════════════════════
// BASIC EVENTS
// ══════════════════════════════════════════════════════════════════════════════

contract BasicEvents {
  // ── Declaring Events ──────────────────────────────────────────────────────────
  
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Deposit(address indexed user, uint256 amount, uint256 timestamp);
  
  mapping(address => uint256) public balances;
  
  // ── Emitting Events ───────────────────────────────────────────────────────────
  
  function transfer(address to, uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    balances[msg.sender] -= amount;
    balances[to] += amount;
    
    // Emit event
    emit Transfer(msg.sender, to, amount);
  }
  
  function deposit() public payable {
    balances[msg.sender] += msg.value;
    
    // Emit with block.timestamp
    emit Deposit(msg.sender, msg.value, block.timestamp);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INDEXED PARAMETERS
// ══════════════════════════════════════════════════════════════════════════════

/*
INDEXED PARAMETERS = Searchable event parameters (topics)

Rules:
  - Max 3 indexed parameters per event
  - Indexed params are stored as topics (searchable)
  - Non-indexed params stored as data (not searchable, but cheaper)

Event Log Structure:
  Topics: [EventSignature, indexed1, indexed2, indexed3]
  Data: [non-indexed params]

Example:
  event Transfer(address indexed from, address indexed to, uint256 value);
  
  Topics: [Transfer signature hash, from address, to address]
  Data: [value]
*/

contract IndexedExample {
  event UserAction(
    address indexed user,     // Topic 1 - searchable
    string indexed action,    // Topic 2 - searchable (hashed if >32 bytes)
    uint256 indexed timestamp, // Topic 3 - searchable
    uint256 value             // Data - not searchable
  );
  
  function performAction(string memory action, uint256 value) public {
    emit UserAction(msg.sender, action, block.timestamp, value);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLES
// ══════════════════════════════════════════════════════════════════════════════

contract MoneyTransferApp {
  event MoneySSent(
    address indexed from,
    address indexed to,
    uint256 amount,
    uint256 timestamp,
    string message
  );
  
  event MoneyReceived(address indexed to, uint256 amount);
  
  mapping(address => uint256) public balances;
  
  function sendMoney(address to, uint256 amount, string memory message) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    balances[msg.sender] -= amount;
    balances[to] += amount;
    
    emit MoneySent(msg.sender, to, amount, block.timestamp, message);
    emit MoneyReceived(to, amount);
  }
  
  function deposit() public payable {
    balances[msg.sender] += msg.value;
  }
}

/*
KEY CONCEPTS:
- EVENT = Logged action on blockchain
- EMIT = Trigger an event
- INDEXED = Searchable parameter (topic)
- TOPIC = Indexed parameter in event log
- DATA = Non-indexed parameters
- GAS COST = ~375 gas per indexed param, ~8 gas per byte of data
*/
