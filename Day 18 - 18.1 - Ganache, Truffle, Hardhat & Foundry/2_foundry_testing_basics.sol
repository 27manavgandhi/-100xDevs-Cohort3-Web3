// Lecture Code - 2_foundry_testing_basics.sol
// Topic: Foundry testing - Test.sol, setUp, test functions
// Day 18.1 - Ganache, Truffle, Hardhat & Foundry

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT TO TEST
// ══════════════════════════════════════════════════════════════════════════════

contract Counter {
  uint256 public count;
  event CountUpdated(uint256 newCount);
  
  function increment() public {
    count++;
    emit CountUpdated(count);
  }
  
  function decrement() public {
    require(count > 0, "Count is zero");
    count--;
    emit CountUpdated(count);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FOUNDRY TEST
// ══════════════════════════════════════════════════════════════════════════════

contract CounterTest is Test {
  Counter public counter;
  
  // setUp runs before each test
  function setUp() public {
    counter = new Counter();
  }
  
  // Test functions must start with "test"
  function test_InitialCount() public {
    assertEq(counter.count(), 0);
  }
  
  function test_Increment() public {
    counter.increment();
    assertEq(counter.count(), 1);
  }
  
  function test_MultipleIncrements() public {
    counter.increment();
    counter.increment();
    counter.increment();
    assertEq(counter.count(), 3);
  }
  
  function test_Decrement() public {
    counter.increment();
    counter.decrement();
    assertEq(counter.count(), 0);
  }
  
  function testFail_DecrementZero() public {
    counter.decrement(); // Should revert
  }
  
  // Test events
  function test_EventEmitted() public {
    vm.expectEmit(true, true, true, true);
    emit Counter.CountUpdated(1);
    counter.increment();
  }
}

/*
FOUNDRY TESTING PATTERNS:
- Test files end with .t.sol
- Test contracts inherit from Test
- setUp() runs before each test
- test* functions are test cases
- testFail* functions expect revert
- Assertions: assertEq, assertTrue, assertFalse, etc.
*/
