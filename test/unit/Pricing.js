const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const zeroAddress = "0x0000000000000000000000000000000000000000"

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()
    _deployer = deployer
    // deploy a test token
    const TestToken = await ethers.getContractFactory("Oracle")
    let testToken = await TestToken.deploy(ethers.utils.parseEther("100000000"))

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

    await testToken.deployed()

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
        testToken.address,
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

    mockTracer.smocked.fundingRateSensitivity.will.return.with(ethers.utils.parseEther("1"))

    // deploy insurance using mock tracer
    const Insurance = await ethers.getContractFactory("Insurance")
    let insurance = await Insurance.deploy(mockTracer.address)
    await insurance.deployed()

    const Pricing = await ethers.getContractFactory("Pricing")
    let pricing = await Pricing.deploy(accounts[0].address, insurance.address, oracleAdapter.address)
    await insurance.deployed()
    return {
        testToken,
        mockTracer,
        insurance,
        pricing
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
})
