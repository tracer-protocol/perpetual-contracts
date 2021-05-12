const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Liquidation functional tests", async () => {
    context("calcAmountToReturn", async () => {
        it("Reverts when units sold is greater than liquidation amount", async () => {})

        it("When there is slippage", async () => {})

        it("Returns 0 when there is no slippage", async () => {})
    })

    context("calcUnitsSold", async () => {
        it("Does nothing when no orders given", async () => {})

        it("Calculates correctly in normal case", async () => {})

        it("Returns nothing when all invalid orders", async () => {})

        it("Returns correct when some invalid orders", async () => {})
    })

    context("getLiquidationReceipt", async () => {
        it("Returns a valid receipt after submission", async () => {})

        it("Returns nothing on invalid submission", async () => {})
    })

    context("liquidate", async () => {
        it("Reverts when liquidation would put liquidator below minimum margin", async () => {})

        it("Reverts when agent isn't below margin", async () => {})

        it("Reverts when gas price is above fast gas price", async () => {})

        it("Reverts on negative liquidation amount", async () => {})

        it("Reverts on amount > agent base amount", async () => {})

        it("Updates accounts and escrow correctly on full liquidation", async () => {})

        it("Updates accounts and escrow correctly on partial liquidation", async () => {})
    })

    context("claimReceipt", async () => {
        it("Reverts when receipt doesn't exist", async () => {})

        it("Reverts when non-whitelisted trader is given", async () => {})

        it("reverts when claim time has passed", async () => {})

        it("reverts when sender isn't liquidator", async () => {})

        it("reverts on a receipt that's already claimed", async () => {})

        it("Accurately updates accounts when slippage occurs - below escrow amount", async () => {})

        it("Accurately updates accounts when slippage occurs - below escrow amount & empty insurance pool", async () => {})

        it("Accurately updates accounts when slippage occurs - below escrow amount & half-full insurance pool", async () => {})

        it("Accurately updates accounts when slippage occurs - below escrow amount & full insurance pool", async () => {})

        it("Accurately updates accounts when slippage occurs - above maxSlippage (caps at maxSlippage)", async () => {})

        it("Makes no changes (to all 3 accounts) when No slippage", async () => {})

        it("Makes no changes (to all 3 accounts) when units sold is 0", async () => {})
    })

    context("claimEscrow", async () => {
        it("Reverts on caller not liquidatee", async () => {})

        it("Reverts if receipt already claimed through claimEscrow", async () => {})

        it("Reverts if calling too early", async () => {})

        it("Is accurate if receipt partially claimed by liquidator on claimReceipt", async () => {})

        it("Is accurate if receipt fully claimed by liquidator on claimReceipt", async () => {})

        it("Is accurate if receipt not claimed by liquidator on claimReceipt", async () => {})
    })

    context("currentLiquidationId", async () => {
        it("Correctly increments liquidation ID", async () => {})
    })

    context("setMaxSlippage", async () => {
        it("Correctly updates maxSlippage", async () => {})
    })

    context("E2E", async () => {
        it("End-to-end Test", async () => {})
    })
})
