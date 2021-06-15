const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const zeroAddress = "0x0000000000000000000000000000000000000000"

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    _deployer = deployer
    // deploy a test token
    const priceOracle = await deploy("PriceOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    const oracleAdapter = await deploy("PriceOracleAdapter", {
        from: deployer,
        log: true,
        args: [priceOracle.address],
        contract: "OracleAdapter",
    })

    let libPerpetuals = await deploy("Perpetuals", {
        from: deployer,
        log: true,
    })

    let libPrices = await deploy("Prices", {
        from: deployer,
        log: true,
    })

    // // this deploy method is needed for mocking
    const tracerContractFactory = await ethers.getContractFactory(
        "TracerPerpetualSwaps",
        {
            libraries: {
                Perpetuals: libPerpetuals.address,
                Prices: libPrices.address,
            },
        }
    )
    let deleveragingCliff = ethers.utils.parseEther("20") // 20 percent
    let lowestMaxLeverage = ethers.utils.parseEther("12.5") // Default -> Doesn't go down
    let _insurancePoolSwitchStage = ethers.utils.parseEther("1") // Switches mode at 1%
    const tracer = await tracerContractFactory.deploy(
        ethers.utils.formatBytes32String("TEST/USD"),
        zeroAddress,
        18,
        zeroAddress,
        1,
        1,
        1,
        zeroAddress,
        deleveragingCliff,
        lowestMaxLeverage,
        _insurancePoolSwitchStage
    )

    let mockTracer = await smockit(tracer)

    mockTracer.smocked.fundingRateSensitivity.will.return.with(
        ethers.utils.parseEther("1")
    )

    // deploy insurance using mock tracer
    const Insurance = await ethers.getContractFactory("Insurance")
    let insurance = await Insurance.deploy(mockTracer.address)
    await insurance.deployed()

    const Pricing = await ethers.getContractFactory("Pricing", {
        libraries: {
            Prices: libPrices.address,
        },
    })
    let pricing = await Pricing.deploy(
        accounts[0].address,
        insurance.address,
        oracleAdapter.address
    )
    await pricing.deployed()
    return {
        mockTracer,
        insurance,
        pricing,
    }
})

describe("Unit tests: Insurance.sol", function () {
    let accounts
    let mockTracer
    let insurance
    let pricing

    beforeEach(async function () {
        const _setup = await setup()
        mockTracer = _setup.mockTracer
        insurance = _setup.insurance
        pricing = _setup.pricing
        accounts = await ethers.getSigners()
    })

    describe("recordTrade", async () => {
        context("when not called by the Tracer", async () => {
            it("reverts", async () => {
                await expect(
                    pricing.connect(accounts[1]).recordTrade(
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1")
                    )
                ).to.be.revertedWith("PRC: Only Tracer")
            })
        })

        context("when a new hour has started", async () => {
            it.skip("updates the funding rate", async () => {
                // todo: this needs to call the tracer, but be called by
                // the tracer. How can this be mocked?
                
                // fast forward an hour
                await forwardTime(60 * 60)
                expect(
                    pricing.recordTrade(
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1")
                    )
                ).to.emit(pricing, "FundingRateUpdated")
            })

            it("updates the price", async () => {})
        })

        context("when 24 hours have passed", async () => {
            it("updates the time value", async () => {})
        })

        context("when a new hour has not started", async () => {
            it("updates the price", async () => {
                let currentHour = await pricing.currentHour()
                let priceMetricsBefore = await pricing.getHourlyAvgTracerPrice(
                    currentHour
                )
                // add a new price at $1 more than before
                await pricing.recordTrade(
                    priceMetricsBefore.add(ethers.utils.parseEther("1")),
                    ethers.utils.parseEther("1")
                )

                let priceMetricsAfter = await pricing.getHourlyAvgTracerPrice(
                    currentHour
                )

                expect(priceMetricsAfter.gt(priceMetricsBefore)).to.equal(
                    true
                )
            })
        })
    })
})
