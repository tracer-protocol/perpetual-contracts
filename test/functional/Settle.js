const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { BigNumber } = require("ethers")
const { deployTracer } = require("../utils/DeploymentUtil.js")
const {
    customOrder,
    matchOrders,
    executeTrade,
} = require("../utils/OrderUtil.js")
const tracerAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/test/PricingMock.sol/PricingMock.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const tokenAbi = require("../../abi/contracts/TestToken.sol/TestToken.json")
const oracleAbi = require("../../abi/contracts/oracle/ChainlinkOracle.sol/ChainlinkOracle.json")

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

const setup = deployments.createFixture(async () => {
    const { _deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["MockPricingDeploy"])
    let factoryInstance = await deployments.get("TracerPerpetualsFactory")
    let _factory = await ethers.getContractAt(
        factoryInstance.abi,
        factoryInstance.address
    )
    let tracerAddress = await _factory.tracersByIndex(0)
    let _tracer = await ethers.getContractAt(tracerAbi, tracerAddress)

    const Insurance = await _tracer.insuranceContract()
    let _insurance = await ethers.getContractAt(insuranceAbi, Insurance)

    const Pricing = await _tracer.pricingContract()
    let _pricing = await ethers.getContractAt(pricingAbi, Pricing)

    const Liquidation = await _tracer.liquidationContract()
    let _liquidation = await ethers.getContractAt(liquidationAbi, Liquidation)

    const QuoteToken = await _tracer.tracerQuoteToken()
    let _quoteToken = await ethers.getContractAt(tokenAbi, QuoteToken)

    const traderDeployment = await deployments.get("Trader")
    let _trader = await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )

    const Oracle = await deployments.get("EthOracle")
    let _oracle = await ethers.getContractAt(oracleAbi, Oracle.address)

    return {
        deployer: _deployer,
        tracer: _tracer,
        insurance: _insurance,
        pricing: _pricing,
        liquidation: _liquidation,
        quoteToken: _quoteToken,
        factory: _factory,
        trader: _trader,
        oracle: _oracle,
    }
})

const depositQuoteTokens = async (contracts, accounts, amount) => {
    // transfer tokens to accounts 1 to 4
    await contracts.quoteToken.transfer(accounts[4].address, amount)
    // deposit tokens for accounts 1 to 4
    for (var i = 0; i < 4; i++) {
        await contracts.quoteToken
            .connect(accounts[i + 1])
            .approve(contracts.tracer.address, amount)
        await contracts.tracer.connect(accounts[i + 1]).deposit(amount)
    }
}

// sets the fast gas / USD price oracles
// takes in the desired fgas / USD price in decimal format
const setGasPrice = async (contracts, gasPrice) => {
    // fgas / USD = fgas / ETH * ETH/USD
    // mock fgas / ETH node always returns 20 GWEI
    // ETH/USD = fgas/USD / 20 GWEI
    const ethOraclePrice = gasPrice / 0.00000002

    // set price of ETH/USD oracle
    await contracts.oracle.setPrice(ethOraclePrice * 10 ** 8)
}

describe("functional tests: settle", function () {
    context("when the account has no open positions", async () => {
        it("updates the last updated index and gas price but does not change the account balance", async () => {
            contracts = await setup()

            accounts = await ethers.getSigners()

            // set gas price when user first deposits to 20 gwei
            await setGasPrice(contracts, 0.00000002)

            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // create a new funding rate of 0.25 at index 1
            await contracts.pricing.setFundingRate(
                1,
                ethers.utils.parseEther("0.25"),
                ethers.utils.parseEther("0.25")
            )

            // set new gas price to 40 gwei
            await setGasPrice(contracts, 0.00000004)

            const priorBalance = await contracts.tracer.balances(
                accounts[1].address
            )

            const settleTx = await contracts.tracer.settle(accounts[1].address)

            const postBalance = await contracts.tracer.balances(
                accounts[1].address
            )

            const latestIndex =
                await contracts.pricing.lastUpdatedFundingIndex()

            // check that account index has been updated
            expect(priorBalance.lastUpdatedIndex).to.equal(0)
            expect(latestIndex).to.equal(1)
            expect(postBalance.lastUpdatedIndex).to.equal(latestIndex)

            // check that gas price has been updated
            expect(priorBalance.lastUpdatedGasPrice).to.equal(
                ethers.utils.parseEther("0.00000002")
            )
            expect(postBalance.lastUpdatedGasPrice).to.equal(
                ethers.utils.parseEther("0.00000004")
            )

            // all other account variables stay the same
            expect(postBalance.position.quote).to.equal(
                priorBalance.position.quote
            )
            expect(postBalance.position.base).to.equal(
                priorBalance.position.base
            )
            expect(postBalance.totalLeveragedValue).to.equal(
                priorBalance.totalLeveragedValue
            )
            expect(settleTx).to.not.emit(contracts.tracer, "Settled")
        })
    })

    context(
        "when the account has a position and is on the latest global index",
        async () => {
            it("does nothing", async () => {
                contracts = await setup()

                accounts = await ethers.getSigners()

                // set gas price when user first deposits to 20 gwei
                await setGasPrice(contracts, 0.00000002)

                initialQuoteBalance = ethers.utils.parseEther("10")
                await depositQuoteTokens(
                    contracts,
                    accounts,
                    initialQuoteBalance
                )

                // give account 1 a base of 1, this trade also settles the account
                const heldPrice = ethers.utils.parseEther("2")
                const heldAmount = ethers.utils.parseEther("1")
                await executeTrade(contracts, accounts, heldPrice, heldAmount)

                const priorBalance = await contracts.tracer.balances(
                    accounts[1].address
                )

                // settle the account again
                const settleTx = await contracts.tracer.settle(
                    accounts[1].address
                )

                const postBalance = await contracts.tracer.balances(
                    accounts[1].address
                )

                // check no changes to position, latest gas price, updated index and total leveraged value
                expect(postBalance.position.quote).to.equal(
                    priorBalance.position.quote
                )
                expect(postBalance.position.base).to.equal(
                    priorBalance.position.base
                )
                expect(postBalance.lastUpdatedGasPrice).to.equal(
                    priorBalance.lastUpdatedGasPrice
                )
                expect(postBalance.lastUpdatedIndex).to.equal(
                    priorBalance.lastUpdatedIndex
                )
                expect(postBalance.totalLeveragedValue).to.equal(
                    priorBalance.totalLeveragedValue
                )
                expect(settleTx).to.not.emit(contracts.tracer, "Settled")
            })
        }
    )

    context("when the account has an unleveraged position", async () => {
        it("it only pays the funding rate and updates other account variables correctly", async () => {
            contracts = await setup()
            accounts = await ethers.getSigners()

            initialQuoteBalance = ethers.utils.parseEther("11")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // set gas price when user first deposits to 20 gwei
            await setGasPrice(contracts, 0.00000002)

            // give account 1 a base of 1 at same price as oracle to avoid impacting funding rate
            const heldPrice = ethers.utils.parseEther("1")
            const heldAmount = ethers.utils.parseEther("1")
            await executeTrade(contracts, accounts, heldPrice, heldAmount)

            // set new gas rate to 40 gwei
            await setGasPrice(contracts, 0.00000004)

            // set funding rate and insurance rate to 0.2 quote tokens per 1 base held at index 1
            const fundingRate = ethers.utils.parseEther("0.2")
            await contracts.pricing.setFundingRate(1, fundingRate, fundingRate)
            await contracts.pricing.setInsuranceFundingRate(
                1,
                fundingRate,
                fundingRate
            )
            await contracts.pricing.setLastUpdatedFundingIndex(1)

            const priorBalance = await contracts.tracer.balances(
                accounts[1].address
            )
            // trader starts with 10 quote (initial balance of 12 - trade of 2)
            expect(priorBalance.position.quote).to.equal(
                ethers.utils.parseEther("10")
            )
            await contracts.tracer.settle(accounts[1].address)
            const postBalance = await contracts.tracer.balances(
                accounts[1].address
            )

            // funding rate payment is 0.2, user has base of 1, payment is 0.2 quote
            // user quote balance = 10 - 0.2 = 9.8
            // insurance funding rate payment of 0.2 is not paid
            const expectedQuote = ethers.utils.parseEther("9.8")
            expect(postBalance.position.quote).to.equal(expectedQuote)

            // check gas price updated
            expect(priorBalance.lastUpdatedGasPrice).to.equal(
                ethers.utils.parseEther("0.00000002")
            )
            expect(postBalance.lastUpdatedGasPrice).to.equal(
                ethers.utils.parseEther("0.00000004")
            )

            // check last index
            const lastIndex = await contracts.pricing.lastUpdatedFundingIndex()
            expect(priorBalance.lastUpdatedIndex).to.equal(0)
            expect(postBalance.lastUpdatedIndex).to.equal(lastIndex)

            // check leverage is still 0
            expect(priorBalance.totalLeveragedValue).to.equal(0)
            expect(postBalance.totalLeveragedValue).to.equal(0)
        })
    })

    context("when the account has a leveraged position", async () => {})

    context(
        "when the account has insufficient margin to pay the funding rate",
        async () => {}
    )

    context(
        "when the account has insufficient margin to pay the insurance rate",
        async () => {}
    )
})
