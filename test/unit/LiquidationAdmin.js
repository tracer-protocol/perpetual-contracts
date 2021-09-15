const perpsAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { smockit, smoddit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")

const provideOrders = async (contracts, liquidationAmount) => {
    const timestamp = contracts.timestamp
    const sellWholeLiquidationAmount = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: liquidationAmount,
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 1,
    }

    const sellWholeLiquidationAmountTinySlippage = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.94").toString(),
        amount: liquidationAmount,
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 1,
    }

    const sellWholeLiquidationAmountZeroTokens = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: "0",
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 1,
    }

    const sellWholeLiquidationAmountUseNoSlippage = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.01").toString(),
        amount: liquidationAmount,
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 1,
    }

    const sellHalfLiquidationAmount = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 1,
    }

    const sellHalfLiquidationAmountSecond = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 2,
    }

    const sellHalfLiquidationAmountThird = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 3,
    }

    const sellLiquidationAmountNoSlippage = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.95").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp + 2,
    }

    const longOrder = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: liquidationAmount,
        side: "0", // Long, which is invalid
        expires: timestamp + 100,
        created: timestamp,
    }

    const zeroDollarOrder = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: "0", // $0
        amount: liquidationAmount,
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: timestamp,
    }

    const earlyCreationOrder = {
        maker: accounts[1].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: 0,
    }

    const wrongMakerOrder = {
        maker: accounts[2].address,
        market: contracts.tracerPerps.address,
        price: ethers.utils.parseEther("0.5").toString(),
        amount: ethers.BigNumber.from(liquidationAmount).div(2).toString(),
        side: "1", // Short, because original position liquidated was long
        expires: timestamp + 100,
        created: 0,
    }

    orders = {
        sellWholeLiquidationAmount: sellWholeLiquidationAmount,
        sellWholeLiquidationAmountTinySlippage:
            sellWholeLiquidationAmountTinySlippage,
        sellHalfLiquidationAmount: sellHalfLiquidationAmount,
        sellHalfLiquidationAmountSecond: sellHalfLiquidationAmountSecond,
        sellHalfLiquidationAmountThird: sellHalfLiquidationAmountThird,
        longOrder: longOrder,
        zeroDollarOrder: zeroDollarOrder,
        earlyCreationOrder: earlyCreationOrder,
        wrongMakerOrder: wrongMakerOrder,
        sellWholeLiquidationAmountUseNoSlippage:
            sellWholeLiquidationAmountUseNoSlippage,
        sellLiquidationAmountNoSlippage: sellLiquidationAmountNoSlippage,
        sellWholeLiquidationAmountZeroTokens:
            sellWholeLiquidationAmountZeroTokens,
    }

    return orders
}

const halfLiquidate = deployments.createFixture(async () => {
    const contracts = await baseLiquidatablePosition()
    const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    const { tracerPerps, liquidation } = contracts

    // Get half the base. Liquidate this amount
    const halfBase = (await tracerPerps.getBalance(deployer)).position.base.div(
        2
    )

    await liquidation.connect(accounts[1]).liquidate(halfBase, deployer)

    const timestamp = (await ethers.provider.getBlock("latest")).timestamp

    return { ...contracts, timestamp }
})

const invalidLiquidate = async () => {
    const contracts = await baseLiquidatablePosition()
    const { deployer } = await getNamedAccounts()
    accounts = await ethers.getSigners()
    const { tracerPerps, liquidation, trader, libPerpetuals } = contracts

    // Get half the base. Liquidate this amount
    const doubleBase = (
        await tracerPerps.getBalance(deployer)
    ).position.base.mul(2)

    const tx = liquidation.connect(accounts[1]).liquidate(doubleBase, deployer)
    await expect(tx).to.be.reverted

    return { tracerPerps, liquidation, trader, libPerpetuals }
}

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

    let insuranceInstance = new ethers.Contract(
        await tracerPerpsInstance.insuranceContract(),
        insuranceAbi,
        ethers.provider
    )
    insuranceInstance = await insuranceInstance.connect(accounts[0])

    const traderDeployment = await deployments.get("Trader")
    let traderInstance = await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )

    const tokenDeployment = await deployments.get("QuoteToken")
    let token = await ethers.getContractAt(
        tokenDeployment.abi,
        tokenDeployment.address
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
        token: token,
        insurance: insuranceInstance,
    }

    return contracts
})

const addOrdersToModifiedTrader = async (
    modifiableTrader,
    contracts,
    orders
) => {
    for (const [key, order] of Object.entries(orders)) {
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

        if (key === "sellWholeLiquidationAmountUseNoSlippage") {
            await modifiableTrader.smodify.put({
                averageExecutionPrice: {
                    [hash]: ethers.utils.parseEther("0.95").toString(), // no slippage on actual executionPrice
                },
            })
        } else {
            await modifiableTrader.smodify.put({
                averageExecutionPrice: {
                    [hash]: order.price,
                },
            })
        }
    }
}

/**
 * 1) Deploy smodded Trader contract
 * 2) Get into liquidatable position
 * 3) liquidate half the position
 * 4) Put in fake orders into smodded Trader contract
 */
const setupReceiptTest = deployments.createFixture(async () => {
    const { modifiableTrader } = await deployModifiableTrader()
    const contracts = await halfLiquidate()

    const liquidationAmount = (
        await contracts.liquidation.liquidationReceipts(0)
    ).amountLiquidated.toString()
    const orders = await provideOrders(
        contracts,
        liquidationAmount,
        contracts.timestamp
    )

    await addOrdersToModifiedTrader(modifiableTrader, contracts, orders)
    return { ...contracts, modifiableTrader, ...orders }
})

const deployModifiableTrader = deployments.createFixture(async () => {
    const ModifiableTraderContract = await smoddit("Trader", {
        libraries: {
            // Perpetuals: contracts.libPerpetuals.address
        },
    })
    const modifiableTrader = await ModifiableTraderContract.deploy()
    return { modifiableTrader }
})

describe("Unit tests: Liquidation.sol admin", async () => {
    let accounts
    let tracerPerps
    let liquidation
    let trader
    let libPerpetuals
    const fifteenMinutes = 60 * 15
    before(async function () {
        accounts = await ethers.getSigners()
    })
    context("setReleaseTime", async () => {
        context("releaseTime", async () => {
            it("correctly updates ", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set multiplier as 20 minutes
                let newReleaseTime = 20 * 60
                await contracts.liquidation
                    .connect(accounts[0])
                    .setReleaseTime(newReleaseTime)
                expect(await contracts.liquidation.releaseTime()).to.equal(
                    newReleaseTime
                )
            })

            it("emits an event", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set multiplier as 20 minutes
                let newReleaseTime = 20 * 60
                expect(
                    await contracts.liquidation
                        .connect(accounts[0])
                        .setReleaseTime(newReleaseTime)
                )
                    .to.emit(contracts.liquidation, "ReleaseTimeUpdated")
                    .withArgs(newReleaseTime)
            })
        })
    })

    context("setMinimumLeftoverGasCostMultiplier", async () => {
        context("maxSlippage", async () => {
            it("correctly updates ", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set multiplier as 8
                let newMultiplier = 8
                await contracts.liquidation
                    .connect(accounts[0])
                    .setMinimumLeftoverGasCostMultiplier(newMultiplier)
                expect(
                    await contracts.liquidation.minimumLeftoverGasCostMultiplier()
                ).to.equal(newMultiplier)
            })

            it("emits an event", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set multiplier as 8
                let newMultiplier = 8
                expect(
                    await contracts.liquidation
                        .connect(accounts[0])
                        .setMinimumLeftoverGasCostMultiplier(newMultiplier)
                )
                    .to.emit(
                        contracts.liquidation,
                        "MinimumLeftoverGasCostMultiplierUpdated"
                    )
                    .withArgs(newMultiplier)
            })
        })
    })

    context("setMaxSlippage", async () => {
        context("maxSlippage", async () => {
            it("correctly updates ", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set max slippage as 50%
                let newMaxSlippage = ethers.utils.parseEther("0.5")
                await contracts.liquidation
                    .connect(accounts[0])
                    .setMaxSlippage(newMaxSlippage)
                expect(await contracts.liquidation.maxSlippage()).to.equal(
                    newMaxSlippage
                )
            })

            it("emits an event", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set max slippage as 50%
                let newMaxSlippage = ethers.utils.parseEther("0.5")
                expect(
                    await contracts.liquidation
                        .connect(accounts[0])
                        .setMaxSlippage(newMaxSlippage)
                )
                    .to.emit(contracts.liquidation, "MaxSlippageUpdated")
                    .withArgs(newMaxSlippage)
            })
        })

        context("when max slippage is greater than 100%", async () => {
            it("reverts", async () => {
                const contracts = await setupReceiptTest()
                accounts = await ethers.getSigners()
                // set max slippage as 123%
                await expect(
                    contracts.liquidation
                        .connect(accounts[0])
                        .setMaxSlippage(ethers.utils.parseEther("123"))
                ).to.be.revertedWith("LIQ: Invalid max slippage")
            })
        })
    })
})
