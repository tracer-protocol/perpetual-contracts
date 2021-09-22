const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")
const {
    executeTrade,
    depositQuoteTokens,
    setGasPrice,
} = require("../util/OrderUtil.js")
const {
    getTracer,
    getMockPricing,
    getPriceOracle,
    getGasEthOracle,
    getQuoteToken,
    getTrader,
} = require("../util/DeploymentUtil.js")

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["MockPricingDeploy"])
    _tracer = await getTracer()

    return {
        trader: await getTrader(),
        tracer: _tracer,
        pricing: await getMockPricing(_tracer),
        quoteToken: await getQuoteToken(_tracer),
        oracle: await getPriceOracle(),
        gasEthOracle: await getGasEthOracle(),
    }
})

describe("Unit tests: TracerPerpetualSwaps.sol settle", function () {
    let long, short

    before(async () => {
        const accounts = await ethers.getSigners()
        long = accounts[1]
        short = accounts[2]
    })

    context("when the account has no open positions", async () => {
        it("updates the last updated index and gas price but does not change the account balance", async () => {
            const { tracer, pricing, quoteToken, gasEthOracle } =
                await setupTests()

            // set gas price when user first deposits to 20 gwei
            await setGasPrice(gasEthOracle, 0.00000002)
            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            // create a new funding rate of 0.25 at index 1
            await pricing.setFundingRate(
                1,
                ethers.utils.parseEther("0.25"),
                ethers.utils.parseEther("0.25")
            )

            // set new gas price to 40 gwei
            await setGasPrice(gasEthOracle, 0.00000004)

            const priorBalance = await tracer.balances(long.address)

            const settleTx = await tracer.settle(long.address)

            const postBalance = await tracer.balances(long.address)

            const latestIndex = await pricing.lastUpdatedFundingIndex()

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
            expect(settleTx).to.not.emit(tracer, "Settled")
        })
    })

    context(
        "when the account has a position and is on the latest global index",
        async () => {
            it("does nothing", async () => {
                const { tracer, trader, quoteToken, oracle, gasEthOracle } =
                    await setupTests()

                // set gas price when user first deposits to 20 gwei
                await setGasPrice(gasEthOracle, 0.00000002)
                await oracle.setPrice(1 * 10 ** 8)

                initialQuoteBalance = ethers.utils.parseEther("10")
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [long, short],
                    initialQuoteBalance
                )

                // give long user a base of 1, this trade also settles the account
                const heldPrice = ethers.utils.parseEther("1")
                const heldAmount = ethers.utils.parseEther("1")
                await executeTrade(
                    tracer,
                    trader,
                    heldPrice,
                    heldAmount,
                    long.address,
                    short.address
                )

                const priorBalance = await tracer.balances(long.address)

                // settle the account again
                const settleTx = await tracer.settle(long.address)

                const postBalance = await tracer.balances(long.address)

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
                expect(settleTx).to.not.emit(tracer, "Settled")
            })
        }
    )

    context("when the account has an unleveraged position", async () => {
        it("it only pays the funding rate", async () => {
            const { tracer, trader, pricing, quoteToken, gasEthOracle } =
                await setupTests()

            initialQuoteBalance = ethers.utils.parseEther("11")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            // set gas price when user first deposits to 20 gwei
            await setGasPrice(gasEthOracle, 0.00000002)
            let markPrice = 1
            await pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )

            // give long user a base of 1 at same price as oracle to avoid impacting funding rate
            const heldPrice = ethers.utils.parseEther(markPrice.toString())
            const heldAmount = ethers.utils.parseEther("1")
            await executeTrade(
                tracer,
                trader,
                heldPrice,
                heldAmount,
                long.address,
                short.address
            )

            // set new gas rate to 40 gwei
            await setGasPrice(gasEthOracle, 0.00000004)
            markPrice = 2
            await pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )

            // set funding rate and insurance rate to 0.2 quote tokens per 1 base held at index 1
            const fundingRate = ethers.utils.parseEther("0.2")
            await pricing.setFundingRate(1, fundingRate, fundingRate)
            await pricing.setInsuranceFundingRate(1, fundingRate, fundingRate)
            await pricing.setLastUpdatedFundingIndex(1)

            const priorBalance = await tracer.balances(long.address)
            // trader starts with 10 quote (initial balance of 12 - trade of 2)
            expect(priorBalance.position.quote).to.equal(
                ethers.utils.parseEther("10")
            )
            await tracer.settle(long.address)
            const postBalance = await tracer.balances(long.address)

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
            const lastIndex = await pricing.lastUpdatedFundingIndex()
            expect(priorBalance.lastUpdatedIndex).to.equal(0)
            expect(postBalance.lastUpdatedIndex).to.equal(lastIndex)

            // check leverage is still 0
            expect(priorBalance.totalLeveragedValue).to.equal(0)
            expect(postBalance.totalLeveragedValue).to.equal(0)
        })
    })

    context("when the account has a leveraged position", async () => {
        it("pays both the funding rate and insurance funding rate", async () => {
            const { tracer, trader, pricing, quoteToken, gasEthOracle } =
                await setupTests()

            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            // set gas price when user first deposits to 20 gwei
            await setGasPrice(gasEthOracle, 0.00000002)
            let markPrice = 1
            await pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )

            // give long user a base of 1 at same price as oracle to avoid impacting funding rate
            const heldPrice = ethers.utils.parseEther(markPrice.toString())
            const heldAmount = ethers.utils.parseEther("20")
            await executeTrade(
                tracer,
                trader,
                heldPrice,
                heldAmount,
                long.address,
                short.address
            )

            // set funding rate and insurance rate to 0.2 quote tokens per 1 base held at index 1
            const fundingRate = ethers.utils.parseEther("0.2")
            await pricing.setFundingRate(1, fundingRate, fundingRate)
            await pricing.setInsuranceFundingRate(1, fundingRate, fundingRate)
            await pricing.setLastUpdatedFundingIndex(1)

            const priorBalance = await tracer.balances(long.address)

            // trader should now have -10 quote after buying 20 base at price of 1
            expect(priorBalance.position.quote).to.equal(
                ethers.utils.parseEther("-10")
            )
            await tracer.settle(long.address)
            const postBalance = await tracer.balances(long.address)

            // funding rate is paid first. Payment = 0.2 * 20 = 4, Balance after = -10 - 4 = -14
            // insurance rate is then paid. Payment = 0.2 * lev value (14) = 2.8
            // quote balance after = -14 - 2.8 = -16.8
            const expectedQuote = ethers.utils.parseEther("-16.8")
            expect(postBalance.position.quote).to.equal(expectedQuote)

            // check last index
            const lastIndex = await pricing.lastUpdatedFundingIndex()
            expect(priorBalance.lastUpdatedIndex).to.equal(0)
            expect(postBalance.lastUpdatedIndex).to.equal(lastIndex)

            // check leverage
            expect(priorBalance.totalLeveragedValue).to.equal(
                ethers.utils.parseEther("10")
            )
            expect(postBalance.totalLeveragedValue).to.equal(
                ethers.utils.parseEther("16.8")
            )
        })
    })

    context(
        "when the account has insufficient margin to pay the funding rate and insurance rate",
        async () => {
            it("updates the account balance", async () => {
                const { tracer, trader, pricing, quoteToken, gasEthOracle } =
                    await setupTests()

                initialQuoteBalance = ethers.utils.parseEther("10")
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [long, short],
                    initialQuoteBalance
                )

                // set gas price when user first deposits to 20 gwei
                await setGasPrice(gasEthOracle, 0.00000002)
                let markPrice = 1
                await pricing.setFairPrice(
                    ethers.utils.parseEther(markPrice.toString())
                )

                // give long user a base of 1 at same price as oracle to avoid impacting funding rate
                const heldPrice = ethers.utils.parseEther(markPrice.toString())
                const heldAmount = ethers.utils.parseEther("50")
                await executeTrade(
                    tracer,
                    trader,
                    heldPrice,
                    heldAmount,
                    long.address,
                    short.address
                )

                // set funding rate and insurance rate to 0.2 quote tokens per 1 base held at index 1
                const fundingRate = ethers.utils.parseEther("0.2")
                await pricing.setFundingRate(1, fundingRate, fundingRate)
                await pricing.setInsuranceFundingRate(
                    1,
                    fundingRate,
                    fundingRate
                )
                await pricing.setLastUpdatedFundingIndex(1)

                const priorBalance = await tracer.balances(long.address)
                // trader starts with -40 quote (initial balance of 10 - 1 * 50)
                expect(priorBalance.position.quote).to.equal(
                    ethers.utils.parseEther("-40")
                )
                await tracer.settle(long.address)
                const postBalance = await tracer.balances(long.address)

                // funding rate is paid first. Payment = 0.2 * 50 = 10, Balance after = -50 (now under min margin)
                // insurance rate is then paid. Payment = 0.2 * lev value (50) = 10
                // quote balance after = -50 - 10 = -60
                const expectedQuote = ethers.utils.parseEther("-60")
                expect(postBalance.position.quote).to.equal(expectedQuote)

                // check last index
                const lastIndex = await pricing.lastUpdatedFundingIndex()
                expect(priorBalance.lastUpdatedIndex).to.equal(0)
                expect(postBalance.lastUpdatedIndex).to.equal(lastIndex)

                // check leverage
                expect(priorBalance.totalLeveragedValue).to.equal(
                    ethers.utils.parseEther("40")
                )
                expect(postBalance.totalLeveragedValue).to.equal(
                    ethers.utils.parseEther("60")
                )
            })
        }
    )
})
