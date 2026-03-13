// Lecture Code - 2_BridgeBase_Complete.sol
// Topic: Destination Chain Bridge with Comprehensive Tracking
// Day 20.1 - Building a Web3 Bridge
//
// To run: Deploy on Base Sepolia
// forge create src/BridgeBase_Complete.sol:BridgeBase --constructor-args <BUSDT_ADDRESS>

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

// ── Interface for Wrapped Token ───────────────────────────────────────────────

interface IBUSDT {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

// ── What Does This Contract Do? ───────────────────────────────────────────────
//
// BridgeBase manages wrapped tokens on the destination chain (e.g., Base).
// When users lock tokens on Ethereum, this contract mints wrapped tokens.
// When users burn wrapped tokens, this signals unlock on Ethereum.
//
// Real-Life Analogy: Foreign Currency Exchange
//   - You deposit USD at US bank (Ethereum)
//   - Foreign bank issues you EUR receipt (this contract mints BUSDT)
//   - When you return EUR, they notify US bank to return USD
//
// Why track so much data?
//   1. AUDITING: Full history of all operations
//   2. RECOVERY: Can rebuild state from events
//   3. ANALYTICS: Track bridge usage and health
//   4. SECURITY: Detect anomalies in minting/burning

// ══════════════════════════════════════════════════════════════════════════════
// BRIDGE BASE CONTRACT - Destination Chain
// ══════════════════════════════════════════════════════════════════════════════

contract BridgeBase is Ownable, ReentrancyGuard, Pausable {
    
    // ── State Variables ───────────────────────────────────────────────────────
    
    // The wrapped token (BUSDT)
    IBUSDT public immutable wrappedToken;
    
    // Prevent replay: track processed mints by transferId
    mapping(bytes32 => bool) public processedMints;
    
    // Track total burned per user (for analytics)
    mapping(address => uint256) public totalBurned;
    
    // Operator address
    address public operator;
    
    // Global counters
    uint256 public totalMinted;
    uint256 public totalBurnedGlobal;
    
    // Mint tracking for detailed history
    struct MintRecord {
        address user;
        uint256 amount;
        uint256 timestamp;
        bytes32 transferId;
        bool processed;
    }
    
    // Burn tracking for detailed history
    struct BurnRecord {
        address user;
        uint256 amount;
        uint256 timestamp;
        bytes32 burnId;
    }
    
    // Store mint history
    mapping(bytes32 => MintRecord) public mintRecords;
    
    // Store burn history
    mapping(bytes32 => BurnRecord) public burnRecords;
    
    // Arrays to track all transferIds and burnIds (for enumeration)
    bytes32[] public allTransferIds;
    bytes32[] public allBurnIds;
    
    // ── Events ────────────────────────────────────────────────────────────────
    
    event TokensMinted(
        address indexed user,
        uint256 amount,
        bytes32 indexed transferId,
        uint256 timestamp
    );
    
    event TokensBurned(
        address indexed user,
        uint256 amount,
        bytes32 indexed burnId,
        uint256 timestamp
    );
    
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    
    // ── Constructor ───────────────────────────────────────────────────────────
    
    constructor(address _wrappedToken) Ownable(msg.sender) {
        require(_wrappedToken != address(0), "Invalid token address");
        wrappedToken = IBUSDT(_wrappedToken);
    }
    
    // ── Mint Tokens Function ──────────────────────────────────────────────────
    
    /**
     * @notice Mint wrapped tokens (called by operator after lock on source chain)
     * @param _user User to receive wrapped tokens
     * @param _amount Amount to mint
     * @param _transferId Unique transfer ID from source chain lock event
     * 
     * Process:
     * 1. Verify caller is operator
     * 2. Check transferId hasn't been processed (replay protection)
     * 3. Mark as processed BEFORE minting
     * 4. Mint wrapped tokens
     * 5. Update counters
     * 6. Save mint record
     * 7. Emit event
     * 
     * Security:
     * - Only operator can call
     * - Each transferId can only be used ONCE
     * - State updated before external call
     */
    function mintTokens(
        address _user,
        uint256 _amount,
        bytes32 _transferId
    ) external nonReentrant whenNotPaused {
        // ── Access Control ────────────────────────────────────────────────────
        
        require(msg.sender == operator, "Only operator");
        
        // ── Validation ────────────────────────────────────────────────────────
        
        require(_user != address(0), "Invalid user");
        require(_amount > 0, "Amount must be > 0");
        require(_transferId != bytes32(0), "Invalid transferId");
        
        // ── Replay Protection ─────────────────────────────────────────────────
        
        require(!processedMints[_transferId], "Already processed");
        
        // ── Update State BEFORE External Call ────────────────────────────────
        
        processedMints[_transferId] = true;
        totalMinted += _amount;
        
        // ── Save Mint Record ──────────────────────────────────────────────────
        
        mintRecords[_transferId] = MintRecord({
            user: _user,
            amount: _amount,
            timestamp: block.timestamp,
            transferId: _transferId,
            processed: true
        });
        
        allTransferIds.push(_transferId);
        
        // ── Mint Wrapped Tokens ───────────────────────────────────────────────
        
        wrappedToken.mint(_user, _amount);
        
        // ── Emit Event ────────────────────────────────────────────────────────
        
        emit TokensMinted(_user, _amount, _transferId, block.timestamp);
    }
    
    // ── Burn Tokens Function ──────────────────────────────────────────────────
    
    /**
     * @notice Burn wrapped tokens to unlock on source chain
     * @param _amount Amount to burn
     * @return burnId Unique identifier for this burn
     * 
     * Process:
     * 1. Validate amount
     * 2. Generate unique burn ID
     * 3. Burn user's wrapped tokens
     * 4. Update counters
     * 5. Save burn record
     * 6. Emit event
     * 7. Return burn ID
     * 
     * Users call this when they want to move tokens back to Ethereum.
     * The operator listens for TokensBurned events and triggers release.
     */
    function burnTokens(uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 burnId) 
    {
        // ── Validation ────────────────────────────────────────────────────────
        
        require(_amount > 0, "Amount must be > 0");
        require(
            wrappedToken.balanceOf(msg.sender) >= _amount,
            "Insufficient balance"
        );
        
        // ── Generate Unique Burn ID ───────────────────────────────────────────
        
        burnId = keccak256(
            abi.encodePacked(
                msg.sender,
                _amount,
                block.timestamp,
                block.number,
                totalBurnedGlobal
            )
        );
        
        // ── Update State ──────────────────────────────────────────────────────
        
        totalBurned[msg.sender] += _amount;
        totalBurnedGlobal += _amount;
        
        // ── Save Burn Record ──────────────────────────────────────────────────
        
        burnRecords[burnId] = BurnRecord({
            user: msg.sender,
            amount: _amount,
            timestamp: block.timestamp,
            burnId: burnId
        });
        
        allBurnIds.push(burnId);
        
        // ── Burn Wrapped Tokens ───────────────────────────────────────────────
        
        wrappedToken.burn(msg.sender, _amount);
        
        // ── Emit Event ────────────────────────────────────────────────────────
        
        emit TokensBurned(msg.sender, _amount, burnId, block.timestamp);
        
        return burnId;
    }
    
    // ── Admin Functions ───────────────────────────────────────────────────────
    
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
     * @notice Pause the bridge
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
    
    function getBurnedBalance(address _user) external view returns (uint256) {
        return totalBurned[_user];
    }
    
    function getTotalMinted() external view returns (uint256) {
        return totalMinted;
    }
    
    function getTotalBurned() external view returns (uint256) {
        return totalBurnedGlobal;
    }
    
    function isMintProcessed(bytes32 _transferId) external view returns (bool) {
        return processedMints[_transferId];
    }
    
    /**
     * @notice Get mint record details
     */
    function getMintRecord(bytes32 _transferId) 
        external 
        view 
        returns (
            address user,
            uint256 amount,
            uint256 timestamp,
            bool processed
        ) 
    {
        MintRecord memory record = mintRecords[_transferId];
        return (record.user, record.amount, record.timestamp, record.processed);
    }
    
    /**
     * @notice Get burn record details
     */
    function getBurnRecord(bytes32 _burnId)
        external
        view
        returns (
            address user,
            uint256 amount,
            uint256 timestamp
        )
    {
        BurnRecord memory record = burnRecords[_burnId];
        return (record.user, record.amount, record.timestamp);
    }
    
    /**
     * @notice Get total number of mints
     */
    function getTotalMintCount() external view returns (uint256) {
        return allTransferIds.length;
    }
    
    /**
     * @notice Get total number of burns
     */
    function getTotalBurnCount() external view returns (uint256) {
        return allBurnIds.length;
    }
    
    /**
     * @notice Get mint history (paginated)
     * @param _offset Starting index
     * @param _limit Number of records to return
     */
    function getMintHistory(uint256 _offset, uint256 _limit)
        external
        view
        returns (MintRecord[] memory)
    {
        require(_offset < allTransferIds.length, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > allTransferIds.length) {
            end = allTransferIds.length;
        }
        
        uint256 size = end - _offset;
        MintRecord[] memory records = new MintRecord[](size);
        
        for (uint256 i = 0; i < size; i++) {
            records[i] = mintRecords[allTransferIds[_offset + i]];
        }
        
        return records;
    }
    
    /**
     * @notice Get burn history (paginated)
     * @param _offset Starting index
     * @param _limit Number of records to return
     */
    function getBurnHistory(uint256 _offset, uint256 _limit)
        external
        view
        returns (BurnRecord[] memory)
    {
        require(_offset < allBurnIds.length, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > allBurnIds.length) {
            end = allBurnIds.length;
        }
        
        uint256 size = end - _offset;
        BurnRecord[] memory records = new BurnRecord[](size);
        
        for (uint256 i = 0; i < size; i++) {
            records[i] = burnRecords[allBurnIds[_offset + i]];
        }
        
        return records;
    }
    
    /**
     * @notice Check if supply is balanced
     * @return balanced True if totalMinted >= totalBurned
     * @return difference Absolute difference between minted and burned
     */
    function checkSupplyBalance() 
        external 
        view 
        returns (bool balanced, uint256 difference) 
    {
        if (totalMinted >= totalBurnedGlobal) {
            balanced = true;
            difference = totalMinted - totalBurnedGlobal;
        } else {
            // This should never happen!
            balanced = false;
            difference = totalBurnedGlobal - totalMinted;
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA TRACKING BENEFITS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * WHY TRACK SO MUCH DATA?
 * ────────────────────────
 * 
 * 1. AUDIT TRAIL:
 *    - Every mint and burn is recorded
 *    - Can prove when and how much was minted
 *    - Useful for debugging and customer support
 * 
 * 2. ANALYTICS:
 *    - Track total volume over time
 *    - Identify power users
 *    - Understand usage patterns
 * 
 * 3. RECOVERY:
 *    - If database is lost, can rebuild from blockchain events
 *    - Full history is immutable and verifiable
 * 
 * 4. SECURITY MONITORING:
 *    - Detect unusual patterns (e.g., sudden spike in mints)
 *    - Alert if supply becomes unbalanced
 *    - Track per-user activity
 * 
 * STORAGE COST vs BENEFITS:
 * ──────────────────────────
 * Gas Cost: ~50,000 extra gas per transaction for detailed tracking
 * Benefit: Complete audit trail, analytics, recovery capability
 * 
 * For a production bridge handling millions of dollars, this is worth it!
 */

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * SCENARIO: Alice bridges 1000 USDT from Ethereum to Base
 * 
 * ON ETHEREUM (BridgeETH):
 * ────────────────────────
 * Alice calls lockTokens(1000)
 * - Generates transferId: 0xabc123...
 * - Emits TokensLocked(Alice, 1000, timestamp, 0xabc123...)
 * 
 * BRIDGE OPERATOR:
 * ────────────────
 * Detects TokensLocked event
 * Calls BridgeBase.mintTokens(Alice, 1000, 0xabc123...)
 * 
 * ON BASE (BridgeBase - this contract):
 * ──────────────────────────────────────
 * mintTokens() is called:
 * 1. Checks processedMints[0xabc123...] = false ✓
 * 2. Sets processedMints[0xabc123...] = true
 * 3. Updates totalMinted: 0 → 1000
 * 4. Saves MintRecord:
 *    {
 *      user: Alice,
 *      amount: 1000,
 *      timestamp: 1234567890,
 *      transferId: 0xabc123...,
 *      processed: true
 *    }
 * 5. Adds 0xabc123... to allTransferIds[]
 * 6. Calls wrappedToken.mint(Alice, 1000)
 * 7. Emits TokensMinted(Alice, 1000, 0xabc123..., timestamp)
 * 
 * RESULT:
 * -------
 * - Alice has 1000 BUSDT on Base
 * - Complete record stored on-chain
 * - Can query mint history anytime
 * - Supply tracking: totalMinted = 1000, totalBurned = 0
 */

/*
KEY CONCEPTS:
- MINT RECORD = Struct storing complete mint details
- BURN RECORD = Struct storing complete burn details
- ENUMERATION = Ability to list all transfers/burns
- PAGINATION = Returning data in chunks (offset + limit)
- SUPPLY BALANCE = Comparing total minted vs burned
- AUDIT TRAIL = Complete history of all operations
- IMMUTABLE STORAGE = Data can't be changed once written
- EVENT INDEXING = Using 'indexed' for efficient event filtering
- GLOBAL COUNTERS = Tracking totals across all users
- PER-USER TRACKING = Tracking individual user activity
*/
