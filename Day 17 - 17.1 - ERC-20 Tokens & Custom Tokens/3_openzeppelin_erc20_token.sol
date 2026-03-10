// Lecture Code - 3_openzeppelin_erc20_token.sol
// Topic: Using OpenZeppelin for production-ready ERC-20 tokens
// Day 17.1 - ERC-20 Tokens & Custom Tokens

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ── OpenZeppelin ERC-20 Token ─────────────────────────────────────────────────
// OpenZeppelin provides battle-tested, audited contract implementations

contract MyToken is ERC20, Ownable {
  constructor(uint256 initialSupply) ERC20("MyToken", "MTK") Ownable(msg.sender) {
    _mint(msg.sender, initialSupply);
  }
  
  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }
  
  function burn(uint256 amount) public {
    _burn(msg.sender, amount);
  }
}

// ── Burnable Token ────────────────────────────────────────────────────────────

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract BurnableToken is ERC20, ERC20Burnable, Ownable {
  constructor() ERC20("BurnableToken", "BURN") Ownable(msg.sender) {
    _mint(msg.sender, 1000000 * 10**decimals());
  }
  
  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }
}

// ── Capped Token ──────────────────────────────────────────────────────────────

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract CappedToken is ERC20, ERC20Capped, Ownable {
  constructor(uint256 cap) 
    ERC20("CappedToken", "CAP") 
    ERC20Capped(cap) 
    Ownable(msg.sender) 
  {
    _mint(msg.sender, cap / 2); // Mint half of cap
  }
  
  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount); // Will revert if exceeds cap
  }
  
  function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Capped) {
    super._update(from, to, value);
  }
}

// ── Pausable Token ────────────────────────────────────────────────────────────

import "@openzeppelin/contracts/utils/Pausable.sol";

contract PausableToken is ERC20, Pausable, Ownable {
  constructor() ERC20("PausableToken", "PAUSE") Ownable(msg.sender) {
    _mint(msg.sender, 1000000 * 10**decimals());
  }
  
  function pause() public onlyOwner {
    _pause();
  }
  
  function unpause() public onlyOwner {
    _unpause();
  }
  
  function _update(address from, address to, uint256 value) internal override whenNotPaused {
    super._update(from, to, value);
  }
}

/*
KEY OPENZEPPELIN BENEFITS:
- AUDITED: Contracts reviewed by security experts
- TESTED: Extensively tested, widely used
- MODULAR: Mix and match features (Burnable, Pausable, etc.)
- UPGRADEABLE: Can create upgradeable tokens
- GAS OPTIMIZED: Efficient implementations

Common OpenZeppelin Imports:
- ERC20.sol - Basic token
- ERC20Burnable.sol - Add burn functionality
- ERC20Capped.sol - Max supply limit
- Ownable.sol - Owner access control
- Pausable.sol - Emergency pause
- AccessControl.sol - Role-based permissions
*/
