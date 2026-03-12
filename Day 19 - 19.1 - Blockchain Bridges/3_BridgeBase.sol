// Lecture Code - 3_BridgeBase.sol
// Topic: Base Chain Bridge Contract for Minting/Burning Bridged Tokens
// Day 19.1 - Blockchain Bridges
//
// To run: Deploy on destination chain (Base, Polygon, etc.)
// forge create src/BridgeBase.sol:BridgeBase --constructor-args <BUSDT_ADDRESS>

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ── What is BridgeBase? ───────────────────────────────────────────────────────
//
// BridgeBase is the contract on the destination chain (e.g., Base, Polygon)
// that manages the minting and burning of bridged tokens (BUSDT).
//
// Real-Life Analogy: Foreign Bank Branch
//   - Main bank in City A (Ethereum) holds your cash
//   - Foreign branch in City B (Base) issues you a temporary card
//   - When you're done in City B, you return the card
//   - Main bank gives you back your original cash
//
// Why separate contracts?
//   1. CHAIN ISOLATION: Each chain has its own bridge logic
//   2. SECURITY: Limits damage if one chain is compromised
//   3. FLEXIBILITY: Can upgrade one side without affecting the other

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACE - How to interact with BUSDT contract
// ══════════════════════════════════════════════════════════════════════════════

interface IBUSDT {
    /**
     * @notice Mint new BUSDT tokens
     * @param _to Recipient address
     * @param _amount Amount to mint
     */
    function mint(address _to, uint256 _amount) external;
    
    /**
     * @notice Burn BUSDT tokens
     * @param _from Address whose tokens will be burned
     * @param _amount Amount to burn
     */
    function burn(address _from, uint256 _amount) external;
}

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE BASE CONTRACT - Manages Bridged Tokens on Destination Chain
// ══════════════════════════════════════════════════════════════════════════════

contract BridgeBase is Ownable {
    
    // ── State Variables ───────────────────────────────────────────────────────
    
    // Address of the BUSDT token contract
    address public tokenAddress;
    
    // Mapping: user address => amount of BUSDT they can burn
    // Tracks pending balances for users who have minted BUSDT
    mapping(address => uint256) public pendingBalance;
    
    // ── Events ────────────────────────────────────────────────────────────────
    
    // Emitted when BUSDT is minted for a user
    // Triggered after USDT is locked on Ethereum
    event Mint(address indexed user, uint256 amount);
    
    // Emitted when a user burns their BUSDT
    // Bridge operator listens to unlock USDT on Ethereum
    event Burn(address indexed user, uint256 amount);
    
    // ── Constructor ───────────────────────────────────────────────────────────
    
    /**
     * @param _tokenAddress The BUSDT contract address
     */
    constructor(address _tokenAddress) Ownable(msg.sender) {
        tokenAddress = _tokenAddress;
    }
    
    // ── Mint Function (Only Owner) ────────────────────────────────────────────
    
    /**
     * @notice Mints BUSDT to a user (called by bridge operator)
     * @param _to Address to receive BUSDT
     * @param _amount Amount of BUSDT to mint
     * 
     * This function is called when:
     * 1. User locks USDT on Ethereum
     * 2. Bridge operator detects the Deposit event
     * 3. Bridge operator calls this to mint equivalent BUSDT on Base
     * 
     * Only Owner (bridge operator) can call this to prevent unauthorized minting.
     * 
     * Real-Life Analogy:
     * - Customer deposits $200 at Main Bank (Ethereum)
     * - Bank manager (owner) at Branch Bank (Base) receives notification
     * - Manager issues $200 in local currency to customer
     */
    function mint(address _to, uint256 _amount) public onlyOwner {
        // Get reference to BUSDT contract
        IBUSDT token = IBUSDT(tokenAddress);
        
        // Mint new BUSDT tokens to the user
        token.mint(_to, _amount);
        
        // Update user's pending balance
        // This tracks how much they've received and can later burn
        pendingBalance[_to] += _amount;
        
        // Emit event for off-chain monitoring
        emit Mint(_to, _amount);
    }
    
    // ── Burn Function (Public) ────────────────────────────────────────────────
    
    /**
     * @notice Burns user's BUSDT tokens
     * @param _amount Amount of BUSDT to burn
     * 
     * This function is called when:
     * 1. User wants to move assets back to Ethereum
     * 2. User calls burn() to destroy their BUSDT on Base
     * 3. Bridge operator detects Burn event
     * 4. Bridge operator allows user to withdraw original USDT on Ethereum
     * 
     * Any user can burn their own tokens (no onlyOwner restriction).
     * 
     * Real-Life Analogy:
     * - Customer returns $200 local currency to Branch Bank
     * - Branch Bank destroys the local currency (burn)
     * - Main Bank gets notification to release original $200 to customer
     */
    function burn(uint256 _amount) public {
        // Check if user has enough pending balance
        require(
            pendingBalance[msg.sender] >= _amount,
            "Insufficient balance"
        );
        
        // Get reference to BUSDT contract
        IBUSDT token = IBUSDT(tokenAddress);
        
        // Burn the BUSDT tokens
        token.burn(msg.sender, _amount);
        
        // Decrease user's pending balance
        pendingBalance[msg.sender] -= _amount;
        
        // Emit event so bridge operator knows to unlock USDT on Ethereum
        emit Burn(msg.sender, _amount);
    }
    
    // ── View Functions ────────────────────────────────────────────────────────
    
    /**
     * @notice Get a user's pending BUSDT balance
     * @param user The address to check
     * @return The amount of BUSDT this user has received via bridge
     */
    function getBalance(address user) public view returns (uint256) {
        return pendingBalance[user];
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE: Complete Two-Way Flow
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SCENARIO: Bob bridges 1000 USDT from Ethereum to Base
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 1: ETHEREUM → BASE (Lock and Mint)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ON ETHEREUM:
 * ────────────
 * Bob's Actions:
 *   1. Has 1000 USDT in wallet
 *   2. Calls: USDT.approve(bridgeETH, 1000)
 *   3. Calls: bridgeETH.deposit(1000)
 * 
 * BridgeETH Contract:
 *   - Transfers 1000 USDT from Bob to itself
 *   - Updates pendingBalance[Bob] = 1000
 *   - Emits: Deposit(Bob, 1000)
 * 
 * Bridge Operator (Off-Chain Service):
 *   - Listens for Deposit events on Ethereum
 *   - Detects: Deposit(Bob, 1000)
 *   - Verifies transaction is valid and confirmed
 *   - Calls: bridgeBase.mint(Bob, 1000) on Base chain
 * 
 * ON BASE:
 * ────────
 * BridgeBase Contract:
 *   - Receives mint call from bridge operator
 *   - Calls: BUSDT.mint(Bob, 1000)
 *   - Updates pendingBalance[Bob] = 1000
 *   - Emits: Mint(Bob, 1000)
 * 
 * BUSDT Contract:
 *   - Creates 1000 new BUSDT tokens
 *   - Sends them to Bob's address
 *   - Total supply increases by 1000
 * 
 * Bob's Result:
 *   - Ethereum: 0 USDT (locked in bridge)
 *   - Base: 1000 BUSDT (newly minted)
 *   - Can now use BUSDT in Base DeFi
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * PART 2: BASE → ETHEREUM (Burn and Unlock)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ON BASE:
 * ────────
 * Bob's Actions:
 *   1. Has 1000 BUSDT in wallet
 *   2. Calls: bridgeBase.burn(1000)
 * 
 * BridgeBase Contract:
 *   - Checks pendingBalance[Bob] >= 1000 ✓
 *   - Calls: BUSDT.burn(Bob, 1000)
 *   - Updates pendingBalance[Bob] = 0
 *   - Emits: Burn(Bob, 1000)
 * 
 * BUSDT Contract:
 *   - Destroys 1000 BUSDT from Bob's wallet
 *   - Total supply decreases by 1000
 * 
 * Bridge Operator:
 *   - Listens for Burn events on Base
 *   - Detects: Burn(Bob, 1000)
 *   - Verifies transaction is valid
 *   - Enables Bob to withdraw on Ethereum
 *   - (In advanced bridges, automatically triggers withdraw)
 * 
 * ON ETHEREUM:
 * ────────────
 * Bob's Actions:
 *   - Calls: bridgeETH.withdraw(1000)
 * 
 * BridgeETH Contract:
 *   - Checks pendingBalance[Bob] >= 1000 ✓
 *   - Transfers 1000 USDT from contract to Bob
 *   - Updates pendingBalance[Bob] = 0
 *   - Emits: Withdraw(Bob, 1000)
 * 
 * Bob's Final State:
 *   - Ethereum: 1000 USDT (original tokens returned)
 *   - Base: 0 BUSDT (all burned)
 *   - Bridge cycle complete!
 */

// ══════════════════════════════════════════════════════════════════════════════
// ONE-WAY BRIDGE VARIANT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A ONE-WAY BRIDGE only allows flow in one direction.
 * 
 * EXAMPLE: ETH → Base (one-way)
 * ──────────────────────────────
 * 
 * Allowed:
 *   ✓ Lock USDT on ETH
 *   ✓ Mint BUSDT on Base
 *   ✓ Burn BUSDT on Base
 *   ✓ Get back USDT on ETH
 * 
 * NOT Allowed:
 *   ✗ Bridge FROM Base TO ETH directly
 * 
 * Why One-Way?
 *   1. SIMPLICITY: Easier to implement and audit
 *   2. SPECIFIC USE CASE: Designed for moving to L2 for cheaper fees
 *   3. SECURITY: Reduces attack surface
 * 
 * Visual:
 * 
 *   ETH ───────────► Base
 *   (Lock)          (Mint)
 *   
 *   ETH ◄─────────── Base
 *   (Unlock)        (Burn)
 * 
 * In this architecture:
 *   - You can ONLY move USDT from ETH to Base
 *   - But you CAN return: Burn on Base, Unlock on ETH
 */

/*
KEY CONCEPTS:
- BRIDGE BASE = Contract on destination chain managing bridged tokens
- MINT = Create new bridged tokens (called by operator)
- BURN = Destroy bridged tokens (called by users)
- PENDING BALANCE = Tracks user's minted amount for burn validation
- ONLY OWNER = Restricts mint to authorized bridge operator
- INTERFACE = Defines functions without implementation
- EVENT = Signal for off-chain systems to monitor
- BRIDGE OPERATOR = Off-chain service connecting both chains
- LOCK AND MINT = Two-step process to bridge tokens
- BURN AND UNLOCK = Reverse process to return tokens
- ONE-WAY BRIDGE = Restricts initial bridging to one direction
- TWO-WAY BRIDGE = Allows bridging in both directions
*/
