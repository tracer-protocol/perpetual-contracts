const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const zeroAddress = "0x0000000000000000000000000000000000000000"

describe("Unit tests: Insurance.sol", function () {
    let testToken
    let insurance
    let mockTracer

    before(async function () {
        const { deployer } = await getNamedAccounts()

        // deploy a test token
        await deploy("TestToken", {
            from: deployer,
            log: true,
            args: [ethers.utils.parseEther("100000000")],
        })

        testToken = await deployments.get("TestToken")

        // deploy mock tracer and libs
        let libBalances = await deploy("Balances", {
            from: deployer,
            log: true,
        })

        let libPerpetuals = await deploy("Perpetuals", {
            from: deployer,
            log: true,
        })

        let libPrices = await deploy("Prices", {
            from: deployer,
            log: true,
        })

        // this deploy method is needed for mocking
        const tracerContractFactory = await ethers.getContractFactory(
            "TracerPerpetualSwaps",
            {
                libraries: {
                    Balances: libBalances.address,
                    Perpetuals: libPerpetuals.address,
                    Prices: libPrices.address,
                },
            }
        )
        const tracer = await tracerContractFactory.deploy(
            ethers.utils.formatBytes32String("TEST/USD"),
            testToken.address,
            18,
            zeroAddress,
            1,
            1,
            1,
            zeroAddress
        )

        mockTracer = await smockit(tracer)

        // mock tracer calls that are needed
        // get balance for this account to return 0
        mockTracer.smocked.getBalance.will.return.with({
            position: { quote: 0, base: 0 }, //quote, base
            totalLeveragedValue: 0, //total leverage
            lastUpdatedIndex: 0, //last updated index
            lastUpdatedGasPrice: 0, //last updated gas price
        })

        // token to return the testToken address
        mockTracer.smocked.tracerQuoteToken.will.return.with(testToken.address)

        // leveraged notional value to return 100
        mockTracer.smocked.leveragedNotionalValue.will.return.with(
            ethers.utils.parseEther("100")
        )

        // deposit and withdraw to return nothing
        mockTracer.smocked.deposit.will.return()
        mockTracer.smocked.withdraw.will.return()

        // deploy insurance using mock tracer
        const Insurance = await ethers.getContractFactory("Insurance")
        insurance = await Insurance.deploy(mockTracer.address)
        await insurance.deployed()
    })

    describe("constructor", async () => {
        context("when sucessfully deployed", async () => {
            it("deploys a new pool token", async () => {
                let poolToken = await insurance.token()
                expect(poolToken.toString()).to.not.equal(
                    zeroAddress.toString()
                )
            })
            it("uses the same collateral as the quote of the market", async () => {
                let collateralToken = await insurance.collateralAsset()
                expect(collateralToken.toString()).to.equal(testToken.address)
            })
            it("emits a pool created event", async () => {})
        })
    })

    describe("stake", async () => {
        context("when the user does not have enough tokens", async () => {
            it("reverts", async () => {
                await expect(
                    insurance.stake(ethers.utils.parseEther("1"))
                ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
            })
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
            it("reverts", async () => {
                await expect(
                    insurance.withdraw(ethers.utils.parseEther("1"))
                ).to.be.revertedWith("INS: balance < amount")
            })
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
            it("returns 1% of the markets leveraged notional value", async () => {
                let poolTarget = await insurance.getPoolTarget()
                expect(poolTarget).to.equal(ethers.utils.parseEther("1"))
                // uses leveraged notional value to compute
                let leveragedNotionalCalls =
                    mockTracer.smocked.leveragedNotionalValue.calls.length
                expect(leveragedNotionalCalls).to.equal(1)
            })
        })
    })

    describe("getPoolFundingRate", async () => {
        context("when the leveraged notional value is <= 0", async () => {
            it("returns 0", async () => {
                // set leveraged notional value to 0
                mockTracer.smocked.leveragedNotionalValue.will.return.with(
                    ethers.utils.parseEther("0")
                )

                let poolFundingRate = await insurance.getPoolFundingRate()
                expect(poolFundingRate).to.equal(0)
            })
        })

        context("when the leveraged notional value is > 0", async () => {
            it("returns the appropriate 8 hour funding rate", async () => {
                // set leveraged notional value to 100
                mockTracer.smocked.leveragedNotionalValue.will.return.with(
                    ethers.utils.parseEther("100")
                )

                let poolFundingRate = await insurance.getPoolFundingRate()
                // 0.0036523 * (poolTarget - collateralHolding) / leveragedNotionalValue))
                // poolTarget = 100 / 1 = 1
                // collateral = 0
                // leveragedNotionalValue = 100
                // ratio = (poolTarget - collateral) / levNotionalValue = 0.01
                let ratio = ethers.utils.parseEther("0.01")
                let expectedFundingRate = ethers.utils
                    .parseEther("0.0036523")
                    .mul(ratio)
                    .div(ethers.utils.parseEther("1")) //divide by 1 to simulate WAD math division
                expect(poolFundingRate).to.equal(expectedFundingRate)
            })
        })
    })
})
