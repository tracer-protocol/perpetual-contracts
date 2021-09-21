const { expect } = require("chai")
const { ethers } = require("hardhat")
const {
    getGasEthOracle,
    getTracer,
    getPricing,
    getMockPricing,
    getPriceOracle,
    getQuoteToken,
    getTrader,
} = require("../util/DeploymentUtil.js")
const {
    createOrder,
    matchOrders,
    executeTrade,
    depositQuoteTokens,
    setGasPrice,
} = require("../util/OrderUtil.js")

const defaultMarkPrice = 2 * 10 ** 8 // 2 USD/ETH
const defaultGasPrice = 0.00000002 // 20 Gwei

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _tracer = await getTracer()

    return {
        trader: await getTrader(),
        tracer: _tracer,
        pricing: await getPricing(_tracer),
        quoteToken: await getQuoteToken(_tracer),
        oracle: await getPriceOracle(),
        gasEthOracle: await getGasEthOracle(),
    }
})

const setupTestsWithMockPricing = deployments.createFixture(async () => {
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

describe("Unit tests: TracerPerpetualSwaps.sol matchOrders", function () {
    let accounts, long, short
    let tracer, trader, pricing, quoteToken, oracle, gasEthOracle
    let initialQuoteBalance, orderPrice, orderAmount
    let tx

    context("when two new users match orders", async () => {
        beforeEach(async () => {
            ;({ tracer, trader, pricing, quoteToken, oracle, gasEthOracle } =
                await setupTests())
            accounts = await ethers.getSigners()
            long = accounts[1]
            short = accounts[2]

            // initial balances
            // long: quote: 10, base: 0
            // short: quote: 10, base: 0
            await oracle.setPrice(defaultMarkPrice)
            await gasEthOracle.setPrice(defaultMarkPrice)
            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            // match orders with 2% fee
            // long: price: 2, amount: 10
            // short: price: 2, amount: 10
            await tracer.setFeeRate(ethers.utils.parseEther("0.02"))
            orderPrice = ethers.utils.parseEther("2")
            orderAmount = ethers.utils.parseEther("10")
            await executeTrade(
                tracer,
                trader,
                accounts,
                orderPrice,
                orderAmount
            )
        })

        it("executes the trade", async () => {
            // expected quote change = 10 * 2
            // expected fee = 20 (quote change) * 2% = 0.4
            // expected total quote change = 20.4
            // expected base change of 10
            const expectedLongQuote = ethers.utils.parseEther("-10.4")
            const expectedLongBase = ethers.utils.parseEther("10")
            const expectedShortQuote = ethers.utils.parseEther("29.6")
            const expectedShortBase = ethers.utils.parseEther("-10")

            const longBalance = await tracer.balances(long.address)
            const shortUser = await tracer.balances(short.address)

            expect(longBalance.position.quote).to.equal(expectedLongQuote)
            expect(longBalance.position.base).to.equal(expectedLongBase)
            expect(shortUser.position.quote).to.equal(expectedShortQuote)
            expect(shortUser.position.base).to.equal(expectedShortBase)
        })

        it("updates protocol fees", async () => {
            // fee rate for each user = 0.4
            const expectedProtocolFees = ethers.utils.parseEther("0.8")

            const protocolFees = await tracer.fees()

            expect(protocolFees).to.equal(expectedProtocolFees)
        })

        it("updates the account leverage correctly", async () => {
            // margin = quote + (base * fair price)
            // margin long = -10 + (10 * 2) = 10
            // margin short = 30 + (-10 * 2) = 10
            // long leverage 0: notional value (20) - margin (9.6) = 10.4
            // short leverage 0: notional value (20) - margin (9.6) = 10.4
            const expectedLongLeverage = ethers.utils.parseEther("10.4")
            const expectedShortLeverage = ethers.utils.parseEther("10.4")

            const longBalance = await tracer.balances(long.address)
            const shortBalance = await tracer.balances(short.address)

            expect(longBalance.totalLeveragedValue).to.equal(
                expectedLongLeverage
            )
            expect(shortBalance.totalLeveragedValue).to.equal(
                expectedShortLeverage
            )
        })

        it("records the trade in the pricing contract", async () => {
            // no other trades occurred, avg price will be same as price of trade
            const expectedAvgPrice = orderPrice

            const currentHour = await pricing.currentHour()
            const avgPrice = await pricing.getHourlyAvgTracerPrice(currentHour)
            const avgPrice24Hours = await pricing.get24HourPrices()
            const avgPrice24HoursTracer = avgPrice24Hours[0]

            expect(avgPrice).to.equal(expectedAvgPrice)
            expect(avgPrice24HoursTracer).to.equal(expectedAvgPrice)
        })
    })

    context("when a trader needs to be settled", async () => {
        it("settles the trader if the order matches", async () => {
            ;({ tracer, trader, pricing, quoteToken, gasEthOracle } =
                await setupTestsWithMockPricing())
            accounts = await ethers.getSigners()
            long = accounts[1]
            short = accounts[2]

            // set initial balances
            // long: quote: 10, base: 1
            // short: quote: 10, base: -1
            initialQuoteBalance = ethers.utils.parseEther("11")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            await setGasPrice(gasEthOracle, defaultGasPrice)
            let markPrice = 1
            await pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )
            let tradePrice = ethers.utils.parseEther(markPrice.toString())
            let tradeAmount = ethers.utils.parseEther("1")
            await executeTrade(
                tracer,
                trader,
                accounts,
                tradePrice,
                tradeAmount
            )

            // set new funding rate to 0.2 quote tokens per 1 base held at index 1
            const fundingRate = ethers.utils.parseEther("0.2")
            await pricing.setFundingRate(1, fundingRate, fundingRate)
            await pricing.setLastUpdatedFundingIndex(1)

            // match orders with fee of 2%
            // long: Price: 2, Amount: 10
            // short: Price: 2, Amount: 10
            tradePrice = ethers.utils.parseEther(markPrice.toString())
            tradeAmount = ethers.utils.parseEther("5")
            let tx = await executeTrade(
                tracer,
                trader,
                accounts,
                tradePrice,
                tradeAmount
            )

            const postBalance = await tracer.balances(long.address)

            // expected quote = initial quote - initial trade - funding payment - new trade
            // = 11 - 1 - 0.2 - 5 = 4.8
            expect(postBalance.position.quote).to.equal(
                ethers.utils.parseEther("4.8")
            )
            expect(tx).to.emit(tracer, "MatchedOrders")
            expect(tx).to.emit(tracer, "Settled")
        })

        it("settles the trader if the order fails", async () => {
            ;({ tracer, trader, pricing, quoteToken, gasEthOracle } =
                await setupTestsWithMockPricing())
            accounts = await ethers.getSigners()
            long = accounts[1]
            short = accounts[2]

            // set initial balances
            // long: quote: 10, base: 1
            // short: quote: 10, base: -1
            initialQuoteBalance = ethers.utils.parseEther("11")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            await setGasPrice(gasEthOracle, defaultGasPrice)
            let markPrice = 1
            await pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )
            let tradePrice = ethers.utils.parseEther(markPrice.toString())
            let tradeAmount = ethers.utils.parseEther("1")
            await executeTrade(
                tracer,
                trader,
                accounts,
                tradePrice,
                tradeAmount
            )

            // set new funding rate to 0.2 quote tokens per 1 base held at index 1
            const fundingRate = ethers.utils.parseEther("0.2")
            await pricing.setFundingRate(1, fundingRate, fundingRate)
            await pricing.setLastUpdatedFundingIndex(1)

            // match orders with fee of 2%
            // long: Price: 2, Amount: 1000, insufficient margin
            // short: Price: 2, Amount: 1000
            tradePrice = ethers.utils.parseEther(markPrice.toString())
            tradeAmount = ethers.utils.parseEther("1000")
            let tx = await executeTrade(
                tracer,
                trader,
                accounts,
                tradePrice,
                tradeAmount
            )

            const postBalance = await tracer.balances(long.address)

            // expected quote = initial quote - initial trade - funding payment
            // = 11 - 1 - 0.2 = 9.8
            expect(postBalance.position.quote).to.equal(
                ethers.utils.parseEther("9.8")
            )
            expect(tx).to.emit(tracer, "FailedOrders")
            expect(tx).to.emit(tracer, "Settled")
        })
    })

    context("when the orders are invalid", async () => {
        beforeEach(async () => {
            ;({ tracer, trader, quoteToken, oracle, gasEthOracle } =
                await setupTests())
            accounts = await ethers.getSigners()
            long = accounts[1]
            short = accounts[2]

            await oracle.setPrice(defaultMarkPrice)
            await gasEthOracle.setPrice(defaultMarkPrice)

            // set initial balances
            // long: quote: 10, base: 0
            // short: quote: 10, base: 0
            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            // match orders where prices don't cross
            // long price < short price
            // long: Price: 1, Amount: 1
            // short: Price: 2, Amount: 1
            const longPrice = ethers.utils.parseEther("1")
            const shortPrice = ethers.utils.parseEther("2")
            orderAmount = ethers.utils.parseEther("1")
            const longOrder = createOrder(
                tracer,
                longPrice,
                orderAmount,
                true,
                long.address
            )
            const shortOrder = createOrder(
                tracer,
                shortPrice,
                orderAmount,
                false,
                short.address
            )

            tx = await matchOrders(trader, longOrder, shortOrder)
        })

        it("does not change user positions", async () => {
            const expectedLongQuote = initialQuoteBalance
            const expectedLongBase = 0
            const expectedShortQuote = initialQuoteBalance
            const expectedShortBase = 0

            const longBalance = await tracer.balances(long.address)
            const shortUser = await tracer.balances(short.address)

            expect(longBalance.position.quote).to.equal(expectedLongQuote)
            expect(longBalance.position.base).to.equal(expectedLongBase)
            expect(shortUser.position.quote).to.equal(expectedShortQuote)
            expect(shortUser.position.base).to.equal(expectedShortBase)
        })

        it("emits a FailedOrders event", async () => {
            expect(tx).to.emit(tracer, "FailedOrders")
        })
    })

    context("when users don't have sufficient margin", async () => {
        beforeEach(async () => {
            ;({ tracer, trader, quoteToken, oracle, gasEthOracle } =
                await setupTests())
            accounts = await ethers.getSigners()
            long = accounts[1]
            short = accounts[2]

            await tracer.setFeeRate(ethers.utils.parseEther("0.02"))
            await oracle.setPrice(defaultMarkPrice)
            await gasEthOracle.setPrice(defaultMarkPrice)

            // set initial balances
            // long: quote: 10, base: 0
            // short: quote: 10, base: 0
            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [long, short],
                initialQuoteBalance
            )

            // match orders
            // long: Price: 2, Amount: 100
            // short: Price: 2, Amount: 100
            // minimum margin ~= 8
            // actual long margin = -94
            orderPrice = ethers.utils.parseEther("2")
            orderAmount = ethers.utils.parseEther("100")
            tx = await executeTrade(
                tracer,
                trader,
                accounts,
                orderPrice,
                orderAmount
            )
        })

        it("does not change user positions", async () => {
            const expectedLongQuote = initialQuoteBalance
            const expectedLongBase = 0
            const expectedShortQuote = initialQuoteBalance
            const expectedShortBase = 0

            const longBalance = await tracer.balances(long.address)
            const shortUser = await tracer.balances(short.address)

            expect(longBalance.position.quote).to.equal(expectedLongQuote)
            expect(longBalance.position.base).to.equal(expectedLongBase)
            expect(shortUser.position.quote).to.equal(expectedShortQuote)
            expect(shortUser.position.base).to.equal(expectedShortBase)
        })

        it("emits a FailedOrders event", async () => {
            expect(tx).to.emit(tracer, "FailedOrders")
        })
    })
})
