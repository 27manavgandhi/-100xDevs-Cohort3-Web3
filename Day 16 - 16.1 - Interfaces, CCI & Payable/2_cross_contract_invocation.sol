// Lecture Code - 2_cross_contract_invocation.sol
// Topic: Cross-Contract Invocation (CCI) - contracts calling other contracts
// Day 16.1 - Interfaces, Cross-Contract Invocation & Payable
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── What is Cross-Contract Invocation (CCI)? ─────────────────────────────────
//
// CCI = One contract calling functions in another contract
//
// Why use CCI?
//   1. MODULARITY - Break complex systems into smaller contracts
//   2. REUSABILITY - Use existing deployed contracts
//   3. SPECIALIZATION - Different contracts for different tasks
//
// Real-Life Analogy: Ticketing System
//   - Ticketing Contract sells tickets
//   - Payment Contract processes payments
//   - Ticketing calls Payment to verify payment
//   - Payment confirms → Ticketing issues ticket

// ══════════════════════════════════════════════════════════════════════════════
// BASIC CCI EXAMPLE
// ══════════════════════════════════════════════════════════════════════════════

// ── Contract 1: Message Storage ──────────────────────────────────────────────

contract MessageStorage {
  string private message;
  address public lastSender;
  
  function setMessage(string memory newMessage) public {
    message = newMessage;
    lastSender = msg.sender;
  }
  
  function getMessage() public view returns (string memory) {
    return message;
  }
  
  function getMessageLength() public view returns (uint256) {
    return bytes(message).length;
  }
}

// ── Interface for MessageStorage ─────────────────────────────────────────────

interface IMessageStorage {
  function setMessage(string memory newMessage) external;
  function getMessage() external view returns (string memory);
  function getMessageLength() external view returns (uint256);
}

// ── Contract 2: Message Controller (calls MessageStorage) ────────────────────

contract MessageController {
  // This contract will call functions in MessageStorage
  
  // Method 1: Call using interface
  function setExternalMessage(address storageAddress, string memory newMessage) public {
    // Create interface instance pointing to external contract
    IMessageStorage storage = IMessageStorage(storageAddress);
    
    // Call function on external contract
    storage.setMessage(newMessage);
  }
  
  function getExternalMessage(address storageAddress) public view returns (string memory) {
    IMessageStorage storage = IMessageStorage(storageAddress);
    return storage.getMessage();
  }
  
  function getExternalMessageLength(address storageAddress) public view returns (uint256) {
    IMessageStorage storage = IMessageStorage(storageAddress);
    return storage.getMessageLength();
  }
  
  // Method 2: Store the address for repeated use
  address public storageContractAddress;
  
  function setStorageAddress(address _storageAddress) public {
    storageContractAddress = _storageAddress;
  }
  
  function setMessageInSavedContract(string memory newMessage) public {
    require(storageContractAddress != address(0), "Storage address not set");
    IMessageStorage(storageContractAddress).setMessage(newMessage);
  }
  
  function getMessageFromSavedContract() public view returns (string memory) {
    require(storageContractAddress != address(0), "Storage address not set");
    return IMessageStorage(storageContractAddress).getMessage();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN TRANSFER EXAMPLE (Real-World Use Case)
// ══════════════════════════════════════════════════════════════════════════════

// ── Simple Token Contract ────────────────────────────────────────────────────

interface IERC20 {
  function transfer(address to, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SimpleToken is IERC20 {
  mapping(address => uint256) private balances;
  mapping(address => mapping(address => uint256)) private allowances;
  uint256 private _totalSupply;
  
  constructor(uint256 initialSupply) {
    _totalSupply = initialSupply;
    balances[msg.sender] = initialSupply;
  }
  
  function transfer(address to, uint256 amount) external override returns (bool) {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    balances[to] += amount;
    return true;
  }
  
  function balanceOf(address account) external view override returns (uint256) {
    return balances[account];
  }
  
  function approve(address spender, uint256 amount) external override returns (bool) {
    allowances[msg.sender][spender] = amount;
    return true;
  }
  
  function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
    require(balances[from] >= amount, "Insufficient balance");
    require(allowances[from][msg.sender] >= amount, "Insufficient allowance");
    
    balances[from] -= amount;
    balances[to] += amount;
    allowances[from][msg.sender] -= amount;
    
    return true;
  }
}

// ── Token Manager (uses CCI to interact with tokens) ─────────────────────────

contract TokenManager {
  // Send tokens to multiple recipients in one transaction
  function batchTransfer(
    address tokenAddress,
    address[] memory recipients,
    uint256[] memory amounts
  ) public {
    require(recipients.length == amounts.length, "Arrays must match");
    
    IERC20 token = IERC20(tokenAddress);
    
    for (uint256 i = 0; i < recipients.length; i++) {
      // CCI: Calling transfer on external token contract
      require(token.transfer(recipients[i], amounts[i]), "Transfer failed");
    }
  }
  
  // Check if sender has enough balance
  function hasEnoughBalance(
    address tokenAddress,
    address account,
    uint256 requiredAmount
  ) public view returns (bool) {
    IERC20 token = IERC20(tokenAddress);
    return token.balanceOf(account) >= requiredAmount;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT SYSTEM EXAMPLE (Ticketing + Payment)
// ══════════════════════════════════════════════════════════════════════════════

// ── Payment Contract ──────────────────────────────────────────────────────────

contract PaymentProcessor {
  mapping(address => uint256) public balances;
  
  function deposit() public payable {
    balances[msg.sender] += msg.value;
  }
  
  function processPayment(address buyer, uint256 amount) external returns (bool) {
    if (balances[buyer] >= amount) {
      balances[buyer] -= amount;
      return true; // Payment successful
    }
    return false; // Insufficient balance
  }
  
  function getBalance(address account) public view returns (uint256) {
    return balances[account];
  }
}

// ── Interface for Payment Processor ───────────────────────────────────────────

interface IPaymentProcessor {
  function processPayment(address buyer, uint256 amount) external returns (bool);
  function getBalance(address account) external view returns (uint256);
}

// ── Ticketing Contract (calls PaymentProcessor) ──────────────────────────────

contract TicketingSystem {
  address public paymentProcessor;
  uint256 public ticketPrice = 0.1 ether;
  
  mapping(address => uint256) public tickets;
  
  constructor(address _paymentProcessor) {
    paymentProcessor = _paymentProcessor;
  }
  
  function buyTicket() public {
    // CCI: Call payment processor to verify and process payment
    IPaymentProcessor processor = IPaymentProcessor(paymentProcessor);
    
    bool paymentSuccess = processor.processPayment(msg.sender, ticketPrice);
    require(paymentSuccess, "Payment failed");
    
    // Issue ticket
    tickets[msg.sender] += 1;
  }
  
  function checkBalance(address buyer) public view returns (uint256) {
    // CCI: Check buyer's balance in payment processor
    IPaymentProcessor processor = IPaymentProcessor(paymentProcessor);
    return processor.getBalance(buyer);
  }
  
  function setTicketPrice(uint256 newPrice) public {
    ticketPrice = newPrice;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFI EXAMPLE: Lending Protocol
// ══════════════════════════════════════════════════════════════════════════════

// ── Price Oracle Contract ─────────────────────────────────────────────────────

contract PriceOracle {
  mapping(address => uint256) public prices; // token address => price in USD
  
  function setPrice(address token, uint256 priceInUSD) public {
    prices[token] = priceInUSD;
  }
  
  function getPrice(address token) public view returns (uint256) {
    require(prices[token] > 0, "Price not set");
    return prices[token];
  }
}

// ── Interface for Price Oracle ────────────────────────────────────────────────

interface IPriceOracle {
  function getPrice(address token) external view returns (uint256);
}

// ── Lending Protocol (calls PriceOracle and Token) ───────────────────────────

contract LendingProtocol {
  address public priceOracle;
  
  struct Loan {
    uint256 amount;
    address collateralToken;
    uint256 collateralAmount;
  }
  
  mapping(address => Loan) public loans;
  
  constructor(address _priceOracle) {
    priceOracle = _priceOracle;
  }
  
  // Borrow with collateral
  function borrow(
    address collateralToken,
    uint256 collateralAmount,
    uint256 borrowAmount
  ) public {
    // CCI 1: Get collateral token price from oracle
    IPriceOracle oracle = IPriceOracle(priceOracle);
    uint256 collateralPrice = oracle.getPrice(collateralToken);
    
    // Calculate collateral value
    uint256 collateralValue = collateralAmount * collateralPrice;
    
    // Require 150% collateralization
    require(collateralValue >= borrowAmount * 150 / 100, "Insufficient collateral");
    
    // CCI 2: Transfer collateral from user to this contract
    IERC20 token = IERC20(collateralToken);
    require(
      token.transferFrom(msg.sender, address(this), collateralAmount),
      "Collateral transfer failed"
    );
    
    // Record loan
    loans[msg.sender] = Loan({
      amount: borrowAmount,
      collateralToken: collateralToken,
      collateralAmount: collateralAmount
    });
  }
  
  // Check if loan is healthy (has enough collateral)
  function isLoanHealthy(address borrower) public view returns (bool) {
    Loan memory loan = loans[borrower];
    
    if (loan.amount == 0) return true; // No loan
    
    // CCI: Get current collateral price
    IPriceOracle oracle = IPriceOracle(priceOracle);
    uint256 collateralPrice = oracle.getPrice(loan.collateralToken);
    
    uint256 collateralValue = loan.collateralAmount * collateralPrice;
    uint256 requiredValue = loan.amount * 150 / 100;
    
    return collateralValue >= requiredValue;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY PATTERN (Contract creating other contracts)
// ══════════════════════════════════════════════════════════════════════════════

contract SimpleWallet {
  address public owner;
  
  constructor(address _owner) {
    owner = _owner;
  }
  
  receive() external payable {}
  
  function withdraw() public {
    require(msg.sender == owner, "Not owner");
    payable(owner).transfer(address(this).balance);
  }
}

contract WalletFactory {
  mapping(address => address[]) public userWallets;
  
  // Create new wallet for user
  function createWallet() public returns (address) {
    // CCI: Deploy new contract
    SimpleWallet newWallet = new SimpleWallet(msg.sender);
    address walletAddress = address(newWallet);
    
    // Track wallet
    userWallets[msg.sender].push(walletAddress);
    
    return walletAddress;
  }
  
  function getUserWallets(address user) public view returns (address[] memory) {
    return userWallets[user];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KEY PATTERNS AND BEST PRACTICES
// ══════════════════════════════════════════════════════════════════════════════

/*
PATTERN 1: Interface-Based CCI
  ✅ Define interface
  ✅ Cast address to interface
  ✅ Call functions through interface

PATTERN 2: Stored Address
  ✅ Store frequently-used contract addresses
  ✅ Reduces gas for repeated calls
  ✅ Can update address if needed

PATTERN 3: Address Validation
  ✅ Always validate addresses before CCI
  ✅ Check for zero address
  ✅ Verify contract exists at address

PATTERN 4: Error Handling
  ✅ Check return values
  ✅ Use require for critical operations
  ✅ Revert on failure

PATTERN 5: Event Emissions
  ✅ Emit events for important CCI operations
  ✅ Helps with debugging and tracking
  ✅ Frontend can listen to events
*/

// ── CCI Best Practices ────────────────────────────────────────────────────────

contract CCIBestPractices {
  // ✅ Store important contract addresses
  address public tokenContract;
  address public oracleContract;
  
  // ✅ Emit events for CCI operations
  event ExternalCallMade(address indexed target, bytes4 selector);
  event ExternalCallFailed(address indexed target, string reason);
  
  // ✅ Validate addresses
  function setTokenContract(address _token) public {
    require(_token != address(0), "Invalid address");
    // Could add: check if contract exists
    tokenContract = _token;
  }
  
  // ✅ Handle errors gracefully
  function safeTransfer(address to, uint256 amount) public returns (bool) {
    require(tokenContract != address(0), "Token contract not set");
    
    try IERC20(tokenContract).transfer(to, amount) returns (bool success) {
      if (success) {
        emit ExternalCallMade(tokenContract, IERC20.transfer.selector);
        return true;
      } else {
        emit ExternalCallFailed(tokenContract, "Transfer returned false");
        return false;
      }
    } catch Error(string memory reason) {
      emit ExternalCallFailed(tokenContract, reason);
      return false;
    } catch {
      emit ExternalCallFailed(tokenContract, "Unknown error");
      return false;
    }
  }
}

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
CCI = Cross-Contract Invocation (calling other contracts)
INTERFACE = Blueprint for calling external contracts
EXTERNAL = Visibility for functions called from other contracts
MODULARITY = Breaking system into separate contracts
FACTORY = Contract that creates other contracts
TRY-CATCH = Error handling for external calls
DELEGATION = Contract delegates tasks to other contracts
COMPOSITION = Building complex systems from simple contracts
*/
