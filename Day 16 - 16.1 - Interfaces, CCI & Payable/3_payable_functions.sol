// Lecture Code - 3_payable_functions.sol
// Topic: Payable keyword - accepting and sending Ether in Solidity
// Day 16.1 - Interfaces, Cross-Contract Invocation & Payable
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What is Payable? ──────────────────────────────────────────────────────────
//
// PAYABLE = Keyword that allows a function to RECEIVE ETHER
//
// Without payable:
//   - Function cannot accept Ether
//   - Transaction reverts if you try to send Ether
//
// With payable:
//   - Function can accept Ether
//   - msg.value contains the amount sent
//
// Real-Life Analogy: Vending Machine
//   - Payable function = Slot that accepts money
//   - Non-payable function = Button that doesn't accept money
//   - msg.value = Amount of money inserted

// ══════════════════════════════════════════════════════════════════════════════
// BASIC PAYABLE EXAMPLES
// ══════════════════════════════════════════════════════════════════════════════

contract PayableBasics {
  uint256 public totalReceived;
  address public owner;
  
  constructor() {
    owner = msg.sender;
  }
  
  // ── Simple Payable Function ──────────────────────────────────────────────────
  
  // This function CAN receive Ether
  function deposit() public payable {
    // msg.value = amount of Ether sent (in wei)
    totalReceived += msg.value;
  }
  
  // This function CANNOT receive Ether (will revert if you try)
  function nonPayableFunction() public {
    // Calling this with value will fail
  }
  
  // ── Payable with Validation ──────────────────────────────────────────────────
  
  function depositWithMinimum() public payable {
    require(msg.value >= 0.01 ether, "Minimum deposit is 0.01 ETH");
    totalReceived += msg.value;
  }
  
  function depositWithMessage(string memory message) public payable {
    require(msg.value > 0, "Must send some ETH");
    totalReceived += msg.value;
    // Could emit event with message
  }
  
  // ── Important msg.value Facts ─────────────────────────────────────────────────
  
  /*
  msg.value = amount of ETH sent with transaction (in wei)
  
  1 ETH = 10^18 wei
  1 wei = 0.000000000000000001 ETH
  
  Solidity time units:
    1 ether = 1000000000000000000 wei
    0.1 ether = 100000000000000000 wei
    
  Common patterns:
    msg.value >= 1 ether        // At least 1 ETH
    msg.value == 0.5 ether      // Exactly 0.5 ETH
    msg.value > 0               // Any amount
  */
  
  // ── Getting Contract Balance ──────────────────────────────────────────────────
  
  function getBalance() public view returns (uint256) {
    return address(this).balance; // Contract's ETH balance in wei
  }
  
  function getBalanceInEther() public view returns (uint256) {
    return address(this).balance / 1 ether;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SENDING ETHER FROM CONTRACT
// ══════════════════════════════════════════════════════════════════════════════

contract SendingEther {
  address payable public owner;
  
  constructor() {
    owner = payable(msg.sender);
  }
  
  // Receive Ether
  function deposit() public payable {}
  
  // ── Method 1: transfer() ──────────────────────────────────────────────────────
  // - Sends 2300 gas
  // - Reverts on failure
  // - Recommended for simple transfers
  
  function sendViaTransfer(address payable recipient, uint256 amount) public {
    require(msg.sender == owner, "Only owner");
    recipient.transfer(amount);
  }
  
  // ── Method 2: send() ──────────────────────────────────────────────────────────
  // - Sends 2300 gas
  // - Returns bool (true/false)
  // - Does NOT revert on failure
  
  function sendViaSend(address payable recipient, uint256 amount) public returns (bool) {
    require(msg.sender == owner, "Only owner");
    
    bool success = recipient.send(amount);
    require(success, "Send failed");
    return success;
  }
  
  // ── Method 3: call() (RECOMMENDED) ────────────────────────────────────────────
  // - Forwards all gas (or set gas limit)
  // - Returns bool + data
  // - Most flexible, recommended in modern Solidity
  
  function sendViaCall(address payable recipient, uint256 amount) public {
    require(msg.sender == owner, "Only owner");
    
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "Call failed");
  }
  
  // Withdraw all funds to owner
  function withdraw() public {
    require(msg.sender == owner, "Only owner");
    
    (bool success, ) = owner.call{value: address(this).balance}("");
    require(success, "Withdrawal failed");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE: Simple Bank
// ══════════════════════════════════════════════════════════════════════════════

contract SimpleBank {
  mapping(address => uint256) public balances;
  
  // ── Deposit ───────────────────────────────────────────────────────────────────
  
  function deposit() public payable {
    require(msg.value > 0, "Deposit amount must be greater than 0");
    balances[msg.sender] += msg.value;
  }
  
  // ── Withdraw ──────────────────────────────────────────────────────────────────
  
  function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // Update balance BEFORE sending (reentrancy protection)
    balances[msg.sender] -= amount;
    
    // Send Ether
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Withdrawal failed");
  }
  
  function withdrawAll() public {
    uint256 amount = balances[msg.sender];
    require(amount > 0, "No balance");
    
    balances[msg.sender] = 0;
    
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Withdrawal failed");
  }
  
  // ── View Functions ────────────────────────────────────────────────────────────
  
  function getBalance() public view returns (uint256) {
    return balances[msg.sender];
  }
  
  function getContractBalance() public view returns (uint256) {
    return address(this).balance;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE: NFT Purchase
// ══════════════════════════════════════════════════════════════════════════════

contract NFTStore {
  address public owner;
  uint256 public nftPrice = 0.1 ether;
  
  mapping(address => uint256) public nftBalance; // How many NFTs each address owns
  
  constructor() {
    owner = msg.sender;
  }
  
  // Buy NFT by sending exact price
  function buyNFT() public payable {
    require(msg.value == nftPrice, "Incorrect payment amount");
    
    // Mint NFT (simplified - just increment balance)
    nftBalance[msg.sender] += 1;
  }
  
  // Buy multiple NFTs
  function buyMultipleNFTs(uint256 quantity) public payable {
    require(quantity > 0, "Quantity must be positive");
    require(msg.value == nftPrice * quantity, "Incorrect payment");
    
    nftBalance[msg.sender] += quantity;
  }
  
  // Owner withdraws funds
  function withdrawFunds() public {
    require(msg.sender == owner, "Only owner");
    
    (bool success, ) = payable(owner).call{value: address(this).balance}("");
    require(success, "Withdrawal failed");
  }
  
  // Owner sets new price
  function setPrice(uint256 newPrice) public {
    require(msg.sender == owner, "Only owner");
    nftPrice = newPrice;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD EXAMPLE: Crowdfunding
// ══════════════════════════════════════════════════════════════════════════════

contract Crowdfunding {
  address payable public owner;
  uint256 public goal;
  uint256 public deadline;
  uint256 public totalContributed;
  bool public goalReached;
  bool public fundsWithdrawn;
  
  mapping(address => uint256) public contributions;
  
  constructor(uint256 _goalInEther, uint256 _durationDays) {
    owner = payable(msg.sender);
    goal = _goalInEther * 1 ether;
    deadline = block.timestamp + (_durationDays * 1 days);
  }
  
  // ── Contribute ────────────────────────────────────────────────────────────────
  
  function contribute() public payable {
    require(block.timestamp < deadline, "Campaign ended");
    require(!goalReached, "Goal already reached");
    require(msg.value > 0, "Contribution must be positive");
    
    contributions[msg.sender] += msg.value;
    totalContributed += msg.value;
    
    if (totalContributed >= goal) {
      goalReached = true;
    }
  }
  
  // ── Withdraw Funds (Owner - if goal reached) ──────────────────────────────────
  
  function withdrawFunds() public {
    require(msg.sender == owner, "Only owner");
    require(goalReached, "Goal not reached");
    require(!fundsWithdrawn, "Funds already withdrawn");
    
    fundsWithdrawn = true;
    
    (bool success, ) = owner.call{value: address(this).balance}("");
    require(success, "Withdrawal failed");
  }
  
  // ── Refund (Contributors - if goal not reached) ───────────────────────────────
  
  function refund() public {
    require(block.timestamp >= deadline, "Campaign still active");
    require(!goalReached, "Goal was reached");
    
    uint256 contribution = contributions[msg.sender];
    require(contribution > 0, "No contribution");
    
    contributions[msg.sender] = 0;
    
    (bool success, ) = payable(msg.sender).call{value: contribution}("");
    require(success, "Refund failed");
  }
  
  // ── View Functions ────────────────────────────────────────────────────────────
  
  function getTimeRemaining() public view returns (uint256) {
    if (block.timestamp >= deadline) return 0;
    return deadline - block.timestamp;
  }
  
  function getContractBalance() public view returns (uint256) {
    return address(this).balance;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// RECEIVE AND FALLBACK FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

contract ReceiveAndFallback {
  event Received(address sender, uint256 amount);
  event FallbackCalled(address sender, uint256 amount, bytes data);
  
  // ── receive() ─────────────────────────────────────────────────────────────────
  // Called when:
  //   - Someone sends ETH with NO data
  //   - Direct transfer: address(contract).transfer(amount)
  
  receive() external payable {
    emit Received(msg.sender, msg.value);
  }
  
  // ── fallback() ────────────────────────────────────────────────────────────────
  // Called when:
  //   - Function called doesn't exist
  //   - Someone sends ETH WITH data
  
  fallback() external payable {
    emit FallbackCalled(msg.sender, msg.value, msg.data);
  }
  
  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT SPLITTING
// ══════════════════════════════════════════════════════════════════════════════

contract PaymentSplitter {
  address payable public recipient1;
  address payable public recipient2;
  uint256 public recipient1Share; // Percentage (0-100)
  uint256 public recipient2Share;
  
  constructor(
    address payable _recipient1,
    address payable _recipient2,
    uint256 _share1,
    uint256 _share2
  ) {
    require(_share1 + _share2 == 100, "Shares must sum to 100");
    
    recipient1 = _recipient1;
    recipient2 = _recipient2;
    recipient1Share = _share1;
    recipient2Share = _share2;
  }
  
  // Receive payment and split automatically
  function splitPayment() public payable {
    require(msg.value > 0, "No payment");
    
    uint256 amount1 = (msg.value * recipient1Share) / 100;
    uint256 amount2 = (msg.value * recipient2Share) / 100;
    
    (bool success1, ) = recipient1.call{value: amount1}("");
    require(success1, "Transfer to recipient1 failed");
    
    (bool success2, ) = recipient2.call{value: amount2}("");
    require(success2, "Transfer to recipient2 failed");
  }
  
  receive() external payable {
    // Auto-split when receiving ETH
    uint256 amount1 = (msg.value * recipient1Share) / 100;
    uint256 amount2 = msg.value - amount1; // Remainder goes to recipient2
    
    (bool success1, ) = recipient1.call{value: amount1}("");
    require(success1, "Transfer failed");
    
    (bool success2, ) = recipient2.call{value: amount2}("");
    require(success2, "Transfer failed");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY BEST PRACTICES
// ══════════════════════════════════════════════════════════════════════════════

contract SecurePayable {
  mapping(address => uint256) public balances;
  
  // ✅ GOOD: Check-Effects-Interactions Pattern
  function secureWithdraw(uint256 amount) public {
    // 1. Checks
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 2. Effects (update state BEFORE external call)
    balances[msg.sender] -= amount;
    
    // 3. Interactions (external call last)
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
  }
  
  // ❌ BAD: Vulnerable to reentrancy
  function insecureWithdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // External call BEFORE updating state (vulnerable!)
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
    
    balances[msg.sender] -= amount; // Attacker can call again before this
  }
  
  function deposit() public payable {
    balances[msg.sender] += msg.value;
  }
}

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
PAYABLE = Keyword allowing function to receive Ether
MSG.VALUE = Amount of ETH sent with transaction (in wei)
WEI = Smallest unit of Ether (1 ETH = 10^18 wei)
TRANSFER = Send ETH, reverts on fail, 2300 gas
SEND = Send ETH, returns bool, 2300 gas
CALL = Send ETH, returns bool, forwards all gas (RECOMMENDED)
RECEIVE = Special function for receiving ETH with no data
FALLBACK = Catch-all function for non-existent functions or ETH with data
ADDRESS(THIS).BALANCE = Contract's ETH balance
PAYABLE(ADDRESS) = Cast address to payable for transfers
REENTRANCY = Attack where external call calls back into function
CHECK-EFFECTS-INTERACTIONS = Security pattern: check → update state → external call
*/

// ── Ether Units ───────────────────────────────────────────────────────────────

/*
1 wei = 1
1 gwei = 10^9 wei = 1,000,000,000 wei
1 ether = 10^18 wei = 1,000,000,000,000,000,000 wei

Solidity keywords:
  1 wei
  1 gwei
  1 ether

Time units:
  1 seconds
  1 minutes = 60 seconds
  1 hours = 60 minutes
  1 days = 24 hours
  1 weeks = 7 days
*/
