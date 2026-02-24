// Lecture Code - 1_keccak256.js
// Topic: Keccak-256 Hashing & ETH Address Generation
// Day 3.1 - Web Based Wallet & RPCs

const { keccak256, toUtf8Bytes } = require("ethers");

// 1. Basic Keccak-256 hashing
function hashMessage(message) {
  const hash = keccak256(toUtf8Bytes(message));
  console.log(`Message: "${message}"`);
  console.log(`Keccak-256 Hash: ${hash}`);
  console.log("---");
  return hash;
}

hashMessage("Hello World");
hashMessage("100xDevs Web3");
hashMessage("hello world"); // Different capitalisation = completely different hash

// 2. Ethereum Address Derivation from a Public Key
// In Ethereum: address = "0x" + last 20 bytes of keccak256(publicKey)
const { Wallet } = require("ethers");

function deriveEthAddress() {
  // Generate a random wallet
  const wallet = Wallet.createRandom();

  console.log("=== Ethereum Address Derivation ===");
  console.log("Private Key:", wallet.privateKey);
  console.log("Public Key:", wallet.publicKey);

  // Keccak-256 hash of the public key (without 0x04 prefix)
  const pubKeyWithoutPrefix = wallet.publicKey.slice(4); // remove 0x04
  const hash = keccak256("0x" + pubKeyWithoutPrefix);
  console.log("Keccak-256 of Public Key:", hash);

  // Ethereum address = last 20 bytes (40 hex chars) + "0x" prefix
  const derivedAddress = "0x" + hash.slice(-40);
  console.log("Derived Address:", derivedAddress);
  console.log("Wallet Address:", wallet.address.toLowerCase());
  console.log("Match:", derivedAddress.toLowerCase() === wallet.address.toLowerCase());
}

deriveEthAddress();

/*
KEY INSIGHT:
- ETH address = last 20 bytes of keccak256(public_key)
- Solana address = raw 32-byte public key (no hashing needed)
- Keccak-256 is collision-resistant, pre-image resistant, outputs 256 bits
*/
