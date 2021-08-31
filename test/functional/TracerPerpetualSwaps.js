const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { BigNumber } = require("ethers")
const { deployTracer } = require("../utils/DeploymentUtil.js")
const {
    customOrder,
    matchOrders,
    executeTrade,
} = require("../utils/OrderUtil.js")

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
    // funding rate = (((TWAP(trade price) - TWAP(oracle price)) - timevalue) / sensitivity) / 8
    // TWAP(trade price) = (funding rate * 8 * sensitivity + timevalue) + TWAP(oracle price)
    // sensivity = 1, timevalue = 0 in first day, TWAP = 1 in first hour
    // trade price = (funding rate * 8) + oracle price
    let price = fundingRate * 8 + oraclePrice
    let priceWAD = ethers.utils.parseEther(price.toString())
    let amount = ethers.utils.parseEther("1")

    // fast forward 8 hours to prevent any previous trades affect funding rate
    await forwardTime(8 * 3600)

    await executeTrade(
        contracts,
        accounts,
        priceWAD,
        amount,
        accounts[3].address,
        accounts[4].address
    )

    // fast forward to next hour and make a trade to establish the funding rate
    await forwardTime(1 * 3600)
    await executeTrade(
        contracts,
        accounts,
        priceWAD,
        amount,
        accounts[3].address,
        accounts[4].address
    )
}

describe("Functional tests: TracerPerpetualSwaps.sol", function () {
    let contracts, accounts, deployer
    let initialQuoteBalance, orderPrice, orderAmount
    let tx

    describe("matchOrders", async () => {
        context("when two new users match orders", async () => {
            beforeEach(async () => {
                contracts = await deployTracer()
                accounts = await ethers.getSigners()

                // set fee rate to 2%
                await contracts.tracer.setFeeRate(
                    ethers.utils.parseEther("0.02")
                )
                // set mark price to 2 (oracle takes in 8 decimal answer)
                await contracts.oracle.setPrice(2 * 10 ** 8)

                initialQuoteBalance = ethers.utils.parseEther("10")
                await depositQuoteTokens(
                    contracts,
                    accounts,
                    initialQuoteBalance
                )

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

        context("when a trader needs to be settled", async () => {
            beforeEach(async () => {})

            it("settles the trader if the order matches", async () => {})

            it("settles the trader if the order fails", async () => {})
        })

        context("when the orders are invalid", async () => {
            beforeEach(async () => {
                contracts = await deployTracer()
                accounts = await ethers.getSigners()
                // set mark price to 2 (oracle takes in 8 decimal answer)
                await contracts.oracle.setPrice(2 * 10 ** 8)

                initialQuoteBalance = ethers.utils.parseEther("10")
                await depositQuoteTokens(
                    contracts,
                    accounts,
                    initialQuoteBalance
                )

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
                await contracts.tracer.setFeeRate(
                    ethers.utils.parseEther("0.02")
                )
                // set mark price to 2 (oracle takes in 8 decimal answer)
                await contracts.oracle.setPrice(2 * 10 ** 8)

                initialQuoteBalance = ethers.utils.parseEther("10")
                await depositQuoteTokens(
                    contracts,
                    accounts,
                    initialQuoteBalance
                )

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

    describe("settle", async () => {
        context("if the account does not have an open position", async () => {
            beforeEach(async () => {
                contracts = await deployTracer()
                accounts = await ethers.getSigners()

                // set the mark price to 1.
                // gas price returns (gas/GWEI * ETH/USD)
                // this sets gas price to 20 gwei * 1 = 20 gwei
                let oraclePrice = 1
                await contracts.oracle.setPrice(oraclePrice * 10 ** 8)

                initialQuoteBalance = ethers.utils.parseEther("12")
                await depositQuoteTokens(
                    contracts,
                    accounts,
                    initialQuoteBalance
                )

                // set mark price to 2
                // this also makes the gas price oracle return 40 Gwei (2 * 20 Gwei)
                oraclePrice = 2
                await contracts.oracle.setPrice(oraclePrice * 10 ** 8)

                // set funding rate to 20%, new updated index should be 1
                const fundingRate = 0.2
                await setFundingRate(
                    contracts,
                    accounts,
                    fundingRate,
                    oraclePrice
                )
            })

            it("updates the last updated index and last updated gas price", async () => {
                const priorBalance = await contracts.tracer.balances(
                    accounts[1].address
                )

                const settleTx = await contracts.tracer.settle(
                    accounts[1].address
                )

                const postBalance = await contracts.tracer.balances(
                    accounts[1].address
                )

                const latestIndex =
                    await contracts.pricing.lastUpdatedFundingIndex()

                // index should update to latest index after being settled
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
            "if the account has a position and is on the latest global index",
            async () => {
                beforeEach(async () => {
                    contracts = await deployTracer()
                    accounts = await ethers.getSigners()

                    initialQuoteBalance = ethers.utils.parseEther("10")
                    await depositQuoteTokens(
                        contracts,
                        accounts,
                        initialQuoteBalance
                    )

                    // set mark price to 2 (oracle takes in 8 decimal answer)
                    const oraclePrice = 2
                    await contracts.oracle.setPrice(oraclePrice * 10 ** 8)

                    // give account 1 a base of 1
                    const heldPrice = ethers.utils.parseEther("2")
                    const heldAmount = ethers.utils.parseEther("1")
                    await executeTrade(
                        contracts,
                        accounts,
                        heldPrice,
                        heldAmount
                    )
                })

                it("does nothing", async () => {
                    const priorBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )

                    const settleTx = await contracts.tracer.settle(
                        accounts[1].address
                    )

                    const postBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )

                    // check position, latest gas price, updated index and total leveraged value
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

        context(
            "if the account isn't up to date and has an unleveraged position",
            async () => {
                beforeEach(async () => {
                    contracts = await deployTracer()
                    accounts = await ethers.getSigners()

                    initialQuoteBalance = ethers.utils.parseEther("11")
                    await depositQuoteTokens(
                        contracts,
                        accounts,
                        initialQuoteBalance
                    )

                    // set gas rate to 1 * 20 gwei = 20 gwei
                    let oraclePrice = 1
                    await contracts.oracle.setPrice(oraclePrice * 10 ** 8)

                    // give account 1 a base of 1 at same price as oracle to avoid impacting funding rate
                    const heldPrice = ethers.utils.parseEther("1")
                    const heldAmount = ethers.utils.parseEther("1")
                    let trans = await executeTrade(
                        contracts,
                        accounts,
                        heldPrice,
                        heldAmount
                    )

                    // set new gas rate to 40 gwei
                    oraclePrice = 2
                    await contracts.oracle.setPrice(oraclePrice * 10 ** 8)

                    // set funding rate to 0.2 quote tokens per 1 base held
                    const fundingRate = 0.2
                    await setFundingRate(
                        contracts,
                        accounts,
                        fundingRate,
                        oraclePrice
                    )
                })

                it("pays the funding rate and does not pay the insurance rate", async () => {
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

                    // sense check funding rate payments
                    const index =
                        await contracts.pricing.lastUpdatedFundingIndex()
                    const fundingRate = (
                        await contracts.pricing.fundingRates(index)
                    )[1]
                    const insuranceFundingRate = (
                        await contracts.pricing.insuranceFundingRates(index)
                    )[1]
                    expect(fundingRate).to.equal(ethers.utils.parseEther("0.2"))
                    expect(insuranceFundingRate).to.equal(0)

                    // funding rate payment is 0.2, user has base of 1, payment is 0.2 quote
                    // user quote balance = 10 - 0.2 = 9.8
                    const expectedQuote = ethers.utils.parseEther("9.8")
                    expect(postBalance.position.quote).to.equal(expectedQuote)
                })

                it("updates the latest gas price", async () => {
                    const priorBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )
                    await contracts.tracer.settle(accounts[1].address)
                    const postBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )

                    // prior gas balance = 20 gwei
                    expect(priorBalance.lastUpdatedGasPrice).to.equal(
                        ethers.utils.parseEther("0.00000002")
                    )
                    // post gas balance = 40 gwei
                    expect(postBalance.lastUpdatedGasPrice).to.equal(
                        ethers.utils.parseEther("0.00000004")
                    )
                })

                it("updates the last updated index", async () => {
                    const priorBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )
                    await contracts.tracer.settle(accounts[1].address)
                    const lastIndex =
                        await contracts.pricing.lastUpdatedFundingIndex()
                    const postBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )

                    expect(priorBalance.lastUpdatedIndex).to.equal(0)
                    expect(postBalance.lastUpdatedIndex).to.equal(lastIndex)
                })

                it("updates the total leveraged value", async () => {
                    const priorBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )
                    await contracts.tracer.settle(accounts[1].address)
                    const postBalance = await contracts.tracer.balances(
                        accounts[1].address
                    )
                    // leverage should still be 0 after payment
                    expect(priorBalance.totalLeveragedValue).to.equal(0)
                    expect(postBalance.totalLeveragedValue).to.equal(0)
                })
            }
        )

        context(
            "if the account isn't up to date and has a leveraged position",
            async () => {
                beforeEach(async () => {})

                it("pays the funding rate and does not pay the insurance rate", async () => {})

                it("updates the latest gas price", async () => {})

                it("updates the last updated index", async () => {})

                it("updates the total leveraged value", async () => {})
            }
        )

        context(
            "if the account isn't up to date and does not have sufficient margin",
            async () => {
                it("pays the funding rate before the insurance funding rate", async () => {})

                it("pays the insurance funding rate", async () => {})

                it("updates the latest gas price", async () => {})

                it("updates the last updated index", async () => {})

                it("updates the total leveraged value", async () => {})
            }
        )
    })
})
