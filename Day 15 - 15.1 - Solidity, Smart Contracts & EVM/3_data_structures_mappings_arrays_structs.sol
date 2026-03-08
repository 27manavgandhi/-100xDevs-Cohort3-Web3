// Lecture Code - 3_data_structures_mappings_arrays_structs.sol
// Topic: Mappings, Arrays, and Structs in Solidity
// Day 15.1 - Solidity, Smart Contracts & EVM
//
// To run: Use Remix IDE at https://remix.ethereum.org/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ── Data Structures in Solidity ──────────────────────────────────────────────
//
// Solidity provides three main data structures:
//   1. Mappings  → Key-value store (like a dictionary)
//   2. Arrays    → Ordered list of items
//   3. Structs   → Custom data types grouping multiple variables

contract DataStructuresDemo {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAPPINGS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ── What is a Mapping? ──────────────────────────────────────────────────────
  // A mapping is a KEY-VALUE store (like a dictionary or hash map)
  // Syntax: mapping(KeyType => ValueType) public variableName;
  
  // Example 1: Store balances for each address
  mapping(address => uint256) public balances;
  
  // Example 2: Store usernames for each address
  mapping(address => string) public usernames;
  
  // Example 3: Track if an address has voted
  mapping(address => bool) public hasVoted;
  
  // Example 4: Nested mapping - allowances in ERC20 tokens
  // owner → (spender → amount)
  mapping(address => mapping(address => uint256)) public allowances;
  
  // ── Mapping Functions ───────────────────────────────────────────────────────
  
  function setBalance(address user, uint256 amount) public {
    balances[user] = amount; // Set value for key
  }
  
  function getBalance(address user) public view returns (uint256) {
    return balances[user]; // Get value for key (returns 0 if not set)
  }
  
  function setUsername(string memory name) public {
    usernames[msg.sender] = name; // msg.sender as key
  }
  
  function vote() public {
    require(!hasVoted[msg.sender], "Already voted");
    hasVoted[msg.sender] = true;
  }
  
  // Nested mapping example
  function approve(address spender, uint256 amount) public {
    allowances[msg.sender][spender] = amount;
  }
  
  function getAllowance(address owner, address spender) public view returns (uint256) {
    return allowances[owner][spender];
  }
  
  // ── Key Points about Mappings ───────────────────────────────────────────────
  /*
  1. All keys exist by default with zero value
     - balances[anyAddress] returns 0 if never set
     - hasVoted[anyAddress] returns false if never set
  
  2. Cannot iterate over mappings
     - No way to list all keys
     - No length property
  
  3. Cannot delete entire mapping
     - Can only set individual values to 0/false
  
  4. Very gas efficient for lookups
  
  5. Common use cases:
     - Token balances (address → uint)
     - Ownership (address → bool)
     - User data (address → struct)
     - Allowances (address → mapping)
  */
  
  // Real-Life Analogy:
  // Mapping = School lockers
  //   - Each student (address) has a locker number (key)
  //   - Inside the locker is their stuff (value)
  //   - You can check any locker instantly
  //   - Empty lockers exist but contain nothing (default value)
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ARRAYS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ── What is an Array? ───────────────────────────────────────────────────────
  // An array is an ORDERED LIST of items of the same type
  
  // Dynamic array (can grow/shrink)
  uint256[] public dynamicNumbers;
  address[] public userAddresses;
  string[] public messages;
  
  // Fixed-size array (size cannot change)
  uint256[5] public fixedNumbers; // Exactly 5 elements
  address[3] public admins;       // Exactly 3 addresses
  
  // ── Array Functions ─────────────────────────────────────────────────────────
  
  // Add element to dynamic array
  function addNumber(uint256 num) public {
    dynamicNumbers.push(num); // Adds to end of array
  }
  
  // Remove last element from dynamic array
  function removeLastNumber() public {
    require(dynamicNumbers.length > 0, "Array is empty");
    dynamicNumbers.pop(); // Removes last element
  }
  
  // Get element at index
  function getNumber(uint256 index) public view returns (uint256) {
    require(index < dynamicNumbers.length, "Index out of bounds");
    return dynamicNumbers[index];
  }
  
  // Get array length
  function getNumberCount() public view returns (uint256) {
    return dynamicNumbers.length;
  }
  
  // Update element at index
  function updateNumber(uint256 index, uint256 newValue) public {
    require(index < dynamicNumbers.length, "Index out of bounds");
    dynamicNumbers[index] = newValue;
  }
  
  // Delete element (sets to 0, doesn't remove)
  function deleteNumber(uint256 index) public {
    require(index < dynamicNumbers.length, "Index out of bounds");
    delete dynamicNumbers[index]; // Sets to 0, doesn't reduce length
  }
  
  // Get entire array (be careful with large arrays - gas intensive!)
  function getAllNumbers() public view returns (uint256[] memory) {
    return dynamicNumbers;
  }
  
  // Fixed array example
  function setFixedNumber(uint256 index, uint256 value) public {
    require(index < 5, "Index must be 0-4");
    fixedNumbers[index] = value;
  }
  
  // ── Key Points about Arrays ─────────────────────────────────────────────────
  /*
  1. Dynamic arrays can grow with push(), shrink with pop()
  
  2. Fixed arrays have constant size
  
  3. Arrays have .length property
  
  4. Deleting an element sets it to 0 but doesn't reduce length
  
  5. Iterating over large arrays is expensive (gas)
  
  6. Common use cases:
     - List of addresses (participants, voters, etc.)
     - Transaction history
     - Todo items
     - Collection of struct instances
  */
  
  // Real-Life Analogy:
  // Array = Numbered parking spots
  //   - Spot 0, spot 1, spot 2... (indices)
  //   - Each spot holds one car (value)
  //   - You can add/remove from the end
  //   - You know exactly how many spots there are (.length)
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ── What is a Struct? ───────────────────────────────────────────────────────
  // A struct is a CUSTOM DATA TYPE that groups multiple variables together
  
  // Example 1: User profile
  struct User {
    string name;
    uint256 age;
    bool isActive;
    uint256 createdAt;
  }
  
  // Example 2: Todo item
  struct Todo {
    uint256 id;
    string text;
    bool completed;
  }
  
  // Example 3: Product
  struct Product {
    uint256 id;
    string name;
    uint256 price;
    address seller;
  }
  
  // ── Using Structs ───────────────────────────────────────────────────────────
  
  // Store single instance
  User public admin;
  
  // Array of structs
  Todo[] public todos;
  
  // Mapping to struct
  mapping(address => User) public users;
  mapping(uint256 => Product) public products;
  
  // Counter for IDs
  uint256 public nextTodoId = 1;
  uint256 public nextProductId = 1;
  
  // ── Struct Functions ────────────────────────────────────────────────────────
  
  // Create a user
  function registerUser(string memory name, uint256 age) public {
    users[msg.sender] = User({
      name: name,
      age: age,
      isActive: true,
      createdAt: block.timestamp
    });
  }
  
  // Alternative syntax using positional arguments
  function registerUserAlt(string memory name, uint256 age) public {
    users[msg.sender] = User(name, age, true, block.timestamp);
  }
  
  // Update struct field
  function updateUserName(string memory newName) public {
    users[msg.sender].name = newName;
  }
  
  function deactivateUser() public {
    users[msg.sender].isActive = false;
  }
  
  // Get struct data
  function getUser(address userAddress) public view returns (
    string memory name,
    uint256 age,
    bool isActive,
    uint256 createdAt
  ) {
    User memory user = users[userAddress];
    return (user.name, user.age, user.isActive, user.createdAt);
  }
  
  // Create todo
  function createTodo(string memory text) public {
    todos.push(Todo({
      id: nextTodoId,
      text: text,
      completed: false
    }));
    nextTodoId++;
  }
  
  // Complete todo
  function completeTodo(uint256 index) public {
    require(index < todos.length, "Todo does not exist");
    todos[index].completed = true;
  }
  
  // Get todo
  function getTodo(uint256 index) public view returns (
    uint256 id,
    string memory text,
    bool completed
  ) {
    require(index < todos.length, "Todo does not exist");
    Todo memory todo = todos[index];
    return (todo.id, todo.text, todo.completed);
  }
  
  // Get todo count
  function getTodoCount() public view returns (uint256) {
    return todos.length;
  }
  
  // Add product
  function addProduct(string memory name, uint256 price) public {
    products[nextProductId] = Product({
      id: nextProductId,
      name: name,
      price: price,
      seller: msg.sender
    });
    nextProductId++;
  }
  
  // ── Key Points about Structs ────────────────────────────────────────────────
  /*
  1. Group related data together
  
  2. Can be used in arrays, mappings, or standalone
  
  3. Two initialization syntaxes:
     - Named: User({name: "Alice", age: 25, ...})
     - Positional: User("Alice", 25, ...)
  
  4. Access fields with dot notation: user.name
  
  5. Can contain any data type except the struct itself
     (but can contain arrays, mappings, other structs)
  
  6. Common use cases:
     - User profiles
     - Orders/transactions
     - Game items
     - Todo items
     - Any complex entity with multiple properties
  */
  
  // Real-Life Analogy:
  // Struct = Student ID card
  //   - Contains multiple pieces of info:
  //     • Name
  //     • Student ID
  //     • Photo
  //     • Expiration date
  //   - All grouped into one card (struct)
}

// ── Combining All Three: Real-World Example ──────────────────────────────────

contract Marketplace {
  
  // Struct: Product definition
  struct Product {
    uint256 id;
    string name;
    uint256 price;
    address seller;
    bool available;
  }
  
  // Mapping: Product ID → Product
  mapping(uint256 => Product) public products;
  
  // Mapping: Seller → array of product IDs
  mapping(address => uint256[]) public sellerProducts;
  
  // Array: All product IDs
  uint256[] public allProductIds;
  
  uint256 public nextProductId = 1;
  
  function listProduct(string memory name, uint256 price) public {
    uint256 productId = nextProductId;
    
    // Add to mapping
    products[productId] = Product({
      id: productId,
      name: name,
      price: price,
      seller: msg.sender,
      available: true
    });
    
    // Add to seller's array
    sellerProducts[msg.sender].push(productId);
    
    // Add to global array
    allProductIds.push(productId);
    
    nextProductId++;
  }
  
  function getSellerProductCount(address seller) public view returns (uint256) {
    return sellerProducts[seller].length;
  }
  
  function getTotalProducts() public view returns (uint256) {
    return allProductIds.length;
  }
}

// ── Data Structure Comparison ─────────────────────────────────────────────────

/*
┌───────────────────────────────────────────────────────────────────────────┐
│                    DATA STRUCTURE COMPARISON                              │
├──────────┬───────────────┬──────────────┬──────────────┬─────────────────┤
│ Type     │ Ordered?      │ Key Access?  │ Can Iterate? │ Use Case        │
├──────────┼───────────────┼──────────────┼──────────────┼─────────────────┤
│ Mapping  │ ❌ No         │ ✅ Yes (O(1))│ ❌ No        │ Balances, owner │
│          │               │              │              │ lookup, voting  │
│          │               │              │              │                 │
│ Array    │ ✅ Yes (index)│ ✅ Yes (O(1))│ ✅ Yes       │ Lists, history, │
│          │               │              │              │ collections     │
│          │               │              │              │                 │
│ Struct   │ N/A (custom)  │ N/A (custom) │ N/A (custom) │ Complex objects │
│          │               │              │              │ User, Product   │
└──────────┴───────────────┴──────────────┴──────────────┴─────────────────┘

WHEN TO USE WHAT:

Mapping:
  - Need fast lookup by key (address, ID)
  - Don't need to list all keys
  - Example: balances[address]

Array:
  - Need ordered list
  - Need to iterate over all items
  - Need to know total count
  - Example: list of transactions

Struct:
  - Need to group related data
  - Creating complex entities
  - Example: User {name, age, email}

Combined:
  - mapping(address => User) = Fast user lookup
  - User[] = List all users
  - mapping(uint => Product) + uint[] = Fast product lookup + list all
*/

// ── Key Concepts ──────────────────────────────────────────────────────────────

/*
MAPPING = Key-value store, instant lookup, no iteration
ARRAY = Ordered list, can iterate, has length
STRUCT = Custom data type, groups multiple fields
PUSH = Add element to end of array
POP = Remove last element from array
DELETE = Set to default value (doesn't reduce array length)
LENGTH = Number of elements in array
MEMORY = Temporary data (function execution)
STORAGE = Permanent data (blockchain state)
BLOCK.TIMESTAMP = Current block time (Unix timestamp)
MSG.SENDER = Address calling the function
*/
