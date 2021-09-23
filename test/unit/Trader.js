const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { signOrders } = require("@tracer-protocol/tracer-utils")

describe("Unit tests: Trader.sol", function () {
    before(async function () {})

    describe("executeTrader", async () => {
        context("When the makers array is empty", async () => {
            it("reverts", async () => {})
        })
        context("When the takers array is empty", async () => {
            it("reverts", async () => {})
        })
        context("When the maker and taker array lengths differ", async () => {
            it("reverts", async () => {})
        })
        context("When a single order signature is incorrect", async () => {
            it("skips that order pairing", async () => {})
        })
        context("When an order already exists", async () => {
            it("does not create a new order", async () => {})

            it("processes the order as is", async () => {})
        })
        context("When the maker order has been completely filled", async () => {
            it("prevents further submission of the order", async () => {})
        })

        context("When the taker order has been completely filled", async () => {
            it("prevents further submission of the order", async () => {})
        })

        context("When two valid orders are submitted", async () => {
            it("updates the order states", async () => {})

            it("fills on the minimum amount of fillable space between the two orders", async () => {})
        })
    })

    describe("verifySignature", async () => {
        context(
            "When called with a valid signedOrder and signature data",
            async () => {
                it("returns true", async () => {})
            }
        )

        context("When called with the zero address", async () => {
            it("returns false", async () => {})
        })
    })
})
