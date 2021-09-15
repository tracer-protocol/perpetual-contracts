const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const zeroAddress = "0x0000000000000000000000000000000000000000"

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

const putAndTakeCollateral = async (
    tracer,
    testToken,
    insurance,
    bufferValue,
    publicValue,
    amountToDrain
) => {
    await putCollateral(tracer, testToken, insurance, bufferValue, publicValue)

    await insurance.drainPool(ethers.utils.parseEther(amountToDrain))

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

    describe("updatePoolAmount", async () => {
        context("when there is only buffer funds", async () => {
            it("pulls funds and updates the collateral holding of the pool", async () => {
                let bufferValue = "1"
                let publicValue = "0"

                await putCollateral(
                    mockTracer,
                    testToken,
                    insurance,
                    bufferValue,
                    publicValue
                )

                mockTracer.smocked.getBalance.will.return.with({
                    position: { quote: ethers.utils.parseEther("1"), base: 0 }, // quote, base
                    totalLeveragedValue: 0, // total leverage
                    lastUpdatedIndex: 0, // last updated index
                    lastUpdatedGasPrice: 0, // last updated gas price
                })

                await insurance.updatePoolAmount()

                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await getCollaterals(insurance)

                // Pays only to buffer
                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("2")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
            })
        })

        context("when there is both public and buffer funds", async () => {
            it("pulls funds and updates the collateral holding of the pool", async () => {
                let bufferValue = "1"
                let publicValue = "1"

                await putCollateral(
                    mockTracer,
                    testToken,
                    insurance,
                    bufferValue,
                    publicValue
                )

                mockTracer.smocked.getBalance.will.return.with({
                    position: { quote: ethers.utils.parseEther("1"), base: 0 }, // quote, base
                    totalLeveragedValue: 0, // total leverage
                    lastUpdatedIndex: 0, // last updated index
                    lastUpdatedGasPrice: 0, // last updated gas price
                })

                await insurance.updatePoolAmount()

                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await getCollaterals(insurance)

                // Pays evenly to both the public and the buffer account (50/50 split in terms of collateral)
                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("1.5")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("1.5")
                )
            })
        })

        context("when there are no funds to pull", async () => {
            it("does nothing", async () => {
                mockTracer.smocked.getBalance.will.return.with({
                    position: { quote: ethers.utils.parseEther("1"), base: 0 }, // quote, base
                    totalLeveragedValue: 0, // total leverage
                    lastUpdatedIndex: 0, // last updated index
                    lastUpdatedGasPrice: 0, // last updated gas price
                })

                // ensure tracer.withdraw was called
                expect(mockTracer.smocked.withdraw.calls.length).to.equal(0)

                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await getCollaterals(insurance)

                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
            })
        })
    })

    describe("drainPool", async () => {
        context("when called by insurance", async () => {
            beforeEach(async () => {
                // mock ourselvse as the liquidation contract
                mockTracer.smocked.liquidationContract.will.return.with(
                    accounts[0].address
                )
            })

            after(async () => {
                // return mock to its previous state
                mockTracer.smocked.liquidationContract.will.return.with(
                    zeroAddress
                )
            })

            it("drains all but one token in public when there's more than one", async () => {
                let bufferCollateralAmountPre = "1",
                    publicCollateralAmountPre = "1.05",
                    amountToDrain = "3"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("1")
                )
            })

            it("drains all but however much is left in public when less than one", async () => {
                let bufferCollateralAmountPre = "1",
                    publicCollateralAmountPre = "0.95",
                    amountToDrain = "3"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther(publicCollateralAmountPre)
                )
            })

            it("drains all but however much is left in public when less than one", async () => {
                let bufferCollateralAmountPre = "1",
                    publicCollateralAmountPre = "0.95",
                    amountToDrain = "3"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther(publicCollateralAmountPre)
                )
            })

            it("drains all of the buffer, and some public while leaving < one token", async () => {
                let bufferCollateralAmountPre = "1",
                    publicCollateralAmountPre = "0.7",
                    amountToDrain = "1.5"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther(publicCollateralAmountPre)
                )
            })

            it("drains all of the buffer, and some public while leaving one token", async () => {
                let bufferCollateralAmountPre = "1",
                    publicCollateralAmountPre = "1.2",
                    amountToDrain = "1.5"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("1")
                )
            })

            it("drains all of the buffer, and however much it needs from public", async () => {
                let bufferCollateralAmountPre = "1",
                    publicCollateralAmountPre = "1.2",
                    amountToDrain = "1.1"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("1.1")
                )
            })

            it("drains part of buffer", async () => {
                let bufferCollateralAmountPre = "1.5",
                    publicCollateralAmountPre = "0.5",
                    amountToDrain = "1"
                let bufferCollateralAmountPost, publicCollateralAmountPost
                ;[bufferCollateralAmountPost, publicCollateralAmountPost] =
                    await putAndTakeCollateral(
                        mockTracer,
                        testToken,
                        insurance,
                        bufferCollateralAmountPre,
                        publicCollateralAmountPre,
                        amountToDrain
                    )

                expect(bufferCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("0.5")
                )
                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther(publicCollateralAmountPre)
                )
            })

            it("deposits into the market", async () => {
                // set collateral holdings to 5
                await testToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("5")
                )
                await insurance.deposit(ethers.utils.parseEther("5"))

                // try withdraw 10 from the pool
                await insurance.drainPool(ethers.utils.parseEther("1"))
                expect(mockTracer.smocked.deposit.calls.length).to.equal(1)
            })

            it("correctly updates the pool's collateral holding", async () => {
                await testToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("5")
                )
                await insurance.deposit(ethers.utils.parseEther("5"))

                // withdraw from pool
                await insurance.drainPool(ethers.utils.parseEther("2"))
                let publicCollateralAmountPost =
                    await insurance.publicCollateralAmount()

                expect(publicCollateralAmountPost).to.equal(
                    ethers.utils.parseEther("3")
                )
            })
        })

        context("when called by someone other than insurance", async () => {
            it("reverts", async () => {
                await expect(
                    insurance.drainPool(ethers.utils.parseEther("1"))
                ).to.be.revertedWith("INS: sender not LIQ contract")
            })
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
})
