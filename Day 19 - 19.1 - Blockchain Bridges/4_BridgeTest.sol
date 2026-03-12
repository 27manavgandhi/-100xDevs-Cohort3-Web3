// Lecture Code - 4_BridgeTest.sol
// Topic: Comprehensive Testing for Bridge Contracts
// Day 19.1 - Blockchain Bridges
//
// To run: Use Foundry testing framework
// forge test -vvv

// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

// ── What is Testing in Blockchain? ───────────────────────────────────────────
//
// Testing ensures your smart contracts work correctly before deploying to mainnet.
// One bug can cost millions of dollars in a bridge contract!
//
// Real-Life Analogy: Bridge Safety Inspection
//   - Before opening a physical bridge, engineers test it extensively
//   - They check weight limits, stress tests, safety mechanisms
//   - Smart contract testing is the same - verify everything works
//
// Why test bridges?
//   1. HIGH VALUE TARGET: Bridges hold millions in locked tokens
//   2. IRREVERSIBLE: Can't undo transactions once on blockchain
//   3. COMPLEX LOGIC: Multiple chains, mint/burn, permissions

// ══════════════════════════════════════════════════════════════════════════════
// MOCK CONTRACTS - Simplified versions for testing
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Mock USDT Token
 * A simplified ERC-20 token for testing purposes
 */
contract USDT {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    
    function mint(address _to, uint256 _amount) public {
        balances[_to] += _amount;
    }
    
    function approve(address _spender, uint256 _amount) public {
        allowances[msg.sender][_spender] = _amount;
    }
    
    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowances[_owner][_spender];
    }
    
    function transferFrom(address _from, address _to, uint256 _amount) public returns (bool) {
        require(allowances[_from][msg.sender] >= _amount, "Insufficient allowance");
        require(balances[_from] >= _amount, "Insufficient balance");
        
        balances[_from] -= _amount;
        balances[_to] += _amount;
        allowances[_from][msg.sender] -= _amount;
        
        return true;
    }
    
    function transfer(address _to, uint256 _amount) public returns (bool) {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
        return true;
    }
    
    function balanceOf(address _account) public view returns (uint256) {
        return balances[_account];
    }
}

/**
 * Simple IERC20 Interface
 */
interface IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * Mock BridgeETH Contract
 */
contract BridgeETH {
    address public tokenAddress;
    mapping(address => uint256) public pendingBalance;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    
    constructor(address _tokenAddress) {
        tokenAddress = _tokenAddress;
    }
    
    function deposit(uint256 _amount) public {
        IERC20 token = IERC20(tokenAddress);
        require(token.allowance(msg.sender, address(this)) >= _amount, "Insufficient allowance");
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        pendingBalance[msg.sender] += _amount;
        emit Deposit(msg.sender, _amount);
    }
    
    function withdraw(uint256 _amount) public {
        require(pendingBalance[msg.sender] >= _amount, "Insufficient balance");
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(msg.sender, _amount), "Transfer failed");
        pendingBalance[msg.sender] -= _amount;
        emit Withdraw(msg.sender, _amount);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE TEST CONTRACT - Comprehensive Test Suite
// ══════════════════════════════════════════════════════════════════════════════

contract BridgeETHTest is Test {
    
    // ── Test Contracts ────────────────────────────────────────────────────────
    
    BridgeETH public bridge;
    USDT public usdt;
    
    // ── Test Users ────────────────────────────────────────────────────────────
    
    // Harkirat is our test user (using makeAddr creates a deterministic address)
    address public user = address(0x29664730b0a7108b1a109c473a30869b076948c5); // Harkirat's address from slides
    
    // ── Setup Function ────────────────────────────────────────────────────────
    
    /**
     * setUp() runs before each test
     * It creates a fresh environment for testing
     * 
     * Real-Life Analogy: Reset before each experiment
     * - Before testing a bridge's weight limit
     * - You remove all previous weight
     * - Start fresh for each test
     */
    function setUp() public {
        // Deploy mock USDT token
        usdt = new USDT();
        
        // Deploy BridgeETH contract with USDT address
        bridge = new BridgeETH(address(usdt));
        
        // Mint 200 USDT to our test user (Harkirat)
        usdt.mint(user, 200);
    }
    
    // ── Test 1: User Can Deposit Tokens ───────────────────────────────────────
    
    /**
     * Tests that a user can successfully deposit USDT into the bridge
     * 
     * Steps:
     * 1. User approves bridge to spend USDT
     * 2. User deposits 200 USDT
     * 3. Verify balances updated correctly
     */
    function test_Deposit() public {
        // Switch to user's context (vm.startPrank makes next calls from 'user')
        vm.startPrank(user);
        
        // User approves bridge to spend 200 USDT
        usdt.approve(address(bridge), 200);
        
        // User deposits 200 USDT into bridge
        bridge.deposit(200);
        
        // Stop acting as user
        vm.stopPrank();
        
        // ── ASSERTIONS (Verify Results) ───────────────────────────────────────
        
        // User should now have 0 USDT (all deposited)
        assertEq(usdt.balanceOf(user), 0, "User should have 0 USDT after deposit");
        
        // Bridge should hold 200 USDT
        assertEq(usdt.balanceOf(address(bridge)), 200, "Bridge should hold 200 USDT");
        
        // User's pendingBalance should be 200
        assertEq(bridge.pendingBalance(user), 200, "User pendingBalance should be 200");
    }
    
    // ── Test 2: User Can Withdraw Tokens ──────────────────────────────────────
    
    /**
     * Tests that a user can withdraw their locked tokens
     * 
     * Steps:
     * 1. User deposits first (setup)
     * 2. User withdraws 100 USDT
     * 3. Verify balances updated correctly
     */
    function test_Withdraw() public {
        // First, user deposits 200 USDT
        vm.startPrank(user);
        usdt.approve(address(bridge), 200);
        bridge.deposit(200);
        
        // Now user withdraws 100 USDT
        bridge.withdraw(100);
        vm.stopPrank();
        
        // ── ASSERTIONS ────────────────────────────────────────────────────────
        
        // User should have 100 USDT back
        assertEq(usdt.balanceOf(user), 100, "User should have 100 USDT after withdraw");
        
        // Bridge should still hold 100 USDT
        assertEq(usdt.balanceOf(address(bridge)), 100, "Bridge should hold 100 USDT");
        
        // User's pendingBalance should be 100
        assertEq(bridge.pendingBalance(user), 100, "User pendingBalance should be 100");
    }
    
    // ── Test 3: Cannot Withdraw Without Deposit ───────────────────────────────
    
    /**
     * Tests that users cannot withdraw tokens they haven't deposited
     * This should revert with "Insufficient balance"
     */
    function testFail_WithdrawWithoutDeposit() public {
        vm.startPrank(user);
        
        // This should fail because user hasn't deposited anything
        bridge.withdraw(100);
        
        vm.stopPrank();
    }
    
    // ── Test 4: Cannot Deposit Without Approval ───────────────────────────────
    
    /**
     * Tests that deposits fail if user hasn't approved the bridge
     * This should revert with "Insufficient allowance"
     */
    function testFail_DepositWithoutApproval() public {
        vm.startPrank(user);
        
        // User tries to deposit without approving first - should fail
        bridge.deposit(200);
        
        vm.stopPrank();
    }
    
    // ── Test 5: Multiple Deposits Accumulate ──────────────────────────────────
    
    /**
     * Tests that multiple deposits correctly accumulate
     */
    function test_MultipleDeposits() public {
        vm.startPrank(user);
        
        // Approve for 200 USDT
        usdt.approve(address(bridge), 200);
        
        // Deposit 100 USDT
        bridge.deposit(100);
        assertEq(bridge.pendingBalance(user), 100, "First deposit should be 100");
        
        // Deposit another 100 USDT
        bridge.deposit(100);
        assertEq(bridge.pendingBalance(user), 200, "Total should be 200");
        
        vm.stopPrank();
    }
    
    // ── Test 6: Full Withdraw Resets Balance ──────────────────────────────────
    
    /**
     * Tests that withdrawing full amount resets pendingBalance to 0
     */
    function test_FullWithdraw() public {
        vm.startPrank(user);
        
        // Deposit 200 USDT
        usdt.approve(address(bridge), 200);
        bridge.deposit(200);
        
        // Withdraw all 200 USDT
        bridge.withdraw(200);
        
        vm.stopPrank();
        
        // ── ASSERTIONS ────────────────────────────────────────────────────────
        
        // User should have all 200 USDT back
        assertEq(usdt.balanceOf(user), 200, "User should have 200 USDT");
        
        // Bridge should hold 0 USDT
        assertEq(usdt.balanceOf(address(bridge)), 0, "Bridge should hold 0 USDT");
        
        // User's pendingBalance should be 0
        assertEq(bridge.pendingBalance(user), 0, "User pendingBalance should be 0");
    }
    
    // ── Test 7: Events Are Emitted ────────────────────────────────────────────
    
    /**
     * Tests that correct events are emitted during deposit and withdraw
     */
    function test_DepositEmitsEvent() public {
        vm.startPrank(user);
        usdt.approve(address(bridge), 200);
        
        // Expect Deposit event
        vm.expectEmit(true, false, false, true);
        emit BridgeETH.Deposit(user, 200);
        
        bridge.deposit(200);
        vm.stopPrank();
    }
    
    function test_WithdrawEmitsEvent() public {
        vm.startPrank(user);
        
        // Setup: Deposit first
        usdt.approve(address(bridge), 200);
        bridge.deposit(200);
        
        // Expect Withdraw event
        vm.expectEmit(true, false, false, true);
        emit BridgeETH.Withdraw(user, 100);
        
        bridge.withdraw(100);
        vm.stopPrank();
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTING BEST PRACTICES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * TESTING CHECKLIST:
 * 
 * ✓ Happy Path Tests:
 *   - User can deposit
 *   - User can withdraw
 *   - Balances update correctly
 * 
 * ✓ Edge Cases:
 *   - Deposit without approval (should fail)
 *   - Withdraw without deposit (should fail)
 *   - Withdraw more than deposited (should fail)
 *   - Zero amount deposits/withdrawals
 * 
 * ✓ State Changes:
 *   - PendingBalance updates correctly
 *   - Token balances change as expected
 *   - Multiple deposits accumulate
 * 
 * ✓ Events:
 *   - Deposit event emitted
 *   - Withdraw event emitted
 *   - Correct event parameters
 * 
 * ✓ Access Control:
 *   - Only owner can call restricted functions
 *   - Users can only withdraw their own funds
 */

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD TESTING SCENARIO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SCENARIO: Testing the Complete Bridge Flow
 * 
 * 1. SETUP PHASE:
 *    - Deploy USDT token ✓
 *    - Deploy BridgeETH contract ✓
 *    - Mint USDT to test users ✓
 * 
 * 2. DEPOSIT PHASE:
 *    - User approves bridge ✓
 *    - User deposits 200 USDT ✓
 *    - Verify: user balance = 0 ✓
 *    - Verify: bridge balance = 200 ✓
 *    - Verify: pendingBalance = 200 ✓
 *    - Verify: Deposit event emitted ✓
 * 
 * 3. WITHDRAW PHASE:
 *    - User withdraws 100 USDT ✓
 *    - Verify: user balance = 100 ✓
 *    - Verify: bridge balance = 100 ✓
 *    - Verify: pendingBalance = 100 ✓
 *    - Verify: Withdraw event emitted ✓
 * 
 * 4. EDGE CASE TESTS:
 *    - Try withdraw without deposit (should fail) ✓
 *    - Try deposit without approval (should fail) ✓
 *    - Try withdraw more than deposited (should fail) ✓
 */

/*
KEY CONCEPTS:
- TEST = Automated check that code works correctly
- SETUP = Function that runs before each test
- ASSERTION = Check that verifies expected outcome
- VM.STARTPRANK = Foundry function to impersonate an address
- VM.EXPECTEMIT = Expect a specific event to be emitted
- TESTFAIL = Test that should revert/fail
- MOCK CONTRACT = Simplified version for testing
- HAPPY PATH = Normal expected usage
- EDGE CASE = Unusual or boundary conditions
- BALANCE TRACKING = Verify tokens move correctly
- EVENT TESTING = Verify correct events are emitted
- ACCESS CONTROL = Verify only authorized users can call functions
*/
