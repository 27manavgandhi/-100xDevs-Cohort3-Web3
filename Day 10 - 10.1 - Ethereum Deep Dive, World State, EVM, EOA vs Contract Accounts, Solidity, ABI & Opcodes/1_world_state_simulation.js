// Lecture Code - 1_world_state_simulation.js
// Topic: Ethereum World State — EOA vs Contract Accounts, Nonce, Balance
// Day 10.1 - Ethereum Deep Dive: World State, EVM, EOA vs Contract Accounts

// ── What is the World State? ──────────────────────────────────────────────────
//
// The World State is a giant SPREADSHEET that maps:
//   address → { nonce, balance, storageHash, codeHash }
//
// Two types of accounts:
//   EOA             → nonce (tx count), balance
//   Contract Account → nonce (contracts created), balance, storageHash, codeHash
//
// Every time a new block is added, the World State updates.
// Ethereum = state machine: State[n] + Block[n+1] → State[n+1]

// ── World State Simulation ────────────────────────────────────────────────────
class Account {
  constructor(type, balance = 0, code = null) {
    this.type = type;       // "EOA" or "Contract"
    this.nonce = 0;
    this.balance = balance;
    this.storage = {};      // key-value store (contracts only)
    this.code = code;       // bytecode (contracts only)
    this.codeHash = code ? hashCode(code) : null;
  }
}

// Simple hash simulation (not cryptographic — for illustration only)
function hashCode(data) {
  let hash = 0;
  const str = JSON.stringify(data);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return "0x" + Math.abs(hash).toString(16).padStart(8, "0");
}

function getStorageHash(storage) {
  return Object.keys(storage).length === 0 ? null : hashCode(storage);
}

class WorldState {
  constructor() {
    this.accounts = {};
    this.blockNumber = 0;
    this.history = [];
  }

  // Create an EOA (controlled by private key)
  createEOA(address, initialBalance = 0) {
    this.accounts[address] = new Account("EOA", initialBalance);
    console.log(`✅ EOA created: ${address} | Balance: ${initialBalance} ETH | Nonce: 0`);
  }

  // Deploy a contract (Contract Account)
  deployContract(fromAddress, contractAddress, code, value = 0) {
    const sender = this.accounts[fromAddress];
    if (!sender) throw new Error("Sender EOA not found");
    if (sender.balance < value) throw new Error("Insufficient balance");

    // Nonce increments when EOA deploys a contract
    sender.nonce++;
    sender.balance -= value;

    this.accounts[contractAddress] = new Account("Contract", value, code);
    console.log(`\n📝 Contract deployed!`);
    console.log(`   Deployer: ${fromAddress} | New nonce: ${sender.nonce}`);
    console.log(`   Contract: ${contractAddress} | Code hash: ${hashCode(code)}`);
  }

  // Send ETH from one account to another
  sendTransaction(from, to, amount, gasPrice = 0.0001) {
    const sender = this.accounts[from];
    if (!sender || sender.type !== "EOA") throw new Error("Sender must be an EOA!");
    if (sender.balance < amount + gasPrice) throw new Error("Insufficient balance (incl. gas)");

    // State update
    sender.nonce++;
    sender.balance -= (amount + gasPrice);

    if (!this.accounts[to]) this.createEOA(to, 0);
    this.accounts[to].balance += amount;

    console.log(`\n💸 TX: ${from} → ${to}`);
    console.log(`   Amount: ${amount} ETH | Gas: ${gasPrice} ETH`);
    console.log(`   ${from} nonce: ${sender.nonce} | New balance: ${sender.balance.toFixed(4)} ETH`);
  }

  // Contract writes to its storage (key-value)
  contractWrite(contractAddress, key, value) {
    const contract = this.accounts[contractAddress];
    if (!contract || contract.type !== "Contract") throw new Error("Not a contract account!");

    contract.storage[key] = value;
    const newStorageHash = getStorageHash(contract.storage);
    console.log(`\n🗄️  Contract Storage Write: ${contractAddress}`);
    console.log(`   [${key}] = ${value}`);
    console.log(`   Storage hash: ${newStorageHash}`);
  }

  // Seal a block — world state snapshot
  sealBlock(transactions = []) {
    this.blockNumber++;
    const snapshot = JSON.parse(JSON.stringify(this.accounts));
    this.history.push({ block: this.blockNumber, state: snapshot });
    console.log(`\n⛏️  Block #${this.blockNumber} sealed — World State updated`);
  }

  // Display current world state
  displayState() {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`WORLD STATE — Block #${this.blockNumber}`);
    console.log(`${"═".repeat(60)}`);
    for (const [address, account] of Object.entries(this.accounts)) {
      console.log(`${address.padEnd(12)} | ${account.type.padEnd(8)} | Nonce: ${account.nonce} | Balance: ${account.balance.toFixed(4)} ETH`);
      if (account.codeHash) console.log(`             | Code Hash: ${account.codeHash}`);
      if (Object.keys(account.storage).length > 0) {
        const sh = getStorageHash(account.storage);
        console.log(`             | Storage Hash: ${sh} | Data: ${JSON.stringify(account.storage)}`);
      }
    }
    console.log(`${"═".repeat(60)}`);
  }
}

// ── Demo ──────────────────────────────────────────────────────────────────────
const world = new WorldState();

// Genesis — create some EOAs
world.createEOA("Alice", 10);
world.createEOA("Bob", 5);
world.sealBlock(); // Block #1

// Alice sends ETH to Bob
world.sendTransaction("Alice", "Bob", 2);

// Alice deploys a simple counter contract
const counterCode = `
  function increment(uint256 count) public { count++; }
  function getCount() view returns (uint256) { return count; }
`;
world.deployContract("Alice", "CounterContract", counterCode);
world.sealBlock(); // Block #2

// Contract stores some data
world.contractWrite("CounterContract", "count", 1);
world.contractWrite("CounterContract", "count", 2);
world.contractWrite("CounterContract", "owner", "Alice");
world.sealBlock(); // Block #3

world.displayState();

console.log(`
\nKEY TAKEAWAYS:
  - World State = mapping of address → account state
  - EOA nonce increments with EVERY transaction sent
  - Contract nonce increments with EVERY new contract deployed
  - Contract storage hash changes whenever storage data changes
  - Each new block = new snapshot of World State
  - EOAs can initiate tx; Contract Accounts can ONLY respond
`);
