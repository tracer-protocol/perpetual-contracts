const perpsAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { smockit, smoddit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")

const provideOrders = async (contracts, liquidationAmount) => {
    const sellWholeLiquidationAmount = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: liquidationAmount,
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: (await ethers.provider.getBlock("latest")).timestamp + 1,
    }

    const sellHalfLiquidationAmount = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: (await ethers.provider.getBlock("latest")).timestamp + 1,
    }

    const sellHalfLiquidationAmountSecond = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: (await ethers.provider.getBlock("latest")).timestamp + 2,
    }

    const sellHalfLiquidationAmountThird = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: (await ethers.provider.getBlock("latest")).timestamp + 2,
    }

    const longOrder = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: liquidationAmount,
        side: "0", // Long, which is invalid
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: (await ethers.provider.getBlock("latest")).timestamp,
    }

    const zeroDollarOrder = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: "0", // $0
        amount: liquidationAmount,
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: (await ethers.provider.getBlock("latest")).timestamp,
    }

    const earlyCreationOrder = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: 0,
    }

    const wrongMakerOrder = {
        maker: accounts[2].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: (await ethers.provider.getBlock("latest")).timestamp + 100,
        created: 0,
    }

    orders = {
        sellWholeLiquidationAmount: sellWholeLiquidationAmount,
        sellHalfLiquidationAmount: sellHalfLiquidationAmount,
        sellHalfLiquidationAmountSecond: sellHalfLiquidationAmountSecond,
        longOrder: longOrder,
        zeroDollarOrder: zeroDollarOrder,
        earlyCreationOrder: earlyCreationOrder,
        wrongMakerOrder: wrongMakerOrder,
    }

    return orders
}

const halfLiquidate = deployments.createFixture(async () => {
    const contracts = await baseLiquidatablePosition()
    const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    const { tracerPerps, liquidation, trader, libPerpetuals } = contracts

    // Get half the base. Liquidate this amount
    const halfBase = (await tracerPerps.getBalance(deployer)).position.base.div(
        2
    )

    const tx = await liquidation
        .connect(accounts[1])
        .liquidate(halfBase, deployer)
    const base = (await tracerPerps.getBalance(deployer)).position.base

    return { tracerPerps, liquidation, trader, libPerpetuals }
})

const baseLiquidatablePosition = deployments.createFixture(async () => {
    await deployments.fixture("GetIntoLiquidatablePosition")
    const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()

    let perpsAddress = await deployments.read(
        "TracerPerpetualsFactory",
        "tracersByIndex",
        0
    )
    let tracerPerpsInstance = new ethers.Contract(
        perpsAddress,
        perpsAbi,
        ethers.provider
    )
    tracerPerpsInstance = await tracerPerpsInstance.connect(deployer)

    let liquidationInstance = new ethers.Contract(
        await tracerPerpsInstance.liquidationContract(),
        liquidationAbi,
        ethers.provider
    )
    liquidationInstance = await liquidationInstance.connect(accounts[0])

    const traderDeployment = await deployments.get("Trader")
    let traderInstance = await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )
    // liquidationInstance.connect(deployer)
    await deployments.fixture("PerpetualsMock")
    const libPerpetualsDeployment = await deployments.get("PerpetualsMock")
    let libPerpetuals = await ethers.getContractAt(
        libPerpetualsDeployment.abi,
        libPerpetualsDeployment.address
    )
    const contracts = {
        tracerPerps: tracerPerpsInstance,
        liquidation: liquidationInstance,
        trader: traderInstance,
        libPerpetuals: libPerpetuals,
    }

    return contracts
})

const addOrdersToModifiedTrader = async (
    modifiableTrader,
    contracts,
    liquidationAmount
) => {
    const orders = await provideOrders(contracts, liquidationAmount)
    for (const [_, order] of Object.entries(orders)) {
        let hash = await contracts.libPerpetuals.callStatic.orderId(order)
        await modifiableTrader.smodify.put({
            orders: {
                [hash]: order,
            },
        })
        await modifiableTrader.smodify.put({
            filled: {
                [hash]: order.amount,
            },
        })
    }
}

const setupReceiptTestNoFixture = async (modifiableTrader) => {
    // const { modifiableTrader } = await deployModifiableTrader()
    const contracts = await halfLiquidate()

    const liquidationAmount = (
        await contracts.liquidation.liquidationReceipts(0)
    ).amountLiquidated.toString()

    await addOrdersToModifiedTrader(
        modifiableTrader,
        contracts,
        liquidationAmount
    )
    return { ...contracts, modifiableTrader }
}

const setupReceiptTest = deployments.createFixture(async () => {
    const { modifiableTrader } = await deployModifiableTrader()
    const contracts = await halfLiquidate()

    const liquidationAmount = (
        await contracts.liquidation.liquidationReceipts(0)
    ).amountLiquidated.toString()

    await addOrdersToModifiedTrader(
        modifiableTrader,
        contracts,
        liquidationAmount
    )
    return { ...contracts, modifiableTrader }
})

const deployModifiableTrader = async () => {
    const ModifiableTraderContract = await smoddit("Trader", {
        libraries: {
            // Perpetuals: contracts.libPerpetuals.address
        },
    })
    const modifiableTrader = await ModifiableTraderContract.deploy()
    console.log("modifiableTrader.address")
    console.log(modifiableTrader.address)
    return modifiableTrader
}

describe("Liquidation functional tests", async () => {
    let accounts
    let tracerPerps
    let liquidation
    let trader
    let modifiableTrader
    before(async function () {
        accounts = await ethers.getSigners()
        modifiableTrader = await deployModifiableTrader()
    })

    beforeEach(async function () {})

    context("calcAmountToReturn", async () => {
        context(
            "when units sold is greater than liquidation amount",
            async () => {
                it("Reverts ", async () => {})
            }
        )

        context("When there is slippage", async () => {
            it("Calculates accurately", async () => {})
        })

        context("When there is no slippage", async () => {
            it("Returns 0 ", async () => {})
        })
    })

    context("calcUnitsSold", async () => {
        context("in the normal case", async () => {
            it("Calculates correctly", async () => {
                const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                tracerPerps = contracts.tracerPerps
                liquidation = contracts.liquidation
                trader = modifiableTrader
                const liquidationAmount = (
                    await liquidation.liquidationReceipts(0)
                ).amountLiquidated
                const orders = await provideOrders(contracts, liquidationAmount)

                const tx = await liquidation.callStatic.calcUnitsSold(
                    [
                        orders.sellHalfLiquidationAmount,
                        orders.sellHalfLiquidationAmountSecond,
                    ],
                    trader.address,
                    0
                )
                await expect(tx[0]).to.equal(ethers.utils.parseEther("5000"))
                await expect(tx[1]).to.equal(ethers.utils.parseEther("0.5"))
            })
        })

        context("when all invalid orders", async () => {
            it("Returns nothing ", async () => {
                const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                const receiptId = 0
                const liquidationAmount = (
                    await contracts.liquidation.liquidationReceipts(receiptId)
                ).amountLiquidated

                const orders = await provideOrders(contracts, liquidationAmount)
                const receipt = await (
                    await contracts.liquidation.calcUnitsSold(
                        [
                            orders.longOrder,
                            orders.wrongMakerOrder,
                            orders.earlyCreationOrder,
                            orders.longOrder,
                        ],
                        modifiableTrader.address,
                        0
                    )
                ).wait()
                let eventCounter = 0
                // Make sure InvalidClaimOrder is emitted correct number of times
                receipt.events.filter((x) => {
                    if (
                        x.event === "InvalidClaimOrder" &&
                        x.args.receiptId == 0
                    ) {
                        eventCounter++
                    }
                })
                const expectedNumberOfEventEmissions = 4
                expect(eventCounter).to.equal(expectedNumberOfEventEmissions)
                const result =
                    await contracts.liquidation.callStatic.calcUnitsSold(
                        [
                            orders.longOrder,
                            orders.wrongMakerOrder,
                            orders.earlyCreationOrder,
                            orders.longOrder,
                        ],
                        modifiableTrader.address,
                        0
                    )
                expect(result[0]).to.equal(0)
                expect(result[1]).to.equal(0)
            })
        })

        context("when some invalid orders", async () => {
            it("Calculates correctly", async () => {
                console.log("1")
                const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                console.log("2")
                const receiptId = 0
                console.log("3")
                const liquidationAmount = (
                    await contracts.liquidation.liquidationReceipts(receiptId)
                ).amountLiquidated
                console.log("4")

                const orders = await provideOrders(contracts, liquidationAmount)
                console.log("5")
                console.log()
                console.log()
                const receipt = await (
                    await contracts.liquidation.calcUnitsSold(
                        [
                            orders.sellHalfLiquidationAmount,
                            orders.longOrder,
                            orders.earlyCreationOrder,
                        ],
                        modifiableTrader.address,
                        0
                    )
                ).wait()
                console.log("6")
                let eventCounter = 0
                // Make sure InvalidClaimOrder is emitted correct number of times
                receipt.events.filter((x) => {
                    if (
                        x.event === "InvalidClaimOrder" &&
                        x.args.receiptId == 0
                    ) {
                        eventCounter++
                    }
                })
                console.log("7")
                const expectedNumberOfEventEmissions = 2
                expect(eventCounter).to.equal(expectedNumberOfEventEmissions)
                const result =
                    await contracts.liquidation.callStatic.calcUnitsSold(
                        [
                            orders.sellHalfLiquidationAmount,
                            orders.longOrder,
                            orders.earlyCreationOrder,
                        ],
                        modifiableTrader.address,
                        0
                    )
                console.log("8")
                expect(result[0]).to.equal(ethers.utils.parseEther("2500")) // units sold
                expect(result[1]).to.equal(ethers.utils.parseEther("0.5")) // avg price
                console.log("9")
            })
        })

        context("when orders were created before the receipt", async () => {
            it("Calculates correctly", async () => {
                const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                const receiptId = 0
                const liquidationAmount = (
                    await contracts.liquidation.liquidationReceipts(receiptId)
                ).amountLiquidated

                const orders = await provideOrders(contracts, liquidationAmount)
                const receipt = await (
                    await contracts.liquidation.calcUnitsSold(
                        [orders.earlyCreationOrder, orders.earlyCreationOrder],
                        modifiableTrader.address,
                        0
                    )
                ).wait()
                let eventCounter = 0
                // Make sure InvalidClaimOrder is emitted correct number of times
                receipt.events.filter((x) => {
                    if (
                        x.event === "InvalidClaimOrder" &&
                        x.args.receiptId == 0
                    ) {
                        eventCounter++
                    }
                })
                const expectedNumberOfEventEmissions = 2
                expect(eventCounter).to.equal(expectedNumberOfEventEmissions)
                const result =
                    await contracts.liquidation.callStatic.calcUnitsSold(
                        [orders.earlyCreationOrder, orders.earlyCreationOrder],
                        modifiableTrader.address,
                        0
                    )
                expect(result[0]).to.equal(ethers.utils.parseEther("0")) // units sold
                expect(result[1]).to.equal(ethers.utils.parseEther("0")) // avg price
            })
        })

        context(
            "when orders were created of the wrong side (e.g. long when they should be short)",
            async () => {
                it("Calculates correctly", async () => {
                    const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                    const receiptId = 0
                    const liquidationAmount = (
                        await contracts.liquidation.liquidationReceipts(
                            receiptId
                        )
                    ).amountLiquidated

                    const orders = await provideOrders(
                        contracts,
                        liquidationAmount
                    )
                    const receipt = await (
                        await contracts.liquidation.calcUnitsSold(
                            [orders.longOrder, orders.longOrder],
                            modifiableTrader.address,
                            0
                        )
                    ).wait()
                    let eventCounter = 0
                    // Make sure InvalidClaimOrder is emitted correct number of times
                    receipt.events.filter((x) => {
                        if (
                            x.event === "InvalidClaimOrder" &&
                            x.args.receiptId == 0
                        ) {
                            eventCounter++
                        }
                    })
                    const expectedNumberOfEventEmissions = 2
                    expect(eventCounter).to.equal(
                        expectedNumberOfEventEmissions
                    )
                    const result =
                        await contracts.liquidation.callStatic.calcUnitsSold(
                            [orders.longOrder, orders.longOrder],
                            modifiableTrader.address,
                            0
                        )
                    expect(result[0]).to.equal(ethers.utils.parseEther("0")) // units sold
                    expect(result[1]).to.equal(ethers.utils.parseEther("0")) // avg price
                })
            }
        )

        context(
            "when some orders have different maker to liquidator",
            async () => {
                it("Calculates correctly", async () => {
                    const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                    const receiptId = 0
                    const liquidationAmount = (
                        await contracts.liquidation.liquidationReceipts(
                            receiptId
                        )
                    ).amountLiquidated

                    const orders = await provideOrders(
                        contracts,
                        liquidationAmount
                    )
                    const receipt = await (
                        await contracts.liquidation.calcUnitsSold(
                            [orders.wrongMakerOrder, orders.wrongMakerOrder],
                            modifiableTrader.address,
                            0
                        )
                    ).wait()
                    let eventCounter = 0
                    // Make sure InvalidClaimOrder is emitted correct number of times
                    receipt.events.filter((x) => {
                        if (
                            x.event === "InvalidClaimOrder" &&
                            x.args.receiptId == 0
                        ) {
                            eventCounter++
                        }
                    })
                    const expectedNumberOfEventEmissions = 2
                    expect(eventCounter).to.equal(
                        expectedNumberOfEventEmissions
                    )
                    const result =
                        await contracts.liquidation.callStatic.calcUnitsSold(
                            [orders.wrongMakerOrder, orders.wrongMakerOrder],
                            modifiableTrader.address,
                            0
                        )
                    expect(result[0]).to.equal(ethers.utils.parseEther("0")) // units sold
                    expect(result[1]).to.equal(ethers.utils.parseEther("0")) // avg price
                })
            }
        )

        context("When no orders given", async () => {
            it("Returns nothing ", async () => {
                console.log("1")
                const contracts = await setupReceiptTestNoFixture(modifiableTrader)
                const result =
                    await contracts.liquidation.callStatic.calcUnitsSold(
                        [],
                        modifiableTrader.address,
                        0
                    )
                await expect(result[0]).to.equal(0)
                await expect(result[1]).to.equal(0)
            })
        })
    })

    context("getLiquidationReceipt", async () => {
        context("after a receipt submission", async () => {
            it("Returns a valid receipt", async () => {})
        })

        context("on invalid submission", async () => {
            it("Returns nothing", async () => {})
        })
    })

    context("liquidate", async () => {
        context(
            "when liquidation would put liquidator below minimum margin",
            async () => {
                it("Reverts", async () => {})
            }
        )

        context("when agent isn't below margin", async () => {
            it("Reverts", async () => {})
        })

        context("when gas price is above fast gas price", async () => {
            it("Reverts", async () => {})
        })

        context("when negative liquidation amount", async () => {
            it("Reverts", async () => {})
        })

        context("when liquidation amount == 0", async () => {
            it("Reverts", async () => {})
        })
        context("when amount > agent base amount", async () => {
            it("Reverts", async () => {})
        })

        context("on full liquidation", async () => {
            it("Updates accounts and escrow correctly", async () => {})
        })

        context("on partial liquidation", async () => {
            it("Updates accounts and escrow correctly", async () => {})
        })
    })

    context("claimReceipt", async () => {
        context("when receipt doesn't exist", async () => {
            it("Reverts", async () => {})
        })

        context("when non-whitelisted trader is given", async () => {
            it("Reverts", async () => {})
        })

        context("when claim time has passed", async () => {
            it("Reverts ", async () => {})
        })

        context("when sender isn't liquidator", async () => {
            it("reverts", async () => {})
        })

        context("on a receipt that's already claimed", async () => {
            it("reverts", async () => {})
        })

        context("when slippage occurs - below escrow amount", async () => {
            it("Accurately updates accounts", async () => {})
        })

        context(
            "when slippage occurs - below escrow amount & empty insurance pool",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context(
            "when slippage occurs - below escrow amount & half-full insurance pool",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context(
            "when slippage occurs - below escrow amount & full insurance pool",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context(
            "when slippage occurs - above maxSlippage (caps at maxSlippage)",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context("when No slippage", async () => {
            it("Makes no changes (to all 3 accounts) ", async () => {})
        })

        context("when units sold is 0", async () => {
            it("Makes no changes (to all 3 accounts) ", async () => {})
        })
    })

    context("claimEscrow", async () => {
        context("when caller not liquidatee", async () => {
            it("Reverts ", async () => {})
        })

        context(
            "when receipt already claimed through claimEscrow",
            async () => {
                it("Reverts ", async () => {})
            }
        )

        context("when calling too early", async () => {
            it("Reverts ", async () => {})
        })

        context(
            "when receipt partially claimed by liquidator on claimReceipt",
            async () => {
                it("Claims accurately", async () => {})
            }
        )

        context(
            "when receipt fully claimed by liquidator on claimReceipt",
            async () => {
                it("Claims accurately", async () => {})
            }
        )

        context(
            "when receipt not claimed by liquidator on claimReceipt",
            async () => {
                it("Claims accurately", async () => {})
            }
        )
    })

    context("currentLiquidationId", async () => {
        context("liquidation ID", async () => {
            it("Correctly increments", async () => {})
        })
    })

    context("setMaxSlippage", async () => {
        context("maxSlippage", async () => {
            it("correctly updates ", async () => {})
        })
    })

    context("E2E", async () => {
        context("End-to-end Test", async () => {
            it("Passes", async () => {})
        })
    })
})
