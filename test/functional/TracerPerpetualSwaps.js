const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { BigNumber } = require("ethers")
const { deployTracer } = require("../utils/DeploymentUtil.js")
const { executeTrade } = require("../utils/OrderUtil.js")

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

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

const setFundingRate = async (
    contracts,
    accounts,
    fundingRate,
    oraclePrice
) => {
    // funding rate = (((TWAP(oracle price) - TWAP(trade price)) - timevalue) / sensitivity) / 8
    // TWAP(trade price) = TWAP(oracle price) - (funding rate * 8 * sensitivity + timevalue)
    // sensivity = 1, timevalue = 0 in first hour, TWAP = 1 in first hour
    // trade price = oracle price -(funding rate * 8)
    let price = oraclePrice - fundingRate * 8
    let priceWAD = ethers.utils.parseEther(price.toString())
    let amount = ethers.utils.parseEther("1")

    await executeTrade(
        contracts,
        accounts,
        priceWAD,
        amount,
        accounts[3].address,
        accounts[4].address
    )

    // fast forward to next hour
    await forwardTime(1 * 3600)
}

describe("Functional tests: TracerPerpetualSwaps.sol", function () {
    let contracts, accounts, deployer
    let initialQuoteBalance, orderPrice, orderAmount

    describe("matchOrders", async () => {
        context("when two traders trade for the first time", async () => {
            beforeEach(async () => {
                initialQuoteBalance = ethers.utils.parseEther("10")
                orderPrice = ethers.utils.parseEther("2")
                orderAmount = ethers.utils.parseEther("10")

                contracts = await deployTracer()
                accounts = await ethers.getSigners()
                await depositQuoteTokens(
                    contracts,
                    accounts,
                    initialQuoteBalance
                )

                // set fee rate to 2%
                await contracts.tracer.setFeeRate(
                    ethers.utils.parseEther("0.02")
                )

                // set mark price to 2 (oracle takes in 8 decimal answer)
                await contracts.oracle.setPrice(2 * 10 ** 8)

                // match order from acc 1 (long) and acc 2 (short)
                await executeTrade(contracts, accounts, orderPrice, orderAmount)
            })

            it("executes the trades", async () => {
                // expected quote change = 10 * 2
                // expected fee = 20 (quote change) * 2% = 0.4
                // expected total quote change = 20.4
                // expected base change of 10
                const expectedLongQuote = ethers.utils.parseEther("-10.4")
                const expectedLongBase = ethers.utils.parseEther("10")
                const expectedShortQuote = ethers.utils.parseEther("29.6")
                const expectedShortBase = ethers.utils.parseEther("-10")

                const long = await contracts.tracer.balances(
                    accounts[1].address
                )
                const short = await contracts.tracer.balances(
                    accounts[2].address
                )

                expect(long.position.quote).to.equal(expectedLongQuote)
                expect(long.position.base).to.equal(expectedLongBase)
                expect(short.position.quote).to.equal(expectedShortQuote)
                expect(short.position.base).to.equal(expectedShortBase)
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

                const long = await contracts.tracer.balances(
                    accounts[1].address
                )
                const short = await contracts.tracer.balances(
                    accounts[2].address
                )

                expect(long.totalLeveragedValue).to.equal(expectedLongLeverage)
                expect(short.totalLeveragedValue).to.equal(
                    expectedShortLeverage
                )
            })

            it("records the trade in the pricing contract", async () => {
                // no other trades occurred, avg price will be same as price of trade
                const expectedAvgPrice = orderPrice

                const currentHour = await contracts.pricing.currentHour()
                const avgPrice =
                    await contracts.pricing.getHourlyAvgTracerPrice(currentHour)
                const avgPrice24Hours =
                    await contracts.pricing.get24HourPrices()
                const avgPrice24HoursTracer = avgPrice24Hours[0]

                expect(avgPrice).to.equal(expectedAvgPrice)
                expect(avgPrice24HoursTracer).to.equal(expectedAvgPrice)
            })
        })

        context("when trader needs to be settled", async () => {
            beforeEach(async () => {})

            it("settles the trader if the order matches", async () => {})

            it("settles the trader if the order fails", async () => {})
        })

        context("when the orders can't match", async () => {
            it("emits a FailedOrders event", async () => {})

            it("does not change user positions", async () => {})
        })

        context("when users don't have margin", async () => {
            it("emits a FailedOrders event", async () => {})
        })
    })
})
