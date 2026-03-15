# 22.1 - Upgradable Contracts — Assignment

> **Notes**: https://petal-estimate-4e9.notion.site/Upgradable-contracts-16f7dfd1073580f39318e64e30c7f431

---

## Core Assignment — Master Upgradeable Contract Patterns

Build and deploy upgradeable contracts using all three major proxy patterns: Transparent, UUPS, and understand Beacon proxies. Test storage layouts, upgrades, and security considerations.

Use **Foundry** for smart contracts and testing.

---

## Task 1 — Build Basic delegateCall Proxy

Create a simple proxy using delegatecall to understand the fundamentals.

```solidity
// TODO: Create contracts/BasicProxy.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract BasicProxy {
    // TODO: Add state variables
    // - num (uint256)
    // - implementation (address)
    
    constructor(address _implementation) {
        // TODO: Initialize implementation
    }
    
    function setNum(uint256 _num) public {
        // TODO: Use delegatecall to forward to implementation
        // Requirements:
        // - Encode function signature and parameter
        // - Call implementation.delegatecall()
        // - Require success
    }
    
    function setImplementation(address _implementation) public {
        // TODO: Allow changing implementation
    }
}

contract ImplementationV1 {
    // TODO: Match storage layout with proxy
    uint256 public num;
    address public implementation;
    
    function setNum(uint256 _num) public {
        // TODO: Set num to _num
    }
}

contract ImplementationV2 {
    uint256 public num;
    address public implementation;
    
    function setNum(uint256 _num) public {
        // TODO: Set num to _num * 2
    }
}
```

**Requirements:**
- Proxy forwards calls via delegatecall
- Storage layout matches between proxy and implementation
- Can upgrade between V1 and V2
- Test that storage persists across upgrades

---

## Task 2 — Test Storage Layout Collisions

Demonstrate and fix storage collision issues when using Ownable.

```solidity
// TODO: Create contracts/StorageCollision.sol

import "@openzeppelin/contracts/access/Ownable.sol";

contract ProxyWithOwnable is Ownable {
    uint256 public num;
    address public implementation;
    
    // TODO: Implement constructor
    // TODO: Implement setNum with delegatecall
    // TODO: Implement setImplementation with onlyOwner
}

// WRONG Implementation (causes collision)
contract WrongImplementation {
    uint256 public num;  // Slot 0 - WRONG!
    
    function setNum(uint256 _num) public {
        num = _num;
    }
}

// CORRECT Implementation (matches layout)
contract CorrectImplementation {
    address private _owner;  // Slot 0 (matches Ownable)
    uint256 public num;      // Slot 1 (matches proxy)
    address public implementation;  // Slot 2 (matches proxy)
    
    function setNum(uint256 _num) public {
        num = _num;
    }
}
```

**Requirements:**
- Deploy proxy with Ownable
- Test with WrongImplementation (observe bug)
- Test with CorrectImplementation (observe fix)
- Document storage slot layout
- Write test cases proving collision/fix

---

## Task 3 — Implement Fallback Proxy

Build a proxy using fallback function to handle all calls.

```solidity
// TODO: Create contracts/FallbackProxy.sol

contract FallbackProxy {
    address public implementation;
    
    constructor(address _implementation) {
        implementation = _implementation;
    }
    
    fallback() external payable {
        // TODO: Implement fallback
        // Requirements:
        // - Get implementation address
        // - Forward call using delegatecall with msg.data
        // - Require success
    }
    
    function setImplementation(address _implementation) public {
        implementation = _implementation;
    }
}

contract ImplementationV1 {
    uint256 public num;
    address public implementation;
    
    function setNum(uint256 _num) public {
        num = _num;
    }
    
    function getNum() public view returns (uint256) {
        return num;
    }
}
```

**Requirements:**
- Fallback forwards ALL calls
- Can call any function on implementation
- Storage persists across calls
- Test with multiple functions

---

## Task 4 — Build ERC-1967 Compliant Proxy

Implement a proxy using ERC-1967 standard storage slots.

```solidity
// TODO: Create contracts/ERC1967Proxy.sol

import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract ERC1967Proxy {
    // ERC-1967 standard slot for implementation
    bytes32 internal constant IMPLEMENTATION_SLOT = 
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
    uint256 public num;
    uint256 public num2;
    
    constructor(address _implementation) {
        // TODO: Store implementation in ERC-1967 slot
    }
    
    fallback() external {
        // TODO: Implement fallback
        // Requirements:
        // - Get implementation from storage slot
        // - delegatecall with msg.data
        // - Revert if failed
    }
    
    function getImplementation() public view returns (address) {
        // TODO: Read from IMPLEMENTATION_SLOT
    }
    
    function setImplementation(address _implementation) public {
        // TODO: Write to IMPLEMENTATION_SLOT
    }
}
```

**Requirements:**
- Use ERC-1967 standard slot
- Avoid storage collision with implementation
- Implement getters and setters for implementation
- Test slot isolation

---

## Task 5 — Deploy Transparent Proxy with OpenZeppelin

Use OpenZeppelin's TransparentUpgradeableProxy pattern.

```solidity
// TODO: Create contracts/TransparentProxy.sol

import {TransparentUpgradeableProxy} from 
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract MyTransparentProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address initialOwner,
        bytes memory _data
    ) payable TransparentUpgradeableProxy(_logic, initialOwner, _data) {}
}

contract TokenV1 {
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    
    function initialize(uint256 _supply) public {
        totalSupply = _supply;
        balances[msg.sender] = _supply;
    }
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}

contract TokenV2 {
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    
    function initialize(uint256 _supply) public {
        totalSupply = _supply;
        balances[msg.sender] = _supply;
    }
    
    function transfer(address to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
    
    // NEW FEATURE
    function burn(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
    }
}
```

**Requirements:**
- Deploy TokenV1
- Deploy TransparentProxy pointing to TokenV1
- Initialize with total supply
- Test transfer function
- Upgrade to TokenV2
- Test new burn function
- Verify storage persisted

---

## Task 6 — Implement UUPS Pattern

Build UUPS proxy with upgrade logic in implementation.

```solidity
// TODO: Create contracts/UUPSProxy.sol

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MyUUPSProxy is ERC1967Proxy {
    constructor(address _logic, bytes memory _data)
        payable
        ERC1967Proxy(_logic, _data)
    {}
}

contract CounterV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public count;
    
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init(msg.sender);
        count = 0;
    }
    
    function increment() public {
        count += 1;
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}

contract CounterV2 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public count;
    
    function initialize() public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init(msg.sender);
    }
    
    function increment() public {
        count += 1;
    }
    
    // NEW FEATURES
    function decrement() public {
        count -= 1;
    }
    
    function reset() public onlyOwner {
        count = 0;
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
```

**Requirements:**
- Deploy CounterV1
- Deploy UUPS Proxy with encoded initialize() call
- Test increment function
- Upgrade to CounterV2 using upgradeTo()
- Test new decrement and reset functions
- Verify only owner can upgrade

---

## Conceptual Questions

1. **What is the main difference between `call` and `delegatecall`? Provide a scenario where each is appropriate.**

2. **Explain storage collision. How does the ERC-1967 standard solve this problem?**

3. **Why do we need initializer functions instead of constructors in upgradeable contracts?**

4. **Compare Transparent Proxy and UUPS patterns. What are the gas cost implications?**

5. **What happens if you forget to include a storage variable from the old implementation in the new one?**

6. **Explain the purpose of the `_authorizeUpgrade` function in UUPS. Why is it critical?**

7. **What is the risk of having the same function selector in both proxy and implementation contracts?**

8. **How does the fallback function enable dynamic function calls without hardcoding them?**

9. **Why must storage layout be identical between proxy and implementation contracts?**

10. **What security considerations should you have when implementing upgradeable contracts?**

---

## Bonus Challenges

### Challenge 1 — Multi-Step Upgrade

Implement a timelock mechanism for upgrades.

**Requirements:**
- Propose upgrade (stores new implementation + timestamp)
- Wait period (24 hours)
- Execute upgrade after timelock
- Cancel upgrade option

---

### Challenge 2 — Upgrade with Data Migration

Create an upgrade that migrates data to new format.

**Requirements:**
- V1: Store user balances in mapping
- V2: Store balances + timestamps in struct
- Migration function that copies old data to new format
- Verify all data migrated correctly

---

### Challenge 3 — Beacon Proxy Pattern

Implement beacon proxy where multiple proxies share one implementation.

**Requirements:**
- Beacon contract storing implementation address
- Multiple beacon proxies pointing to beacon
- Upgrade all proxies by updating beacon
- Test with 3 proxy instances

---

## Testing Guide

### Test Cases

```solidity
// Test 1: Basic delegatecall
function testDelegateCall() public {
    // Deploy proxy and implementation
    // Call setNum via proxy
    // Verify num updated in proxy storage
}

// Test 2: Storage collision
function testStorageCollision() public {
    // Deploy proxy with Ownable
    // Use wrong implementation
    // Verify _owner slot corrupted
    // Use correct implementation
    // Verify proper behavior
}

// Test 3: Upgrade preserves storage
function testUpgradePreservesStorage() public {
    // Set state in V1
    // Upgrade to V2
    // Verify state unchanged
}

// Test 4: New functionality works
function testNewFunctionality() public {
    // Upgrade from V1 to V2
    // Call new V2-only function
    // Verify it works
}

// Test 5: Access control
function testOnlyOwnerCanUpgrade() public {
    // Try upgrade as non-owner
    // Expect revert
    // Upgrade as owner
    // Expect success
}
```

---

## Common Mistakes to Avoid

- ❌ **Mismatched storage layouts**: Always match variable order and types
- ❌ **Using constructors**: Use initializers in upgradeable contracts
- ❌ **Selfdestruct in implementation**: Never use selfdestruct
- ❌ **Not testing upgrades**: Always test upgrade path
- ❌ **Missing access control**: Protect upgrade functions
- ❌ **Initializing twice**: Use `initializer` modifier
- ❌ **Storage gaps**: Add gaps for future variables

---

## Submission Requirements

1. **Smart Contracts**
   - BasicProxy with V1/V2 implementations
   - Storage collision demo (wrong + correct)
   - Fallback proxy
   - ERC-1967 proxy
   - Transparent proxy with TokenV1/V2
   - UUPS proxy with CounterV1/V2

2. **Tests**
   - Full test suite covering all scenarios
   - Upgrade tests
   - Storage persistence tests
   - Access control tests

3. **Documentation**
   - README with deployment instructions
   - Storage layout diagrams
   - Explanation of each pattern
   - Gas cost comparison

---

## References

- **ERC-1967**: https://eips.ethereum.org/EIPS/eip-1967
- **ERC-1822 (UUPS)**: https://eips.ethereum.org/EIPS/eip-1822
- **OpenZeppelin Proxies**: https://docs.openzeppelin.com/contracts/5.x/api/proxy
- **Transparent Proxy Pattern**: https://blog.openzeppelin.com/the-transparent-proxy-pattern
- **Solidity delegatecall**: https://docs.soliditylang.org/en/latest/introduction-to-smart-contracts.html
