// Lecture Code - 2_BUSDT.sol
// Topic: Bridged USDT Token Contract (ERC-20 with Mint/Burn)
// Day 19.1 - Blockchain Bridges
//
// To run: Deploy on destination chain (e.g., Base, Polygon)
// forge create src/BUSDT.sol:BUSDT

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// ── What is a Bridged Token? ──────────────────────────────────────────────────
//
// A bridged token is a wrapped version of a token from another blockchain.
// When you lock USDT on Ethereum, an equivalent amount of BUSDT is minted on Base.
//
// Real-Life Analogy: Gift Cards
//   - You exchange $100 cash at Store A (lock USDT on Ethereum)
//   - Store B gives you a $100 gift card (mint BUSDT on Base)
//   - The gift card represents your original $100
//   - When you return the gift card, you get your $100 cash back
//
// Why use bridged tokens?
//   1. LOWER FEES: Use assets on cheaper chains (Base fees << Ethereum fees)
//   2. SAME VALUE: 1 BUSDT always represents 1 USDT locked on Ethereum
//   3. LIQUIDITY: Access DeFi protocols on multiple chains

// ══════════════════════════════════════════════════════════════════════════════
// BUSDT CONTRACT - Bridged USDT Token
// ══════════════════════════════════════════════════════════════════════════════

contract BUSDT is ERC20, Ownable {
    
    // ── Constructor ───────────────────────────────────────────────────────────
    
    /**
     * @notice Initializes the BUSDT token
     * 
     * ERC20 constructor parameters:
     * - "Bridged USDT": The full name of the token
     * - "BUSDT": The symbol/ticker (shows in wallets as BUSDT)
     * 
     * Ownable: Sets msg.sender as the owner (bridge operator)
     */
    constructor() ERC20("Bridged USDT", "BUSDT") Ownable(msg.sender) {
        // No initial supply - tokens are only minted when locked on source chain
    }
    
    // ── Mint Function ─────────────────────────────────────────────────────────
    
    /**
     * @notice Creates new BUSDT tokens
     * @param _to The address to receive the newly minted tokens
     * @param _amount The amount of tokens to mint
     * 
     * Only the owner (bridge operator) can call this function.
     * This is called when:
     * - User locks USDT on Ethereum (source chain)
     * - Bridge operator detects the Deposit event
     * - Bridge operator mints equivalent BUSDT on Base (destination chain)
     * 
     * Real-Life Analogy:
     * - Customer locks $100 at Bank A
     * - Bank B (the bridge operator) issues a $100 check
     * - Customer can now spend that $100 check at Bank B's locations
     */
    function mint(address _to, uint256 _amount) public onlyOwner {
        // OpenZeppelin's _mint function:
        // 1. Creates new tokens (increases total supply)
        // 2. Adds tokens to _to's balance
        // 3. Emits Transfer event from address(0) to _to
        _mint(_to, _amount);
    }
    
    // ── Burn Function ─────────────────────────────────────────────────────────
    
    /**
     * @notice Destroys BUSDT tokens
     * @param _from The address whose tokens will be burned
     * @param _amount The amount of tokens to burn
     * 
     * Only the owner (bridge operator) can call this function.
     * This is called when:
     * - User wants to move assets back to Ethereum
     * - User initiates burn on Base
     * - Bridge operator detects burn and unlocks original USDT on Ethereum
     * 
     * Real-Life Analogy:
     * - Customer returns the $100 check to Bank B
     * - Bank B tears up the check (burns BUSDT)
     * - Bank A releases the original $100 to customer
     */
    function burn(address _from, uint256 _amount) public onlyOwner {
        // OpenZeppelin's _burn function:
        // 1. Decreases total supply
        // 2. Subtracts tokens from _from's balance
        // 3. Emits Transfer event from _from to address(0)
        _burn(_from, _amount);
    }
    
    // ── Decimals ──────────────────────────────────────────────────────────────
    
    /**
     * @notice Returns the number of decimals for the token
     * @return The number of decimals (6, matching USDT)
     * 
     * USDT uses 6 decimals, so we override the default 18 to match.
     * This means: 1 USDT = 1,000,000 base units
     * 
     * Example:
     * - To represent 100.50 USDT: 100_500_000 base units
     * - To represent 1 USDT: 1_000_000 base units
     */
    function decimals() public pure override returns (uint8) {
        return 6; // Match USDT's 6 decimals
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE: Complete Bridge Flow
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SCENARIO: Alice wants to use 500 USDT on Base DeFi
 * 
 * STEP 1: Lock on Ethereum
 * ─────────────────────────
 * Alice on Ethereum:
 * - Has 1000 USDT in her wallet
 * - Calls: USDT.approve(bridgeETH, 500)
 * - Calls: bridgeETH.deposit(500)
 * - Result: 500 USDT locked in BridgeETH contract
 * 
 * Bridge Operator:
 * - Detects Deposit(Alice, 500) event on Ethereum
 * - Verifies the transaction
 * - Calls: BUSDT.mint(Alice, 500) on Base
 * 
 * STEP 2: Receive on Base
 * ────────────────────────
 * Alice on Base:
 * - Receives 500 BUSDT in her wallet
 * - Can now use 500 BUSDT in Base DeFi protocols
 * - Enjoys lower transaction fees on Base
 * 
 * STEP 3: Using BUSDT
 * ───────────────────
 * Alice on Base:
 * - Supplies BUSDT to Aave for lending
 * - Swaps BUSDT for other tokens on Uniswap
 * - Provides BUSDT liquidity on Curve
 * 
 * STEP 4: Return to Ethereum
 * ───────────────────────────
 * Alice wants to return to Ethereum:
 * - Calls: bridgeBase.burn(500) on Base
 * - Bridge operator detects Burn(Alice, 500) event
 * - Result: 500 BUSDT destroyed on Base
 * 
 * Bridge Operator:
 * - Verifies burn transaction
 * - Enables Alice to withdraw on Ethereum
 * 
 * Alice on Ethereum:
 * - Calls: bridgeETH.withdraw(500)
 * - Receives her original 500 USDT back
 * 
 * FINAL STATE:
 * ────────────
 * - Alice has 1000 USDT on Ethereum (same as start)
 * - 0 BUSDT exists on Base (all burned)
 * - Total supply is balanced
 */

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLY MANAGEMENT EXAMPLE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * HOW TOTAL SUPPLY STAYS BALANCED:
 * 
 * Initial State:
 * ──────────────
 * Ethereum: 1,000,000 USDT total (native)
 * Base:     0 BUSDT
 * 
 * After 100,000 USDT Bridged:
 * ────────────────────────────
 * Ethereum: 
 *   - 900,000 USDT in circulation
 *   - 100,000 USDT locked in bridge
 *   - Total still 1,000,000 USDT
 * 
 * Base:
 *   - 100,000 BUSDT minted
 * 
 * Key Insight: 
 * - Every BUSDT on Base = 1 USDT locked on Ethereum
 * - Total effective supply remains constant
 * - BUSDT total supply = Amount locked on Ethereum
 * 
 * After 50,000 BUSDT Burned:
 * ──────────────────────────
 * Ethereum:
 *   - 950,000 USDT in circulation
 *   - 50,000 USDT locked in bridge
 * 
 * Base:
 *   - 50,000 BUSDT in circulation
 * 
 * Perfect Balance: 50,000 locked = 50,000 minted
 */

/*
KEY CONCEPTS:
- BRIDGED TOKEN = Wrapped representation of token from another chain
- MINT = Create new tokens when original is locked
- BURN = Destroy tokens when original is unlocked
- ONLY OWNER = Only bridge operator can mint/burn (security)
- DECIMALS = Number of decimal places (USDT uses 6)
- TOTAL SUPPLY = Amount of tokens in existence
- ERC20 = Standard token interface on Ethereum
- OWNABLE = Access control pattern (owner has special permissions)
- _MINT = Internal function that creates tokens
- _BURN = Internal function that destroys tokens
- EVENT = Signal emitted when state changes (Transfer event)
*/
