// Lecture Code - 4_evm_architecture.js
// Topic: EVM Architecture — Stack, Memory, Storage, ROM, Program Counter
// Day 10.1 - Ethereum Deep Dive: World State, EVM, EOA vs Contract Accounts

// ── EVM Architecture Overview ─────────────────────────────────────────────────
//
//                    EVM
// ┌───────────────────────────────────────────────────────┐
// │  ROM (EVM CODE)      ← immutable bytecode             │
// │  PROGRAM COUNTER     ← current instruction index      │
// │  GAS AVAILABLE       ← remaining gas budget           │
// │                                                       │
// │  STACK    MEMORY    ACCOUNT STATE (STORAGE)           │
// │  (temp)   (temp)    (persistent, on-chain)            │
// └───────────────────────────────────────────────────────┘
//
// KEY DISTINCTION:
//   MEMORY  = temporary (like RAM) — wiped after each function call
//   STORAGE = persistent (like hard disk) — stays on blockchain forever
//   STACK   = tiny scratch pad for current computation (max 1024 items)

// ── EVM Simulation ────────────────────────────────────────────────────────────
class EVM {
  constructor(bytecode, storage = {}, gasLimit = 100000) {
    // ROM — immutable code, loaded at start
    this.rom = bytecode;
    this.pc = 0; // Program Counter — which instruction we're on

    // Gas tracking
    this.gasLimit = gasLimit;
    this.gasUsed = 0;

    // Execution components
    this.stack = [];      // LIFO — last in, first out
    this.memory = {};     // Temporary per-call storage (key-value for simplicity)
    this.storage = storage; // Persistent — survives between calls!

    this.logs = [];
  }

  // Consume gas — every opcode costs gas
  consumeGas(amount, opcode) {
    this.gasUsed += amount;
    if (this.gasUsed > this.gasLimit) {
      throw new Error(`OUT OF GAS! Used: ${this.gasUsed}, Limit: ${this.gasLimit}, At: ${opcode}`);
    }
  }

  // STACK operations
  push(value) {
    if (this.stack.length >= 1024) throw new Error("STACK OVERFLOW! Max 1024 items");
    this.stack.push(value);
  }

  pop() {
    if (this.stack.length === 0) throw new Error("STACK UNDERFLOW! Nothing to pop");
    return this.stack.pop();
  }

  // ── Opcode implementations ─────────────────────────────────────────────────
  opcodes = {
    // PUSH: push value onto stack (3 gas)
    PUSH: (value) => {
      this.consumeGas(3, "PUSH");
      this.push(value);
      console.log(`  PUSH ${value} → stack: [${this.stack.join(", ")}]`);
    },

    // ADD: pop 2 items, push their sum (3 gas)
    ADD: () => {
      this.consumeGas(3, "ADD");
      const b = this.pop();
      const a = this.pop();
      this.push(a + b);
      console.log(`  ADD ${a} + ${b} = ${a + b} → stack: [${this.stack.join(", ")}]`);
    },

    // MUL: pop 2, push product (5 gas)
    MUL: () => {
      this.consumeGas(5, "MUL");
      const b = this.pop();
      const a = this.pop();
      this.push(a * b);
      console.log(`  MUL ${a} × ${b} = ${a * b} → stack: [${this.stack.join(", ")}]`);
    },

    // MSTORE: write to MEMORY (3 gas — cheap, temporary)
    MSTORE: (key, value) => {
      this.consumeGas(3, "MSTORE");
      this.memory[key] = value;
      console.log(`  MSTORE memory[${key}] = ${value} (TEMP — wiped after call)`);
    },

    // MLOAD: read from MEMORY (3 gas — cheap)
    MLOAD: (key) => {
      this.consumeGas(3, "MLOAD");
      const val = this.memory[key] || 0;
      this.push(val);
      console.log(`  MLOAD memory[${key}] = ${val} → stack: [${this.stack.join(", ")}]`);
    },

    // SSTORE: write to STORAGE (20000 gas — VERY expensive, persistent!)
    SSTORE: (key, value) => {
      this.consumeGas(20000, "SSTORE");
      this.storage[key] = value;
      console.log(`  SSTORE storage[${key}] = ${value} (PERSISTENT — stays on-chain!)`);
      console.log(`  ⚠️  Gas used: 20,000 (SSTORE is the most expensive common opcode)`);
    },

    // SLOAD: read from STORAGE (2100 gas — expensive vs MLOAD)
    SLOAD: (key) => {
      this.consumeGas(2100, "SLOAD");
      const val = this.storage[key] || 0;
      this.push(val);
      console.log(`  SLOAD storage[${key}] = ${val} → stack: [${this.stack.join(", ")}]`);
    },

    // RETURN: end execution, return value
    RETURN: (value) => {
      console.log(`  RETURN: ${value}`);
      console.log(`  Gas used: ${this.gasUsed} / ${this.gasLimit}`);
      console.log(`  Memory wiped. Storage persists.`);
    }
  };
}

// ── Demo 1: Simple arithmetic ─────────────────────────────────────────────────
console.log("=== EVM EXECUTION: 3 + 4 * 2 ===");
const evm1 = new EVM("ARITHMETIC_DEMO", {}, 100000);
evm1.opcodes.PUSH(3);
evm1.opcodes.PUSH(4);
evm1.opcodes.PUSH(2);
evm1.opcodes.MUL();  // 4 * 2 = 8
evm1.opcodes.ADD();  // 3 + 8 = 11
evm1.opcodes.RETURN(evm1.pop());

// ── Demo 2: setNumber(42) — write to storage ──────────────────────────────────
console.log("\n=== EVM EXECUTION: setNumber(42) — writes to STORAGE ===");
const existingStorage = { storedNumber: 0, owner: "0xAlice" };
const evm2 = new EVM("SIMPLE_STORAGE", existingStorage, 100000);
evm2.opcodes.PUSH(42);                         // push the value to store
evm2.opcodes.SSTORE("storedNumber", 42);        // write to persistent storage
evm2.opcodes.RETURN("success");
console.log("Final storage:", evm2.storage);

// ── Demo 3: getNumber() — read from storage ───────────────────────────────────
console.log("\n=== EVM EXECUTION: getNumber() — reads from STORAGE (view) ===");
const evm3 = new EVM("SIMPLE_STORAGE", existingStorage, 100000);
evm3.opcodes.SLOAD("storedNumber");  // load from storage onto stack
const result = evm3.pop();
evm3.opcodes.RETURN(result);

// ── Memory vs Storage — the crucial difference ────────────────────────────────
console.log("\n=== MEMORY vs STORAGE — the crucial distinction ===");
const evm4 = new EVM("MEMORY_VS_STORAGE", {}, 100000);

// Write to MEMORY — cheap but temporary
evm4.opcodes.MSTORE("tempResult", 100);
evm4.opcodes.MSTORE("tempResult", 200); // overwrite

// Write to STORAGE — expensive but permanent
evm4.opcodes.SSTORE("permanentResult", 999);

console.log("\nAfter execution:");
console.log("Memory (TEMPORARY):", evm4.memory);  // exists during call
console.log("Storage (PERSISTENT):", evm4.storage); // persists on blockchain!
console.log("\n⚡ Cost comparison:");
console.log("  MSTORE: 3 gas | MLOAD: 3 gas   ← USE FOR TEMP CALCULATIONS");
console.log("  SSTORE: 20,000 gas | SLOAD: 2,100 gas ← USE FOR PERMANENT STATE");

console.log(`
\n${"═".repeat(65)}
JVM vs EVM — Side-by-Side:
${"═".repeat(65)}
Feature          JVM                       EVM
─────────────────────────────────────────────────────────────────
Language         Java                      Solidity (main)
Purpose          General-purpose apps      Smart contracts on Ethereum
Bytecode         Java bytecode             EVM bytecode
Platform         Windows, Mac, Linux       All Ethereum nodes globally
Gas              No concept of gas         Every opcode costs gas
State            JVM doesn't keep state    EVM has persistent storage
Immutability     Code can be updated       Deployed code is IMMUTABLE
Philosophy       Write Once, Run Anywhere  Deploy Once, Run Everywhere
${"═".repeat(65)}
`);

/*
KEY CONCEPTS:
- EVM has 3 types of data areas:
  1. STACK: scratch pad for current computation (max 1024 items, LIFO)
  2. MEMORY: temporary per-call storage (cleared after each call), cheap: 3 gas/op
  3. STORAGE: persistent on-chain key-value store, expensive: SSTORE=20,000 gas
- ROM: the contract's immutable bytecode
- Program Counter: tracks which opcode is executing next
- Gas Available: budget that decrements with every opcode
- OUT OF GAS: if gas runs out mid-execution, ALL state changes revert
- Gas costs reflect computational burden on the network:
  - Simple math (ADD): 3 gas
  - Memory read/write: 3 gas  
  - Storage read (SLOAD): 2,100 gas
  - Storage write (SSTORE): 20,000 gas ← MOST EXPENSIVE common opcode
- This is why smart contracts minimize SSTORE calls and use MSTORE for temp data
*/
