const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const zeroAddress = "0x0000000000000000000000000000000000000000"

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
        context(
            "With deleveragingCliff == insurancePoolSwitchStage && percentFull < deleveragingCliff",
            async () => {
                it("Equals lowestMaxLeverage", async () => {
                    const collateralAmount = ethers.utils.parseEther("10")
                    const poolTarget = ethers.utils.parseEther("1000")
                    const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                    const lowestMaxLeverage = ethers.utils.parseEther("2")
                    const deleveragingCliff = ethers.utils.parseEther("10")
                    const insurancePoolSwitchStage =
                        ethers.utils.parseEther("10")
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

        context("With lowestMaxLeverage == defaultMaxLeverage", async () => {
            it("Returns defaultMaxLeverage", async () => {
                const collateralAmount = ethers.utils.parseEther("10") // 10%
                const poolTarget = ethers.utils.parseEther("100")
                const defaultMaxLeverage = ethers.utils.parseEther("12.5")
                const lowestMaxLeverage = ethers.utils.parseEther("12.5")
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
            it("returns false", async () => {
                let priceA = ethers.utils.parseEther("1")
                let priceB = ethers.utils.parseEther("2")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    priceA,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    priceB,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
        })

        context("when called with the same side", async () => {
            it("returns false", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 0
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
        })

        context("when called with an expired order", async () => {
            it("returns false if order a is expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresA = 500
                let expiresB = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
            it("returns false if order b is expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresB = 250
                let expiresA = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })

            it("returns false if both orders are expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresA = 350
                let expiresB = 750
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
        })

        context("when called with already filled orders", async () => {
            it("returns false if order a is filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = amount
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })

            it("returns false if order b is filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = amount
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })

            it("returns false if both orders are filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = amount
                let filledB = amount
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })
        })

        context(
            "when called with orders that were created in the future",
            async () => {
                it("returns false if order a was created in the future", async () => {
                    let price = ethers.utils.parseEther("1")
                    let amount = ethers.utils.parseEther("1")
                    let sideA = 1
                    let sideB = 0
                    let expires = 3021382897 // large unix timestamp
                    let createdA = 3021382897
                    let createdB = 0
                    let filledA = 0
                    let filledB = 0
                    let orderA = [
                        zeroAddress,
                        zeroAddress,
                        price,
                        amount,
                        sideA,
                        expires,
                        createdA,
                    ]
                    let orderB = [
                        zeroAddress,
                        zeroAddress,
                        price,
                        amount,
                        sideB,
                        expires,
                        createdB,
                    ]
                    let result = await libPerpetuals.canMatch(
                        orderA,
                        filledA,
                        orderB,
                        filledB
                    )
                    expect(result).to.equal(false)
                })

                it("returns false if order b was created in the future", async () => {
                    let price = ethers.utils.parseEther("1")
                    let amount = ethers.utils.parseEther("1")
                    let sideA = 1
                    let sideB = 0
                    let expires = 3021382897 // large unix timestamp
                    let createdB = 3021382897
                    let createdA = 0
                    let filledA = 0
                    let filledB = 0
                    let orderA = [
                        zeroAddress,
                        zeroAddress,
                        price,
                        amount,
                        sideA,
                        expires,
                        createdA,
                    ]
                    let orderB = [
                        zeroAddress,
                        zeroAddress,
                        price,
                        amount,
                        sideB,
                        expires,
                        createdB,
                    ]
                    let result = await libPerpetuals.canMatch(
                        orderA,
                        filledA,
                        orderB,
                        filledB
                    )
                    expect(result).to.equal(false)
                })

                it("retuns false if both orders were created in the future", async () => {
                    let price = ethers.utils.parseEther("1")
                    let amount = ethers.utils.parseEther("1")
                    let sideA = 1
                    let sideB = 0
                    let expires = 3021382897 // large unix timestamp
                    let createdA = 3021382897
                    let createdB = 3021382897
                    let filledA = 0
                    let filledB = 0
                    let orderA = [
                        zeroAddress,
                        zeroAddress,
                        price,
                        amount,
                        sideA,
                        expires,
                        createdA,
                    ]
                    let orderB = [
                        zeroAddress,
                        zeroAddress,
                        price,
                        amount,
                        sideB,
                        expires,
                        createdB,
                    ]
                    let result = await libPerpetuals.canMatch(
                        orderA,
                        filledA,
                        orderB,
                        filledB
                    )
                    expect(result).to.equal(false)
                })
            }
        )

        context("when called with valid orders", async () => {
            it("returns true", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(true)
            })
        })
    })
})
