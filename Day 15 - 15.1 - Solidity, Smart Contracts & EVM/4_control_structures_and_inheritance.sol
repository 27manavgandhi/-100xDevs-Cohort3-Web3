// Lecture Code - 4_control_structures_and_inheritance.sol
// Topic: If-else, loops, require, and inheritance in Solidity
// Day 15.1 - Solidity, Smart Contracts & EVM
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════

contract ControlStructures {
  
  // ── IF-ELSE ─────────────────────────────────────────────────────────────────
  // Conditional logic to execute different code based on conditions
  
  // Example 1: Check if number is even or odd
  function isEven(uint256 number) public pure returns (string memory) {
    if (number % 2 == 0) {
      return "Even";
    } else {
      return "Odd";
    }
  }
  
  // Example 2: Check number category
  function categorizeNumber(uint256 num) public pure returns (string memory) {
    if (num == 0) {
      return "Zero";
    } else if (num < 10) {
      return "Small";
    } else if (num < 100) {
      return "Medium";
    } else {
      return "Large";
    }
  }
  
  // Example 3: Ternary operator (condition ? true : false)
  function max(uint256 a, uint256 b) public pure returns (uint256) {
    return a > b ? a : b; // If a > b, return a, else return b
  }
  
  // Example 4: Multiple conditions
  function checkAge(uint256 age) public pure returns (string memory) {
    if (age >= 18 && age < 65) {
      return "Adult";
    } else if (age >= 65) {
      return "Senior";
    } else {
      return "Minor";
    }
  }
  
  // Example 5: Nested if-else
  function gradeStudent(uint256 score) public pure returns (string memory) {
    if (score >= 90) {
      return "A";
    } else {
      if (score >= 80) {
        return "B";
      } else if (score >= 70) {
        return "C";
      } else {
        return "F";
      }
    }
  }
  
  // ── REQUIRE ─────────────────────────────────────────────────────────────────
  // Ensures conditions are met; otherwise, reverts transaction
  
  mapping(address => uint256) public balances;
  
  // Example 1: Validate deposit amount
  function deposit(uint256 amount) public {
    require(amount > 0, "Amount must be greater than 0");
    balances[msg.sender] += amount;
  }
  
  // Example 2: Validate withdrawal
  function withdraw(uint256 amount) public {
    require(amount > 0, "Amount must be greater than 0");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
  }
  
  // Example 3: Multiple require statements
  function transfer(address to, uint256 amount) public {
    require(to != address(0), "Cannot transfer to zero address");
    require(amount > 0, "Amount must be greater than 0");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    balances[msg.sender] -= amount;
    balances[to] += amount;
  }
  
  // Example 4: Require with revert message
  function setAge(uint256 age) public pure {
    require(age >= 18, "Must be at least 18 years old");
    require(age <= 120, "Age cannot exceed 120");
    // Age is valid, continue...
  }
  
  // Key Points about require:
  /*
  1. If condition is FALSE, transaction reverts (undoes all changes)
  2. Gas used up to the require is consumed
  3. Remaining gas is refunded
  4. Can include error message for debugging
  5. Use for input validation and access control
  */
  
  // ── LOOPS ───────────────────────────────────────────────────────────────────
  // Used to repeat code multiple times
  
  uint256[] public numbers;
  
  // Example 1: For loop - add numbers to array
  function populateArray(uint256 count) public {
    for (uint256 i = 0; i < count; i++) {
      numbers.push(i); // Adds 0, 1, 2, ... count-1
    }
  }
  
  // Example 2: For loop - sum array elements
  function sumArray() public view returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < numbers.length; i++) {
      sum += numbers[i];
    }
    return sum;
  }
  
  // Example 3: While loop - add numbers until threshold
  function addUntilThreshold(uint256 threshold) public pure returns (uint256) {
    uint256 sum = 0;
    uint256 i = 1;
    
    while (sum < threshold) {
      sum += i;
      i++;
    }
    
    return sum;
  }
  
  // Example 4: Do-while loop (executes at least once)
  function doWhileExample(uint256 n) public pure returns (uint256) {
    uint256 result = 0;
    uint256 i = 0;
    
    do {
      result += i;
      i++;
    } while (i < n);
    
    return result;
  }
  
  // Example 5: Break and continue
  function findFirstEven() public view returns (uint256) {
    for (uint256 i = 0; i < numbers.length; i++) {
      if (numbers[i] % 2 == 0) {
        return numbers[i]; // Found even number, exit loop
      }
    }
    return 0; // No even number found
  }
  
  function countOddNumbers() public view returns (uint256) {
    uint256 count = 0;
    for (uint256 i = 0; i < numbers.length; i++) {
      if (numbers[i] % 2 == 0) {
        continue; // Skip even numbers
      }
      count++;
    }
    return count;
  }
  
  // ⚠️ WARNING: Gas Limit Concerns
  // Loops can be VERY expensive in gas if iterating over large arrays
  // Always consider gas limits when using loops
  
  function expensiveLoop() public view returns (uint256) {
    uint256 sum = 0;
    // If numbers.length is 10,000, this could exceed block gas limit!
    for (uint256 i = 0; i < numbers.length; i++) {
      sum += numbers[i] * 2; // More computation = more gas
    }
    return sum;
  }
  
  // Best practice: Avoid loops over unbounded arrays
  // Better: Keep track of sum as items are added
  uint256 public runningSum;
  
  function addNumberOptimized(uint256 num) public {
    numbers.push(num);
    runningSum += num; // O(1) instead of O(n)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INHERITANCE
// ═══════════════════════════════════════════════════════════════════════════

// ── BASE CONTRACT (Parent) ──────────────────────────────────────────────────

contract Vehicle {
  string public brand;
  uint256 public speed;
  
  constructor(string memory _brand) {
    brand = _brand;
    speed = 0;
  }
  
  // Virtual function - can be overridden by child contracts
  function description() public pure virtual returns (string memory) {
    return "This is a vehicle";
  }
  
  function accelerate(uint256 amount) public {
    speed += amount;
  }
  
  function brake(uint256 amount) public {
    require(speed >= amount, "Cannot brake that much");
    speed -= amount;
  }
  
  function getSpeed() public view returns (uint256) {
    return speed;
  }
}

// ── CHILD CONTRACT (inherits from Vehicle) ──────────────────────────────────

contract Car is Vehicle {
  uint256 public numberOfDoors;
  
  // Constructor calls parent constructor
  constructor(
    string memory _brand,
    uint256 _numberOfDoors
  ) Vehicle(_brand) {  // Call parent constructor
    numberOfDoors = _numberOfDoors;
  }
  
  // Override parent function
  function description() public pure override returns (string memory) {
    return "This is a car";
  }
  
  // Additional function specific to Car
  function getCarInfo() public view returns (
    string memory,
    uint256,
    uint256
  ) {
    return (brand, numberOfDoors, speed);
  }
  
  // Can call parent functions
  function turboBoost() public {
    accelerate(50); // Calls parent's accelerate
  }
}

// ── MULTIPLE INHERITANCE ────────────────────────────────────────────────────

contract Electric {
  uint256 public batteryLevel;
  
  constructor() {
    batteryLevel = 100;
  }
  
  function charge() public {
    batteryLevel = 100;
  }
  
  function useBattery(uint256 amount) public {
    require(batteryLevel >= amount, "Not enough battery");
    batteryLevel -= amount;
  }
}

// Inherits from both Vehicle and Electric
contract ElectricCar is Vehicle, Electric {
  
  constructor(string memory _brand) Vehicle(_brand) Electric() {
    // Both parent constructors called
  }
  
  function description() public pure override returns (string memory) {
    return "This is an electric car";
  }
  
  // Can use functions from both parents
  function drive(uint256 speedIncrease) public {
    accelerate(speedIncrease);    // From Vehicle
    useBattery(speedIncrease / 10); // From Electric
  }
  
  function getStatus() public view returns (
    string memory,
    uint256,
    uint256
  ) {
    return (brand, speed, batteryLevel);
  }
}

// ── ABSTRACT CONTRACTS ──────────────────────────────────────────────────────

abstract contract Animal {
  string public name;
  
  constructor(string memory _name) {
    name = _name;
  }
  
  // Abstract function - must be implemented by child
  function makeSound() public virtual returns (string memory);
  
  // Concrete function - inherited as-is
  function sleep() public pure returns (string memory) {
    return "Zzz...";
  }
}

contract Dog is Animal {
  constructor(string memory _name) Animal(_name) {}
  
  // Must implement abstract function
  function makeSound() public pure override returns (string memory) {
    return "Woof!";
  }
}

contract Cat is Animal {
  constructor(string memory _name) Animal(_name) {}
  
  function makeSound() public pure override returns (string memory) {
    return "Meow!";
  }
}

// ── INTERFACES ──────────────────────────────────────────────────────────────

interface IToken {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

// Contract implementing interface
contract SimpleToken is IToken {
  mapping(address => uint256) private _balances;
  
  function transfer(address to, uint256 amount) external override returns (bool) {
    require(_balances[msg.sender] >= amount, "Insufficient balance");
    _balances[msg.sender] -= amount;
    _balances[to] += amount;
    return true;
  }
  
  function balanceOf(address account) external view override returns (uint256) {
    return _balances[account];
  }
  
  function mint(address to, uint256 amount) external {
    _balances[to] += amount;
  }
}

// ── Inheritance Patterns ────────────────────────────────────────────────────

/*
┌───────────────────────────────────────────────────────────────────────────┐
│                      INHERITANCE PATTERNS                                 │
├─────────────┬─────────────────────────────────────────────────────────────┤
│ Pattern     │ Description                                                 │
├─────────────┼─────────────────────────────────────────────────────────────┤
│ Single      │ contract Child is Parent                                    │
│ Inheritance │ - Inherits all public/internal members                      │
│             │ - Can override virtual functions                            │
│             │                                                             │
│ Multiple    │ contract Child is Parent1, Parent2                          │
│ Inheritance │ - Order matters (rightmost parent takes precedence)         │
│             │ - Can cause diamond problem                                │
│             │                                                             │
│ Virtual     │ function name() public virtual                              │
│             │ - Can be overridden by child                                │
│             │                                                             │
│ Override    │ function name() public override                             │
│             │ - Overrides parent's virtual function                       │
│             │                                                             │
│ Abstract    │ abstract contract Name                                      │
│ Contract    │ - Cannot be deployed                                        │
│             │ - Contains at least one unimplemented function             │
│             │                                                             │
│ Interface   │ interface IName                                             │
│             │ - No implementation, only signatures                        │
│             │ - All functions are external                                │
└─────────────┴─────────────────────────────────────────────────────────────┘
*/

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
IF-ELSE = Conditional execution based on boolean conditions
REQUIRE = Validation statement, reverts if condition false
FOR LOOP = Iterate a fixed number of times
WHILE LOOP = Iterate while condition is true
DO-WHILE = Execute at least once, then check condition
BREAK = Exit loop early
CONTINUE = Skip to next iteration
INHERITANCE = Child contract inherits parent's functions/variables
VIRTUAL = Function can be overridden by child
OVERRIDE = Child overrides parent's virtual function
ABSTRACT = Contract with unimplemented functions (cannot deploy)
INTERFACE = Contract with only function signatures (no implementation)
IS = Keyword to declare inheritance (contract Child is Parent)
SUPER = Reference to parent contract
*/
