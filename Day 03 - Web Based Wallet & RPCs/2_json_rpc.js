// Lecture Code - 2_json_rpc.js
// Topic: JSON-RPC Calls on Ethereum & Solana
// Day 3.1 - Web Based Wallet & RPCs

// ============================================================
// ETHEREUM RPC CALLS
// ============================================================
// Replace with your own Alchemy/Infura/Quicknode URL
const ETH_RPC_URL = "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY";

async function ethRPCExamples() {
  console.log("=== Ethereum JSON-RPC Examples ===\n");

  // 1. Get ETH Balance
  const getBalancePayload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: ["0xaeaa570b50ad00377ff8add27c50a7667c8f1811", "latest"],
  };

  // 2. Get latest block number
  const getBlockNumberPayload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_blockNumber",
  };

  // 3. Get block by number
  const getBlockPayload = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBlockByNumber",
    params: ["0x1396d66", true], // block hex number, full transaction objects
  };

  // Making the actual RPC call (using fetch)
  async function rpcCall(payload) {
    const response = await fetch(ETH_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  // Uncomment to actually call:
  // const balance = await rpcCall(getBalancePayload);
  // console.log("ETH Balance (in Wei):", balance.result);
  // console.log("ETH Balance:", parseInt(balance.result, 16) / 1e18, "ETH");

  // Printing the payloads to understand the structure
  console.log("Get Balance Payload:");
  console.log(JSON.stringify(getBalancePayload, null, 2));

  console.log("\nGet Block Number Payload:");
  console.log(JSON.stringify(getBlockNumberPayload, null, 2));

  console.log("\nGet Block by Number Payload:");
  console.log(JSON.stringify(getBlockPayload, null, 2));
}

// ============================================================
// SOLANA RPC CALLS
// ============================================================
const SOL_RPC_URL = "https://api.mainnet-beta.solana.com"; // free public RPC

async function solanaRPCExamples() {
  console.log("\n=== Solana JSON-RPC Examples ===\n");

  const SOLANA_ADDRESS = "Eg4F6LW8DD3SvFLLigYJBFvRnXSBiLZYYJ3KEePDL95Q";

  // 1. Get account info
  const getAccountInfo = {
    jsonrpc: "2.0",
    id: 1,
    method: "getAccountInfo",
    params: [SOLANA_ADDRESS],
  };

  // 2. Get Balance
  const getBalance = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [SOLANA_ADDRESS],
  };

  // 3. Get Transaction Count
  const getTxCount = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransactionCount",
  };

  async function rpcCall(payload) {
    const response = await fetch(SOL_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  // Actually calling Solana (public endpoint, no key needed)
  try {
    const balanceRes = await rpcCall(getBalance);
    const LAMPORTS_PER_SOL = 1_000_000_000;
    console.log("Solana Balance (Lamports):", balanceRes.result?.value);
    console.log(
      "Solana Balance (SOL):",
      balanceRes.result?.value / LAMPORTS_PER_SOL
    );
  } catch (err) {
    console.log("Solana RPC call (structure):");
    console.log(JSON.stringify(getBalance, null, 2));
  }
}

// ============================================================
// USING ethers.js (Higher-Level Abstraction over JSON-RPC)
// ============================================================
async function ethersExample() {
  console.log("\n=== ethers.js Abstracts JSON-RPC ===\n");

  // ethers.js is just a nice wrapper around JSON-RPC
  // const { ethers } = require("ethers");
  // const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
  // const balance = await provider.getBalance("0xabc...");
  // console.log("Balance:", ethers.formatEther(balance), "ETH");

  console.log(
    "ethers.js provider.getBalance() internally calls eth_getBalance via JSON-RPC"
  );
  console.log("It abstracts the raw JSON-RPC call for us.");
}

// ============================================================
// WEI & LAMPORTS
// ============================================================
function weiAndLamports() {
  console.log("\n=== Wei & Lamports ===\n");

  const WEI_PER_ETH = BigInt("1000000000000000000"); // 10^18
  const GWEI_PER_ETH = BigInt("1000000000"); // 10^9
  const LAMPORTS_PER_SOL = 1_000_000_000; // 10^9

  console.log("1 ETH =", WEI_PER_ETH.toString(), "Wei");
  console.log("1 ETH =", GWEI_PER_ETH.toString(), "Gwei");
  console.log("1 SOL =", LAMPORTS_PER_SOL.toString(), "Lamports");

  // Convert Wei to ETH
  const weiBalance = BigInt("1500000000000000000"); // 1.5 ETH in Wei
  const ethBalance = Number(weiBalance) / 1e18;
  console.log("\n1.5 ETH in Wei:", weiBalance.toString());
  console.log("Convert back to ETH:", ethBalance, "ETH");
}

// Run all examples
(async () => {
  ethRPCExamples();
  await solanaRPCExamples();
  ethersExample();
  weiAndLamports();
})();
