const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const {
    getTracer,
    getPricing,
    getPriceOracle,
    getQuoteToken,
    getTrader,
} = require("../util/DeploymentUtil.js")
const { executeTrade, depositQuoteTokens } = require("../util/OrderUtil.js")

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _tracer = await getTracer()

    return {
        trader: await getTrader(),
        tracer: _tracer,
        pricing: await getPricing(_tracer),
        quoteToken: await getQuoteToken(_tracer),
        oracle: await getPriceOracle(_tracer),
    }
})

describe("Unit tests: Pricing", function () {
    let accounts
    describe("fundingRate", async () => {
        it("is zero when oracle and tracer price are equal", async () => {
            const { tracer, trader, pricing, oracle, quoteToken } =
                await setupTests()
            accounts = await ethers.getSigners()
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [accounts[1], accounts[2]],
                ethers.utils.parseEther("100")
            )

            // set underlying price to 10 (oracle takes in 8 decimal answer)
            await oracle.setPrice(10 * 10 ** 8)
            // execute trade to set tracer price to 10
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("2")
            )

            // create a new trade in the next hour to update the funding rate in the last hour
            await forwardTime(2 * 3600 + 100)
            await executeTrade(
                tracer,
                trader,
                accounts,
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

        it("is positive when tracer price is greater than oracle price", async () => {
            const { tracer, trader, pricing, oracle, quoteToken } =
                await setupTests()
            accounts = await ethers.getSigners()
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [accounts[1], accounts[2]],
                ethers.utils.parseEther("100")
            )

            // set underlying price to 10 (oracle takes in 8 decimal answer)
            await oracle.setPrice(10 * 10 ** 8)
            // execute trade to set tracer price to 12
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("12"),
                ethers.utils.parseEther("2")
            )

            // create a new trade in the next hour to update the funding rate in the last hour
            await forwardTime(2 * 3600 + 100)
            await executeTrade(
                tracer,
                trader,
                accounts,
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

        it("is negative when tracer price is greater than oracle price", async () => {
            const { tracer, trader, pricing, oracle, quoteToken } =
                await setupTests()
            accounts = await ethers.getSigners()
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [accounts[1], accounts[2]],
                ethers.utils.parseEther("100")
            )

            // set underlying price to 12 (oracle takes in 8 decimal answer)
            await oracle.setPrice(12 * 10 ** 8)

            // execute trade to set tracer price to 10
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("2")
            )

            // create a new trade in the next hour to update the funding rate in the last hour
            await forwardTime(2 * 3600 + 100)
            await executeTrade(
                tracer,
                trader,
                accounts,
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
    })

    describe("timeValue", async () => {
        it("correctly updates every 24 hours", async () => {
            const { tracer, trader, pricing, oracle, quoteToken } =
                await setupTests()
            accounts = await ethers.getSigners()
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [accounts[1], accounts[2]],
                ethers.utils.parseEther("100")
            )

            // state 1
            // day: 1
            // daily average price difference: -2 (10-12)
            // timeValue: 0
            await oracle.setPrice(12 * 10 ** 8)
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("2")
            )
            let expectedTimeValue = 0
            let tx = await pricing.timeValue()
            expect(tx).to.equal(expectedTimeValue)

            // state 2
            // day: 2
            // daily average price difference: -1 (11-12)
            // timeValue: 2/90 = -0.02 recurring
            await forwardTime(24 * 3600)
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("11"),
                ethers.utils.parseEther("2")
            )
            expectedTimeValue = ethers.utils.parseEther("-0.022222222222222222")
            tx = await pricing.timeValue()
            expect(tx).to.equal(expectedTimeValue)

            // state 3
            // day: 3
            // daily average price difference: -3 (11-12)
            // timeValue: -2/90 + -1/90 = -0.03 recurring
            await forwardTime(24 * 3600)
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("9"),
                ethers.utils.parseEther("2")
            )
            expectedTimeValue = ethers.utils.parseEther("-0.033333333333333333")

            tx = await pricing.timeValue()
            expect(tx).to.equal(expectedTimeValue)
        })

        it("returns only the last 90 days of averages", async () => {
            const { tracer, trader, pricing, oracle, quoteToken } =
                await setupTests()
            accounts = await ethers.getSigners()
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [accounts[1], accounts[2]],
                ethers.utils.parseEther("100")
            )

            // state 1
            // day: 1
            // daily average price difference: -2 (10-12)
            // timeValue: 0
            await oracle.setPrice(12 * 10 ** 8)
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("10"),
                ethers.utils.parseEther("2")
            )
            let expectedTimeValue = 0
            let tx = await pricing.timeValue()
            expect(tx).to.equal(expectedTimeValue)

            // state 2
            // day: 2
            // daily average price difference: -1 (11-12)
            // timeValue: 2/90 = -0.02 recurring
            await forwardTime(24 * 3600)
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("11"),
                ethers.utils.parseEther("2")
            )
            expectedTimeValue = ethers.utils.parseEther("-0.022222222222222222")
            tx = await pricing.timeValue()
            expect(tx).to.equal(expectedTimeValue)

            // state 3
            // day: 93
            // daily average price difference: -3 (9-12)
            // timeValue: -1/90 (90 day avg from day 2-92)
            await forwardTime(91 * 24 * 3600)
            await executeTrade(
                tracer,
                trader,
                accounts,
                ethers.utils.parseEther("9"),
                ethers.utils.parseEther("2")
            )
            expectedTimeValue = ethers.utils.parseEther("-0.011111111111111111")

            tx = await pricing.timeValue()
            expect(tx).to.equal(expectedTimeValue)
        })
    })

    describe("recordTrade", async () => {
        let pricing, tracer, trader, oracle, quoteToken
        context(
            "when the last recording was made in the same hour",
            async () => {
                beforeEach(async () => {
                    ;({ tracer, trader, pricing, oracle, quoteToken } =
                        await setupTests())
                    accounts = await ethers.getSigners()
                    await depositQuoteTokens(
                        tracer,
                        quoteToken,
                        [accounts[1], accounts[2]],
                        ethers.utils.parseEther("100")
                    )

                    // make three trades at hour 0
                    // record trade of price 10 with amount 2
                    await oracle.setPrice(10 * 10 ** 8)
                    await executeTrade(
                        tracer,
                        trader,
                        accounts,
                        ethers.utils.parseEther("10"),
                        ethers.utils.parseEther("2")
                    )
                    // fast forward 10 minutes
                    await forwardTime(10 * 60)

                    // record trade of price 13 with amount 4
                    await oracle.setPrice(13 * 10 ** 8)
                    await executeTrade(
                        tracer,
                        trader,
                        accounts,
                        ethers.utils.parseEther("13"),
                        ethers.utils.parseEther("4")
                    )
                })
                it("updates the average price", async () => {
                    const expectedPrice = (10 * 2 + 13 * 4) / 6
                    const expectedPriceWAD = ethers.utils.parseEther(
                        expectedPrice.toString()
                    )
                    const avgPrice = await pricing.getHourlyAvgTracerPrice(0)
                    expect(avgPrice).to.equal(expectedPriceWAD)
                })

                it("does not update the funding rate", async () => {
                    const lastIndex = await pricing.lastUpdatedFundingIndex()
                    expect(lastIndex).to.equal(0)
                })

                it("does not update the current hour", async () => {
                    const currentHour = await pricing.currentHour()
                    expect(currentHour).to.equal(0)
                })
            }
        )

        context("when an hour has passed since last recording", async () => {
            beforeEach(async () => {
                ;({ tracer, trader, pricing, oracle, quoteToken } =
                    await setupTests())
                accounts = await ethers.getSigners()
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [accounts[1], accounts[2]],
                    ethers.utils.parseEther("100")
                )

                // make three trades at hour 0
                // record trade of price 10 with amount 2
                await oracle.setPrice(12 * 10 ** 8)
                await executeTrade(
                    tracer,
                    trader,
                    accounts,
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("2")
                )
                // fast forward to next hour
                await forwardTime(1 * 3600)

                // record trade of price 13 with amount 4
                await oracle.setPrice(13 * 10 ** 8)
                await executeTrade(
                    tracer,
                    trader,
                    accounts,
                    ethers.utils.parseEther("13"),
                    ethers.utils.parseEther("4")
                )
            })
            it("creates a new price recording", async () => {
                const expectedHourZero = ethers.utils.parseEther("10")
                const expectedHourOne = ethers.utils.parseEther("13")
                let avgPriceZero = await pricing.getHourlyAvgTracerPrice(0)
                let avgPriceOne = await pricing.getHourlyAvgTracerPrice(1)
                expect(avgPriceZero).to.equal(expectedHourZero)
                expect(avgPriceOne).to.equal(expectedHourOne)
            })

            it("updates the funding rate", async () => {
                // funding rate should update according to the first trade
                // first trade funding rate should be (12-10)/8 = 0.25
                const expectedFundingIndex = 1
                const expectedFundingRate = ethers.utils.parseEther("-0.25")
                const lastIndex = await pricing.lastUpdatedFundingIndex()
                const fundingRateInstance = await pricing.getFundingRate(
                    lastIndex
                )
                const fundingRate = fundingRateInstance[1]

                expect(lastIndex).to.equal(expectedFundingIndex)
                expect(fundingRate).to.equal(expectedFundingRate)
            })

            it("updates the current hour", async () => {
                let currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(1)
            })
        })

        context("when extended periods of no trades occur", async () => {
            beforeEach(async () => {
                ;({ tracer, trader, pricing, oracle, quoteToken } =
                    await setupTests())
                accounts = await ethers.getSigners()
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [accounts[1], accounts[2]],
                    ethers.utils.parseEther("100")
                )

                // set up hourly average prices as:
                // hour 0: 10, hour 1: 13
                // set hour 0
                await oracle.setPrice(12 * 10 ** 8)
                await executeTrade(
                    tracer,
                    trader,
                    accounts,
                    ethers.utils.parseEther("10"),
                    ethers.utils.parseEther("2")
                )
                // set hour 1
                await forwardTime(1 * 3600)
                await oracle.setPrice(13 * 10 ** 8)
                await executeTrade(
                    tracer,
                    trader,
                    accounts,
                    ethers.utils.parseEther("13"),
                    ethers.utils.parseEther("2")
                )

                // fast forward 24 hours and set price as 15
                await forwardTime(24 * 3600)
                await oracle.setPrice(15 * 10 ** 8)
                await executeTrade(
                    tracer,
                    trader,
                    accounts,
                    ethers.utils.parseEther("15"),
                    ethers.utils.parseEther("2")
                )
            })

            it("overwrites stale prices", async () => {
                // hourly prices should be:
                // hour 0: Max_Int(no volume), hour 1: 15
                const expectedHourZero = ethers.constants.MaxUint256
                const expectedHourOne = ethers.utils.parseEther("15")
                const expected24Hour = ethers.utils.parseEther("15")

                const avgPriceZero = await pricing.getHourlyAvgTracerPrice(0)
                const avgPriceOne = await pricing.getHourlyAvgTracerPrice(1)
                const avgPrice24Hour = await pricing.get24HourPrices()
                const avgPrice24HourTracer = avgPrice24Hour[0]

                expect(avgPriceZero).to.equal(expectedHourZero)
                expect(avgPriceOne).to.equal(expectedHourOne)
                expect(avgPrice24HourTracer).to.equal(expected24Hour)
            })

            it("updates the current hour", async () => {
                let currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(1)
            })
        })
    })
})
