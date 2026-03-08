// Lecture Code - 4_will_contract_and_complete_examples.sol
// Topic: Will Contract assignment + combining Interfaces, CCI, and Payable
// Day 16.1 - Interfaces, CCI & Payable
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ══════════════════════════════════════════════════════════════════════════════
// WILL CONTRACT (Class Assignment)
// ══════════════════════════════════════════════════════════════════════════════

/*
REQUIREMENTS:
1. Set owner to deployer in constructor
2. Owner can define recipient in constructor
3. Owner can change the recipient
4. Owner can interact via ping function
5. If ping not called for > 1 year, recipient can claim funds
*/

contract WillContract {
  // ── State Variables ───────────────────────────────────────────────────────────
  
  address public owner;
  address public recipient;
  uint256 public lastVisited; // Timestamp of last owner interaction
  uint256 public constant INACTIVITY_PERIOD = 365 days; // 1 year
  
  // For testing, you can use shorter periods:
  // uint256 public constant INACTIVITY_PERIOD = 1 minutes;
  // uint256 public constant INACTIVITY_PERIOD = 1 hours;
  
  // ── Events ────────────────────────────────────────────────────────────────────
  
  event RecipientChanged(address indexed oldRecipient, address indexed newRecipient);
  event DepositMade(address indexed depositor, uint256 amount);
  event Pinged(address indexed owner, uint256 timestamp);
  event FundsClaimed(address indexed recipient, uint256 amount);
  
  // ── Modifiers ─────────────────────────────────────────────────────────────────
  
  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner can call this");
    _;
  }
  
  modifier onlyRecipient() {
    require(msg.sender == recipient, "Only recipient can call this");
    _;
  }
  
  // ── Constructor ───────────────────────────────────────────────────────────────
  
  constructor(address _recipient) {
    require(_recipient != address(0), "Invalid recipient address");
    require(_recipient != msg.sender, "Cannot set self as recipient");
    
    owner = msg.sender;
    recipient = _recipient;
    lastVisited = block.timestamp;
  }
  
  // ── Owner Functions ───────────────────────────────────────────────────────────
  
  // Change recipient
  function changeRecipient(address newRecipient) public onlyOwner {
    require(newRecipient != address(0), "Invalid recipient");
    require(newRecipient != owner, "Cannot set self as recipient");
    
    address oldRecipient = recipient;
    recipient = newRecipient;
    lastVisited = block.timestamp; // Update activity
    
    emit RecipientChanged(oldRecipient, newRecipient);
  }
  
  // Deposit funds (payable)
  function deposit() public payable onlyOwner {
    require(msg.value > 0, "Must deposit something");
    lastVisited = block.timestamp;
    
    emit DepositMade(msg.sender, msg.value);
  }
  
  // Ping to show owner is alive
  function ping() public onlyOwner {
    lastVisited = block.timestamp;
    
    emit Pinged(msg.sender, block.timestamp);
  }
  
  // ── Recipient Functions ───────────────────────────────────────────────────────
  
  // Claim funds if owner inactive for > 1 year
  function claim() public onlyRecipient {
    require(canClaim(), "Cannot claim yet - owner still active");
    
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to claim");
    
    // Transfer all funds to recipient
    (bool success, ) = payable(recipient).call{value: balance}("");
    require(success, "Transfer failed");
    
    emit FundsClaimed(recipient, balance);
  }
  
  // ── View Functions ────────────────────────────────────────────────────────────
  
  // Check if recipient can claim
  function canClaim() public view returns (bool) {
    return block.timestamp >= lastVisited + INACTIVITY_PERIOD;
  }
  
  // Get time since last visit (in seconds)
  function getTimeSinceLastVisit() public view returns (uint256) {
    if (block.timestamp < lastVisited) return 0;
    return block.timestamp - lastVisited;
  }
  
  // Get time remaining until claimable (in seconds)
  function getTimeUntilClaimable() public view returns (uint256) {
    uint256 claimableAt = lastVisited + INACTIVITY_PERIOD;
    
    if (block.timestamp >= claimableAt) return 0;
    return claimableAt - block.timestamp;
  }
  
  // Get contract balance
  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }
  
  // Get full contract info
  function getInfo() public view returns (
    address _owner,
    address _recipient,
    uint256 _balance,
    uint256 _lastVisited,
    bool _canClaim
  ) {
    return (
      owner,
      recipient,
      address(this).balance,
      lastVisited,
      canClaim()
    );
  }
  
  // ── Fallback (allow receiving ETH) ───────────────────────────────────────────
  
  receive() external payable {
    // Anyone can send ETH, but only owner resets lastVisited with deposit()
    emit DepositMade(msg.sender, msg.value);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMBINING INTERFACES, CCI, AND PAYABLE
// ══════════════════════════════════════════════════════════════════════════════

// ── Token Interface ───────────────────────────────────────────────────────────

interface IPaymentToken {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ── Marketplace using CCI + Payable ───────────────────────────────────────────

contract NFTMarketplace {
  address public paymentToken; // Address of ERC20 token for payments
  address public owner;
  uint256 public feePercentage = 2; // 2% marketplace fee
  
  struct Listing {
    address seller;
    uint256 priceInEth;
    uint256 priceInTokens;
    bool acceptsEth;
    bool acceptsToken;
    bool active;
  }
  
  mapping(uint256 => Listing) public listings; // nftId => Listing
  uint256 public nextListingId;
  
  event ItemListed(
    uint256 indexed listingId,
    address indexed seller,
    uint256 priceInEth,
    uint256 priceInTokens
  );
  
  event ItemSold(
    uint256 indexed listingId,
    address indexed buyer,
    address indexed seller,
    uint256 price,
    bool paidInEth
  );
  
  constructor(address _paymentToken) {
    paymentToken = _paymentToken;
    owner = msg.sender;
  }
  
  // ── List Item ─────────────────────────────────────────────────────────────────
  
  function listItem(
    uint256 priceInEth,
    uint256 priceInTokens,
    bool acceptsEth,
    bool acceptsToken
  ) public returns (uint256) {
    require(acceptsEth || acceptsToken, "Must accept at least one payment");
    
    uint256 listingId = nextListingId++;
    
    listings[listingId] = Listing({
      seller: msg.sender,
      priceInEth: priceInEth,
      priceInTokens: priceInTokens,
      acceptsEth: acceptsEth,
      acceptsToken: acceptsToken,
      active: true
    });
    
    emit ItemListed(listingId, msg.sender, priceInEth, priceInTokens);
    
    return listingId;
  }
  
  // ── Buy with ETH (Payable) ────────────────────────────────────────────────────
  
  function buyWithEth(uint256 listingId) public payable {
    Listing storage listing = listings[listingId];
    
    require(listing.active, "Listing not active");
    require(listing.acceptsEth, "Seller doesn't accept ETH");
    require(msg.value == listing.priceInEth, "Incorrect payment amount");
    
    // Calculate fee
    uint256 fee = (msg.value * feePercentage) / 100;
    uint256 sellerAmount = msg.value - fee;
    
    // Mark as sold
    listing.active = false;
    
    // Pay seller
    (bool success, ) = payable(listing.seller).call{value: sellerAmount}("");
    require(success, "Payment to seller failed");
    
    emit ItemSold(listingId, msg.sender, listing.seller, msg.value, true);
  }
  
  // ── Buy with Tokens (CCI) ─────────────────────────────────────────────────────
  
  function buyWithTokens(uint256 listingId) public {
    Listing storage listing = listings[listingId];
    
    require(listing.active, "Listing not active");
    require(listing.acceptsToken, "Seller doesn't accept tokens");
    
    uint256 price = listing.priceInTokens;
    
    // Calculate fee
    uint256 fee = (price * feePercentage) / 100;
    uint256 sellerAmount = price - fee;
    
    // Mark as sold
    listing.active = false;
    
    // CCI: Transfer tokens from buyer to seller
    IPaymentToken token = IPaymentToken(paymentToken);
    
    require(
      token.transferFrom(msg.sender, listing.seller, sellerAmount),
      "Token transfer to seller failed"
    );
    
    // Transfer fee to marketplace owner
    require(
      token.transferFrom(msg.sender, owner, fee),
      "Fee transfer failed"
    );
    
    emit ItemSold(listingId, msg.sender, listing.seller, price, false);
  }
  
  // ── Owner Functions ───────────────────────────────────────────────────────────
  
  function withdrawFees() public {
    require(msg.sender == owner, "Only owner");
    
    (bool success, ) = payable(owner).call{value: address(this).balance}("");
    require(success, "Withdrawal failed");
  }
  
  function setFeePercentage(uint256 newFee) public {
    require(msg.sender == owner, "Only owner");
    require(newFee <= 10, "Fee too high"); // Max 10%
    
    feePercentage = newFee;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION SERVICE (CCI + Payable + Time-based)
// ══════════════════════════════════════════════════════════════════════════════

interface ISubscriptionToken {
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
}

contract SubscriptionService {
  address public token;
  address public serviceProvider;
  uint256 public monthlyFeeInTokens;
  
  struct Subscription {
    uint256 expiresAt; // Timestamp
    bool active;
  }
  
  mapping(address => Subscription) public subscriptions;
  mapping(address => uint256) public deposits; // Prepaid token deposits
  
  event Subscribed(address indexed user, uint256 expiresAt);
  event Renewed(address indexed user, uint256 newExpiresAt);
  event Deposited(address indexed user, uint256 amount);
  
  constructor(address _token, uint256 _monthlyFee) {
    token = _token;
    monthlyFeeInTokens = _monthlyFee;
    serviceProvider = msg.sender;
  }
  
  // ── Deposit Tokens ────────────────────────────────────────────────────────────
  
  function deposit(uint256 amount) public {
    require(amount > 0, "Amount must be positive");
    
    // CCI: Transfer tokens from user to contract
    ISubscriptionToken paymentToken = ISubscriptionToken(token);
    require(
      paymentToken.transferFrom(msg.sender, address(this), amount),
      "Token transfer failed"
    );
    
    deposits[msg.sender] += amount;
    
    emit Deposited(msg.sender, amount);
  }
  
  // ── Subscribe ─────────────────────────────────────────────────────────────────
  
  function subscribe() public {
    require(deposits[msg.sender] >= monthlyFeeInTokens, "Insufficient deposit");
    
    // Deduct fee
    deposits[msg.sender] -= monthlyFeeInTokens;
    
    // Set expiry
    uint256 expiresAt = block.timestamp + 30 days;
    
    subscriptions[msg.sender] = Subscription({
      expiresAt: expiresAt,
      active: true
    });
    
    emit Subscribed(msg.sender, expiresAt);
  }
  
  // ── Renew Subscription ────────────────────────────────────────────────────────
  
  function renew() public {
    Subscription storage sub = subscriptions[msg.sender];
    
    require(sub.expiresAt > 0, "No subscription found");
    require(block.timestamp > sub.expiresAt, "Subscription still active");
    require(deposits[msg.sender] >= monthlyFeeInTokens, "Insufficient deposit");
    
    // Deduct fee
    deposits[msg.sender] -= monthlyFeeInTokens;
    
    // Extend expiry
    sub.expiresAt = block.timestamp + 30 days;
    sub.active = true;
    
    emit Renewed(msg.sender, sub.expiresAt);
  }
  
  // ── View Functions ────────────────────────────────────────────────────────────
  
  function isActive(address user) public view returns (bool) {
    Subscription memory sub = subscriptions[user];
    return sub.active && block.timestamp < sub.expiresAt;
  }
  
  function getTimeRemaining(address user) public view returns (uint256) {
    Subscription memory sub = subscriptions[user];
    
    if (block.timestamp >= sub.expiresAt) return 0;
    return sub.expiresAt - block.timestamp;
  }
  
  // ── Withdraw (Service Provider) ───────────────────────────────────────────────
  
  function withdrawFees() public {
    require(msg.sender == serviceProvider, "Only service provider");
    
    ISubscriptionToken paymentToken = ISubscriptionToken(token);
    uint256 balance = paymentToken.balanceOf(address(this));
    
    // Calculate total user deposits
    // (In production, track separately or use different approach)
    
    require(
      paymentToken.transferFrom(address(this), serviceProvider, balance),
      "Withdrawal failed"
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

// Simple token for testing
contract TestToken {
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  
  function mint(address to, uint256 amount) public {
    balanceOf[to] += amount;
  }
  
  function approve(address spender, uint256 amount) public returns (bool) {
    allowance[msg.sender][spender] = amount;
    return true;
  }
  
  function transfer(address to, uint256 amount) public returns (bool) {
    require(balanceOf[msg.sender] >= amount);
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    return true;
  }
  
  function transferFrom(address from, address to, uint256 amount) public returns (bool) {
    require(balanceOf[from] >= amount);
    require(allowance[from][msg.sender] >= amount);
    
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    allowance[from][msg.sender] -= amount;
    
    return true;
  }
}

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
WILL CONTRACT = Time-based access control for inheritance
BLOCK.TIMESTAMP = Current block time in Unix seconds
365 DAYS = Solidity time unit (365 * 24 * 60 * 60 seconds)
MODIFIERS = Reusable access control (onlyOwner, onlyRecipient)
CCI + PAYABLE = Combining cross-contract calls with ETH payments
DEPOSIT PATTERN = Prepaid balance for future operations
TIME-BASED LOGIC = Using block.timestamp for expiry/deadlines
SUBSCRIPTION MODEL = Recurring payments with expiry dates
MARKETPLACE PATTERN = Buyers, sellers, fees, multiple payment methods
*/
