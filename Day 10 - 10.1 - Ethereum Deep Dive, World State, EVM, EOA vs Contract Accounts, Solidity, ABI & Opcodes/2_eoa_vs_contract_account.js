// Lecture Code - 2_eoa_vs_contract_account.js
// Topic: EOA vs Contract Accounts — characteristics, nonce, balance, gas
// Day 10.1 - Ethereum Deep Dive: World State, EVM, EOA vs Contract Accounts

// ── Side-by-side comparison ───────────────────────────────────────────────────
console.log(`
EOA vs CONTRACT ACCOUNT:
${"═".repeat(70)}
Feature              EOA                        Contract Account
─────────────────────────────────────────────────────────────────────────
Controlled by        Private key (you)          Smart contract code
Can initiate tx?     YES — only EOAs can         NO — must be "woken up"
Has private key?     YES                         NO
Contains code?       NO                          YES (bytecode)
Nonce meaning        # of txs sent              # of contracts deployed
Pays gas?            YES (from balance)          NO (calling EOA pays)
Can hold ETH?        YES                         YES
Can receive ETH?     YES                         YES (if code allows)
Analogy              Bank account + PIN          Vending machine / Robot
Immutable?           No (balance changes)        Code is immutable after deploy
${"═".repeat(70)}
`);

// ── EOA Simulation ────────────────────────────────────────────────────────────
class EOA {
  constructor(address, privateKey, initialBalance = 0) {
    this.address = address;
    this.privateKey = privateKey; // in real life this NEVER leaves your device
    this.nonce = 0;
    this.balance = initialBalance;
    this.type = "EOA";
  }

  // EOA sends a transaction
  sendTx(to, amount, gasLimit = 21000, gasPriceGwei = 20) {
    const gasCost = (gasLimit * gasPriceGwei) / 1e9; // in ETH
    const total = amount + gasCost;

    if (this.balance < total) {
      throw new Error(`Insufficient balance. Have: ${this.balance} ETH, Need: ${total} ETH`);
    }

    this.nonce++;
    this.balance -= total;

    const tx = {
      from: this.address,
      to: to.address || to,
      value: amount,
      nonce: this.nonce,
      gasUsed: gasCost,
      signature: `sig_by_${this.privateKey}` // simplified
    };

    console.log(`\n📤 EOA Transaction Sent:`);
    console.log(`   From:     ${this.address}`);
    console.log(`   To:       ${to.address || to}`);
    console.log(`   Amount:   ${amount} ETH`);
    console.log(`   Gas cost: ${gasCost.toFixed(6)} ETH`);
    console.log(`   Nonce:    ${this.nonce} (prevents replay attacks)`);
    console.log(`   Balance:  ${this.balance.toFixed(6)} ETH remaining`);

    if (to.receiveETH) to.receiveETH(amount, this.address);
    return tx;
  }

  // Interact with a contract (call a function)
  callContract(contract, functionName, args = [], value = 0) {
    if (!contract.functions[functionName]) {
      throw new Error(`Function ${functionName} not found in contract`);
    }

    const gasEstimate = 50000; // simplified
    const gasCost = (gasEstimate * 20) / 1e9;

    this.nonce++;
    this.balance -= gasCost;
    if (value > 0) this.balance -= value;

    console.log(`\n🔗 EOA calls contract:`);
    console.log(`   EOA: ${this.address} → Contract: ${contract.address}`);
    console.log(`   Function: ${functionName}(${args.join(", ")})`);
    console.log(`   Gas cost: ${gasCost.toFixed(6)} ETH (paid by EOA)`);

    return contract.execute(functionName, args, this.address, value);
  }
}

// ── Contract Account Simulation ───────────────────────────────────────────────
class ContractAccount {
  constructor(address, deployerAddress, code) {
    this.address = address;
    this.balance = 0;
    this.nonce = 0;           // nonce = number of contracts this contract has deployed
    this.storage = {};        // persistent key-value store
    this.code = code;         // immutable after deployment!
    this.type = "Contract";
    this.owner = deployerAddress;

    // Simulate the ABI — available functions
    this.functions = {};
    for (const fn of code.functions) {
      this.functions[fn.name] = fn;
    }

    console.log(`\n🚀 Contract deployed at: ${address}`);
    console.log(`   Owner: ${deployerAddress}`);
    console.log(`   Functions: ${Object.keys(this.functions).join(", ")}`);
    console.log(`   Code is now IMMUTABLE`);
  }

  // Contracts CANNOT initiate tx — they can only respond
  execute(functionName, args, caller, value = 0) {
    const fn = this.functions[functionName];
    if (!fn) throw new Error(`Function not found: ${functionName}`);

    if (value > 0) this.balance += value;

    console.log(`   Executing: ${functionName} | Caller: ${caller}`);
    const result = fn.logic(this.storage, args, caller, this.owner);
    console.log(`   Result: ${JSON.stringify(result)}`);
    return result;
  }

  receiveETH(amount, from) {
    this.balance += amount;
    console.log(`   Contract received ${amount} ETH from ${from}`);
  }
}

// ── Demo: SimpleStorage contract ──────────────────────────────────────────────
const alice = new EOA("0xAlice", "alice_private_key", 5.0);
const bob   = new EOA("0xBob",   "bob_private_key",   2.0);

// Define a simple storage contract
const simpleStorageCode = {
  functions: [
    {
      name: "setNumber",
      logic: (storage, args, caller) => {
        storage.number = args[0];
        return { success: true };
      }
    },
    {
      name: "getNumber",
      logic: (storage) => {
        return { number: storage.number || 0 };
      }
    },
    {
      name: "reset",
      logic: (storage, args, caller, owner) => {
        if (caller !== owner) throw new Error("Only owner can reset!");
        storage.number = 0;
        return { success: true };
      }
    }
  ]
};

const simpleStorage = new ContractAccount("0xContract1", alice.address, simpleStorageCode);

// Alice interacts with the contract (as EOA)
alice.callContract(simpleStorage, "setNumber", [42]);
alice.callContract(simpleStorage, "getNumber", []);

// Bob tries to reset — should fail (only owner can)
try {
  bob.callContract(simpleStorage, "reset", []);
} catch (err) {
  console.log(`\n❌ Bob's reset failed: ${err.message}`);
}

// Alice resets (she's the owner)
alice.callContract(simpleStorage, "reset", []);

console.log("\n--- Final Storage State ---");
console.log("Contract storage:", simpleStorage.storage);

/*
KEY CONCEPTS:
- EOA: has private key, initiates ALL transactions, pays ALL gas
- Contract: has no private key, cannot start tx on its own, code is immutable
- Nonce (EOA): prevents replay attacks (same tx can't be broadcast twice)
- Nonce (Contract): tracks how many sub-contracts it has deployed
- Gas is always paid by the EOA that initiated the transaction chain
- Contract code = immutable → security guarantee but means bugs are permanent
- ABI = the "interface" (list of functions + their inputs/outputs) used to call contracts
*/
