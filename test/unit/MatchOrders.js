const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { BigNumber } = require("ethers")
const {
    deployTracer,
    deployTracerMockPricing,
} = require("../utils/DeploymentUtil.js")
const {
    customOrder,
    matchOrders,
    executeTrade,
} = require("../utils/OrderUtil.js")

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
    await contracts.gasEthOracle.setPrice(ethOraclePrice * 10 ** 8)
}

describe("Unit tests: matchOrders", function () {
    let contracts, accounts, deployer
    let initialQuoteBalance, orderPrice, orderAmount
    let tx

    context("when two new users match orders", async () => {
        beforeEach(async () => {
            contracts = await deployTracer()
            accounts = await ethers.getSigners()

            // set fee rate to 2%
            await contracts.tracer.setFeeRate(ethers.utils.parseEther("0.02"))
            // set mark price to 2 (oracle takes in 8 decimal answer)
            await contracts.oracle.setPrice(2 * 10 ** 8)
            await contracts.gasEthOracle.setPrice(2 * 10 ** 8)

            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // match order from acc 1 (long) and acc 2 (short)
            orderPrice = ethers.utils.parseEther("2")
            orderAmount = ethers.utils.parseEther("10")
            await executeTrade(contracts, accounts, orderPrice, orderAmount)
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

            const longUser = await contracts.tracer.balances(
                accounts[1].address
            )
            const shortUser = await contracts.tracer.balances(
                accounts[2].address
            )

            expect(longUser.position.quote).to.equal(expectedLongQuote)
            expect(longUser.position.base).to.equal(expectedLongBase)
            expect(shortUser.position.quote).to.equal(expectedShortQuote)
            expect(shortUser.position.base).to.equal(expectedShortBase)
        })

        it("updates protocol fees", async () => {
            // fee rate for each user = 0.4
            const expectedProtocolFees = ethers.utils.parseEther("0.8")

            const protocolFees = await contracts.tracer.fees()

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

            const long = await contracts.tracer.balances(accounts[1].address)
            const short = await contracts.tracer.balances(accounts[2].address)

            expect(long.totalLeveragedValue).to.equal(expectedLongLeverage)
            expect(short.totalLeveragedValue).to.equal(expectedShortLeverage)
        })

        it("records the trade in the pricing contract", async () => {
            // no other trades occurred, avg price will be same as price of trade
            const expectedAvgPrice = orderPrice

            const currentHour = await contracts.pricing.currentHour()
            const avgPrice = await contracts.pricing.getHourlyAvgTracerPrice(
                currentHour
            )
            const avgPrice24Hours = await contracts.pricing.get24HourPrices()
            const avgPrice24HoursTracer = avgPrice24Hours[0]

            expect(avgPrice).to.equal(expectedAvgPrice)
            expect(avgPrice24HoursTracer).to.equal(expectedAvgPrice)
        })
    })

    context("when a trader needs to be settled", async () => {
        it("settles the trader if the order matches", async () => {
            contracts = await deployTracerMockPricing()
            accounts = await ethers.getSigners()

            initialQuoteBalance = ethers.utils.parseEther("11")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // give account 1 a base of 1, quote is now 10
            await setGasPrice(contracts, 0.00000002)
            let markPrice = 1
            await contracts.pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )
            let tradePrice = ethers.utils.parseEther(markPrice.toString())
            let tradeAmount = ethers.utils.parseEther("1")
            await executeTrade(contracts, accounts, tradePrice, tradeAmount)

            // set new funding rate to 0.2 quote tokens per 1 base held at index 1, no insurance rate
            const fundingRate = ethers.utils.parseEther("0.2")
            await contracts.pricing.setFundingRate(1, fundingRate, fundingRate)
            await contracts.pricing.setLastUpdatedFundingIndex(1)

            tradePrice = ethers.utils.parseEther(markPrice.toString())
            tradeAmount = ethers.utils.parseEther("5")
            let tx = await executeTrade(
                contracts,
                accounts,
                tradePrice,
                tradeAmount
            )

            const postBalance = await contracts.tracer.balances(
                accounts[1].address
            )

            // expected quote = initial quote - initial trade - funding payment - new trade
            // = 11 - 1 - 0.2 - 5 = 4.8
            expect(postBalance.position.quote).to.equal(
                ethers.utils.parseEther("4.8")
            )
            expect(tx).to.emit(contracts.tracer, "MatchedOrders")
            expect(tx).to.emit(contracts.tracer, "Settled")
        })

        it("settles the trader if the order fails", async () => {
            contracts = await deployTracerMockPricing()
            accounts = await ethers.getSigners()

            initialQuoteBalance = ethers.utils.parseEther("11")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // give account 1 a base of 1, quote is now 10
            await setGasPrice(contracts, 0.00000002)
            let markPrice = 1
            await contracts.pricing.setFairPrice(
                ethers.utils.parseEther(markPrice.toString())
            )
            let tradePrice = ethers.utils.parseEther(markPrice.toString())
            let tradeAmount = ethers.utils.parseEther("1")
            await executeTrade(contracts, accounts, tradePrice, tradeAmount)

            // set new funding rate to 0.2 quote tokens per 1 base held at index 1, no insurance rate
            const fundingRate = ethers.utils.parseEther("0.2")
            await contracts.pricing.setFundingRate(1, fundingRate, fundingRate)
            await contracts.pricing.setLastUpdatedFundingIndex(1)

            tradePrice = ethers.utils.parseEther(markPrice.toString())
            tradeAmount = ethers.utils.parseEther("1000") // user will have insufficient margin for this trade
            let tx = await executeTrade(
                contracts,
                accounts,
                tradePrice,
                tradeAmount
            )

            const postBalance = await contracts.tracer.balances(
                accounts[1].address
            )

            // expected quote = initial quote - initial trade - funding payment
            // = 11 - 1 - 0.2 = 9.8
            expect(postBalance.position.quote).to.equal(
                ethers.utils.parseEther("9.8")
            )
            expect(tx).to.emit(contracts.tracer, "FailedOrders")
            expect(tx).to.emit(contracts.tracer, "Settled")
        })
    })

    context("when the orders are invalid", async () => {
        beforeEach(async () => {
            contracts = await deployTracer()
            accounts = await ethers.getSigners()
            // set mark price to 2 (oracle takes in 8 decimal answer)
            await contracts.oracle.setPrice(2 * 10 ** 8)
            await contracts.gasEthOracle.setPrice(2 * 10 ** 8)

            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // create order where prices don't cross i.e long price < short price
            const longPrice = ethers.utils.parseEther("1")
            const shortPrice = ethers.utils.parseEther("2")
            orderAmount = ethers.utils.parseEther("1")
            const long = customOrder(
                contracts,
                longPrice,
                orderAmount,
                0,
                accounts[1].address
            )
            const short = customOrder(
                contracts,
                shortPrice,
                orderAmount,
                1,
                accounts[2].address
            )

            tx = await matchOrders(contracts, long, short)
        })

        it("does not change user positions", async () => {
            const expectedLongQuote = initialQuoteBalance
            const expectedLongBase = 0
            const expectedShortQuote = initialQuoteBalance
            const expectedShortBase = 0

            const longUser = await contracts.tracer.balances(
                accounts[1].address
            )
            const shortUser = await contracts.tracer.balances(
                accounts[2].address
            )

            expect(longUser.position.quote).to.equal(expectedLongQuote)
            expect(longUser.position.base).to.equal(expectedLongBase)
            expect(shortUser.position.quote).to.equal(expectedShortQuote)
            expect(shortUser.position.base).to.equal(expectedShortBase)
        })

        it("emits a FailedOrders event", async () => {
            expect(tx).to.emit(contracts.tracer, "FailedOrders")
        })
    })

    context("when users don't have sufficient margin", async () => {
        beforeEach(async () => {
            contracts = await deployTracer()
            accounts = await ethers.getSigners()

            // set fee rate to 2%
            await contracts.tracer.setFeeRate(ethers.utils.parseEther("0.02"))
            // set mark price to 2 (oracle takes in 8 decimal answer)
            await contracts.oracle.setPrice(2 * 10 ** 8)
            await contracts.gasEthOracle.setPrice(2 * 10 ** 8)

            initialQuoteBalance = ethers.utils.parseEther("10")
            await depositQuoteTokens(contracts, accounts, initialQuoteBalance)

            // match order with amount 100
            // min margin = quote change / max leverage + liq. gas cost (negligble)
            // min margin = 20 / 12.5 = 16
            // actual margin = -194 + (100 * 2) = 6
            orderPrice = ethers.utils.parseEther("2")
            orderAmount = ethers.utils.parseEther("100")
            await executeTrade(contracts, accounts, orderPrice, orderAmount)
        })

        it("does not change user positions", async () => {
            const expectedLongQuote = initialQuoteBalance
            const expectedLongBase = 0
            const expectedShortQuote = initialQuoteBalance
            const expectedShortBase = 0

            const longUser = await contracts.tracer.balances(
                accounts[1].address
            )
            const shortUser = await contracts.tracer.balances(
                accounts[2].address
            )

            expect(longUser.position.quote).to.equal(expectedLongQuote)
            expect(longUser.position.base).to.equal(expectedLongBase)
            expect(shortUser.position.quote).to.equal(expectedShortQuote)
            expect(shortUser.position.base).to.equal(expectedShortBase)
        })

        it("emits a FailedOrders event", async () => {
            expect(tx).to.emit(contracts.tracer, "FailedOrders")
        })
    })
})
