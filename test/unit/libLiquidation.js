const { expect } = require("chai");

describe("Unit tests: LibLiquidation.sol", function() {
  it("Should escrow full amount if margin == minMargin", async function() {
    const LibLiquidation = await ethers.getContractFactory("LibLiquidation");
    const libLiquidation = await LibLiquidation.deploy();
    
    await libLiquidation.deployed();

    const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(123, 123)
    expect(escrowAmount.toString()).to.equal("123");
  });
});
