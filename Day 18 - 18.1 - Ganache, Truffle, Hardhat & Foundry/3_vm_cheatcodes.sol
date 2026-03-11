// Lecture Code - 3_vm_cheatcodes.sol
// Topic: Foundry cheatcodes - vm.prank, vm.deal, vm.hoax, vm.expectEmit
// Day 18.1 - Ganache, Truffle, Hardhat & Foundry

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

contract SimpleToken {
  mapping(address => uint256) public balances;
  event Transfer(address indexed from, address indexed to, uint256 value);
  
  function transfer(address to, uint256 amount) public {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    balances[to] += amount;
    emit Transfer(msg.sender, to, amount);
  }
  
  function mint(address to, uint256 amount) public {
    balances[to] += amount;
  }
}

contract CheatcodeTest is Test {
  SimpleToken token;
  address alice = address(0x1);
  address bob = address(0x2);
  
  function setUp() public {
    token = new SimpleToken();
    token.mint(address(this), 1000);
  }
  
  // ── vm.prank ──────────────────────────────────────────────────────────────────
  // Impersonate address for ONE transaction
  
  function test_Prank() public {
    token.mint(alice, 100);
    
    vm.prank(alice); // Next call will be from alice
    token.transfer(bob, 50);
    
    assertEq(token.balances(alice), 50);
    assertEq(token.balances(bob), 50);
  }
  
  // ── vm.startPrank / vm.stopPrank ──────────────────────────────────────────────
  // Impersonate for MULTIPLE transactions
  
  function test_StartStopPrank() public {
    token.mint(alice, 100);
    
    vm.startPrank(alice); // All calls now from alice
    token.transfer(bob, 30);
    token.transfer(bob, 20);
    vm.stopPrank(); // Back to test contract
    
    assertEq(token.balances(alice), 50);
  }
  
  // ── vm.deal ───────────────────────────────────────────────────────────────────
  // Set ETH balance of address
  
  function test_Deal() public {
    vm.deal(alice, 10 ether);
    assertEq(alice.balance, 10 ether);
  }
  
  // ── vm.hoax ───────────────────────────────────────────────────────────────────
  // Prank + Deal in one (give ETH and prank)
  
  function test_Hoax() public {
    vm.hoax(alice, 5 ether); // Alice has 5 ETH and next call is from alice
    // Next transaction will be from alice with 5 ETH
  }
  
  // ── vm.expectEmit ─────────────────────────────────────────────────────────────
  // Test event emission
  
  function test_ExpectEmit() public {
    token.mint(alice, 100);
    
    vm.expectEmit(true, true, false, true);
    emit SimpleToken.Transfer(alice, bob, 50);
    
    vm.prank(alice);
    token.transfer(bob, 50);
  }
}

/*
VM CHEATCODES:
- vm.prank(addr) - Next call from addr
- vm.startPrank(addr) - All calls from addr until stopPrank
- vm.stopPrank() - Stop pranking
- vm.deal(addr, amount) - Set ETH balance
- vm.hoax(addr, amount) - Prank + deal
- vm.expectEmit(t1, t2, t3, data) - Expect event
- vm.expectRevert() - Expect next call to revert
*/
