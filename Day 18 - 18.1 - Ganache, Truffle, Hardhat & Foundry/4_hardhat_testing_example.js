// Lecture Code - 4_hardhat_testing_example.js
// Topic: Hardhat testing with JavaScript/TypeScript
// Day 18.1 - Ganache, Truffle, Hardhat & Foundry

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Counter Contract", function () {
  let counter;
  let owner, addr1, addr2;
  
  // Deploy contract before each test
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Counter = await ethers.getContractFactory("Counter");
    counter = await Counter.deploy();
    await counter.deployed();
  });
  
  // ── Basic Tests ─────────────────────────────────────────────────────────────
  
  it("should start with count of 0", async function () {
    expect(await counter.count()).to.equal(0);
  });
  
  it("should increment count", async function () {
    await counter.increment();
    expect(await counter.count()).to.equal(1);
  });
  
  it("should decrement count", async function () {
    await counter.increment();
    await counter.decrement();
    expect(await counter.count()).to.equal(0);
  });
  
  // ── Testing Reverts ─────────────────────────────────────────────────────────
  
  it("should revert when decrementing from 0", async function () {
    await expect(counter.decrement())
      .to.be.revertedWith("Count is zero");
  });
  
  // ── Testing Events ──────────────────────────────────────────────────────────
  
  it("should emit CountUpdated event", async function () {
    await expect(counter.increment())
      .to.emit(counter, "CountUpdated")
      .withArgs(1);
  });
  
  it("should emit event with correct parameters", async function () {
    await counter.increment();
    await expect(counter.increment())
      .to.emit(counter, "CountUpdated")
      .withArgs(2);
  });
  
  // ── Multiple Operations ─────────────────────────────────────────────────────
  
  it("should handle multiple increments", async function () {
    await counter.increment();
    await counter.increment();
    await counter.increment();
    expect(await counter.count()).to.equal(3);
  });
  
  // ── Testing with Different Signers ──────────────────────────────────────────
  
  it("should allow any address to increment", async function () {
    await counter.connect(addr1).increment();
    expect(await counter.count()).to.equal(1);
    
    await counter.connect(addr2).increment();
    expect(await counter.count()).to.equal(2);
  });
});

/*
HARDHAT TESTING PATTERNS:

Setup:
  - beforeEach() runs before each test
  - ethers.getSigners() gets test accounts
  - getContractFactory() compiles contract
  - deploy() deploys to test network

Assertions:
  - expect(value).to.equal(expected)
  - expect(value).to.be.gt/lt(number)
  - expect(value).to.be.true/false

Testing Reverts:
  - expect(call).to.be.revertedWith("message")
  - expect(call).to.be.reverted
  - expect(call).to.be.revertedWithCustomError()

Testing Events:
  - expect(call).to.emit(contract, "EventName")
  - expect(call).to.emit().withArgs(arg1, arg2, ...)

Running Tests:
  - npx hardhat test
  - npx hardhat test --grep "pattern"
  - REPORT_GAS=true npx hardhat test
*/
