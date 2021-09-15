const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { smockit } = require("@eth-optimism/smock")

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

    describe("deposit", async () => {
        context("when the user does not have enough tokens", async () => {
            it("reverts", async () => {
                await expect(
                    insurance.deposit(ethers.utils.parseEther("1"))
                ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
            })
        })

        context("when the user has enough tokens", async () => {
            beforeEach(async () => {
                await testToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("1")
                )
                await insurance.deposit(ethers.utils.parseEther("1"))
            })

            it("mints them pool tokens", async () => {
                let poolTokenHolding = await insurance.getPoolUserBalance(
                    accounts[0].address
                )
                expect(poolTokenHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("increases the collateral holding of the insurance fund", async () => {
                let collateralHolding = await insurance.publicCollateralAmount()
                expect(collateralHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("pulls in collateral from the tracer market", async () => {
                let balanceCalls = mockTracer.smocked.getBalance.calls.length
                expect(balanceCalls).to.equal(1)
            })

            it("emits an insurance deposit event", async () => {
                await testToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("1")
                )
                expect(await insurance.deposit(ethers.utils.parseEther("1")))
                    .to.emit(insurance, "InsuranceDeposit")
                    .withArgs(
                        mockTracer.address,
                        accounts[0].address,
                        ethers.utils.parseEther("1")
                    )
            })
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
            beforeEach(async () => {
                // get user tp acquire some pool tokens
                await testToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("2")
                )
                await insurance.deposit(ethers.utils.parseEther("2"))
                // get user to burn some pool tokens
                await insurance.withdraw(ethers.utils.parseEther("1"))
            })

            it("burns pool tokens", async () => {
                let poolTokenHolding = await insurance.getPoolUserBalance(
                    accounts[0].address
                )
                expect(poolTokenHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("decreases the collateral holdings of the insurance fund", async () => {
                let collateralHolding = await insurance.publicCollateralAmount()
                expect(collateralHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("pulls in collateral from the tracer market", async () => {
                let balanceCalls = mockTracer.smocked.getBalance.calls.length
                expect(balanceCalls).to.equal(1)
            })

            it("emits an insurance withdraw event", async () => {})
        })
    })

    describe("getPoolBalance", async () => {
        context("when called", async () => {
            it("returns the balance of a user in terms of the pool token", async () => {
                await testToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("2")
                )
                await insurance.deposit(ethers.utils.parseEther("2"))
                let poolBalance = await insurance.getPoolUserBalance(
                    accounts[0].address
                )
                expect(poolBalance).to.equal(ethers.utils.parseEther("2"))
            })
        })
    })
})
