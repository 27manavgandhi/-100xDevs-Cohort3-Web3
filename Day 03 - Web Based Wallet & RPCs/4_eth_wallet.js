// Lecture Code - 4_eth_wallet.js
// Topic: Generating Ethereum Wallets from Mnemonic (HD Wallet)
// Day 3.1 - Web Based Wallet & RPCs

// npm install bip39 ethers

const { generateMnemonic, mnemonicToSeedSync } = require("bip39");
const { HDNodeWallet, Wallet, JsonRpcProvider, formatEther } = require("ethers");

// ============================================================
// Step 1: Generate a mnemonic
// ============================================================
const mnemonic = generateMnemonic();
console.log("Generated Mnemonic:\n", mnemonic);
console.log();

// ============================================================
// Step 2: Convert mnemonic → seed → HD Node
// ============================================================
const seed = mnemonicToSeedSync(mnemonic);
const hdNode = HDNodeWallet.fromSeed(seed);

// ============================================================
// Step 3: Derive multiple Ethereum wallets
// Derivation path: m/44'/60'/index'/0'
//   44'  = BIP44 purpose
//   60'  = Ethereum coin type
//   index' = account index
//   0'   = external chain
// ============================================================
console.log("=== Derived Ethereum Wallets ===");

const wallets = [];

for (let i = 0; i < 4; i++) {
  const derivationPath = `m/44'/60'/${i}'/0'`;
  const child = hdNode.derivePath(derivationPath);

  const wallet = new Wallet(child.privateKey);

  console.log(`\nWallet ${i + 1} — Path: ${derivationPath}`);
  console.log("  Address:", wallet.address);
  console.log("  Private Key:", child.privateKey.slice(0, 20) + "...");

  wallets.push({ address: wallet.address, privateKey: child.privateKey });
}

// ============================================================
// Step 4: Fetch ETH balance via RPC (ethers.js)
// ============================================================
async function fetchEthBalance(address, rpcUrl) {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    console.log(`\nBalance of ${address}:`);
    console.log(`  ${balance} Wei = ${formatEther(balance)} ETH`);
  } catch (err) {
    console.log("Balance fetch error:", err.message);
  }
}

// Uncomment with your Alchemy/Infura key to test:
// const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY";
// fetchEthBalance(wallets[0].address, RPC_URL);

// ============================================================
// Step 5: Keccak-256 address derivation (how ETH does it under the hood)
// ============================================================
const { keccak256 } = require("ethers");

function showAddressDerivation(wallet) {
  const pubKey = wallet.signingKey.publicKey;
  // Remove 0x04 prefix (uncompressed public key indicator)
  const pubKeyBytes = pubKey.slice(4);
  // Keccak256 the public key bytes
  const hash = keccak256("0x" + pubKeyBytes);
  // Last 20 bytes = address
  const derivedAddr = "0x" + hash.slice(-40);

  console.log("\n=== ETH Address Derivation (under the hood) ===");
  console.log("Public Key:", pubKey.slice(0, 20) + "...");
  console.log("Keccak256(pubKey):", hash.slice(0, 20) + "...");
  console.log("Last 20 bytes (address):", derivedAddr);
  console.log("ethers.js address:", wallet.address.toLowerCase());
  console.log(
    "Match:",
    derivedAddr.toLowerCase() === wallet.address.toLowerCase()
  );
}

const demoWallet = new Wallet(wallets[0].privateKey);
showAddressDerivation(demoWallet);

/*
KEY CONCEPTS:
- ETH coin type = 60 in BIP44
- HDNodeWallet from ethers.js handles all BIP32 derivation
- ETH address = "0x" + last 20 bytes of keccak256(publicKey)
- ethers.Wallet gives you sign, sendTransaction, connect(provider) methods
- Always use a provider (Alchemy/Infura/Quicknode) for mainnet/testnet access
*/
