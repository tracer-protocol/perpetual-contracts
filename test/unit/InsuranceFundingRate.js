const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const zeroAddress = "0x0000000000000000000000000000000000000000"
const FUNDING_RATE_FACTOR = ethers.utils.parseEther("0.00000570775")

const getCollaterals = async (insurance) => [
    (await insurance.bufferCollateralAmount()).toString(),
    (await insurance.publicCollateralAmount()).toString(),
]

const putCollateral = async (
    tracer,
    testToken,
    insurance,
    bufferValue,
    publicValue
) => {
    tracer.smocked.getBalance.will.return.with({
        position: { quote: ethers.utils.parseEther(bufferValue), base: 0 }, // quote, base
        totalLeveragedValue: 0, // total leverage
        lastUpdatedIndex: 0, // last updated index
        lastUpdatedGasPrice: 0, // last updated gas price
    })

    await insurance.updatePoolAmount()

    // Set getBalance to return 0 so that updatePoolAmount doesn't add more
    // to buffer (what was in the balance already added)
    tracer.smocked.getBalance.will.return.with({
        position: { quote: 0, base: 0 }, // quote, base
        totalLeveragedValue: 0, // total leverage
        lastUpdatedIndex: 0, // last updated index
        lastUpdatedGasPrice: 0, // last updated gas price
    })

    await testToken.approve(
        insurance.address,
        ethers.utils.parseEther(publicValue)
    )

    await insurance.deposit(ethers.utils.parseEther(publicValue))

    return await getCollaterals(insurance)
}

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()
    _deployer = deployer
    // deploy a test token
    const TestToken = await ethers.getContractFactory("TestToken")
    let testToken = await TestToken.deploy(
        ethers.utils.parseEther("100000000"),
        "Test Token",
        "TST",
        18
    )
    await testToken.deployed()

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
        "TracerPerpetualSwaps"
    )

    let maxLeverage = ethers.utils.parseEther("12.5")
    let deleveragingCliff = ethers.utils.parseEther("20") // 20 percent
    let lowestMaxLeverage = ethers.utils.parseEther("12.5") // Default -> Doesn't go down
    let insurancePoolSwitchStage = ethers.utils.parseEther("1") // Switches mode at 1%
    let liquidationGasCost = 63516

    const tracer = await tracerContractFactory.deploy(
        ethers.utils.formatBytes32String("TEST/USD"),
        testToken.address,
        deployer, // Dummy address so it is not address(0)
        maxLeverage,
        1,
        1,
        deployer, // Dummy address so it is not address(0)
        deleveragingCliff,
        lowestMaxLeverage,
        insurancePoolSwitchStage,
        liquidationGasCost
    )

    let mockTracer = await smockit(tracer)

    // mock tracer calls that are needed
    // get balance for this account to return 0
    // NOTE: If any test changes mocks, due to Hardhat fixture optimisations,
    // the mock defaults set here WILL NOT be returned. You need to manually
    // change the mock state back to its expected value at the end of the test.
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

    // quote token decimals
    mockTracer.smocked.quoteTokenDecimals.will.return.with(18)

    // deposit and withdraw to return nothing
    mockTracer.smocked.deposit.will.return()
    mockTracer.smocked.withdraw.will.return()

    // deploy insurance using mock tracer
    const Insurance = await ethers.getContractFactory("Insurance")
    let insurance = await Insurance.deploy(mockTracer.address)
    await insurance.deployed()
    return {
        testToken,
        mockTracer,
        insurance,
    }
})

describe("Unit tests: Insurance.sol", function () {
    let accounts
    let testToken
    let mockTracer
    let insurance

    beforeEach(async function () {
        const _setup = await setup()
        testToken = _setup.testToken
        mockTracer = _setup.mockTracer
        insurance = _setup.insurance
        accounts = await ethers.getSigners()
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

        context("when the pool is greater than the target", async () => {
            it("returns 0", async () => {
                // set leveraged notional value to 100
                mockTracer.smocked.leveragedNotionalValue.will.return.with(
                    ethers.utils.parseEther("100")
                )

                let bufferCollateralAmount = "100"
                let publicCollateralAmount = "100"

                await putCollateral(
                    mockTracer,
                    testToken,
                    insurance,
                    bufferCollateralAmount,
                    publicCollateralAmount
                )

                let poolFundingRate = await insurance.getPoolFundingRate()
                // poolFundingRate = constant * ratio
                //                 = ((fund_target - fund_holdings)/fund_holdings) ** 2
                let ratio = ethers.utils.parseEther("0")
                let expectedFundingRate = FUNDING_RATE_FACTOR.mul(ratio)
                    .mul(ratio)
                    .div(ethers.utils.parseEther("1")) //divide by 1 to simulate WAD math division
                expect(poolFundingRate).to.equal(expectedFundingRate)
            })
        })

        context(
            "when the leveraged notional value is > 0 and the pool is empty",
            async () => {
                it("returns the appropriate one hour funding rate", async () => {
                    // set leveraged notional value to 400
                    mockTracer.smocked.leveragedNotionalValue.will.return.with(
                        ethers.utils.parseEther("400")
                    )

                    let bufferCollateralAmount = "0"
                    let publicCollateralAmount = "0"

                    await putCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmount,
                        publicCollateralAmount
                    )

                    let poolFundingRate = await insurance.getPoolFundingRate()
                    // poolFundingRate = constant * (ratio ** 2)
                    //                 = constant * (((fund_target - fund_holdings)/fund_target) ** 2)
                    //                 = constant * (((4 - 0)/4) ** 2)
                    //                 = constant * 1
                    let ratio = ethers.utils.parseEther("1")
                    let expectedFundingRate = FUNDING_RATE_FACTOR.mul(
                        ratio
                    ).div(ethers.utils.parseEther("1")) // should be 0.000570775%
                    expect(expectedFundingRate).to.equal(
                        ethers.utils.parseEther("0.00000570775")
                    )

                    expect(poolFundingRate).to.equal(expectedFundingRate)
                })
            }
        )

        context(
            "when the leveraged notional value is > 0 and the pool is not empty",
            async () => {
                it("returns the appropriate one hour funding rate", async () => {
                    // set leveraged notional value to 400
                    mockTracer.smocked.leveragedNotionalValue.will.return.with(
                        ethers.utils.parseEther("400")
                    )

                    let bufferCollateralAmount = "1"
                    let publicCollateralAmount = "1"

                    await putCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmount,
                        publicCollateralAmount
                    )

                    let poolFundingRate = await insurance.getPoolFundingRate()
                    // poolFundingRate = constant * (ratio ** 2)
                    //                 = constant * (((fund_target - fund_holdings)/fund_target) ** 2)
                    //                 = constant * (((4 - 2)/4) ** 2)
                    //                 = constant * (0.5 ** 2) = constant * 0.25
                    let ratio = ethers.utils.parseEther("0.25")
                    let expectedFundingRate = FUNDING_RATE_FACTOR.mul(
                        ratio
                    ).div(ethers.utils.parseEther("1")) // should be 0.000142694063926941%
                    expect(expectedFundingRate).to.equal(
                        ethers.utils.parseEther("0.0000014269375") // Approximate due to imprecision
                    )

                    expect(poolFundingRate).to.equal(expectedFundingRate)
                })
            }
        )
    })
})
