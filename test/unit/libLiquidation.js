const { expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require('hardhat');

describe("Unit tests: LibLiquidation.sol", function() {
  let libLiquidation
  before(async function() {
    await deployments.fixture(["LibLiquidation"])
    const { deployer } = await getNamedAccounts();
    const deployment = await deployments.get("LibLiquidation");
    libLiquidation = await ethers.getContractAt(deployment.abi, deployment.address)
  });

  context("calcEscrowLiquidationAmount", async function() {
    it("Should escrow full amount if margin == minMargin", async function() {
      const margin = 123;
      const minMargin = 123;
      const expectedEscrowAmount = minMargin;

      const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(minMargin, margin)
      expect(escrowAmount.toString()).to.equal("123");
    });

    it("Should escrow less as margin drops below minMargin", async function() {
      const margin = 100;
      const minMargin = 123;
      const expectedEscrowAmount = 77; // 100 - (123 - 100) = 77

      const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(minMargin, margin)
      expect(escrowAmount.toString()).to.equal(expectedEscrowAmount.toString());
    });


    it("Should escrow 0 once escrowAmount goes below 0", async function() {
      const margin = 0;
      const minMargin = 123;
      const expectedEscrowAmount = 0; // min(0, 0 - (123 - 0)) = 0

      const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(minMargin, margin)
      expect(escrowAmount.toString()).to.equal(expectedEscrowAmount.toString());
    });
  })

  context("liquidationBalanceChanges", async function() {
    it("full", async function() {
      const liquidatedBase = "-100"
      const liquidatedQuote = "250"
      const liquidatorQuote = "300"
      const amount = "250"

      /* base goes up or down by 100, quote goes up or down by 250, since this is a complete liquidation */
      const expectedLiquidatorBaseChange = "100"
      const expectedLiquidatorQuoteChange = "250"
      const expectedLiquidateeBaseChange = "-100"
      const expectedLiquidateeQuoteChange = "-250"

      const ret = await libLiquidation.liquidationBalanceChanges(liquidatedBase, liquidatedQuote, liquidatorQuote, amount)
      expect(ret._liquidatorBaseChange.toString()).to.equal(expectedLiquidatorBaseChange)
      expect(ret._liquidatorQuoteChange.toString()).to.equal(expectedLiquidatorQuoteChange)
      expect(ret._liquidateeBaseChange.toString()).to.equal(expectedLiquidateeBaseChange)
      expect(ret._liquidateeQuoteChange.toString()).to.equal(expectedLiquidateeQuoteChange)
    })

    it("zero liquidation", async function() {
      const liquidatedBase = "100"
      const liquidatedQuote = "250"
      const liquidatorQuote = "300"
      const amount = "0"

      /* Nothing changes, since amount = 0 */
      const expectedChange = "0"

      const ret = await libLiquidation.liquidationBalanceChanges(liquidatedBase, liquidatedQuote, liquidatorQuote, amount)
      expect(ret._liquidatorBaseChange.toString()).to.equal(expectedChange)
      expect(ret._liquidatorQuoteChange.toString()).to.equal(expectedChange)
      expect(ret._liquidateeBaseChange.toString()).to.equal(expectedChange)
      expect(ret._liquidateeQuoteChange.toString()).to.equal(expectedChange)
    })

    it("partial liquidation", async function() {
      const liquidatedBase = "-100"
      const liquidatedQuote = "250"
      const liquidatorQuote = "300"
      const amount = "125"

      /* base goes up or down by 50, quote goes up or down by 125, since this is a 50% partial liquidation */
      const expectedLiquidatorBaseChange = "50"
      const expectedLiquidatorQuoteChange = "125"
      const expectedLiquidateeBaseChange = "-50"
      const expectedLiquidateeQuoteChange = "-125"

      const ret = await libLiquidation.liquidationBalanceChanges(liquidatedBase, liquidatedQuote, liquidatorQuote, amount)
      expect(ret._liquidatorBaseChange.toString()).to.equal(expectedLiquidatorBaseChange)
      expect(ret._liquidatorQuoteChange.toString()).to.equal(expectedLiquidatorQuoteChange)
      expect(ret._liquidateeBaseChange.toString()).to.equal(expectedLiquidateeBaseChange)
      expect(ret._liquidateeQuoteChange.toString()).to.equal(expectedLiquidateeQuoteChange)
    })
  })

});
