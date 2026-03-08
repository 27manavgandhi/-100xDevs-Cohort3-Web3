// Lecture Code - 2_functions_and_visibility.sol
// Topic: Functions in Solidity - state-changing vs view, visibility, constructor
// Day 15.1 - Solidity, Smart Contracts & EVM
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What are Functions in Solidity? ──────────────────────────────────────────
//
// Functions are blocks of code that perform specific tasks.
// They can:
//   - Read state variables (view)
//   - Modify state variables (state-changing)
//   - Accept parameters
//   - Return values
//   - Have different visibility levels

contract FunctionsDemo {
  
  // ── State Variables ─────────────────────────────────────────────────────────
  uint256 public currentValue;
  address public owner;
  string public status;
  
  // ── Constructor ─────────────────────────────────────────────────────────────
  // Special function that runs ONLY ONCE when contract is deployed
  // Used to initialize state variables
  
  constructor(uint256 _initialValue) {
    currentValue = _initialValue;
    owner = msg.sender; // msg.sender = address deploying the contract
    status = "initialized";
  }
  
  // ── STATE-CHANGING FUNCTIONS ────────────────────────────────────────────────
  // These functions MODIFY the blockchain state
  // They COST GAS because they require a transaction
  
  // Example 1: Add to current value
  function add(uint256 value) public {
    currentValue += value; // Modifies state → costs gas
  }
  
  // Example 2: Subtract from current value
  function subtract(uint256 value) public {
    require(currentValue >= value, "Cannot subtract: result would be negative");
    currentValue -= value;
  }
  
  // Example 3: Multiply current value
  function multiply(uint256 value) public {
    currentValue *= value;
  }
  
  // Example 4: Reset to zero
  function reset() public {
    currentValue = 0;
    status = "reset";
  }
  
  // Example 5: Set a new value directly
  function setValue(uint256 newValue) public {
    currentValue = newValue;
    status = "updated";
  }
  
  // Real-Life Analogy:
  // State-changing functions = Making a bank transaction
  //   - Deposit or withdraw money → balance changes
  //   - Takes time and costs a fee (gas)
  //   - Requires a transaction to be recorded
  
  // ── VIEW FUNCTIONS ──────────────────────────────────────────────────────────
  // These functions ONLY READ blockchain state, never modify it
  // They are FREE when called externally (no gas cost)
  // Cannot be called from state-changing functions without gas cost
  
  // Example 1: Get current value
  function getValue() public view returns (uint256) {
    return currentValue; // Just reading → no gas
  }
  
  // Example 2: Get status
  function getStatus() public view returns (string memory) {
    return status;
  }
  
  // Example 3: Check if value is greater than threshold
  function isGreaterThan(uint256 threshold) public view returns (bool) {
    return currentValue > threshold;
  }
  
  // Example 4: Get owner address
  function getOwner() public view returns (address) {
    return owner;
  }
  
  // Example 5: Calculate double without storing (view can do calculations)
  function calculateDouble() public view returns (uint256) {
    return currentValue * 2; // Calculation without modifying state
  }
  
  // Real-Life Analogy:
  // View functions = Checking your bank balance
  //   - Just viewing the balance → nothing changes
  //   - Quick and free, no fee required
  //   - Doesn't affect anything
  
  // ── PURE FUNCTIONS ──────────────────────────────────────────────────────────
  // These functions DON'T READ or MODIFY state
  // They only work with parameters passed to them
  // Used for utility/helper functions
  
  // Example 1: Add two numbers
  function addNumbers(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b; // No state access at all
  }
  
  // Example 2: Multiply two numbers
  function multiplyNumbers(uint256 a, uint256 b) public pure returns (uint256) {
    return a * b;
  }
  
  // Example 3: Check if number is even
  function isEven(uint256 num) public pure returns (bool) {
    return num % 2 == 0;
  }
  
  // Example 4: Get maximum of two numbers
  function max(uint256 a, uint256 b) public pure returns (uint256) {
    return a > b ? a : b;
  }
  
  // ── VISIBILITY MODIFIERS ────────────────────────────────────────────────────
  
  // PUBLIC: Anyone can call (externally or internally)
  function publicFunction() public pure returns (string memory) {
    return "Anyone can call this";
  }
  
  // EXTERNAL: Can ONLY be called from outside the contract
  // Slightly more gas efficient than public for external calls
  function externalFunction() external pure returns (string memory) {
    return "Only external calls";
  }
  
  // INTERNAL: Can only be called from this contract or contracts that inherit it
  function internalFunction() internal pure returns (string memory) {
    return "Only from this contract or child contracts";
  }
  
  // PRIVATE: Can only be called from this contract (not even child contracts)
  function privateFunction() private pure returns (string memory) {
    return "Only from this exact contract";
  }
  
  // Demonstrating internal function call
  function callInternalFunction() public pure returns (string memory) {
    return internalFunction(); // OK: same contract
  }
  
  // Demonstrating private function call
  function callPrivateFunction() public pure returns (string memory) {
    return privateFunction(); // OK: same contract
  }
  
  // Note: Cannot call external functions internally with externalFunction()
  // Must use this.externalFunction() (creates external call)
  function callExternalFunction() public view returns (string memory) {
    return this.externalFunction(); // External call to self
  }
  
  // ── PAYABLE FUNCTIONS ───────────────────────────────────────────────────────
  // Functions that can receive Ether (ETH)
  // Must have 'payable' keyword
  
  uint256 public totalDeposited;
  
  function deposit() public payable {
    require(msg.value > 0, "Must send some ETH");
    totalDeposited += msg.value; // msg.value = amount of ETH sent (in wei)
  }
  
  function getBalance() public view returns (uint256) {
    return address(this).balance; // Contract's ETH balance
  }
  
  // ── FUNCTION MODIFIERS ──────────────────────────────────────────────────────
  // Custom modifiers to add preconditions to functions
  
  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner can call this");
    _; // Continue executing the function
  }
  
  modifier validValue(uint256 value) {
    require(value > 0, "Value must be greater than 0");
    _;
  }
  
  // Using modifiers
  function restrictedFunction() public onlyOwner {
    status = "Owner called restricted function";
  }
  
  function setValueWithValidation(uint256 newValue) public validValue(newValue) {
    currentValue = newValue;
  }
  
  // Multiple modifiers
  function ownerOnlySetValue(uint256 newValue) public onlyOwner validValue(newValue) {
    currentValue = newValue;
    status = "Owner set new value";
  }
  
  // ── RETURN VALUES ───────────────────────────────────────────────────────────
  
  // Single return value
  function getSingleValue() public view returns (uint256) {
    return currentValue;
  }
  
  // Multiple return values (tuple)
  function getMultipleValues() public view returns (
    uint256,
    address,
    string memory
  ) {
    return (currentValue, owner, status);
  }
  
  // Named return values
  function getNamedValues() public view returns (
    uint256 value,
    address ownerAddress,
    string memory currentStatus
  ) {
    value = currentValue;
    ownerAddress = owner;
    currentStatus = status;
  }
  
  // Destructuring return values
  function demonstrateMultipleReturns() public view returns (uint256, string memory) {
    (uint256 val, , string memory stat) = getMultipleValues();
    // Skip the middle value (address) with empty comma
    return (val, stat);
  }
}

// ── Visibility Comparison Table ──────────────────────────────────────────────

/*
┌───────────────────────────────────────────────────────────────────────────┐
│                   VISIBILITY COMPARISON TABLE                             │
├───────────┬────────────┬─────────────┬──────────────┬─────────────────────┤
│ Visibility│ Same       │ Derived     │ Other        │ External            │
│           │ Contract   │ Contracts   │ Contracts    │ Users               │
├───────────┼────────────┼─────────────┼──────────────┼─────────────────────┤
│ public    │ ✅ Yes     │ ✅ Yes      │ ✅ Yes       │ ✅ Yes              │
│ external  │ ❌ No*     │ ✅ Yes      │ ✅ Yes       │ ✅ Yes              │
│ internal  │ ✅ Yes     │ ✅ Yes      │ ❌ No        │ ❌ No               │
│ private   │ ✅ Yes     │ ❌ No       │ ❌ No        │ ❌ No               │
└───────────┴────────────┴─────────────┴──────────────┴─────────────────────┘

* Can call with this.externalFunction() (creates external call)
*/

// ── Function Type Comparison ──────────────────────────────────────────────────

/*
┌─────────────────────────────────────────────────────────────────────────┐
│                    FUNCTION TYPE COMPARISON                             │
├──────────────┬──────────────┬─────────────┬────────────┬────────────────┤
│ Type         │ Reads State  │ Writes State│ Costs Gas  │ Use Case       │
├──────────────┼──────────────┼─────────────┼────────────┼────────────────┤
│ State-       │ ✅ Can       │ ✅ Yes      │ ✅ Always  │ Transfer ETH,  │
│ changing     │              │             │            │ update balance │
│              │              │             │            │                │
│ view         │ ✅ Yes       │ ❌ No       │ ❌ No      │ Check balance, │
│              │              │             │ (external) │ get info       │
│              │              │             │            │                │
│ pure         │ ❌ No        │ ❌ No       │ ❌ No      │ Math helpers,  │
│              │              │             │ (external) │ utilities      │
│              │              │             │            │                │
│ payable      │ ✅ Can       │ ✅ Can      │ ✅ Always  │ Receive ETH,   │
│              │              │             │            │ deposit        │
└──────────────┴──────────────┴─────────────┴────────────┴────────────────┘
*/

// ── Real-World Examples ───────────────────────────────────────────────────────

/*
BANK ACCOUNT ANALOGY:

State-Changing Functions (Transactions):
  - deposit(amount)     → Add money to account
  - withdraw(amount)    → Take money out
  - transfer(to, amount)→ Send money to someone
  → All require a transaction, take time, cost a fee

View Functions (Checking):
  - getBalance()        → Check current balance
  - getAccountInfo()    → View account details
  - isOverdrawn()       → Check if balance is negative
  → All are instant, free, just looking at data

Pure Functions (Calculations):
  - calculateInterest(principal, rate) → Calculate interest
  - max(a, b)                          → Find larger number
  - isEven(num)                        → Check if even
  → No account data needed, just math

Payable Functions (Deposits):
  - receive() payable   → Accept incoming money
  - deposit() payable   → Deposit ETH
  → Can receive Ether along with function call
*/

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
CONSTRUCTOR = Runs once on deployment, initializes contract
STATE-CHANGING = Modifies blockchain, costs gas, requires transaction
VIEW = Reads state only, free externally, no gas
PURE = No state access, pure computation, free externally
PUBLIC = Anyone can call (most common)
EXTERNAL = Only external calls (gas efficient)
INTERNAL = This contract + child contracts
PRIVATE = Only this exact contract
PAYABLE = Can receive ETH
MODIFIER = Reusable precondition logic (e.g., onlyOwner)
REQUIRE = Validation statement, reverts if false
MSG.SENDER = Address calling the function
MSG.VALUE = Amount of ETH sent with call (in wei)
THIS = Reference to current contract
*/
