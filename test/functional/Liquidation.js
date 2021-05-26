const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { smockit, smoddit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")

const halfLiquidate = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    const { tracerPerps, liquidation, trader, libPerpetuals } =
        await baseLiquidatablePosition()

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
    const tracerPerpsDeployment = await deployments.get("TracerPerpetualSwaps")
    let tracerPerpsInstance = await ethers.getContractAt(
        tracerPerpsDeployment.abi,
        tracerPerpsDeployment.address
    )

    const liquidationDeployment = await deployments.get("Liquidation")
    let liquidationInstance = await ethers.getContractAt(
        liquidationDeployment.abi,
        liquidationDeployment.address
    )

    const traderDeployment = await deployments.get("Trader")
    let traderInstance = await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )
    // liquidationInstance.connect(deployer)
    const libPerpetuals = await deployments.get("Perpetuals")
    const contracts = {
        tracerPerps: tracerPerpsInstance,
        liquidation: liquidationInstance,
        trader: traderInstance,
        libPerpetuals: libPerpetuals
    }

    return contracts
})

const sellForSlippage = deployments.createFixture(async () => {
    const contracts = await halfLiquidate()
})

describe("Liquidation functional tests", async () => {
    let accounts
    let tracerPerps
    let liquidation
    let trader
    let libPerpetuals
    before(async function () {
        accounts = await ethers.getSigners()
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
        context("When no orders given", async () => {
            it("Returns nothing ", async () => {
                const smocked = await smockCalcAmountToReturn()
                const result =
                    await smocked.liquidation.callStatic.calcUnitsSold(
                        [],
                        smocked.mockTrader.address,
                        0
                    )
                await expect(result[0]).to.equal(0)
                await expect(result[1]).to.equal(0)
            })
        })

        context("in the normal case", async () => {
            it("Calculates correctly", async () => {
                const smocked = await halfLiquidate()
                tracerPerps = smocked.tracerPerps
                liquidation = smocked.liquidation
                trader = smocked.mockTrader

                const liquidationAmount = (
                    await liquidation.liquidationReceipts(0)
                ).amountLiquidated
                const order = [
                    accounts[1].address,
                    tracerPerps.address,
                    ethers.utils.parseEther("1"),
                    liquidationAmount,
                    "1", // Short, because original position liquidated was long
                    (await ethers.provider.getBlock("latest")).timestamp + 100,
                    (await ethers.provider.getBlock("latest")).timestamp,
                ]
                const tx = await liquidation.callStatic.calcUnitsSold(
                    [order],
                    trader.address,
                    0
                )
                await expect(tx[0]).to.equal(ethers.utils.parseEther("5000"))
                await expect(tx[1]).to.equal(ethers.utils.parseEther("1"))
            })
        })

        context("when all invalid orders", async () => {
            it.only("Returns nothing ", async () => {
                const contracts = await baseLiquidatablePosition()
                const ModifiableTraderContract = await smoddit(
                    'Trader',
                    {
                        libraries: {
                            Perpetuals: contracts.libPerpetuals.address
                        }
                    }
                )
                const modifiableTrader = await ModifiableTraderContract.deploy()
                const liquidationAmount = (
                    await contracts.liquidation.liquidationReceipts(0)
                ).amountLiquidated
                
                const order = [
                    accounts[1].address,
                    contracts.tracerPerps.address,
                    1, // ethers.utils.parseEther("1"),
                    liquidationAmount,
                    "1", // Short, because original position liquidated was long
                    (await ethers.provider.getBlock("latest")).timestamp + 100,
                    (await ethers.provider.getBlock("latest")).timestamp,
                ]
                const hash = await modifiableTrader.hashOrder(order)

                console.log("HASH")
                console.log(hash)

                await modifiableTrader.smodify.put({
                    orders: {
                      hash: order,
                    },
                });
                console.log("modified")

                const orderMapping = await modifiableTrader.orders(hash)
                console.log("orderMapping")
                console.log(orderMapping)

                const orderRes = await modifiableTrader.getOrder(order)
                console.log("orderRes")
                console.log(orderRes)

                console.log("Hello")
                
                /*
                await modifiableTrader.smodify.put({
                  myInternalUint256: 1234
                })
                const smocked = await smockCalcAmountToReturn()
                tracerPerps = smocked.tracerPerps
                liquidation = smocked.liquidation
                trader = smocked.mockTrader
                const liquidationAmount = (
                    await smocked.liquidation.liquidationReceipts(0)
                ).amountLiquidated

                const invalidOrder1 = [
                    accounts[1].address,
                    tracerPerps.address,
                    ethers.utils.parseEther("1"),
                    liquidationAmount,
                    "0", // Long, which is invalid
                    (await ethers.provider.getBlock("latest")).timestamp + 100,
                    (await ethers.provider.getBlock("latest")).timestamp,
                ]
                const invalidOrder2 = [
                    accounts[1].address,
                    tracerPerps.address,
                    ethers.utils.parseEther("0"), // $0, which is invalid
                    liquidationAmount,
                    "0", // Short, because original position liquidated was long
                    (await ethers.provider.getBlock("latest")).timestamp + 100,
                    (await ethers.provider.getBlock("latest")).timestamp,
                ]

                const tx = await liquidation.callStatic.calcUnitsSold(
                    [invalidOrder1, invalidOrder2, invalidOrder2, invalidOrder1],
                    trader.address,
                    0
                )
                await expect(ethers.utils.parseEther("0")).to.equal(tx[0])
                await expect(ethers.utils.parseEther("0")).to.equal(tx[1])
                */
            })
        })

        context("when some invalid orders", async () => {
            it("Calculates correctly", async () => {})
        })

        context(
            "when some orders were created before the receipt",
            async () => {
                it("Calculates correctly", async () => {})
            }
        )

        context(
            "when some orders were created of the wrong side (e.g. long when they should be short)",
            async () => {
                it("Calculates correctly", async () => {})
            }
        )

        context(
            "when some orders have different maker to liquidator",
            async () => {
                it("Calculates correctly", async () => {})
            }
        )
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
