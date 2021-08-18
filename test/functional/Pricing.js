const { expect, assert } = require("chai")
const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const { deploy } = deployments
const { time } = require("@openzeppelin/test-helpers")
const tracerAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const tokenAbi = require("../../abi/contracts/TestToken.sol/TestToken.json")
const oracleAbi = require("../../abi/contracts/oracle/ChainlinkOracle.sol/ChainlinkOracle.json")
const { BN } = require("@openzeppelin/test-helpers/src/setup")

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["FullDeployTest"])
    let Factory = await deployments.get("TracerPerpetualsFactory")
    let factory = await ethers.getContractAt(Factory.abi, Factory.address)
    let tracerAddress = await factory.tracersByIndex(0)
    let tracer = await ethers.getContractAt(tracerAbi, tracerAddress)

    // setup mocks for the contracts and relink
    const Insurance = await tracer.insuranceContract()
    let insurance = await ethers.getContractAt(insuranceAbi, Insurance)

    const Pricing = await tracer.pricingContract()
    let pricing = await ethers.getContractAt(pricingAbi, Pricing)

    const Liquidation = await tracer.liquidationContract()
    let liquidation = await ethers.getContractAt(liquidationAbi, Liquidation)

    const QuoteToken = await tracer.tracerQuoteToken()
    let quoteToken = await ethers.getContractAt(tokenAbi, QuoteToken)

    const traderDeployment = await deployments.get("Trader")
    let traderInstance = await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )

    const Oracle = await deployments.get("PriceOracle")
    let oracle = await ethers.getContractAt(oracleAbi, Oracle.address)

    return {
        tracer,
        insurance,
        pricing,
        liquidation,
        quoteToken,
        deployer,
        factory,
        traderInstance,
        oracle,
    }
})

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

const compareAccountState = (state, expectedState) => {
    expect(state.position.quote).to.equal(expectedState.position.quote)
    expect(state.position.base).to.equal(expectedState.position.base)
    expect(state.totalLeveragedValue).to.equal(
        expectedState.totalLeveragedValue
    )
    expect(state.lastUpdatedIndex).to.equal(expectedState.lastUpdatedIndex)
    expect(state.lastUpdatedGasPrice).to.equal(
        expectedState.lastUpdatedGasPrice
    )
}

describe("Functional tests: Pricing", function () {
    let accounts, deployer
    let insurance,
        pricing,
        liquidation,
        tracer,
        quoteToken,
        traderInstance,
        oracle
    let now
    let order1, order2, order3, order4, order5
    let mockSignedOrder1,
        mockSignedOrder2,
        mockSignedOrder3,
        mockSignedOrder4,
        mockSignedOrder5

    const executeTrade = async (price, amount) => {
        const long = {
            maker: accounts[1].address,
            market: tracer.address,
            price: price,
            amount: amount,
            side: 0, // long,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        // set up basic trades
        const mockSignedLong = [
            long,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]

        const short = {
            maker: accounts[2].address,
            market: tracer.address,
            price: price,
            amount: amount,
            side: 1, // short,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        const mockSignedShort = [
            short,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]

        // place trades
        await traderInstance.executeTrade([mockSignedLong], [mockSignedShort])
        await traderInstance.clearFilled(mockSignedLong)
        await traderInstance.clearFilled(mockSignedShort)
    }

    beforeEach(async () => {
        const _setup = await setup()
        quoteToken = _setup.quoteToken
        tracer = _setup.tracer
        insurance = _setup.insurance
        pricing = _setup.pricing
        liquidation = _setup.liquidation
        deployer = _setup.deployer
        traderInstance = _setup.traderInstance
        oracle = _setup.oracle
        accounts = await ethers.getSigners()
        // transfer tokesn to account 4
        await quoteToken.transfer(
            accounts[4].address,
            ethers.utils.parseEther("1000")
        )
        now = Math.floor(new Date().getTime() / 1000)

        // set up accounts
        for (var i = 0; i < 4; i++) {
            await quoteToken
                .connect(accounts[i + 1])
                .approve(tracer.address, ethers.utils.parseEther("1000"))
            await tracer
                .connect(accounts[i + 1])
                .deposit(ethers.utils.parseEther("1000"))
        }

        order1 = {
            maker: accounts[1].address,
            market: tracer.address,
            price: ethers.utils.parseEther("1"),
            amount: ethers.utils.parseEther("50"),
            side: 0, // long,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        mockSignedOrder1 = [
            order1,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]

        order2 = {
            maker: accounts[2].address,
            market: tracer.address,
            price: ethers.utils.parseEther("0.9"),
            amount: ethers.utils.parseEther("40"),
            side: 1, // short,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        mockSignedOrder2 = [
            order2,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]

        order3 = {
            maker: accounts[3].address,
            market: tracer.address,
            price: ethers.utils.parseEther("0.9"),
            amount: ethers.utils.parseEther("10"),
            side: 1, // short,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        mockSignedOrder3 = [
            order3,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]

        order4 = {
            maker: accounts[1].address,
            market: tracer.address,
            price: ethers.utils.parseEther("1.25"),
            amount: ethers.utils.parseEther("50"),
            side: 0, // long,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        mockSignedOrder4 = [
            order4,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]

        order5 = {
            maker: accounts[2].address,
            market: tracer.address,
            price: ethers.utils.parseEther("1.10"),
            amount: ethers.utils.parseEther("10"),
            side: 1, // short,
            expires: now + 604800, // now + 7 days
            created: now - 100,
        }
        mockSignedOrder5 = [
            order5,
            ethers.utils.formatBytes32String("DummyString"),
            ethers.utils.formatBytes32String("DummyString"),
            0,
        ]
    })

    it("Funding rate is zero when oracle and tracer price are equal", async () => {
        // set underlying price to 10 (oracle takes in 8 decimal answer)
        await oracle.setPrice(10 * 10 ** 8)
        // execute trade to set tracer price to 10
        await executeTrade(
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("2")
        )

        // create a new trade in the next hour to update the funding rate in the last hour
        await forwardTime(2 * 3600 + 100)
        await executeTrade(
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("2")
        )

        // check pricing is in hour 1
        let currentHour = await pricing.currentHour()
        expect(currentHour).to.equal(2)

        // there are no previous trades, therefore TWAPs should both be 10
        let expectedTWAP = ethers.utils.parseEther("10")
        let TWAP = await pricing.getTWAPs(0)
        let underlyingTWAP = TWAP[0]
        let derivativeTWAP = TWAP[1]
        await expect(underlyingTWAP).to.equal(expectedTWAP)
        await expect(derivativeTWAP).to.equal(expectedTWAP)

        let lastIndex = await pricing.lastUpdatedFundingIndex()
        let fundingRate = await pricing.getFundingRate(lastIndex)
        let fundingRateInstance = fundingRate[1]
        let fundingRateCumulative = fundingRate[2]

        // funding rate should be 0 since underlying and oracle price were the same
        expect(fundingRateInstance).to.equal(0)
        expect(fundingRateCumulative).to.equal(0)
    })

    it("Funding rate is positive when tracer price is greater than oracle price", async () => {
        // set underlying price to 10 (oracle takes in 8 decimal answer)
        await oracle.setPrice(10 * 10 ** 8)
        // execute trade to set tracer price to 12
        await executeTrade(
            ethers.utils.parseEther("12"),
            ethers.utils.parseEther("2")
        )

        // create a new trade in the next hour to update the funding rate in the last hour
        await forwardTime(2 * 3600 + 100)
        await executeTrade(
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("2")
        )

        // check pricing is in hour 1
        let currentHour = await pricing.currentHour()
        expect(currentHour).to.equal(2)

        // there are no previous trades, therefore TWAPs should both be 10
        let expectedUnderTWAP = ethers.utils.parseEther("10")
        let expectedDerivTWAP = ethers.utils.parseEther("12")
        let TWAP = await pricing.getTWAPs(0)
        let underlyingTWAP = TWAP[0]
        let derivativeTWAP = TWAP[1]
        await expect(underlyingTWAP).to.equal(expectedUnderTWAP)
        await expect(derivativeTWAP).to.equal(expectedDerivTWAP)

        // funding rate should be (12-10)/8 = 0.25
        let lastIndex = await pricing.lastUpdatedFundingIndex()
        let fundingRate = await pricing.getFundingRate(lastIndex)
        let fundingRateInstance = fundingRate[1]
        let fundingRateCumulative = fundingRate[2]
        let expectedFundingRate = ethers.utils.parseEther("0.25")
        expect(fundingRateInstance).to.equal(expectedFundingRate)
        expect(fundingRateCumulative).to.equal(expectedFundingRate)
    })

    it("Funding rate negative when tracer price is greater than oracle price", async () => {
        // set underlying price to 12 (oracle takes in 8 decimal answer)
        await oracle.setPrice(12 * 10 ** 8)
        // execute trade to set tracer price to 10
        await executeTrade(
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("2")
        )

        // create a new trade in the next hour to update the funding rate in the last hour
        await forwardTime(2 * 3600 + 100)
        await executeTrade(
            ethers.utils.parseEther("10"),
            ethers.utils.parseEther("2")
        )

        // check pricing is in hour 1
        let currentHour = await pricing.currentHour()
        expect(currentHour).to.equal(2)

        // there are no previous trades, therefore TWAPs should both be 10
        let expectedUnderTWAP = ethers.utils.parseEther("12")
        let expectedDerivTWAP = ethers.utils.parseEther("10")
        let TWAP = await pricing.getTWAPs(0)
        let underlyingTWAP = TWAP[0]
        let derivativeTWAP = TWAP[1]
        await expect(underlyingTWAP).to.equal(expectedUnderTWAP)
        await expect(derivativeTWAP).to.equal(expectedDerivTWAP)

        // funding rate should be (10-12)/8 = -0.25
        let lastIndex = await pricing.lastUpdatedFundingIndex()
        let fundingRate = await pricing.getFundingRate(lastIndex)
        let fundingRateInstance = fundingRate[1]
        let fundingRateCumulative = fundingRate[2]
        let expectedFundingRate = ethers.utils.parseEther("-0.25")
        expect(fundingRateInstance).to.equal(expectedFundingRate)
        expect(fundingRateCumulative).to.equal(expectedFundingRate)
    })

    it("Cumulative Funding Rate", async () => {})

    it("Fair Price", async () => {})
})
