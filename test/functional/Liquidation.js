const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Liquidation functional tests", async () => {
    context("liquidate", async () => {
        it("Reverts when liquidation would put liquidator below minimum margin", async () => {
        })

        it("Reverts when agent isn't below margin", async () => {
        })

        it("Reverts when gas price is above fast gas price", async () => {
        })

        it("Reverts on negative liquidation amount", async () => {
        })

        it("Reverts on amount > agent base amount", async () => {
        })

        it("Updates accounts and escrow correctly on full liquidation", async () => {
        })

        it("Updates accounts and escrow correctly on partial liquidation", async () => {
        })
    })

    context("claimReceipt", async () => {
        it("", async () => {
        })

        it("", async () => {
        })

        it("", async () => {
        })

        it("", async () => {
        })

        it("", async () => {
        })

        it("", async () => {
        })

        it("", async () => {
        })

    })

})
