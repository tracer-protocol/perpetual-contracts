const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
import { smockit } from '@eth-optimism/smock'
const zeroAddress = "0x0000000000000000000000000000000000000000"

describe("Unit tests: Insurance.sol", function () {
    before(async function () {
        // deploy mock tracer
        const tracerContractFactory = await ethers.getContractFactory('TracerPerpetualSwap')
        const tracer = await tracerContractFactory.deploy(
            ["TEST/USD", zeroAddress, 18, zeroAddress, 1, 1, 1, zeroAddress]
        )

        // mock tracer calls that are needed

        // deploy insurance using mock tracer
    })

    describe("constructor", async () => {
        context("when sucessfully deployed", async () => {
            it("deploys a new pool token", async () => {})
            it("uses the same collateral as the quote of the market", async () => {})
            it("emits a pool created event", async () => {})
        })
    })

    describe("stake", async () => {
        context("when the user does not have enough tokens", async () => {
            it("reverts", async () => {})
        })

        context("when the user has enough tokens", async () => {
            it("mints them pool tokens", async () => {})

            it("increases the collateral holding of the insurance fund", async () => {})

            it("pulls in collateral from the tracer market", async () => {})

            it("emits an insurance deposit event", async () => {})
        })
    })

    describe("withdraw", async () => {
        context("when the user does not have enough pool tokens", async () => {
            it("reverts", async () => {})
        })

        context("when the user has enough pool tokens", async () => {
            it("burns pool tokens", async () => {})

            it("decreases the collateral holdings of the insurance fund", async () => {})

            it("pulls in collateral from the tracer market", async () => {})

            it("emits an insurance withdraw event", async () => {})
        })
    })

    describe("updatePoolAmount", async () => {
        context("when there are funds to pull", async () => {
            it("pulls funds and updates the collateral holding of the pool", async () => {})
        })

        context("when there are no funds to pull", async () => {
            it("does nothing", async () => {})
        })
    })

    describe("drainPool", async () => {
        context("when called by insurance", async () => {
            it("does nothing if there is less than 1 unit of collateral", async () => {})

            it("caps the amount to drain to the pools collateral holding", async () => {})

            it("ensures 1 unit of collateral is left in the pool", async () => {})

            it("deposits into the market", async () => {})

            it("correctly updates the pools collateral holding", async () => {})
        })

        context("when called by someone other than insurance", async () => {
            it("reverts", async () => {})
        })
    })

    describe("getPoolBalance", async () => {
        context("when called", async () => {
            it("returns the balance of a user in terms of the pool token", async () => {})
        })
    })

    describe("getPoolTarget", async () => {
        context("when called", async () => {
            it("returns 1% of the markets leveraged notional value", async () => {})
        })
    })

    describe("getPoolFundingRate", async () => {
        context("when the leveraged notional value is <= 0", async () => {
            it("returns 0", async () => {})
        })

        context("when the leveraged notional value is > 0", async () => {
            it("returns the appropriate 8 hour funding rate")
        })
    })
})
