// Lecture Code - 3_solidity_abi_bytecode_evm.js
// Topic: Solidity → Bytecode → EVM pipeline + ABI encoding/decoding
// Day 10.1 - Ethereum Deep Dive: World State, EVM, EOA vs Contract Accounts
//
// npm install ethers

// ── The Compilation Pipeline ──────────────────────────────────────────────────
//
// Solidity (human readable)
//       ↓  compiler (solc)
// Bytecode (low-level, EVM understands this)
//       ↓  deploy to Ethereum network
// EVM (executes bytecode one opcode at a time)
//   Runs on every node: Windows / Ubuntu / Linux — same result everywhere!
//
// Analogy:
//   Solidity → source code (like writing a recipe in English)
//   Bytecode → compiled instructions (like step-by-step instructions a robot follows)
//   Opcodes  → individual steps (ADD, STORE, LOAD, JUMP...)
//   EVM      → the robot that follows the steps

// ── Solidity contract (shown as string — normally in a .sol file) ─────────────
const solidityCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    // State variable — stored in contract's STORAGE (persistent, on-chain)
    uint256 private storedNumber;
    address public owner;

    // Runs ONCE on deployment
    constructor() {
        owner = msg.sender;
        storedNumber = 0;
    }

    // WRITE function — changes storage → costs gas
    function setNumber(uint256 _number) public {
        storedNumber = _number;
    }

    // READ function — only reads storage → FREE (view function)
    function getNumber() public view returns (uint256) {
        return storedNumber;
    }

    // Restricted function — only owner
    function reset() public {
        require(msg.sender == owner, "Only owner can reset");
        storedNumber = 0;
    }
}
`;

console.log("=== 1. SOLIDITY CODE ===");
console.log("Human-readable, compiled by solc compiler");
console.log(solidityCode);

// ── What bytecode looks like (simplified) ─────────────────────────────────────
// In reality this is output by the Solidity compiler (solc)
const exampleBytecode = "0x608060405234801561001057600080fd5b50336000806101000a81548173..." +
  "ffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506...";

console.log("=== 2. BYTECODE (after compilation) ===");
console.log("Machine-readable, deployed to Ethereum blockchain");
console.log(exampleBytecode.slice(0, 80) + "...");
console.log("(Full bytecode is much longer — the EVM reads this one opcode at a time)");

// ── Opcodes — individual EVM instructions ─────────────────────────────────────
console.log("\n=== 3. OPCODES (individual EVM instructions) ===");
const opcodeExamples = [
  { hex: "0x60", name: "PUSH1",   gas: 3,    desc: "Push 1 byte onto the stack" },
  { hex: "0x01", name: "ADD",     gas: 3,    desc: "Add two top stack values" },
  { hex: "0x02", name: "MUL",     gas: 5,    desc: "Multiply two top stack values" },
  { hex: "0x54", name: "SLOAD",   gas: 2100, desc: "Load 32 bytes from STORAGE (persistent, expensive!)" },
  { hex: "0x55", name: "SSTORE",  gas: 20000,desc: "Write 32 bytes to STORAGE (very expensive!)" },
  { hex: "0x51", name: "MLOAD",   gas: 3,    desc: "Load 32 bytes from MEMORY (temporary, cheap)" },
  { hex: "0x52", name: "MSTORE",  gas: 3,    desc: "Write 32 bytes to MEMORY (temporary, cheap)" },
  { hex: "0xf3", name: "RETURN",  gas: 0,    desc: "Return data from memory and stop execution" },
  { hex: "0xf1", name: "CALL",    gas: 700,  desc: "Call another contract" },
  { hex: "0x56", name: "JUMP",    gas: 8,    desc: "Jump to another location in bytecode (control flow)" },
];

console.log("Hex    | Name    | Gas   | Description");
console.log("─".repeat(70));
opcodeExamples.forEach(op => {
  console.log(`${op.hex.padEnd(6)} | ${op.name.padEnd(7)} | ${String(op.gas).padEnd(5)} | ${op.desc}`);
});

// Note: SSTORE (write to storage) costs 20,000 gas = VERY expensive
// MSTORE (write to memory) costs 3 gas = VERY cheap
// This is why reading/writing blockchain state is so costly!

// ── ABI — Application Binary Interface ───────────────────────────────────────
// ABI is the translation guide: human ↔ EVM
// It defines: function names, input types, output types

const abi = [
  {
    type: "constructor",
    inputs: []
  },
  {
    type: "function",
    name: "setNumber",
    inputs: [{ name: "_number", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable" // changes state → costs gas
  },
  {
    type: "function",
    name: "getNumber",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view" // read-only → no gas
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  }
];

console.log("\n=== 4. ABI (Application Binary Interface) ===");
console.log("Translation guide — tells apps how to call contract functions");
console.log(JSON.stringify(abi, null, 2));

// ── ABI Encoding with ethers.js ───────────────────────────────────────────────
// In real code, ethers.js handles ABI encoding/decoding automatically

async function abiEncodingDemo() {
  try {
    const { ethers } = await import("ethers");

    const iface = new ethers.Interface(abi);

    // Encode a call to setNumber(42)
    const encoded = iface.encodeFunctionData("setNumber", [42]);
    console.log("\n=== 5. ABI ENCODING: setNumber(42) ===");
    console.log("Encoded:", encoded);
    // 0x3fb5c1cb  ← first 4 bytes = function selector (keccak256 of "setNumber(uint256)")
    //   000...2a  ← 32 bytes for the number 42 (hex: 0x2a)
    console.log("Function selector (first 4 bytes):", encoded.slice(0, 10));
    console.log("Argument (number 42 in hex):", "0x" + (42).toString(16).padStart(64, "0"));

    // This is what gets sent as tx.data when you call setNumber(42)
    console.log("\nThis encoded hex IS what gets sent as transaction 'data' field");
    console.log("The EVM reads this and knows which function to call + with what args");

  } catch (err) {
    console.log("\nNote: Run 'npm install ethers' to see ABI encoding demo");
    console.log("ABI encoding format:");
    console.log("  Function selector: first 4 bytes = keccak256('setNumber(uint256)')[0:4]");
    console.log("  Arguments: padded to 32 bytes each");
    console.log("  setNumber(42) → 0x3fb5c1cb" + "00".repeat(31) + "2a");
  }
}

abiEncodingDemo();

/*
KEY CONCEPTS:
- Solidity = high-level language (like JavaScript) for writing smart contracts
- Bytecode = compiled low-level output that the EVM reads (not human-readable)
- Opcodes = individual instructions inside bytecode (ADD, SLOAD, CALL, etc.)
- SSTORE/SLOAD = persistent storage operations — VERY expensive (20,000 gas)
- MSTORE/MLOAD = temporary memory operations — CHEAP (3 gas)
- ABI = the interface between human/app and smart contract bytecode
  → defines function names, input types, output types
  → encodeFunctionData() → turns function call into hex data for the tx
  → decodeFunctionData() → turns hex data back into readable function call
- Function selector = first 4 bytes of keccak256 hash of function signature
  → 'setNumber(uint256)' → keccak256 → first 4 bytes → 0x3fb5c1cb
- evm.codes → explore every opcode: gas cost, stack effects, descriptions
- remix.ethereum.org → write + compile + deploy Solidity in browser
*/
