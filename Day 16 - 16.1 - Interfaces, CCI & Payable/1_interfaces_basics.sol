// Lecture Code - 1_interfaces_basics.sol
// Topic: Interfaces in Solidity - definitions, implementation, and usage
// Day 16.1 - Interfaces, Cross-Contract Invocation & Payable
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What is an Interface? ─────────────────────────────────────────────────────
//
// An interface is like a CONTRACT BLUEPRINT that:
//   - Defines function signatures WITHOUT implementation
//   - Specifies HOW to interact with a contract
//   - Enables contracts to call each other without knowing internal details
//
// Real-Life Analogy: TV Remote
//   - The remote shows which buttons exist (functions)
//   - You don't know HOW the TV processes the signal internally
//   - You just press buttons and the TV responds
//
// Real-Life Analogy: ATM Interface
//   - ATM shows options: "Withdraw", "Check Balance", "Deposit"
//   - You don't know the bank's internal system
//   - You just use the interface to communicate

// ── Interface Basics ──────────────────────────────────────────────────────────

// Example 1: Simple interface for a counter
interface ICounter {
  // Function declarations ONLY (no implementation)
  // All functions MUST be external
  
  function increment() external;
  function decrement() external;
  function getCount() external view returns (uint256);
  function reset() external;
}

// Example 2: Token interface (simplified ERC20)
interface IERC20 {
  // Transfer tokens
  function transfer(address to, uint256 amount) external returns (bool);
  
  // Get balance
  function balanceOf(address account) external view returns (uint256);
  
  // Get total supply
  function totalSupply() external view returns (uint256);
}

// Example 3: Greeter interface
interface IGreeter {
  function greet() external view returns (string memory);
  function setGreeting(string memory newGreeting) external;
}

// ── Implementing an Interface ─────────────────────────────────────────────────

// Contract that implements ICounter interface
contract Counter is ICounter {
  uint256 private count;
  
  // Must implement ALL functions from interface
  function increment() external override {
    count += 1;
  }
  
  function decrement() external override {
    require(count > 0, "Count is already zero");
    count -= 1;
  }
  
  function getCount() external view override returns (uint256) {
    return count;
  }
  
  function reset() external override {
    count = 0;
  }
}

// Another implementation of ICounter
contract DoubleCounter is ICounter {
  uint256 private count;
  
  // Different behavior - increments by 2
  function increment() external override {
    count += 2;
  }
  
  function decrement() external override {
    require(count >= 2, "Count too low");
    count -= 2;
  }
  
  function getCount() external view override returns (uint256) {
    return count;
  }
  
  function reset() external override {
    count = 0;
  }
}

// ── Using Interfaces ──────────────────────────────────────────────────────────

contract CounterUser {
  // Using interface to interact with any ICounter implementation
  
  // Increment a counter at given address
  function incrementCounter(address counterAddress) public {
    // Create interface instance
    ICounter counter = ICounter(counterAddress);
    
    // Call function through interface
    counter.increment();
  }
  
  // Get count from any counter
  function getCounterValue(address counterAddress) public view returns (uint256) {
    ICounter counter = ICounter(counterAddress);
    return counter.getCount();
  }
  
  // Increment multiple times
  function incrementMultiple(address counterAddress, uint256 times) public {
    ICounter counter = ICounter(counterAddress);
    
    for (uint256 i = 0; i < times; i++) {
      counter.increment();
    }
  }
  
  // Works with BOTH Counter and DoubleCounter!
  // As long as they implement ICounter interface
}

// ── Key Features of Interfaces ───────────────────────────────────────────────

/*
1. Function Declarations Only
   - No function bodies
   - No implementation code
   - Just signatures

2. All Functions Must Be External
   - Cannot be public, internal, or private
   - Only callable from outside

3. No State Variables
   - Cannot have storage variables
   - No data storage

4. No Constructors
   - Interfaces cannot have constructor
   - Cannot be instantiated directly

5. Can Inherit from Other Interfaces
   - But not from regular contracts
*/

// ── Advanced Interface Examples ──────────────────────────────────────────────

// Interface inheritance
interface IExtendedCounter is ICounter {
  function getCountHistory() external view returns (uint256[] memory);
  function getLastChange() external view returns (uint256);
}

// Multiple interfaces
interface INamed {
  function getName() external view returns (string memory);
  function setName(string memory newName) external;
}

// Contract implementing multiple interfaces
contract NamedCounter is ICounter, INamed {
  uint256 private count;
  string private name;
  
  constructor(string memory _name) {
    name = _name;
  }
  
  // ICounter implementation
  function increment() external override {
    count += 1;
  }
  
  function decrement() external override {
    require(count > 0, "Count is zero");
    count -= 1;
  }
  
  function getCount() external view override returns (uint256) {
    return count;
  }
  
  function reset() external override {
    count = 0;
  }
  
  // INamed implementation
  function getName() external view override returns (string memory) {
    return name;
  }
  
  function setName(string memory newName) external override {
    name = newName;
  }
}

// ── Real-World Example: ERC20 Token ──────────────────────────────────────────

// Simplified ERC20 interface
interface IERC20Simple {
  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function transfer(address to, uint256 amount) external returns (bool);
  
  event Transfer(address indexed from, address indexed to, uint256 value);
}

// Simple token implementation
contract SimpleToken is IERC20Simple {
  mapping(address => uint256) private _balances;
  uint256 private _totalSupply;
  string public name;
  
  constructor(string memory _name, uint256 initialSupply) {
    name = _name;
    _totalSupply = initialSupply;
    _balances[msg.sender] = initialSupply;
  }
  
  function totalSupply() external view override returns (uint256) {
    return _totalSupply;
  }
  
  function balanceOf(address account) external view override returns (uint256) {
    return _balances[account];
  }
  
  function transfer(address to, uint256 amount) external override returns (bool) {
    require(_balances[msg.sender] >= amount, "Insufficient balance");
    require(to != address(0), "Cannot transfer to zero address");
    
    _balances[msg.sender] -= amount;
    _balances[to] += amount;
    
    emit Transfer(msg.sender, to, amount);
    return true;
  }
}

// Contract that uses any ERC20 token
contract TokenManager {
  // Send tokens from this contract to recipient
  function sendTokens(
    address tokenAddress,
    address recipient,
    uint256 amount
  ) public returns (bool) {
    IERC20Simple token = IERC20Simple(tokenAddress);
    return token.transfer(recipient, amount);
  }
  
  // Check balance of any address for any token
  function checkBalance(
    address tokenAddress,
    address account
  ) public view returns (uint256) {
    IERC20Simple token = IERC20Simple(tokenAddress);
    return token.balanceOf(account);
  }
  
  // Get total supply of any token
  function getTotalSupply(address tokenAddress) public view returns (uint256) {
    IERC20Simple token = IERC20Simple(tokenAddress);
    return token.totalSupply();
  }
}

// ── Why Use Interfaces? ──────────────────────────────────────────────────────

/*
1. MODULARITY
   - Separate interface (what) from implementation (how)
   - Different contracts can implement same interface differently
   
2. INTEROPERABILITY
   - Contracts can interact without knowing each other's code
   - Just need to know the interface
   
3. UPGRADEABILITY
   - Can swap out implementations without changing calling code
   - As long as new implementation follows same interface
   
4. STANDARDIZATION
   - Industry standards like ERC20, ERC721 use interfaces
   - All tokens implementing IERC20 can be used interchangeably
   
5. TYPE SAFETY
   - Solidity compiler ensures correct function signatures
   - Prevents calling non-existent functions
*/

// ── Interface vs Abstract Contract ───────────────────────────────────────────

/*
┌────────────────────────────────────────────────────────────────────────┐
│                  INTERFACE VS ABSTRACT CONTRACT                        │
├─────────────────┬──────────────────────┬────────────────────────────────┤
│ Feature         │ Interface            │ Abstract Contract              │
├─────────────────┼──────────────────────┼────────────────────────────────┤
│ Functions       │ Declarations only    │ Can have implementations       │
│ State Variables │ ❌ Not allowed       │ ✅ Allowed                     │
│ Constructors    │ ❌ Not allowed       │ ✅ Allowed                     │
│ Inheritance     │ Only other interfaces│ Contracts and interfaces       │
│ Visibility      │ Must be external     │ Can be public/internal/etc     │
│ Use Case        │ Define standards     │ Partial implementations        │
└─────────────────┴──────────────────────┴────────────────────────────────┘
*/

// Example abstract contract (for comparison)
abstract contract AbstractCounter {
  uint256 internal count; // ✅ Can have state variables
  
  // ✅ Can have implemented functions
  function getCount() public view virtual returns (uint256) {
    return count;
  }
  
  // ✅ Can have unimplemented functions
  function increment() public virtual;
}

// ── Common Patterns ───────────────────────────────────────────────────────────

// Pattern 1: Interface for external contracts
// Used when you need to call functions on already-deployed contracts
contract UsingExternalContract {
  function callExternalCounter(address externalAddress) public {
    ICounter external Counter = ICounter(externalAddress);
    externalCounter.increment();
  }
}

// Pattern 2: Interface for dependency injection
// Pass any contract that implements the interface
contract FlexibleContract {
  ICounter public counter;
  
  constructor(address counterAddress) {
    counter = ICounter(counterAddress);
  }
  
  function updateCounter() public {
    counter.increment();
  }
  
  // Can change which counter contract is used
  function setCounter(address newCounterAddress) public {
    counter = ICounter(newCounterAddress);
  }
}

// Pattern 3: Interface for testing
// Easy to create mock implementations for testing
contract MockCounter is ICounter {
  uint256 private fakeCount = 42;
  
  function increment() external override {}
  function decrement() external override {}
  function getCount() external view override returns (uint256) {
    return fakeCount; // Always returns 42 for testing
  }
  function reset() external override {}
}

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
INTERFACE = Contract blueprint with function signatures only
EXTERNAL = Only visibility allowed for interface functions
OVERRIDE = Keyword when implementing interface function
MULTIPLE INTERFACES = Contract can implement many interfaces
IERC20 = Standard interface for fungible tokens
TYPE CASTING = ICounter(address) converts address to interface
MODULARITY = Separation of interface and implementation
INTEROPERABILITY = Different contracts using same interface
STANDARDIZATION = Industry-wide interfaces (ERC20, ERC721, etc.)
*/

// ── Real-World Analogy Summary ────────────────────────────────────────────────

/*
INTERFACE = TV Remote / ATM Screen
  - Shows what buttons/options are available
  - Doesn't show internal workings
  - Just facilitates interaction

IMPLEMENTATION = The actual TV / Bank System
  - Does the real work
  - Processes the commands
  - Internal complexity hidden

USER = Your Contract
  - Uses the interface to interact
  - Doesn't need to know how it works internally
  - Just calls the functions defined in interface
*/
