// Lecture Code - 1_eth_vs_solana_token_creation.js
// Topic: ETH vs Solana Token Creation — Token Program vs ERC-20 Smart Contracts
// Day 12.1 - Liquidity Pools on Solana, Raydium, ETH vs Solana

// ── ETH vs SOLANA — Token Creation Comparison ────────────────────────────────
//
// ETHEREUM:
//   - You must write a Solidity ERC-20 smart contract
//   - Deploy it yourself (costs ETH gas)
//   - Every token = its own separate smart contract
//   - Like building a custom house: Hire architect, draw blueprints, build it
//
// SOLANA:
//   - Built-in Token Program handles everything
//   - You just send a createToken instruction
//   - All tokens share the same Token Program
//   - Like ordering from a toy factory: Submit a form, factory creates your toy

console.log(`
${"═".repeat(65)}
ETH vs SOLANA — Token Creation
${"═".repeat(65)}
                ETHEREUM                     SOLANA
────────────────────────────────────────────────────────────
Analogy     Construction company          Giant toy factory
How         Write Solidity ERC-20         Call Token Program
Complexity  High — write + audit code     Low — one instruction
Time        Hours/days                    Seconds
Cost        High gas (deploy contract)    ~0.002 SOL (~$0.30)
Customise   Fully custom logic            Standardized behavior
Token addr  = smart contract address      = Mint account address
Ownership   Smart contract controls       Mint Authority controls
${"═".repeat(65)}
`);

// ── Ethereum ERC-20 — what you have to write ──────────────────────────────────
// (Shown for comparison — Solana devs don't need this)
const ethereumERC20Solidity = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// On Ethereum: you write this entire contract yourself
contract MyToken {
    string public name = "My Token";
    string public symbol = "MYT";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * (10 ** uint256(decimals));
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    // ... approve, transferFrom, allowance logic...
}
// Then deploy this contract to Ethereum — it costs ~$50-200 in gas
// The contract address IS the token address
`;

// ── Solana Token Creation — what you actually do ──────────────────────────────
// Just 3 function calls to the Token Program — no contract to write!
const solanaTokenCreationSteps = `
SOLANA TOKEN CREATION — 3 STEPS:

Step 1: createMint()
  → Creates a Mint Account (the token's "blueprint")
  → You set: decimals, mintAuthority, freezeAuthority
  → Returns: mintAddress (this IS your token's address)

Step 2: getOrCreateAssociatedTokenAccount()
  → Creates an ATA (Associated Token Account) for your wallet
  → Like creating a "pocket" for your specific token
  → Returns: ataAddress (where your token balance lives)

Step 3: mintTo()
  → Mints (creates) tokens and sends them to the ATA
  → Only the mintAuthority can do this
  → Returns: transaction signature

That's it! No Solidity, no contract audit, no $100+ gas fees.
`;

console.log("ETHEREUM APPROACH:");
console.log("Write this entire Solidity contract + deploy it:");
console.log(ethereumERC20Solidity);

console.log("SOLANA APPROACH:");
console.log(solanaTokenCreationSteps);

// ── Conceptual simulation of both approaches ──────────────────────────────────
class EthereumTokenCreation {
  constructor() {
    this.contracts = {};
  }

  deployERC20(name, symbol, decimals, initialSupply, deployer) {
    const contractAddress = "0x" + Math.random().toString(16).slice(2, 42);
    this.contracts[contractAddress] = {
      name, symbol, decimals,
      totalSupply: initialSupply * (10 ** decimals),
      balances: { [deployer]: initialSupply * (10 ** decimals) },
      owner: deployer,
    };

    const gasCost = 0.05; // ~$50 worth of ETH at time of writing
    console.log(`\n[ETH] Deployed ERC-20 contract`);
    console.log(`  Token name:       ${name} (${symbol})`);
    console.log(`  Contract address: ${contractAddress}`);
    console.log(`  Gas cost:         ~${gasCost} ETH (~$100+)`);
    console.log(`  Steps needed:     Write Solidity → Test → Deploy → Verify`);
    return contractAddress;
  }
}

class SolanaTokenCreation {
  constructor() {
    this.mints = {};
    this.atas = {};
  }

  createMint(decimals, mintAuthority) {
    const mintAddress = "So" + Math.random().toString(36).slice(2, 46);
    this.mints[mintAddress] = { decimals, mintAuthority, supply: 0 };
    console.log(`\n[SOL] Step 1 — createMint()`);
    console.log(`  Mint address:    ${mintAddress}`);
    console.log(`  Decimals:        ${decimals}`);
    console.log(`  Mint authority:  ${mintAuthority.slice(0, 8)}...`);
    console.log(`  Cost:            ~0.00144 SOL (~$0.25)`);
    return mintAddress;
  }

  createATA(mintAddress, owner) {
    const ataAddress = "AT" + Math.random().toString(36).slice(2, 46);
    this.atas[ataAddress] = { mint: mintAddress, owner, balance: 0 };
    console.log(`\n[SOL] Step 2 — createAssociatedTokenAccount()`);
    console.log(`  ATA address:     ${ataAddress}`);
    console.log(`  Owner:           ${owner.slice(0, 8)}...`);
    console.log(`  Cost:            ~0.002 SOL (~$0.35)`);
    return ataAddress;
  }

  mintTo(mintAddress, ataAddress, amount, mintAuthority) {
    const mint = this.mints[mintAddress];
    const ata = this.atas[ataAddress];
    mint.supply += amount;
    ata.balance += amount;
    console.log(`\n[SOL] Step 3 — mintTo()`);
    console.log(`  Minted:          ${amount} tokens`);
    console.log(`  ATA balance now: ${ata.balance}`);
    console.log(`  Total supply:    ${mint.supply}`);
    console.log(`  Cost:            ~0.000005 SOL (negligible)`);
  }
}

console.log("\n=== DEMO: Creating tokens on both chains ===\n");

// Ethereum: 1 step conceptually but lots of code to write
const eth = new EthereumTokenCreation();
eth.deployERC20("Kirat Token", "KRT", 18, 1000000, "0xAliceAddress123");

// Solana: 3 simple calls, no contract to write
const sol = new SolanaTokenCreation();
const mint = sol.createMint(6, "AliceSolanaWallet123");
const ata = sol.createATA(mint, "AliceSolanaWallet123");
sol.mintTo(mint, ata, 1000000, "AliceSolanaWallet123");

/*
KEY CONCEPTS:
- Ethereum: each token = unique smart contract (ERC-20), you write the code
- Solana: Token Program is shared by ALL tokens, just send createMint instruction
- Mint Account = Solana's "token definition" (like a contract address but simpler)
- ATA = each user's wallet for a specific token (separate from SOL balance)
- Solana is faster + cheaper for token creation but less customizable
- Ethereum gives full control but requires Solidity knowledge
*/
