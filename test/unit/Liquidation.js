const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")
const { BigNumber } = require("ethers")
const {
    getTracer,
    getLiquidation,
    getQuoteToken,
} = require("../util/DeploymentUtil")

const liquidatorMargin = ethers.utils.parseEther("10000")

/**
 * liquidatee is in a liquidatable position
 * liquidator has sufficient margin and is connected to contracts
 */
const setupTests = deployments.createFixture(async () => {
    await deployments.fixture("GetIntoLiquidatablePosition")
    const accounts = await ethers.getSigners()
    const liquidator = accounts[2]

    let tracer = await getTracer()
    let liquidation = await getLiquidation(tracer)
    let token = await getQuoteToken(tracer)

    // connect contracts to liquidator
    tracer = tracer.connect(liquidator)
    liquidation = liquidation.connect(liquidator)
    token = token.connect(liquidator)

    // deposit large amount of tokens to ensure liquidator has sufficient margin
    await token.approve(tracer.address, liquidatorMargin)
    await tracer.deposit(liquidatorMargin)

    return {
        tracer: tracer,
        liquidation: liquidation,
        token: token,
    }
})

describe("Unit tests: Liquidation.sol", async () => {
    let liquidatee, liquidator

    before(async function () {
        accounts = await ethers.getSigners()
        liquidatee = accounts[0]
        liquidator = accounts[2]
    })

    context("liquidate", async () => {
        context(
            "when liquidation would put liquidator below minimum margin",
            async () => {
                it("Reverts", async () => {
                    const { tracer, liquidation } = await setupTests()

                    // withdraw all margin from liquidator
                    await tracer.withdraw(liquidatorMargin)

                    const liquidationAmount = (
                        await tracer.balances(liquidatee.address)
                    ).position.base

                    // Liquidate, but only quote token won't be enough to afford liquidating
                    const tx = liquidation.liquidate(
                        liquidationAmount,
                        liquidatee.address
                    )
                    await expect(tx).to.be.revertedWith(
                        "TCR: Liquidator under min margin"
                    )
                })
            }
        )

        context("when agent isn't below margin", async () => {
            it("Reverts", async () => {
                const { liquidation } = await setupTests()

                // Liquidate, but accounts[1] is above margin
                const tx = liquidation.liquidate("1", accounts[1].address)
                await expect(tx).to.be.revertedWith("LIQ: Account above margin")
            })
        })

        context(
            "when agent isn't below margin, then insurance pool drops and is below",
            async () => {
                it("Reverts when below, and allows liquidation when trueMaxLeverage drops", async () => {
                    const { tracer, liquidation, token } = await setupTests()

                    await token
                        .connect(accounts[1])
                        .approve(
                            tracer.address,
                            ethers.utils.parseEther("10000")
                        )
                    await tracer
                        .connect(accounts[1])
                        .deposit(ethers.utils.parseEther("100"))

                    // Liquidate, but accounts[1] is above margin
                    const invalidTx = liquidation.liquidate(
                        "1",
                        accounts[1].address
                    )
                    await expect(invalidTx).to.be.revertedWith(
                        "LIQ: Account above margin"
                    )

                    // Set lowestMaxLeverage to 1.5x
                    await tracer
                        .connect(liquidatee)
                        .setLowestMaxLeverage(ethers.utils.parseEther("1.5"))

                    // Liquidate, and now accounts[1] is below minimum margin
                    const tx = liquidation.liquidate("1", accounts[1].address)
                    await expect(tx).to.emit(liquidation, "Liquidate")
                })
            }
        )

        context("when gas price is above fast gas price", async () => {
            it("Reverts", async () => {
                const { tracer, liquidation } = await setupTests()

                const liquidationAmount = (
                    await tracer.balances(liquidatee.address)
                ).position.base

                // Liquidate with gas price (100 gwei) higher than actual gas price (20 gwei)
                const tx = liquidation.liquidate(
                    liquidationAmount,
                    liquidatee.address,
                    {
                        gasPrice: "100000000000",
                    }
                )
                await expect(tx).to.be.revertedWith("LIQ: GasPrice > FGasPrice")
            })
        })

        context("when negative liquidation amount", async () => {
            it("Reverts", async () => {
                const { liquidation } = await setupTests()

                // Liquidate with negative amount
                const tx = liquidation.liquidate(
                    ethers.utils.parseEther("-10000"),
                    liquidatee.address
                )
                await expect(tx).to.be.revertedWith(
                    "LIQ: Liquidation amount <= 0"
                )
            })
        })

        context("when amount > agent base amount", async () => {
            it("Reverts", async () => {
                const { tracer, liquidation } = await setupTests()

                const liquidationAmount = (
                    await tracer.balances(liquidatee.address)
                ).position.base

                // Liquidate with 1 more than agent's position
                const tx = liquidation.liquidate(
                    liquidationAmount.add(BigNumber.from("1")),
                    liquidatee.address
                )
                await expect(tx).to.be.revertedWith(
                    "LIQ: Liquidate Amount > Position"
                )
            })
        })

        context("when liquidation amount == 0", async () => {
            it("Reverts", async () => {
                const { liquidation } = await setupTests()

                // Liquidate with 0
                const tx = liquidation.liquidate(
                    ethers.utils.parseEther("0"),
                    liquidatee.address
                )
                await expect(tx).to.be.revertedWith(
                    "LIQ: Liquidation amount <= 0"
                )
            })
        })

        context("on full liquidation", async () => {
            it("Updates accounts and escrow correctly", async () => {
                const { tracer, liquidation } = await setupTests()

                const liquidateeBalance = await tracer.balances(
                    liquidatee.address
                )
                const liquidationAmount = liquidateeBalance.position.base

                const baseBefore = (await tracer.balances(liquidator.address))
                    .position.base

                // Normal liquidation
                await liquidation.liquidate(
                    liquidationAmount,
                    liquidatee.address
                )

                // escrowedAmount = [margin - (minMargin - margin)] = [500 - (782.86576 - 500)] = 217.13424
                const expectedEscrowedAmount =
                    ethers.utils.parseEther("217.13424")

                const escrowedAmount = (
                    await liquidation.liquidationReceipts(0)
                ).escrowedAmount
                expect(escrowedAmount).to.equal(expectedEscrowedAmount)

                const liquidateeBalanceAfter = await tracer.balances(
                    liquidatee.address
                )
                const leveragedValueAfter =
                    liquidateeBalanceAfter.totalLeveragedValue

                const balanceAfter = await tracer.balances(liquidator.address)
                const baseAfter = balanceAfter.position.base

                expect(liquidateeBalanceAfter.position.quote).to.equal("0")
                expect(liquidateeBalanceAfter.position.base).to.equal("0")
                expect(baseAfter).to.equal(baseBefore.add(liquidationAmount))
                expect(leveragedValueAfter).to.equal(BigNumber.from("0"))
            })
        })

        context("on partial liquidation", async () => {
            it("Updates accounts and escrow correctly", async () => {
                const { tracer, liquidation } = await setupTests()

                const liquidateeBalance = await tracer.balances(
                    liquidatee.address
                )
                const liquidationAmount = liquidateeBalance.position.base.div(2)
                const leveragedValueBefore =
                    liquidateeBalance.totalLeveragedValue

                const baseBefore = (await tracer.balances(liquidator.address))
                    .position.base

                // Normal liquidation
                await liquidation.liquidate(
                    liquidationAmount,
                    liquidatee.address
                )

                // minMargin = 6 * (0.00006*63515) + 9500/12.5
                // escrowAmount = (margin - (minMargin - margin)) / 2 = (500 - (782.86 - 500))/2 = 108.56712
                const expectedEscrowedAmount =
                    ethers.utils.parseEther("108.56712")

                const escrowedAmount = (
                    await liquidation.liquidationReceipts(0)
                ).escrowedAmount
                expect(escrowedAmount).to.equal(expectedEscrowedAmount)

                const liquidateeBalanceAfter = await tracer.balances(
                    liquidatee.address
                )
                const leveragedValueAfter =
                    liquidateeBalanceAfter.totalLeveragedValue

                const baseAfter = (await tracer.balances(liquidator.address))
                    .position.base

                // Leveraged value should half
                expect(leveragedValueAfter).to.equal(
                    leveragedValueBefore.div(2)
                )
                expect(baseAfter).to.equal(baseBefore.add(liquidationAmount))
            })
        })
    })
})
