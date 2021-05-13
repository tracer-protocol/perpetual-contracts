const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Liquidation functional tests", async () => {
    context("calcAmountToReturn", async () => {
        context("when units sold is greater than liquidation amount", async () => {
            it("Reverts ", async () => {

            })
        })

        context("When there is slippage", async () => {
            it("Calculates accurately", async () => {

            })
        })

        context("When there is no slippage", async () => {
            it("Returns 0 ", async () => {

            })
        })
    })

    context("calcUnitsSold", async () => {
        context("Does nothing when no orders given", async () => {
            it("", async () => {

            })
        })

        context("Calculates correctly in normal case", async () => {
            it("", async () => {

            })
        })

        context("Returns nothing when all invalid orders", async () => {
            it("", async () => {

            })
        })

        context("Returns correct when some invalid orders", async () => {
            it("", async () => {

            })
        })
    })

    context("getLiquidationReceipt", async () => {
        context("Returns a valid receipt after submission", async () => {
            it("", async () => {

            })
        })

        context("Returns nothing on invalid submission", async () => {
            it("", async () => {

            })
        })
    })

    context("liquidate", async () => {
        context("Reverts when liquidation would put liquidator below minimum margin", async () => {
            it("", async () => {

            })
        })

        context("Reverts when agent isn't below margin", async () => {
            it("", async () => {

            })
        })

        context("Reverts when gas price is above fast gas price", async () => {
            it("", async () => {

            })
        })

        context("Reverts on negative liquidation amount", async () => {
            it("", async () => {

            })
        })

        context("Reverts on liquidation amount == 0", async () => {
            it("", async () => {

            })
        })
        context("Reverts on amount > agent base amount", async () => {
            it("", async () => {

            })
        })

        context("Updates accounts and escrow correctly on full liquidation", async () => {
            it("", async () => {

            })
        })

        context("Updates accounts and escrow correctly on partial liquidation", async () => {
            it("", async () => {

            })
        })
    })

    context("claimReceipt", async () => {
        context("Reverts when receipt doesn't exist", async () => {
            it("", async () => {

            })
        })

        context("Reverts when non-whitelisted trader is given", async () => {
            it("", async () => {

            })
        })

        context("reverts when claim time has passed", async () => {
            it("", async () => {

            })
        })

        context("reverts when sender isn't liquidator", async () => {
            it("", async () => {

            })
        })

        context("reverts on a receipt that's already claimed", async () => {
            it("", async () => {

            })
        })

        context("Accurately updates accounts when slippage occurs - below escrow amount", async () => {
            it("", async () => {

            })
        })

        context("Accurately updates accounts when slippage occurs - below escrow amount & empty insurance pool", async () => {
            it("", async () => {

            })
        })

        context("Accurately updates accounts when slippage occurs - below escrow amount & half-full insurance pool", async () => {
            it("", async () => {

            })
        })

        context("Accurately updates accounts when slippage occurs - below escrow amount & full insurance pool", async () => {
            it("", async () => {

            })
        })

        context("Accurately updates accounts when slippage occurs - above maxSlippage (caps at maxSlippage)", async () => {
            it("", async () => {

            })
        })

        context("Makes no changes (to all 3 accounts) when No slippage", async () => {
            it("", async () => {

            })
        })

        context("Makes no changes (to all 3 accounts) when units sold is 0", async () => {
            it("", async () => {

            })
        })
    })

    context("claimEscrow", async () => {
        context("Reverts on caller not liquidatee", async () => {
            it("", async () => {

            })
        })

        context("Reverts if receipt already claimed through claimEscrow", async () => {
            it("", async () => {

            })
        })

        context("Reverts if calling too early", async () => {
            it("", async () => {

            })
        })

        context("Is accurate if receipt partially claimed by liquidator on claimReceipt", async () => {
            it("", async () => {

            })
        })

        context("Is accurate if receipt fully claimed by liquidator on claimReceipt", async () => {
            it("", async () => {

            })
        })

        context("Is accurate if receipt not claimed by liquidator on claimReceipt", async () => {
            it("", async () => {

            })
        })
    })

    context("currentLiquidationId", async () => {
        context("Correctly increments liquidation ID", async () => {
            it("", async () => {

            })
        })
    })

    context("setMaxSlippage", async () => {
        context("Correctly updates maxSlippage", async () => {
            it("", async () => {

            })
        })
    })

    context("E2E", async () => {
        context("End-to-end Test", async () => {
            it("", async () => {

            })
        })
    })
})
