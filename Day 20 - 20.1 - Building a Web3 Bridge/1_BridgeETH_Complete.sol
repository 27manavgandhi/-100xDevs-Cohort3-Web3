// Lecture Code - 1_BridgeETH_Complete.sol
// Topic: Production-Ready Bridge Contract with Security Features
// Day 20.1 - Building a Web3 Bridge
//
// To run: Deploy with Foundry
// forge create src/BridgeETH_Complete.sol:BridgeETH --constructor-args <TOKEN> <MIN> <MAX>

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

// ── What Makes This Bridge Production-Ready? ──────────────────────────────────
//
// This contract includes enterprise-level security features:
//
// Real-Life Analogy: Compare to a bank vault system
//   - Basic vault: Just locks the door (basic bridge)
//   - Production vault: Locks, alarms, cameras, access logs, limits (this contract)
//
// Security Features:
//   1. REPLAY PROTECTION: Prevents same withdrawal twice
//   2. REENTRANCY GUARD: Prevents recursive call attacks
//   3. RATE LIMITING: Daily limits prevent mass theft
//   4. PAUSABLE: Emergency stop mechanism
//   5. MIN/MAX LIMITS: Prevents dust attacks and whale manipulation
//   6. UNIQUE TRANSFER IDS: Cryptographic proof of uniqueness

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION BRIDGE ETH CONTRACT
// ══════════════════════════════════════════════════════════════════════════════

contract BridgeETH is Ownable, ReentrancyGuard, Pausable {
    
    // ── State Variables ───────────────────────────────────────────────────────
    
    // The token this bridge accepts (e.g., USDT)
    IERC20 public immutable token;
    
    // Track how much each user has locked
    mapping(address => uint256) public lockedBalance;
    
    // Prevent replay attacks: track processed withdrawals
    mapping(bytes32 => bool) public processedWithdrawals;
    
    // Rate limiting: track last lock time and daily amount
    mapping(address => uint256) public lastLockTime;
    mapping(address => uint256) public dailyLocked;
    
    // Bridge limits
    uint256 public minLockAmount;      // Minimum lock (e.g., 10 USDT)
    uint256 public maxLockAmount;      // Maximum single lock (e.g., 100,000 USDT)
    uint256 public dailyLimitPerUser;  // Daily limit per user (e.g., 500,000 USDT)
    
    // Operator address (the bridge service)
    address public operator;
    
    // Total locked counter
    uint256 public totalLocked;
    
    // ── Events ────────────────────────────────────────────────────────────────
    
    event TokensLocked(
        address indexed user,
        uint256 amount,
        uint256 timestamp,
        bytes32 indexed transferId
    );
    
    event TokensReleased(
        address indexed user,
        uint256 amount,
        bytes32 indexed burnTxHash,
        uint256 timestamp
    );
    
    event LimitsUpdated(
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit
    );
    
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    
    // ── Constructor ───────────────────────────────────────────────────────────
    
    /**
     * @param _token Address of the ERC20 token to bridge
     * @param _minAmount Minimum amount that can be locked
     * @param _maxAmount Maximum amount that can be locked in single tx
     */
    constructor(
        address _token,
        uint256 _minAmount,
        uint256 _maxAmount
    ) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        require(_minAmount > 0, "Min amount must be > 0");
        require(_maxAmount > _minAmount, "Max must be > min");
        
        token = IERC20(_token);
        minLockAmount = _minAmount;
        maxLockAmount = _maxAmount;
        dailyLimitPerUser = _maxAmount * 5; // Default: 5x max amount
    }
    
    // ── Lock Tokens Function ──────────────────────────────────────────────────
    
    /**
     * @notice Lock tokens to bridge to another chain
     * @param _amount Amount of tokens to lock
     * @return transferId Unique identifier for this transfer
     * 
     * Process:
     * 1. Validate amount is within limits
     * 2. Check daily limit not exceeded
     * 3. Generate unique transfer ID
     * 4. Transfer tokens to bridge
     * 5. Update state
     * 6. Emit event
     * 
     * Security Features:
     * - whenNotPaused: Can be stopped in emergency
     * - nonReentrant: Prevents reentrancy attacks
     * - Rate limiting: Prevents abuse
     * - Min/Max checks: Prevents dust/whale attacks
     */
    function lockTokens(uint256 _amount) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (bytes32 transferId) 
    {
        // ── Validation ────────────────────────────────────────────────────────
        
        require(_amount >= minLockAmount, "Amount below minimum");
        require(_amount <= maxLockAmount, "Amount exceeds maximum");
        
        // ── Daily Limit Check ─────────────────────────────────────────────────
        
        // Reset daily counter if it's a new day
        if (block.timestamp >= lastLockTime[msg.sender] + 1 days) {
            dailyLocked[msg.sender] = 0;
        }
        
        // Check daily limit
        require(
            dailyLocked[msg.sender] + _amount <= dailyLimitPerUser,
            "Daily limit exceeded"
        );
        
        // ── Generate Unique Transfer ID ───────────────────────────────────────
        
        // Combine multiple sources of entropy for uniqueness:
        // - msg.sender: Different for each user
        // - _amount: Different for each amount
        // - block.timestamp: Different for each block
        // - block.number: Additional entropy
        // - totalLocked: Incremental counter
        transferId = keccak256(
            abi.encodePacked(
                msg.sender,
                _amount,
                block.timestamp,
                block.number,
                totalLocked
            )
        );
        
        // ── Transfer Tokens ───────────────────────────────────────────────────
        
        // Transfer tokens from user to this contract
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        // ── Update State ──────────────────────────────────────────────────────
        
        lockedBalance[msg.sender] += _amount;
        dailyLocked[msg.sender] += _amount;
        lastLockTime[msg.sender] = block.timestamp;
        totalLocked += _amount;
        
        // ── Emit Event ────────────────────────────────────────────────────────
        
        emit TokensLocked(msg.sender, _amount, block.timestamp, transferId);
        
        return transferId;
    }
    
    // ── Release Tokens Function ───────────────────────────────────────────────
    
    /**
     * @notice Release locked tokens (called by operator after burn on dest chain)
     * @param _user User to receive tokens
     * @param _amount Amount to release
     * @param _burnTxHash Transaction hash from burn on destination chain
     * 
     * Security Features:
     * - onlyOperator: Only bridge service can call
     * - Replay protection: Each burnTxHash can only be used once
     * - State before external calls: Prevents reentrancy
     */
    function releaseTokens(
        address _user,
        uint256 _amount,
        bytes32 _burnTxHash
    ) external nonReentrant {
        // ── Access Control ────────────────────────────────────────────────────
        
        require(msg.sender == operator, "Only operator");
        
        // ── Replay Protection ─────────────────────────────────────────────────
        
        require(!processedWithdrawals[_burnTxHash], "Already processed");
        
        // ── Validation ────────────────────────────────────────────────────────
        
        require(_user != address(0), "Invalid user address");
        require(_amount > 0, "Amount must be > 0");
        require(lockedBalance[_user] >= _amount, "Insufficient locked balance");
        
        // ── Update State BEFORE External Call ────────────────────────────────
        // This is critical for security (Checks-Effects-Interactions pattern)
        
        processedWithdrawals[_burnTxHash] = true;
        lockedBalance[_user] -= _amount;
        totalLocked -= _amount;
        
        // ── Transfer Tokens ───────────────────────────────────────────────────
        
        require(token.transfer(_user, _amount), "Transfer failed");
        
        // ── Emit Event ────────────────────────────────────────────────────────
        
        emit TokensReleased(_user, _amount, _burnTxHash, block.timestamp);
    }
    
    // ── Admin Functions ───────────────────────────────────────────────────────
    
    /**
     * @notice Update bridge limits
     */
    function updateLimits(
        uint256 _minAmount,
        uint256 _maxAmount,
        uint256 _dailyLimit
    ) external onlyOwner {
        require(_minAmount > 0, "Min must be > 0");
        require(_maxAmount > _minAmount, "Max must be > min");
        require(_dailyLimit >= _maxAmount, "Daily limit must be >= max");
        
        minLockAmount = _minAmount;
        maxLockAmount = _maxAmount;
        dailyLimitPerUser = _dailyLimit;
        
        emit LimitsUpdated(_minAmount, _maxAmount, _dailyLimit);
    }
    
    /**
     * @notice Set the operator address
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Invalid operator");
        address oldOperator = operator;
        operator = _operator;
        emit OperatorUpdated(oldOperator, _operator);
    }
    
    /**
     * @notice Pause the bridge (emergency use)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the bridge
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ── View Functions ────────────────────────────────────────────────────────
    
    function getLockedBalance(address _user) external view returns (uint256) {
        return lockedBalance[_user];
    }
    
    function getTotalLocked() external view returns (uint256) {
        return totalLocked;
    }
    
    function isWithdrawalProcessed(bytes32 _burnTxHash) external view returns (bool) {
        return processedWithdrawals[_burnTxHash];
    }
    
    function getRemainingDailyLimit(address _user) external view returns (uint256) {
        if (block.timestamp >= lastLockTime[_user] + 1 days) {
            return dailyLimitPerUser;
        }
        return dailyLimitPerUser - dailyLocked[_user];
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * REENTRANCY PROTECTION:
 * ─────────────────────
 * The contract uses OpenZeppelin's ReentrancyGuard to prevent reentrancy attacks.
 * Additionally, it follows the Checks-Effects-Interactions pattern:
 * 
 * ✓ CORRECT:
 * 1. Check conditions
 * 2. Update state variables
 * 3. Make external calls
 * 
 * ✗ INCORRECT:
 * 1. Make external call
 * 2. Update state (attacker can reenter here!)
 * 
 * REPLAY ATTACK PROTECTION:
 * ─────────────────────────
 * Uses mapping(bytes32 => bool) to track processed transactions.
 * Each burnTxHash can only be used ONCE.
 * 
 * RATE LIMITING:
 * ──────────────
 * Prevents abuse by limiting:
 * - Minimum amount (prevents dust attacks)
 * - Maximum amount (prevents whale manipulation)
 * - Daily limit (prevents rapid drainage)
 * 
 * PAUSABLE:
 * ─────────
 * Owner can pause the bridge in emergency situations.
 * When paused, no new locks can be created.
 * 
 * ACCESS CONTROL:
 * ───────────────
 * - Owner: Can update limits, set operator, pause/unpause
 * - Operator: Can release tokens
 * - Users: Can lock tokens
 */

/*
KEY CONCEPTS:
- REPLAY PROTECTION = Preventing same transaction from being processed twice
- REENTRANCY GUARD = Preventing recursive function calls
- RATE LIMITING = Restricting frequency/amount of operations
- PAUSABLE = Emergency stop mechanism
- CHECKS-EFFECTS-INTERACTIONS = Security pattern for function execution order
- TRANSFER ID = Unique identifier generated using multiple entropy sources
- IMMUTABLE = Variable that can only be set once (in constructor)
- NONREENTRANT = Modifier preventing reentrancy
- WHENNOTPAUSED = Modifier that requires contract not to be paused
- DAILY LIMIT = Maximum amount per user per 24-hour period
*/
