const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const zeroAddress = "0x0000000000000000000000000000000000000000"

describe("Unit tests: LibPerpetuals.sol", function () {
    let accounts
    let libPerpetuals

    before(async function () {
        const { deployer } = await getNamedAccounts()

        libPrices = await deploy("Prices", {
            from: deployer,
            log: true,
        })

        await deploy("libPricesMock", {
            from: deployer,
            log: true,
            libraries: {
                Pricing: libPrices.address,
            },
        })

        let deployment = await deployments.get("LibPricesMock")
        libPrices = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("fairPrice", async () => {
        context("when called with a positive time value", async () => {
            it("returns as expected", async () => {})
        })

        context("when called with a negative time value", async () => {
            it("returns as expected", async () => {})
        })

        context("when called with time value > oracle price", async () => {
            it("returns 0", async () => {})
        })
    })

    describe("timeValue", async () => {
        context(
            "when average oracle price > average tracer price",
            async () => {
                it("returns a negative value", async () => {})
            }
        )

        context(
            "when average tracer price >= average oracle price",
            async () => {
                it("returns a positive value", async () => {})
            }
        )
    })

    describe("averagePrice", async () => {
        context("when trades = 0", async () => {
            it("returns 0", async() => {

            })
        })

        context("when trades != 0", async () => {
            it("returns the average trade price", async() => {

            })
        })
    })

    describe("averagePriceForPeriod", async () => {
        context("when prices length > 24", async () => {
            it("returns the average price for the first 24 periods", async() => {

            })
        })

        context("when prices length < 24", async () => {
            it("returns the average price for the number of periods present", async() => {

            })
        })
    })

    describe("globalLeverage", async () => {
        context("when leverage has increased", async () => {
            it("increases global leverage", async() => {

            })
        })

        context("when leverage has not increased", async () => {
            it("decreases global leverage", async() => {

            })
        })
    })

    describe("calcualteTwap", async () => {

    })
})
