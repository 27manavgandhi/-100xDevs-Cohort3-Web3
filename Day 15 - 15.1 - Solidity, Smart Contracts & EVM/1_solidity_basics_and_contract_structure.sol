// Lecture Code - 1_solidity_basics_and_contract_structure.sol
// Topic: Solidity basics, pragma, contracts, variables, and data types
// Day 15.1 - Solidity, Smart Contracts & EVM
//
// To run: Use Remix IDE at https://remix.ethereum.org/
// 1. Create new file: 1_solidity_basics_and_contract_structure.sol
// 2. Paste this code
// 3. Compile with Solidity compiler ^0.8.0
// 4. Deploy and interact

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What is Solidity? ─────────────────────────────────────────────────────────
//
// Solidity is a programming language for writing smart contracts on Ethereum.
// Think of it as JavaScript for blockchain.
//
// Key characteristics:
//   - High-level language (easy to read/write)
//   - Statically typed (must declare variable types)
//   - Compiled to bytecode (low-level machine code for EVM)
//   - Object-oriented (uses contracts like classes)

// ── SPDX License Identifier ──────────────────────────────────────────────────
//
// SPDX-License-Identifier: MIT
//   - This is a comment that specifies the code license
//   - MIT = permissive open-source license
//   - Required by Solidity compiler to avoid warnings

// ── Pragma Directive ──────────────────────────────────────────────────────────
//
// pragma solidity ^0.8.0;
//   - Tells compiler which Solidity version to use
//   - ^0.8.0 means "any version from 0.8.0 to below 0.9.0"
//   - 0.8.26 means "exact version 0.8.26 only"
//   - >=0.7.0 <0.9.0 means "any version from 0.7.0 to below 0.9.0"

// ── Contract Declaration ──────────────────────────────────────────────────────
// 
// Like a class in OOP, a contract is the basic building block
contract SolidityBasics {
  
  // ── State Variables ─────────────────────────────────────────────────────────
  // These are stored permanently on the blockchain (in contract storage)
  
  // 1. Unsigned Integers (can't be negative)
  uint8 public smallNumber;      // 0 to 255 (2^8 - 1)
  uint16 public mediumNumber;    // 0 to 65,535 (2^16 - 1)
  uint32 public largeNumber;     // 0 to 4,294,967,295 (2^32 - 1)
  uint256 public veryLargeNumber; // 0 to 2^256 - 1 (default uint)
  uint public defaultUint;       // uint = uint256
  
  // 2. Signed Integers (can be negative)
  int8 public tinySignedNumber;   // -128 to 127
  int32 public signedNumber;      // -2^31 to 2^31 - 1
  int256 public bigSignedNumber;  // -2^255 to 2^255 - 1
  int public defaultInt;          // int = int256
  
  // 3. Boolean
  bool public isActive;           // true or false
  
  // 4. Address (Ethereum wallet address)
  address public owner;           // 20-byte Ethereum address (0x...)
  address public contractAddress; // Can store contract addresses too
  
  // 5. String
  string public message;          // UTF-8 encoded string
  string public name;
  
  // 6. Bytes (fixed-size byte arrays)
  bytes1 public singleByte;       // 1 byte
  bytes32 public hash;            // 32 bytes (common for hashes)
  
  // Real-world example: Decentralized Uber
  // You'd store:
  //   - Rides (struct with driver, rider, fare, status)
  //   - Users (mapping of address to User struct)
  //   - Locations (coordinates as uint)
  //   - Payments (mapping of address to balance)
  
  // ── Constructor ─────────────────────────────────────────────────────────────
  // Runs ONCE when contract is deployed to blockchain
  // Used to initialize state variables
  constructor() {
    // Set initial values
    smallNumber = 42;
    mediumNumber = 1000;
    largeNumber = 1000000;
    veryLargeNumber = 123456789012345678901234567890;
    
    tinySignedNumber = -50;
    signedNumber = -1000000;
    bigSignedNumber = -123456789012345678901234567890;
    
    isActive = true;
    owner = msg.sender; // msg.sender = address that deployed the contract
    contractAddress = address(this); // address of this contract
    
    message = "Hello, Solidity!";
    name = "SolidityBasics";
    
    singleByte = 0x42; // Hexadecimal notation
    hash = keccak256(abi.encodePacked("example")); // SHA-3 hash
  }
  
  // ── Functions to Update Variables ───────────────────────────────────────────
  
  function setSmallNumber(uint8 _value) public {
    smallNumber = _value;
  }
  
  function setMessage(string memory _newMessage) public {
    message = _newMessage;
  }
  
  function setIsActive(bool _status) public {
    isActive = _status;
  }
  
  // ── View Functions (Read-only, don't modify state) ─────────────────────────
  
  function getSmallNumber() public view returns (uint8) {
    return smallNumber;
  }
  
  function getMessage() public view returns (string memory) {
    return message;
  }
  
  function getOwner() public view returns (address) {
    return owner;
  }
  
  // ── Pure Functions (Don't read or modify state) ────────────────────────────
  
  function add(uint a, uint b) public pure returns (uint) {
    return a + b;
  }
  
  function multiply(uint a, uint b) public pure returns (uint) {
    return a * b;
  }
  
  // ── Demonstration of Variable Types ────────────────────────────────────────
  
  function demonstrateTypes() public pure returns (
    uint8,
    int8,
    bool,
    string memory
  ) {
    uint8 unsignedNum = 255;     // Maximum value for uint8
    int8 signedNum = -128;       // Minimum value for int8
    bool flag = true;
    string memory text = "Demo";
    
    return (unsignedNum, signedNum, flag, text);
  }
}

// ── Variable Type Comparison ──────────────────────────────────────────────────

/*
┌─────────────────────────────────────────────────────────────────────┐
│                    VARIABLE TYPES IN SOLIDITY                       │
├─────────────┬─────────────────┬─────────────────────────────────────┤
│ Type        │ Size            │ Range / Use Case                    │
├─────────────┼─────────────────┼─────────────────────────────────────┤
│ uint8       │ 1 byte          │ 0 to 255                            │
│ uint16      │ 2 bytes         │ 0 to 65,535                         │
│ uint32      │ 4 bytes         │ 0 to ~4 billion                     │
│ uint256     │ 32 bytes        │ 0 to 2^256-1 (default uint)         │
│             │                 │                                     │
│ int8        │ 1 byte          │ -128 to 127                         │
│ int256      │ 32 bytes        │ -2^255 to 2^255-1 (default int)     │
│             │                 │                                     │
│ bool        │ 1 byte          │ true or false                       │
│             │                 │                                     │
│ address     │ 20 bytes        │ Ethereum address (0x...)            │
│             │                 │                                     │
│ string      │ Dynamic         │ UTF-8 text (stored in memory/storage│
│             │                 │                                     │
│ bytes1      │ 1 byte          │ Single byte (0x00 to 0xFF)          │
│ bytes32     │ 32 bytes        │ Fixed 32 bytes (hashes, IDs)        │
└─────────────┴─────────────────┴─────────────────────────────────────┘
*/

// ── Deployment & Interaction Flow ─────────────────────────────────────────────

/*
1. WRITE SOLIDITY CODE
   ↓
2. COMPILE TO BYTECODE + ABI
   Solidity compiler (solc) generates:
   - Bytecode: Low-level machine code for EVM
   - ABI: JSON interface describing contract functions
   ↓
3. DEPLOY TO BLOCKCHAIN
   - Bytecode is sent in a transaction
   - Contract gets an address (e.g., 0xABC123...)
   - Constructor runs once
   ↓
4. INTERACT WITH CONTRACT
   - Call functions using ABI
   - State-changing functions → send transaction (costs gas)
   - View/pure functions → free to call externally
*/

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
SOLIDITY = Language for smart contracts (like JavaScript for blockchain)
CONTRACT = Basic building block (like a class)
STATE VARIABLES = Data stored on blockchain (permanent)
CONSTRUCTOR = Runs once when deploying contract
FUNCTION = Code that can be called to read/write state
VIEW = Function that reads state but doesn't change it
PURE = Function that doesn't read or change state
PUBLIC = Anyone can call this function
UINT/INT = Unsigned/signed integers
ADDRESS = Ethereum wallet or contract address
STRING = Text data
BYTES = Raw binary data
*/

// ── Real-World Analogy ────────────────────────────────────────────────────────

/*
Smart Contract = Digital Vending Machine

1. State Variables = What the vending machine stores
   - uint balance = money collected
   - mapping(uint => string) items = snack inventory
   - address owner = who owns the machine

2. Constructor = Initial setup when installed
   - Set owner
   - Stock initial items
   - Set prices

3. Functions = What the vending machine can do
   - buySnack(uint itemId) payable = insert money, get snack
   - restock(uint itemId, string item) = owner refills
   - withdrawFunds() = owner takes the money

4. View Functions = Check status without changing anything
   - getBalance() = see how much money is inside
   - getItem(uint itemId) = see what snack is at slot 5

5. Modifiers = Rules
   - onlyOwner = only the owner can restock or withdraw
   - require(msg.value >= price) = must insert enough money
*/
