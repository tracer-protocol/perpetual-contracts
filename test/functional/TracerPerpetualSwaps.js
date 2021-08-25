const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { deployTracer } = require("../utils/DeploymentUtil.js")

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

describe("Functional tests: TracerPerpetualSwaps.sol", function () {
    let accounts, deployer
    let insurance, pricing, liquidation, tracer, quoteToken, trader
    let now
    let order1, order2, order3, order4, order5
    let mockSignedOrder1,
        mockSignedOrder2,
        mockSignedOrder3,
        mockSignedOrder4,
        mockSignedOrder5

    context("Regular Trading", async () => {
        beforeEach(async () => {
            const _setup = await deployTracer()
            quoteToken = _setup.quoteToken
            tracer = _setup.tracer
            insurance = _setup.insurance
            pricing = _setup.pricing
            liquidation = _setup.liquidation
            deployer = _setup.deployer
            trader = _setup.trader
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

            // set up basic trades
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

        describe("when markets are operating as normal", async () => {
            it("passes", async () => {
                // STATE 1:
                // hour = 0
                // funding index = 0

                // check pricing is in hour 0
                let currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(0)

                // place trades
                await trader.executeTrade(
                    [mockSignedOrder1],
                    [mockSignedOrder2]
                )
                await trader.clearFilled(mockSignedOrder1)
                await trader.clearFilled(mockSignedOrder2)
                await trader.executeTrade(
                    [mockSignedOrder1],
                    [mockSignedOrder3]
                )
                await trader.clearFilled(mockSignedOrder1)
                await trader.clearFilled(mockSignedOrder3)

                // check account state
                let account1 = await tracer.balances(accounts[1].address)
                let account2 = await tracer.balances(accounts[2].address)
                let account3 = await tracer.balances(accounts[3].address)

                // gas price = fast gas in gwei * cost per eth
                // $3000 * 20 gwei fast gas = (3000 / 10^18) * (20 * 10^9)
                // = 3000 * 20 * 10^-9 gwei gas / usd = 0.00006 USD / GAS
                let lastUpdatedGas = "60000000000000"
                let account1Expected = {
                    position: {
                        quote: ethers.utils.parseEther("950"),
                        base: ethers.utils.parseEther("50"),
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 0,
                    lastUpdatedGasPrice: lastUpdatedGas,
                }
                let account2Expected = {
                    position: {
                        quote: ethers.utils.parseEther("1040"),
                        base: ethers.utils.parseEther("-40"),
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 0,
                    lastUpdatedGasPrice: lastUpdatedGas,
                }
                let account3Expected = {
                    position: {
                        quote: ethers.utils.parseEther("1010"),
                        base: ethers.utils.parseEther("-10"),
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 0,
                    lastUpdatedGasPrice: lastUpdatedGas,
                }

                compareAccountState(account1, account1Expected)
                compareAccountState(account2, account2Expected)
                compareAccountState(account3, account3Expected)

                // time travel forward to check pricing state
                await forwardTime(60 * 60 + 100)

                // STATE 2:
                // hour = 1
                // funding index = 1

                // make trade in new hour to tick over funding index
                await trader.executeTrade(
                    [mockSignedOrder4],
                    [mockSignedOrder5]
                )
                await trader.clearFilled(mockSignedOrder4)
                await trader.clearFilled(mockSignedOrder5)

                // check pricing is in hour 1
                currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(1)

                // check funding index is 1
                let fundingIndex = await pricing.lastUpdatedFundingIndex()
                expect(fundingIndex).to.equal(1)

                // check pricing state
                // derivative price should be the price of the first created trade
                // above (eg account1 long in both trade cases)
                // underlying price should be oracle price of $1
                let twap = await pricing.getTWAPs(0)
                let expectedUnderlying = ethers.utils.parseEther("1")
                let expectedDerivative = ethers.utils.parseEther("1")
                expect(twap[0].toString()).to.equal(
                    expectedUnderlying.toString()
                )
                expect(twap[1].toString()).to.equal(
                    expectedDerivative.toString()
                )
                // time travel forward 2 hours without any trades happening
                await forwardTime(120 * 60 + 100)

                // STATE 3:
                // hour = 4
                // funding index = 2

                await trader.executeTrade(
                    [mockSignedOrder1],
                    [mockSignedOrder2]
                )
                await trader.clearFilled(mockSignedOrder1)
                await trader.clearFilled(mockSignedOrder2)

                // check pricing is in hour 3 (2 hours passed)
                currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(3)

                // check funding index is 2
                fundingIndex = await pricing.lastUpdatedFundingIndex()
                expect(fundingIndex).to.equal(2)

                // check pricing state
                // derivative price should be the price of the first created trade
                // above (eg trade 4 long price)
                // underlying price should be oracle price of $1
                // twap = 7 * hour 0 ($1) + 8 * hour 1 ($1.25) / 8+7 = 1.13333333333
                let twap2 = await pricing.getTWAPs(1)
                let expectedUnderlying2 = ethers.utils.parseEther("1")
                let expectedDerivative2 = ethers.utils.parseEther(
                    "1.133333333333333333"
                )
                expect(twap2[0].toString()).to.equal(
                    expectedUnderlying2.toString()
                )
                expect(twap2[1].toString()).to.equal(
                    expectedDerivative2.toString()
                )

                // settle accounts and measure funding rate affect
                // fundingRate = derivative twap - underlying twap - time value
                // ($1.1333 - $1 - 0) / 8 = 0.16666666666666666
                let expectedFundingRate = ethers.utils.parseEther(
                    "0.016666666666666666"
                )
                fundingIndex = await pricing.lastUpdatedFundingIndex()
                let fundingRate = await pricing.fundingRates(fundingIndex)

                // previous funding rate was 0, so instant and cumulative should be same
                expect(fundingRate.cumulativeFundingRate).to.equal(
                    expectedFundingRate
                )
                expect(fundingRate.fundingRate).to.equal(expectedFundingRate)

                // settle and check account 3
                let balanceBeforeSettle = await tracer.balances(
                    accounts[3].address
                )
                // account 3 last updated 2 indexes ago at fundingRateIndex 0
                expect(balanceBeforeSettle.lastUpdatedIndex).to.equal(
                    fundingIndex - 2
                )
                await tracer.settle(accounts[3].address)
                let balanceAfterSettle = await tracer.balances(
                    accounts[3].address
                )
                // funding rate * base
                // account 3 has 10 units short --> should receive funding
                let expectedDifference = expectedFundingRate
                    .mul(ethers.utils.parseEther("10"))
                    .div(ethers.utils.parseEther("1"))
                expect(
                    balanceAfterSettle.position.quote.sub(
                        balanceBeforeSettle.position.quote
                    )
                ).to.equal(expectedDifference)
            })
        })

        describe("when market has extended periods with no trades", async () => {
            it("dismisses periods with no trades", async () => {
                // STATE 1:
                // hour = 0
                // funding index = 0

                // check pricing is in hour 0
                let currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(0)

                // fast forward 2 hours without trades
                await forwardTime(2 * 60 * 60 + 100)

                // STATE 2:
                // hour = 2
                // funding index = 0

                // place a trade
                await trader.executeTrade(
                    [mockSignedOrder1],
                    [mockSignedOrder2]
                )
                await trader.clearFilled(mockSignedOrder1)
                await trader.clearFilled(mockSignedOrder2)

                // check account state
                let account1 = await tracer.balances(accounts[1].address)
                let account2 = await tracer.balances(accounts[2].address)

                let lastUpdatedGas = "60000000000000"
                let account1Expected = {
                    position: {
                        quote: ethers.utils.parseEther("960"),
                        base: ethers.utils.parseEther("40"),
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 0,
                    lastUpdatedGasPrice: lastUpdatedGas,
                }
                let account2Expected = {
                    position: {
                        quote: ethers.utils.parseEther("1040"),
                        base: ethers.utils.parseEther("-40"),
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 0,
                    lastUpdatedGasPrice: lastUpdatedGas,
                }

                compareAccountState(account1, account1Expected)
                compareAccountState(account2, account2Expected)

                // check pricing is in hour 2
                currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(2)

                let fundingIndex = await pricing.lastUpdatedFundingIndex()
                expect(fundingIndex).to.equal(0)

                // time travel forward 26 hours to check pricing state after no trades occurred
                let passedHours = 26
                await forwardTime(passedHours * 60 * 60 + 100)

                // STATE 2:
                // hour = (2 + 26) % 24 = 4
                // funding index = 0

                // average 24 hour price should be 1.00 from prior trade
                let average24Hour = await pricing.get24HourPrices()
                await expect(average24Hour[0].toString()).to.equal(
                    "1000000000000000000"
                )

                // execute new trade with price of 1.25
                await trader.executeTrade(
                    [mockSignedOrder4],
                    [mockSignedOrder5]
                )
                await trader.clearFilled(mockSignedOrder4)
                await trader.clearFilled(mockSignedOrder5)

                let expectedHour = (2 + passedHours) % 24
                currentHour = await pricing.currentHour()
                expect(currentHour).to.equal(expectedHour)

                // check the average price has not included last price recording which is stale
                // new average should just be price of new trade, 1.25
                average24Hour = await pricing.get24HourPrices()
                await expect(average24Hour[0].toString()).to.equal(
                    "1250000000000000000"
                )

                fundingIndex = await pricing.lastUpdatedFundingIndex()
                expect(fundingIndex).to.equal(1)
            })
        })
    })
})
