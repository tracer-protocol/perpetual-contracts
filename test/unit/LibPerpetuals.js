const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const zeroAddress = "0x0000000000000000000000000000000000000000"
const { BigNumber } = require("ethers")

describe("Unit tests: LibPerpetuals.sol", function () {
    let accounts
    let libPerpetuals

    before(async function () {
        const { deployer } = await getNamedAccounts()

        libPerpetuals = await deploy("Perpetuals", {
            from: deployer,
            log: true,
        })

        await deploy("PerpetualsMock", {
            from: deployer,
            log: true,
            libraries: {
                Perpetuals: libPerpetuals.address,
            },
        })

        let deployment = await deployments.get("PerpetualsMock")
        libPerpetuals = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("calculateAverageExecutionPrice", async () => {
        context("With zero everything", async () => {
            it("returns zero", async () => {
                const result =
                    await libPerpetuals.calculateAverageExecutionPrice(
                        0,
                        0,
                        0,
                        0
                    )
                expect(result).to.equal(BigNumber.from("0"))
            })
        })

        context("with zero price", async () => {
            it("returns zero", async () => {
                const oldFilledAmount = 100
                const oldAverage = 0
                const fillChange = 300
                const newFillExecutionPrice = 0

                const expectedResult = BigNumber.from("0")

                const result =
                    await libPerpetuals.calculateAverageExecutionPrice(
                        oldFilledAmount,
                        oldAverage,
                        fillChange,
                        newFillExecutionPrice
                    )

                expect(result).to.equal(expectedResult)
            })
        })

        context("non-zero price, zero amount", async () => {
            it("returns zero", async () => {
                const oldFilledAmount = 0
                const oldAverage = 1000
                const fillChange = 0
                const newFillExecutionPrice = 123120

                const expectedResult = BigNumber.from("0")

                const result =
                    await libPerpetuals.calculateAverageExecutionPrice(
                        oldFilledAmount,
                        oldAverage,
                        fillChange,
                        newFillExecutionPrice
                    )

                expect(result).to.equal(expectedResult)
            })
        })

        context("zero oldFilledAmount", async () => {
            it("returns as expected", async () => {
                const oldFilledAmount = ethers.utils.parseEther("0")
                const oldAverage = ethers.utils.parseEther("1000")
                const fillChange = ethers.utils.parseEther("200")
                const newFillExecutionPrice = ethers.utils.parseEther("2500")

                // (0 * 1000 + 200 * 2500) / (0 + 200) = 2500
                const expectedResult = ethers.utils.parseEther("2500")

                const result =
                    await libPerpetuals.calculateAverageExecutionPrice(
                        oldFilledAmount,
                        oldAverage,
                        fillChange,
                        newFillExecutionPrice
                    )

                expect(result).to.equal(expectedResult)
            })
        })

        context("normal case", async () => {
            it("returns as expected", async () => {
                const oldFilledAmount = ethers.utils.parseEther("100")
                const oldAverage = ethers.utils.parseEther("1000")
                const fillChange = ethers.utils.parseEther("200")
                const newFillExecutionPrice = ethers.utils.parseEther("2500")

                // (100 * 1000 + 200 * 2500) / (100 + 200) = 2000
                const expectedResult = ethers.utils.parseEther("2000")

                const result =
                    await libPerpetuals.calculateAverageExecutionPrice(
                        oldFilledAmount,
                        oldAverage,
                        fillChange,
                        newFillExecutionPrice
                    )

                expect(result).to.equal(expectedResult)
            })
        })
    })

    describe("calculateTrueMaxLeverage", async () => {
        context("With an empty pool", async () => {
            it("Equals lowestMaxLeverage", async () => {
                const collateralAmount = 0
                const poolTarget = ethers.utils.parseEther("1000")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("2")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = await libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                expect(result).to.equal(lowestMaxLeverage)
            })
        })

        context("With a pool at insurancePoolSwitchStage", async () => {
            it("Equals lowestMaxLeverage", async () => {
                const collateralAmount = ethers.utils.parseEther("1")
                const poolTarget = ethers.utils.parseEther("100")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("2")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = await libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                expect(result).to.equal(lowestMaxLeverage)
            })
        })

        context("With an overcollateralised pool (over target)", async () => {
            it("Returns default maxLeverage", async () => {
                const collateralAmount = ethers.utils.parseEther("10000")
                const poolTarget = ethers.utils.parseEther("1000")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("2")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = await libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                expect(result).to.equal(defaultMaxLeverage)
            })
        })

        context("With a pool at deleveragingCliff", async () => {
            it("Returns default maxLeverage", async () => {
                const collateralAmount = ethers.utils.parseEther("200")
                const poolTarget = ethers.utils.parseEther("1000")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("2")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = await libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                expect(result).to.equal(defaultMaxLeverage)
            })
        })

        context("With a pool above deleveragingCliff", async () => {
            it("Returns default maxLeverage", async () => {
                const collateralAmount = ethers.utils.parseEther("300")
                const poolTarget = ethers.utils.parseEther("1000")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("2")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = await libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                expect(result).to.equal(defaultMaxLeverage)
            })
        })

        context("With lowestMaxLeverage > defaultMaxLeverage", async () => {
            it("Reverts", async () => {
                const collateralAmount = ethers.utils.parseEther("19") // 19%
                const poolTarget = ethers.utils.parseEther("100")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("20")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                await expect(result).to.be.reverted
            })
        })

        context("When target == 0", async () => {
            it("Equals lowestMaxLeverage", async () => {
                const collateralAmount = ethers.utils.parseEther("10")
                const poolTarget = ethers.utils.parseEther("0")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("2")
                const deleveragingCliff = ethers.utils.parseEther("20")
                const insurancePoolSwitchStage = ethers.utils.parseEther("1")
                let result = await libPerpetuals.calculateTrueMaxLeverage(
                    collateralAmount,
                    poolTarget,
                    defaultMaxLeverage,
                    lowestMaxLeverage,
                    deleveragingCliff,
                    insurancePoolSwitchStage
                )
                await expect(result).to.equal(lowestMaxLeverage)
            })
        })

        context(
            "When deleveragingCliff == insurancePoolSwitchStage",
            async () => {
                it("reverts", async () => {
                    const collateralAmount = ethers.utils.parseEther("10")
                    const poolTarget = ethers.utils.parseEther("20")
                    const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                    const lowestMaxLeverage = ethers.utils.parseEther("2")
                    const deleveragingCliff = ethers.utils.parseEther("10")
                    const insurancePoolSwitchStage =
                        ethers.utils.parseEther("10")
                    let tx = libPerpetuals.calculateTrueMaxLeverage(
                        collateralAmount,
                        poolTarget,
                        defaultMaxLeverage,
                        lowestMaxLeverage,
                        deleveragingCliff,
                        insurancePoolSwitchStage
                    )
                    await expect(tx).to.be.revertedWith("Switch >= delevCliff")
                })
            }
        )

        context(
            "When deleveragingCliff < insurancePoolSwitchStage",
            async () => {
                it("reverts", async () => {
                    const collateralAmount = ethers.utils.parseEther("10")
                    const poolTarget = ethers.utils.parseEther("20")
                    const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                    const lowestMaxLeverage = ethers.utils.parseEther("2")
                    const deleveragingCliff = ethers.utils.parseEther("8")
                    const insurancePoolSwitchStage =
                        ethers.utils.parseEther("10")
                    let tx = libPerpetuals.calculateTrueMaxLeverage(
                        collateralAmount,
                        poolTarget,
                        defaultMaxLeverage,
                        lowestMaxLeverage,
                        deleveragingCliff,
                        insurancePoolSwitchStage
                    )
                    await expect(tx).to.be.revertedWith("Switch >= delevCliff")
                })
            }
        )

        context(
            "When poolAmount below insurancePoolSwitchStage% of target",
            async () => {
                it("Equals lowestMaxLeverage", async () => {
                    const collateralAmount = ethers.utils.parseEther("0.5")
                    const poolTarget = ethers.utils.parseEther("100")
                    const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                    const lowestMaxLeverage = ethers.utils.parseEther("2")
                    const deleveragingCliff = ethers.utils.parseEther("20")
                    const insurancePoolSwitchStage =
                        ethers.utils.parseEther("1")
                    let result = await libPerpetuals.calculateTrueMaxLeverage(
                        collateralAmount,
                        poolTarget,
                        defaultMaxLeverage,
                        lowestMaxLeverage,
                        deleveragingCliff,
                        insurancePoolSwitchStage
                    )
                    await expect(result).to.equal(lowestMaxLeverage)
                })
            }
        )

        context(
            "Pool under deleveragingCliff and above switch stage",
            async () => {
                it("Returns as expected", async () => {
                    const collateralAmount = ethers.utils.parseEther("19") // 19%
                    const collateralAmountNormal = 19 // 19%
                    const poolTarget = ethers.utils.parseEther("100")
                    const poolTargetNormal = 100
                    const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                    const defaultMaxLeverageNormal = 12.5
                    const lowestMaxLeverage = ethers.utils.parseEther("2")
                    const lowestMaxLeverageNormal = 2
                    const deleveragingCliff = ethers.utils.parseEther("20")
                    const deleveragingCliffNormal = 20
                    const insurancePoolSwitchStage =
                        ethers.utils.parseEther("1")
                    const insurancePoolSwitchStageNormal = 1

                    let result = await libPerpetuals.calculateTrueMaxLeverage(
                        collateralAmount,
                        poolTarget,
                        defaultMaxLeverage,
                        lowestMaxLeverage,
                        deleveragingCliff,
                        insurancePoolSwitchStage
                    )
                    let fraction =
                        (defaultMaxLeverageNormal - lowestMaxLeverageNormal) /
                        (deleveragingCliffNormal -
                            insurancePoolSwitchStageNormal)
                    fraction = fraction
                    const expectedValue =
                        fraction *
                            ((collateralAmountNormal / poolTargetNormal) *
                                100) +
                        (lowestMaxLeverageNormal - fraction)

                    const lowerBound = expectedValue - 0.001
                    const upperBound = expectedValue + 0.001
                    const upperWei = ethers.utils.parseEther(
                        upperBound.toString()
                    )
                    const lowerWei = ethers.utils.parseEther(
                        lowerBound.toString()
                    )
                    // ~ 11.947
                    expect(result).to.be.within(lowerWei, upperWei)
                })
            }
        )
    })

    describe("canMatch", async () => {
        context("when called with different order prices", async () => {
            it("returns VALID if prices do cross", async () => {
                let priceA = ethers.utils.parseEther("1") // short order
                let priceB = ethers.utils.parseEther("2") // long order
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    priceA,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    priceB,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    0,
                    orderShort,
                    0
                )
                // OrderMatchingResult.VALID => 0
                expect(result).to.equal(0)
            })

            it("returns PRICE_MISMATCH if prices don't cross", async () => {
                let priceA = ethers.utils.parseEther("2") // short order
                let priceB = ethers.utils.parseEther("1") // long order
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    priceA,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    priceB,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    0,
                    orderShort,
                    0
                )
                // OrderMatchingResult.PRICE_MISMATCH => 3
                expect(result).to.equal(3)
            })
        })

        context("when called with the same side", async () => {
            it("returns SIDE_MISMATCH", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 0
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderLong1 = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong2 = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong1,
                    0,
                    orderLong2,
                    0
                )
                // OrderMatchingResult.SIDE_MISMATCH => 2
                expect(result).to.equal(2)
            })
        })

        context("when called with an expired order", async () => {
            it("returns EXPIRED if order a is expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresA = 500
                let expiresB = 3021382897 // large unix timestamp
                let created = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    0,
                    orderShort,
                    0
                )
                // OrderMatchingResult.EXPIRED => 5
                expect(result).to.equal(5)
            })

            it("returns EXPIRED if order b is expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresB = 250
                let expiresA = 3021382897 // large unix timestamp
                let created = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    0,
                    orderShort,
                    0
                )
                // OrderMatchingResult.EXPIRED => 5
                expect(result).to.equal(5)
            })

            it("returns EXPIRED if both orders are expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresA = 350
                let expiresB = 750
                let created = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    0,
                    orderShort,
                    0
                )
                // OrderMatchingResult.EXPIRED => 5
                expect(result).to.equal(5)
            })
        })

        context("when called with already filled orders", async () => {
            it("returns FILLED if order a is filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = amount
                let filledB = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    filledA,
                    orderShort,
                    filledB
                )
                // OrderMatchingResult.FILLED => 6
                expect(result).to.equal(6)
            })

            it("returns FILLED if order b is filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = amount
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    filledA,
                    orderShort,
                    filledB
                )
                // OrderMatchingResult.FILLED => 6
                expect(result).to.equal(6)
            })

            it("returns FILLED if both orders are filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = amount
                let filledB = amount
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    filledA,
                    orderShort,
                    filledB
                )
                // OrderMatchingResult.FILLED => 6
                expect(result).to.equal(6)
            })
        })

        context(
            "when called with orders that were created in the future",
            async () => {
                it("returns INVALID_TIME if order a was created in the future", async () => {
                    let price = ethers.utils.parseEther("1")
                    let amount = ethers.utils.parseEther("1")
                    let sideA = 1
                    let sideB = 0
                    let expires = 3021382897 // large unix timestamp
                    let createdA = 3021382897
                    let createdB = 0
                    let filledA = 0
                    let filledB = 0
                    let orderShort = [
                        accounts[1].address,
                        zeroAddress,
                        price,
                        amount,
                        sideA,
                        expires,
                        createdA,
                    ]
                    let orderLong = [
                        accounts[2].address,
                        zeroAddress,
                        price,
                        amount,
                        sideB,
                        expires,
                        createdB,
                    ]
                    let result = await libPerpetuals.canMatch(
                        orderLong,
                        filledA,
                        orderShort,
                        filledB
                    )
                    // OrderMatchingResult.INVALID_TIME => 7
                    expect(result).to.equal(7)
                })

                it("returns INVALID_TIME if order b was created in the future", async () => {
                    let price = ethers.utils.parseEther("1")
                    let amount = ethers.utils.parseEther("1")
                    let sideA = 1
                    let sideB = 0
                    let expires = 3021382897 // large unix timestamp
                    let createdB = 3021382897
                    let createdA = 0
                    let filledA = 0
                    let filledB = 0
                    let orderShort = [
                        accounts[1].address,
                        zeroAddress,
                        price,
                        amount,
                        sideA,
                        expires,
                        createdA,
                    ]
                    let orderLong = [
                        accounts[2].address,
                        zeroAddress,
                        price,
                        amount,
                        sideB,
                        expires,
                        createdB,
                    ]
                    let result = await libPerpetuals.canMatch(
                        orderLong,
                        filledA,
                        orderShort,
                        filledB
                    )
                    // OrderMatchingResult.INVALID_TIME => 7
                    expect(result).to.equal(7)
                })

                it("returns INVALID_TIME if both orders were created in the future", async () => {
                    let price = ethers.utils.parseEther("1")
                    let amount = ethers.utils.parseEther("1")
                    let sideA = 1
                    let sideB = 0
                    let expires = 3021382897 // large unix timestamp
                    let createdA = 3021382897
                    let createdB = 3021382897
                    let filledA = 0
                    let filledB = 0
                    let orderShort = [
                        accounts[1].address,
                        zeroAddress,
                        price,
                        amount,
                        sideA,
                        expires,
                        createdA,
                    ]
                    let orderLong = [
                        accounts[2].address,
                        zeroAddress,
                        price,
                        amount,
                        sideB,
                        expires,
                        createdB,
                    ]
                    let result = await libPerpetuals.canMatch(
                        orderLong,
                        filledA,
                        orderShort,
                        filledB
                    )
                    // OrderMatchingResult.INVALID_TIME => 7
                    expect(result).to.equal(7)
                })
            }
        )

        context("when called with different markets", async () => {
            it("returns MARKET_MISMATCH", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = 0
                let orderShort = [
                    accounts[1].address,
                    accounts[3].address,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    accounts[4].address,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    filledA,
                    orderShort,
                    filledB
                )
                // OrderMatchingResult.MARKET_MISMATCH => 1
                expect(result).to.equal(1)
            })
        })

        context("when called with the same makers", async () => {
            it("returns INVALID_TIME", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    filledA,
                    orderShort,
                    filledB
                )
                // OrderMatchingResult.INVALID_TIME => 4
                expect(result).to.equal(4)
            })
        })

        context("when called with valid orders", async () => {
            it("returns VALID", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = 0
                let orderShort = [
                    accounts[1].address,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderLong = [
                    accounts[2].address,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderLong,
                    filledA,
                    orderShort,
                    filledB
                )
                // OrderMatchingResult.VALID => 0
                expect(result).to.equal(0)
            })
        })
    })
})
