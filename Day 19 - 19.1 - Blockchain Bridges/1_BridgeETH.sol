// Lecture Code - 1_BridgeETH.sol
// Topic: Ethereum Bridge Contract for Locking ERC-20 Tokens
// Day 19.1 - Blockchain Bridges
//
// To run: Deploy in Remix IDE or use Foundry
// forge create src/BridgeETH.sol:BridgeETH --constructor-args <USDT_ADDRESS>

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ── What is a Bridge Contract? ────────────────────────────────────────────────
//
// A bridge contract allows users to lock tokens on one blockchain (e.g., Ethereum)
// so they can be minted as wrapped tokens on another blockchain (e.g., Base, Polygon).
//
// Real-Life Analogy: Think of it like a bank vault at an international airport.
//   - You deposit your USD at the US airport (lock tokens on Ethereum)
//   - The foreign bank gives you equivalent local currency (mint tokens on Base)
//   - When you return, you exchange the local currency back for USD (burn and unlock)
//
// Why use it?
//   1. CROSS-CHAIN TRANSFERS: Move assets between different blockchains
//   2. LOWER FEES: Use cheaper L2 chains while keeping assets secure on L1
//   3. DEFI ACCESS: Participate in DeFi protocols on multiple chains

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE ETH CONTRACT - Locks ERC-20 Tokens on Ethereum
// ══════════════════════════════════════════════════════════════════════════════

contract BridgeETH is Ownable {
    
    // ── State Variables ───────────────────────────────────────────────────────
    
    // Address of the ERC-20 token this bridge handles (e.g., USDT)
    address public tokenAddress;
    
    // Mapping: user address => locked token balance
    // Tracks how many tokens each user has locked in the bridge
    mapping(address => uint256) public pendingBalance;
    
    // ── Events ────────────────────────────────────────────────────────────────
    
    // Emitted when a user deposits tokens
    // Bridge operator listens for this to trigger minting on destination chain
    event Deposit(address indexed user, uint256 amount);
    
    // Emitted when a user withdraws their locked tokens
    // Triggered after tokens are burned on the destination chain
    event Withdraw(address indexed user, uint256 amount);
    
    // ── Constructor ───────────────────────────────────────────────────────────
    
    // @param _tokenAddress: The ERC-20 token contract address (e.g., USDT)
    constructor(address _tokenAddress) Ownable(msg.sender) {
        tokenAddress = _tokenAddress;
    }
    
    // ── Deposit Function ──────────────────────────────────────────────────────
    
    /**
     * @notice Allows users to lock their ERC-20 tokens in the bridge
     * @param _amount The amount of tokens to lock
     * 
     * Process:
     * 1. User must first approve this contract: token.approve(bridgeAddress, amount)
     * 2. Contract transfers tokens from user to itself
     * 3. Updates user's locked balance
     * 4. Emits Deposit event for bridge operator to monitor
     * 
     * Real-Life Analogy:
     * - You go to the bank with $200
     * - You say "I approve the safe to hold my money"
     * - Bank puts your $200 in the vault
     * - Bank writes down: "You have $200 locked here"
     */
    function deposit(uint256 _amount) public {
        // Get reference to the token contract
        IERC20 token = IERC20(tokenAddress);
        
        // Check if user has approved the bridge to spend their tokens
        // This is required before transferFrom can work
        require(
            token.allowance(msg.sender, address(this)) >= _amount,
            "Insufficient allowance"
        );
        
        // Transfer tokens from user to this contract
        // This locks the tokens in the bridge
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        // Update the user's locked balance
        // This tracks how much they can later withdraw
        pendingBalance[msg.sender] += _amount;
        
        // Emit event so bridge operator knows to mint tokens on destination chain
        emit Deposit(msg.sender, _amount);
    }
    
    // ── Withdraw Function ─────────────────────────────────────────────────────
    
    /**
     * @notice Allows users to retrieve their locked tokens
     * @param _amount The amount of tokens to withdraw
     * 
     * Process:
     * 1. Checks user has sufficient locked balance
     * 2. Transfers tokens back to user
     * 3. Updates locked balance
     * 4. Emits Withdraw event
     * 
     * Real-Life Analogy:
     * - You return to the bank
     * - You say "I want my $200 back"
     * - Bank checks: "Yes, you have $200 locked"
     * - Bank gives you your $200
     * - Bank updates record: "Balance now $0"
     */
    function withdraw(uint256 _amount) public {
        // Check if user has enough locked tokens
        require(
            pendingBalance[msg.sender] >= _amount,
            "Insufficient balance"
        );
        
        // Get reference to the token contract
        IERC20 token = IERC20(tokenAddress);
        
        // Transfer tokens back to the user
        require(
            token.transfer(msg.sender, _amount),
            "Transfer failed"
        );
        
        // Decrease user's locked balance
        pendingBalance[msg.sender] -= _amount;
        
        // Emit event for off-chain monitoring
        emit Withdraw(msg.sender, _amount);
    }
    
    // ── View Functions ────────────────────────────────────────────────────────
    
    /**
     * @notice Get a user's locked token balance
     * @param user The address to check
     * @return The amount of tokens locked by this user
     */
    function getBalance(address user) public view returns (uint256) {
        return pendingBalance[user];
    }
    
    /**
     * @notice Get the total tokens locked in the bridge
     * @return The total balance held by this contract
     */
    function getTotalLocked() public view returns (uint256) {
        IERC20 token = IERC20(tokenAddress);
        return token.balanceOf(address(this));
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE: Using the Bridge
// ══════════════════════════════════════════════════════════════════════════════

/**
 * STEP-BY-STEP USAGE:
 * 
 * 1. User has 1000 USDT on Ethereum
 * 2. User wants to use DeFi on Base (lower fees)
 * 
 * On Ethereum:
 * - User calls: USDT.approve(bridgeAddress, 1000)
 * - User calls: bridge.deposit(1000)
 * - BridgeETH emits Deposit event
 * - User's 1000 USDT is locked in BridgeETH contract
 * 
 * Bridge Operator (Off-Chain):
 * - Detects Deposit event
 * - Calls BridgeBase.mint(userAddress, 1000) on Base chain
 * 
 * On Base:
 * - User receives 1000 BUSDT (Bridged USDT)
 * - User can now use BUSDT in Base DeFi protocols
 * 
 * To Return (Burn and Unlock):
 * On Base:
 * - User calls: bridgeBase.burn(1000)
 * - BridgeBase emits Burn event
 * 
 * Bridge Operator:
 * - Detects Burn event
 * - Allows user to call withdraw on Ethereum
 * 
 * On Ethereum:
 * - User calls: bridge.withdraw(1000)
 * - User receives original 1000 USDT back
 */

/*
KEY CONCEPTS:
- BRIDGE = Protocol connecting two blockchains
- LOCK = Store tokens in contract on source chain
- MINT = Create wrapped tokens on destination chain
- BURN = Destroy wrapped tokens on destination chain
- UNLOCK = Release original tokens on source chain
- PENDING BALANCE = Amount user has locked and can withdraw
- ALLOWANCE = Permission for contract to spend user's tokens
- TRANSFERFROM = Move tokens from user to contract (requires approval)
- EVENTS = Signals for off-chain systems to react to on-chain actions
- OWNER = Address with special permissions (for admin functions)
*/
