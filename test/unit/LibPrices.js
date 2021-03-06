const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const MAX_INT256 = ethers.BigNumber.from(2).pow(255).sub(1)
const calcExpectedTWAPs = (oraclePrices, tracerPrices, hour) => {
    let cumulativeDerivative = ethers.BigNumber.from("0")
    let cumulativeUnderlying = ethers.BigNumber.from("0")
    let totalDerivativeTimeWeight = ethers.BigNumber.from("0")
    let totalUnderlyingTimeWeight = ethers.BigNumber.from("0")

    for (i = 0; i < 8; i++) {
        let currTimeWeight = 8 - i
        let j = hour < i ? 24 - i + hour : hour - i

        if (tracerPrices[j][1].eq(ethers.BigNumber.from("0"))) {
            continue
        } else {
            cumulativeDerivative = cumulativeDerivative.add(
                tracerPrices[j][0]
                    .mul(ethers.utils.parseEther("1"))
                    .div(tracerPrices[j][1])
                    .mul(currTimeWeight)
            )
            totalDerivativeTimeWeight = totalDerivativeTimeWeight.add(
                ethers.BigNumber.from(currTimeWeight)
            )
        }
        if (oraclePrices[j][1].eq(ethers.BigNumber.from("0"))) {
            continue
        } else {
            cumulativeUnderlying = cumulativeUnderlying.add(
                oraclePrices[j][0]
                    .mul(ethers.utils.parseEther("1"))
                    .div(oraclePrices[j][1])
                    .mul(currTimeWeight)
            )
            totalUnderlyingTimeWeight = totalUnderlyingTimeWeight.add(
                ethers.BigNumber.from(currTimeWeight)
            )
        }
    }

    return [
        totalUnderlyingTimeWeight == 0
            ? 0
            : cumulativeUnderlying.div(totalUnderlyingTimeWeight),
        totalDerivativeTimeWeight == 0
            ? 0
            : cumulativeDerivative.div(totalDerivativeTimeWeight),
    ]
}

const calculateExpectedUserPosition = (
    quote,
    base,
    globalCumulativeRate,
    userCumulativeRate
) => {
    return [
        quote.sub(
            base
                .mul(globalCumulativeRate.sub(userCumulativeRate))
                .div(ethers.utils.parseEther("1")) // div by 10**18 for WAD maths
        ),
        base,
    ]
}

const applyFundingWrapper = async (
    userPosition,
    globalCumulativeRate,
    userCumulativeRate
) => {
    // timestamp & the individual funding rate for that hour don't matter, so we zero them out
    let globalRate = [0, 0, globalCumulativeRate]
    let userRate = [0, 0, userCumulativeRate]

    return await libPrices.applyFunding(userPosition, globalRate, userRate)
}

describe("Unit tests: LibPrices.sol", function () {
    before(async function () {
        const { deployer } = await getNamedAccounts()

        libPrices = await deploy("Prices", {
            from: deployer,
            log: true,
        })

        await deploy("LibPricesMock", {
            from: deployer,
            log: true,
            libraries: {
                Prices: libPrices.address,
            },
        })

        let deployment = await deployments.get("LibPricesMock")
        libPrices = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("fairPrice", async () => {
        context("when called with a positive time value", async () => {
            it("returns as expected", async () => {
                let oraclePrice = ethers.utils.parseEther("100")
                let timeValue = ethers.utils.parseEther("10")

                let result = await libPrices.fairPrice(oraclePrice, timeValue)

                expect(result).to.equal(ethers.utils.parseEther("90"))
            })
        })

        context("when called with a negative time value", async () => {
            it("returns as expected", async () => {
                let oraclePrice = ethers.utils.parseEther("100")
                let timeValue = ethers.utils.parseEther("-10")

                let result = await libPrices.fairPrice(oraclePrice, timeValue)

                expect(result).to.equal(ethers.utils.parseEther("110"))
            })
        })

        context("when called with time value > oracle price", async () => {
            it("returns 0", async () => {
                let oraclePrice = ethers.utils.parseEther("100")
                let timeValue = ethers.utils.parseEther("110")

                let result = await libPrices.fairPrice(oraclePrice, timeValue)

                expect(result).to.equal(ethers.utils.parseEther("10"))
            })
        })

        context("when the oracle price is > max int", async () => {
            it("reverts", async () => {
                let oraclePrice = MAX_INT256.add(ethers.BigNumber.from("1"))
                let timeValue = ethers.utils.parseEther("10")

                await expect(
                    libPrices.fairPrice(oraclePrice, timeValue)
                ).to.be.revertedWith("int256 overflow")
            })
        })
    })

    describe("timeValue", async () => {
        context(
            "when average oracle price > average tracer price",
            async () => {
                it("returns a negative value", async () => {
                    let averageTracerPrice = ethers.utils.parseEther("9100")
                    let averageOraclePrice = ethers.utils.parseEther("10000")

                    let result = await libPrices.timeValue(
                        averageTracerPrice,
                        averageOraclePrice
                    )

                    expect(result).to.equal(ethers.utils.parseEther("-10"))
                })
            }
        )

        context(
            "when average tracer price >= average oracle price",
            async () => {
                it("returns a positive value", async () => {
                    let averageTracerPrice = ethers.utils.parseEther("10000")
                    let averageOraclePrice = ethers.utils.parseEther("9100")

                    let result = await libPrices.timeValue(
                        averageTracerPrice,
                        averageOraclePrice
                    )

                    expect(result).to.equal(ethers.utils.parseEther("10")) // (10000 - 9100) / 90 = 10
                })
            }
        )

        context("when average tracer price > max int", async () => {
            it("reverts", async () => {
                let averageTracerPrice = MAX_INT256.add(
                    ethers.BigNumber.from("1")
                )
                let averageOraclePrice = ethers.utils.parseEther("9100")

                await expect(
                    libPrices.timeValue(averageTracerPrice, averageOraclePrice)
                ).to.be.revertedWith("int256 overflow")
            })
        })

        context("when average oracle price > max int", async () => {
            it("reverts", async () => {
                let averageOraclePrice = MAX_INT256.add(
                    ethers.BigNumber.from("1")
                )
                let averageTracerPrice = ethers.utils.parseEther("9100")

                await expect(
                    libPrices.timeValue(averageTracerPrice, averageOraclePrice)
                ).to.be.revertedWith("int256 overflow")
            })
        })
    })

    describe("averagePrice", async () => {
        context("when trades == 0", async () => {
            it("returns 0", async () => {
                let price = [
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("0"),
                ]

                let result = await libPrices.averagePrice(price)

                expect(result).to.equal(ethers.constants.MaxUint256)
            })
        })

        context("when trades != 0", async () => {
            it("returns the average trade price", async () => {
                let price = {}

                price.cumulativePrice = ethers.utils.parseEther("10")
                price.trades = ethers.utils.parseEther("1")

                let result = await libPrices.averagePrice(price)

                expect(result).to.equal(ethers.utils.parseEther("10"))
            })
        })
    })

    describe("averagePriceForPeriod", async () => {
        context("when prices length is 24", async () => {
            it("returns the average price for the number of periods present", async () => {
                let n = 24
                let prices = new Array()
                let priceAverages = ethers.constants.Zero

                for (i = 0; i < n; i++) {
                    prices.push([
                        ethers.utils.parseEther((i + 1).toString()),
                        ethers.utils.parseEther((i + 1).toString()),
                    ])
                    let dayAverage = ethers.utils
                        .parseEther((i + 1).toString())
                        .mul(ethers.utils.parseEther("1"))
                        .div(ethers.utils.parseEther((i + 1).toString()))
                    priceAverages = priceAverages.add(dayAverage)
                }

                let averagePriceForPeriod = priceAverages.div(
                    ethers.BigNumber.from(n.toString())
                )
                let result = await libPrices.averagePriceForPeriod(prices)

                expect(result).to.equal(averagePriceForPeriod)
            })
        })

        context("when prices length != 24", async () => {
            it("reverts", async () => {
                // prices length > 24
                let n = 26
                let prices = new Array()

                for (i = 0; i < n; i++) {
                    prices.push([
                        ethers.BigNumber.from(i * 100000),
                        ethers.BigNumber.from(50 - i),
                    ])
                }

                await expect(libPrices.averagePriceForPeriod(prices)).to.be
                    .reverted

                // prices length < 24
                n = 20
                prices = new Array()

                for (i = 0; i < n; i++) {
                    prices.push([
                        ethers.BigNumber.from(i * 100000),
                        ethers.BigNumber.from(50 - i),
                    ])
                }

                await expect(libPrices.averagePriceForPeriod(prices)).to.be
                    .reverted
            })
        })

        context("when no trades occurred in the last 24 hours", async () => {
            it("returns the maximum integer", async () => {
                let n = 24
                let prices = new Array()

                // set all price instants to have 0 trades
                for (i = 0; i < n; i++) {
                    prices.push([
                        ethers.BigNumber.from("0"),
                        ethers.BigNumber.from("0"),
                    ])
                }

                let tx = await libPrices.averagePriceForPeriod(prices)
                expect(tx).to.equal(ethers.constants.MaxUint256)
            })
        })
    })

    describe("globalLeverage", async () => {
        context("when leverage has increased", async () => {
            it("increases global leverage", async () => {
                let globalLeverageInitial = ethers.utils.parseEther("100")
                let oldAccountLeverage = ethers.utils.parseEther("10")
                let newAccountLeverage = ethers.utils.parseEther("20")

                let result = await libPrices.globalLeverage(
                    globalLeverageInitial,
                    oldAccountLeverage,
                    newAccountLeverage
                )

                expect(result).to.equal(ethers.utils.parseEther("110"))
            })
        })

        context("when leverage has not increased", async () => {
            it("decreases global leverage", async () => {
                let globalLeverageInitial = ethers.utils.parseEther("100")
                let oldAccountLeverage = ethers.utils.parseEther("20")
                let newAccountLeverage = ethers.utils.parseEther("10")

                let result = await libPrices.globalLeverage(
                    globalLeverageInitial,
                    oldAccountLeverage,
                    newAccountLeverage
                )

                expect(result).to.equal(ethers.utils.parseEther("90"))
            })
        })

        context(
            "when leverage has decreased by more than the global leverage",
            async () => {
                it("caps global leverage at 0", async () => {
                    let globalLeverageInitial = ethers.utils.parseEther("100")
                    let oldAccountLeverage = ethers.utils.parseEther("110")
                    let newAccountLeverage = ethers.utils.parseEther("0")

                    let result = await libPrices.globalLeverage(
                        globalLeverageInitial,
                        oldAccountLeverage,
                        newAccountLeverage
                    )

                    expect(result).to.equal(ethers.utils.parseEther("0"))
                })
            }
        )
    })

    describe("calculateTWAP", async () => {
        context("for a range of hours", async () => {
            it("returns as expected #1", async () => {
                let tracerPrices = [
                    ["10", "4"], // 2.5
                    ["5.5", "2"], // 2.75
                    ["30", "10"], // 3
                    ["25", "8"], // 3.125
                    ["15", "5"], // 3
                    ["15.95", "5.5"], // 2.95
                    ["14", "5"], // 2.8
                    ["10", "4"], // 2.5
                ].map((x) => [
                    ethers.utils.parseEther(x[0]),
                    ethers.utils.parseEther(x[1]),
                ])
                for (i = 0; i < 16; i++) {
                    tracerPrices.push([
                        ethers.utils.parseEther("0"),
                        ethers.utils.parseEther("0"),
                    ])
                }
                let oraclePrices = tracerPrices // Calculation same for both, so ignore what oraclePrices is

                for (var hour = 0; hour < 24; hour++) {
                    let expectedTWAP = calcExpectedTWAPs(
                        oraclePrices,
                        tracerPrices,
                        hour
                    )
                    let result = await libPrices.calculateTWAP(
                        hour,
                        tracerPrices,
                        oraclePrices
                    )

                    expect(result[0].toString()).to.equal(
                        expectedTWAP[0].toString()
                    )
                }
            })

            it("returns as expected #2", async () => {
                let tracerPrices = new Array()
                let oraclePrices = new Array()

                // generate 24 hour oracle and tracer prices
                for (i = 0; i < 24; i++) {
                    oraclePrices.push([
                        ethers.utils.parseEther((1 + 1 * i).toString()),
                        ethers.utils.parseEther("1"),
                    ])
                    tracerPrices.push([
                        ethers.utils.parseEther((1 + 0.5 * i).toString()),
                        ethers.utils.parseEther("1"),
                    ])
                }

                for (var hour = 0; hour < 24; hour++) {
                    let expectedTWAP = calcExpectedTWAPs(
                        oraclePrices,
                        tracerPrices,
                        hour
                    )
                    let result = await libPrices.calculateTWAP(
                        hour,
                        tracerPrices,
                        oraclePrices
                    )
                    expect(result[0]).to.equal(expectedTWAP[0])
                    expect(result[1]).to.equal(expectedTWAP[1])
                }
            })
        })

        context("when prices are 0", async () => {
            it("returns 0", async () => {
                let tracerPrices = new Array()
                let oraclePrices = new Array()

                // generate 24 hour oracle and tracer prices
                for (i = 0; i < 24; i++) {
                    oraclePrices.push([
                        ethers.utils.parseEther("0"),
                        ethers.BigNumber.from("1"),
                    ])
                    tracerPrices.push([
                        ethers.utils.parseEther("0"),
                        ethers.BigNumber.from("1"),
                    ])
                }

                for (var hour = 0; hour < 24; hour++) {
                    let expectedTWAP = calcExpectedTWAPs(
                        oraclePrices,
                        tracerPrices,
                        hour
                    )
                    let result = await libPrices.calculateTWAP(
                        hour,
                        tracerPrices,
                        oraclePrices
                    )

                    expect(result[0]).to.equal(expectedTWAP[0])
                    expect(result[1]).to.equal(expectedTWAP[1])
                }
            })
        })

        context("when there are periods with no trades", async () => {
            it("ignores periods with no trades", async () => {
                let tracerPrices = new Array()
                let oraclePrices = new Array()

                // generate 24 hour oracle and tracer prices
                for (i = 0; i < 24; i++) {
                    oraclePrices.push([0, 0])
                    tracerPrices.push([0, 0])
                }

                // set hour 8 to be 1
                tracerPrices[7] = [
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("1"),
                ]
                oraclePrices[7] = [
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("1"),
                ]
                // set hour 6 to be 3
                tracerPrices[5] = [
                    ethers.utils.parseEther("3"),
                    ethers.utils.parseEther("1"),
                ]
                oraclePrices[5] = [
                    ethers.utils.parseEther("3"),
                    ethers.utils.parseEther("1"),
                ]

                // get TWAP at hour 8
                // expected TWAP = (8 * 1 + 6 * 3) / 14 = 1.857142857142857142
                const expectedTWAP = ethers.utils.parseEther(
                    "1.857142857142857142"
                )
                let result = await libPrices.calculateTWAP(
                    7,
                    tracerPrices,
                    oraclePrices
                )
                expect(result[0]).to.equal(expectedTWAP)
                expect(result[1]).to.equal(expectedTWAP)
            })
        })

        context("when there are no trades in the last 8 hours", async () => {
            it("returns 0", async () => {
                let tracerPrices = new Array()
                let oraclePrices = new Array()

                // generate 24 hour oracle and tracer prices
                for (i = 0; i < 24; i++) {
                    oraclePrices.push([0, 0])
                    tracerPrices.push([0, 0])
                }

                for (var hour = 0; hour < 24; hour++) {
                    let result = await libPrices.calculateTWAP(
                        hour,
                        tracerPrices,
                        oraclePrices
                    )
                    expect(result[0]).to.equal(0)
                    expect(result[1]).to.equal(0)
                }
            })
        })
    })

    describe("applyFunding", async () => {
        context(
            "When the global rate is greater than the user rate & user has a long position",
            async () => {
                it("applies a negative change to the user's position", async () => {
                    var quote = ethers.utils.parseEther("0")
                    var base = ethers.utils.parseEther("50")

                    var userPosition = [quote, base]

                    let globalCumulativeRate = ethers.utils.parseEther("2300")
                    let userCumulativeRate = ethers.utils.parseEther("2200")

                    // Funding applied (i.e. quote diff) will be (50 base * (100 quote / base) = 5000 quote
                    // Since user had zero quote, they should have -5000 now (take negative of funding applied)
                    let expectedUserPosition = calculateExpectedUserPosition(
                        quote,
                        base,
                        globalCumulativeRate,
                        userCumulativeRate
                    )
                    expect(expectedUserPosition[0]).to.equal(
                        ethers.utils.parseEther("-5000")
                    )

                    let funding = await applyFundingWrapper(
                        userPosition,
                        globalCumulativeRate,
                        userCumulativeRate
                    )

                    expect(funding[0]).to.equal(expectedUserPosition[0]) // check quote is changed
                    expect(funding[1]).to.equal(expectedUserPosition[1]) // check base is unchanged
                })
            }
        )

        context(
            "When the global rate is less than the user rate & user has a long position",
            async () => {
                it("applies a positive change to the user's position", async () => {
                    var quote = ethers.utils.parseEther("0")
                    var base = ethers.utils.parseEther("50")

                    var userPosition = [quote, base]

                    let globalCumulativeRate = ethers.utils.parseEther("2200")
                    let userCumulativeRate = ethers.utils.parseEther("2300")

                    // Funding applied (i.e. quote diff) will be (50 base * (100 quote / base) = -5000 quote
                    // Since user had zero quote, they should have 5000 now (take negative of funding applied)
                    let expectedUserPosition = calculateExpectedUserPosition(
                        quote,
                        base,
                        globalCumulativeRate,
                        userCumulativeRate
                    )
                    expect(expectedUserPosition[0]).to.equal(
                        ethers.utils.parseEther("5000")
                    )

                    let funding = await applyFundingWrapper(
                        userPosition,
                        globalCumulativeRate,
                        userCumulativeRate
                    )

                    expect(funding[0]).to.equal(expectedUserPosition[0]) // check quote is changed
                    expect(funding[1]).to.equal(expectedUserPosition[1]) // check base is unchanged
                })
            }
        )

        context(
            "When the global rate is greater than the user rate & user has a short position",
            async () => {
                it("applies a positive change to the user's position", async () => {
                    quote = ethers.utils.parseEther("0")
                    base = ethers.utils.parseEther("-50")

                    userPosition = [quote, base]

                    let globalCumulativeRate = ethers.utils.parseEther("2300")
                    let userCumulativeRate = ethers.utils.parseEther("2200")

                    // Funding applied (i.e. quote diff) will be (-50 base * (100 quote / base) = -5000 quote
                    // Since user had zero quote, they should have 5000 now (take negative of funding applied)
                    let expectedUserPosition = calculateExpectedUserPosition(
                        quote,
                        base,
                        globalCumulativeRate,
                        userCumulativeRate
                    )
                    expect(expectedUserPosition[0]).to.equal(
                        ethers.utils.parseEther("5000")
                    )

                    let funding = await applyFundingWrapper(
                        userPosition,
                        globalCumulativeRate,
                        userCumulativeRate
                    )

                    expect(funding[0]).to.equal(expectedUserPosition[0]) // check quote is changed
                    expect(funding[1]).to.equal(expectedUserPosition[1]) // check base is unchanged
                })
            }
        )

        context(
            "When the global rate is less than the user rate & user has a short position",
            async () => {
                it("applies a negative change to the user's position", async () => {
                    quote = ethers.utils.parseEther("0")
                    base = ethers.utils.parseEther("-50")

                    userPosition = [quote, base]

                    let globalCumulativeRate = ethers.utils.parseEther("2200")
                    let userCumulativeRate = ethers.utils.parseEther("2300")

                    // Funding applied (i.e. quote diff) will be (-50 base * (-100 quote / base) = 5000 quote
                    // Since user had zero quote, they should have -5000 now (take negative of funding applied)
                    let expectedUserPosition = calculateExpectedUserPosition(
                        quote,
                        base,
                        globalCumulativeRate,
                        userCumulativeRate
                    )
                    expect(expectedUserPosition[0]).to.equal(
                        ethers.utils.parseEther("-5000")
                    )

                    let funding = await applyFundingWrapper(
                        userPosition,
                        globalCumulativeRate,
                        userCumulativeRate
                    )

                    expect(funding[0]).to.equal(expectedUserPosition[0]) // check quote is changed
                    expect(funding[1]).to.equal(expectedUserPosition[1]) // check base is unchanged
                })
            }
        )
    })

    describe("applyInsurance", async () => {
        context("when insurance funding has increased", async () => {
            it("returns the correct insurance/user positions", async () => {
                let userPosition = [
                    ethers.utils.parseEther("0"),
                    ethers.utils.parseEther("110"),
                ] // quote, base
                let insurancePosition = [
                    ethers.utils.parseEther("0"),
                    ethers.utils.parseEther("0"),
                ] // quote, base
                let insuranceGlobalRate = [0, 0, ethers.utils.parseEther("10")] // timestamp, fundingRate, cumulativeFundingRate
                let insuranceUserRate = [0, 0, ethers.utils.parseEther("5")] // timestamp, fundingRate, cumulativeFundingRate
                let totalLeveragedValue = ethers.utils.parseEther("100")

                // expected change in quote = (insurance rate - user rate) * leveraged value
                // (10 - 5) * 100 = 500
                let expectedUserPosition = [
                    ethers.utils.parseEther("-500"),
                    ethers.utils.parseEther("110"),
                ]
                let expectedInsurancePosition = [
                    ethers.utils.parseEther("500"),
                    ethers.utils.parseEther("0"),
                ]

                let result = await libPrices.applyInsurance(
                    userPosition,
                    insurancePosition,
                    insuranceGlobalRate,
                    insuranceUserRate,
                    totalLeveragedValue
                )
                let newUserPosition = result[0]
                let newInsurancePosition = result[1]

                await expect(newUserPosition[0]).to.be.equal(
                    expectedUserPosition[0]
                )
                await expect(newUserPosition[1]).to.be.equal(
                    expectedUserPosition[1]
                )
                await expect(newInsurancePosition[0]).to.be.equal(
                    expectedInsurancePosition[0]
                )
                await expect(newInsurancePosition[1]).to.be.equal(
                    expectedInsurancePosition[1]
                )
            })
        })

        context("when insurance funding has decreased", async () => {
            it("does not change user positions", async () => {
                let userPosition = [
                    ethers.utils.parseEther("0"),
                    ethers.utils.parseEther("110"),
                ] // quote, base
                let insurancePosition = [
                    ethers.utils.parseEther("0"),
                    ethers.utils.parseEther("0"),
                ] // quote, base
                let insuranceGlobalRate = [0, 0, ethers.utils.parseEther("2")] // timestamp, fundingRate, cumulativeFundingRate
                let insuranceUserRate = [0, 0, ethers.utils.parseEther("5")] // timestamp, fundingRate, cumulativeFundingRate
                let totalLeveragedValue = ethers.utils.parseEther("100")

                let result = await libPrices.applyInsurance(
                    userPosition,
                    insurancePosition,
                    insuranceGlobalRate,
                    insuranceUserRate,
                    totalLeveragedValue
                )
                let newUserPosition = result[0]
                let newInsurancePosition = result[1]

                await expect(newUserPosition[0]).to.be.equal(userPosition[0])
                await expect(newUserPosition[1]).to.be.equal(userPosition[1])
                await expect(newInsurancePosition[0]).to.be.equal(
                    insurancePosition[0]
                )
                await expect(newInsurancePosition[1]).to.be.equal(
                    insurancePosition[1]
                )
            })
        })
    })
})
