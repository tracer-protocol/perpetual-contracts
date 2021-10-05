const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")
const { BigNumber } = require("ethers")

const { getTracer, getQuoteToken } = require("../util/DeploymentUtil.js")
const { depositQuoteTokens } = require("../util/OrderUtil.js")

const one = ethers.utils.parseEther("1")

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _tracer = await getTracer()

    return {
        tracer: _tracer,
        quoteToken: await getQuoteToken(_tracer),
    }
})

describe("Unit tests: TracerPerpetualSwaps.sol Liquidate funcs", function () {
    let liquidator, liquidatee, insurance

    before(async () => {
        accounts = await ethers.getSigners()
        liquidator = accounts[0]
        liquidatee = accounts[1]
        insurance = accounts[2]
    })

    describe("updateAccountsOnLiquidation", async () => {
        context("when not called by liquidation", async () => {
            it("reverts", async () => {
                const { tracer } = await setupTests()

                await expect(
                    tracer.updateAccountsOnLiquidation(
                        liquidator.address,
                        liquidatee.address,
                        one,
                        one,
                        one,
                        one,
                        one
                    )
                ).to.be.revertedWith("TCR: Sender not liquidation")
            })
        })

        context("when the liquidators margin isn't valid", async () => {
            it("reverts", async () => {
                const { tracer } = await setupTests()

                await tracer.setLiquidationContract(liquidator.address)
                await expect(
                    tracer.updateAccountsOnLiquidation(
                        liquidator.address,
                        liquidatee.address,
                        one,
                        one,
                        one,
                        one,
                        one
                    )
                ).to.be.revertedWith("TCR: Liquidator under min margin")
            })
        })

        context("when called with valid accounts", async () => {
            it("liquidates the account appropriately", async () => {
                const { tracer, quoteToken } = await setupTests()

                await tracer.setLiquidationContract(liquidator.address)
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [liquidator],
                    ethers.utils.parseEther("500")
                )
                let balanceBeforeLiquidator = await tracer.balances(
                    liquidator.address
                )
                let balanceBeforeLiquidatee = await tracer.balances(
                    liquidatee.address
                )
                await tracer.updateAccountsOnLiquidation(
                    liquidator.address,
                    liquidatee.address,
                    one,
                    one,
                    ethers.utils.parseEther("-1"),
                    ethers.utils.parseEther("-1"),
                    ethers.utils.parseEther("0.5")
                )
                let balanceAfterLiquidator = await tracer.balances(
                    liquidator.address
                )
                let balanceAfterLiquidatee = await tracer.balances(
                    liquidatee.address
                )

                // quote: gained 1 but escorwed 0.5 for net 0.5 gain
                expect(
                    balanceAfterLiquidator.position.quote.sub(
                        balanceBeforeLiquidator.position.quote
                    )
                ).to.equal(ethers.utils.parseEther("0.5"))

                // quote: lost 1
                expect(
                    balanceAfterLiquidatee.position.quote.sub(
                        balanceBeforeLiquidatee.position.quote
                    )
                ).to.equal(ethers.utils.parseEther("-1"))

                // base: gained 1
                expect(
                    balanceAfterLiquidator.position.base.sub(
                        balanceBeforeLiquidator.position.base
                    )
                ).to.equal(one)

                // base: lost 1
                expect(
                    balanceAfterLiquidatee.position.base.sub(
                        balanceBeforeLiquidatee.position.base
                    )
                ).to.equal(ethers.utils.parseEther("-1"))
            })
        })
    })

    describe("updateAccountsOnClaim", async () => {
        context("when not called by liquidation", async () => {
            it("reverts", async () => {
                const { tracer } = await setupTests()

                await expect(
                    tracer.updateAccountsOnClaim(
                        liquidator.address,
                        one,
                        liquidator.address,
                        one,
                        one
                    )
                ).to.be.revertedWith("TCR: Sender not liquidation")
            })
        })

        context("when the insurance fund ends up empty", async () => {
            it("reverts", async () => {
                const { tracer, quoteToken } = await setupTests()

                await tracer.setLiquidationContract(liquidator.address)

                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [liquidator],
                    ethers.utils.parseEther("500")
                )

                // insurance pool has nothing in it
                await expect(
                    tracer.updateAccountsOnClaim(
                        liquidator.address,
                        one,
                        liquidator.address,
                        one,
                        one
                    )
                ).to.be.revertedWith("TCR: Insurance not funded enough")
            })
        })

        context("when called with valid params", async () => {
            let tracer, quoteToken
            let initialBalance
            let amountToGiveClaimant,
                amountToGiveToLiquidatee,
                amountToTakeFromInsurance

            beforeEach(async () => {
                ;({ tracer, quoteToken } = await setupTests())
                await tracer.setLiquidationContract(liquidator.address)
                await tracer.setInsuranceContract(insurance.address)

                // set up accounts with initial quote balances:
                // liquidator: 500
                // insurance pool: 500
                // liquidatee: 0

                // deposit 500 tokens to liquidator and insurance balance
                initialBalance = ethers.utils.parseEther("500")
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [liquidator, insurance],
                    initialBalance
                )

                // give 100 to liquidator
                // give 100 to liquidatee
                // take 200 from insurance pool
                amountToGiveClaimant = ethers.utils.parseEther("100")
                amountToGiveToLiquidatee = ethers.utils.parseEther("100")
                amountToTakeFromInsurance = ethers.utils.parseEther("200")
                await tracer.updateAccountsOnClaim(
                    liquidator.address,
                    amountToGiveClaimant,
                    liquidatee.address,
                    amountToGiveToLiquidatee,
                    amountToTakeFromInsurance
                )
            })

            it("takes from insurance", async () => {
                const insuranceBalance = await tracer.balances(
                    insurance.address
                )
                expect(insuranceBalance.position.quote).to.equal(
                    initialBalance.sub(amountToTakeFromInsurance)
                )
            })

            it("gives to the claimaint", async () => {
                const liquidatorBalance = await tracer.balances(
                    liquidator.address
                )
                expect(liquidatorBalance.position.quote).to.equal(
                    initialBalance.add(amountToGiveClaimant)
                )
            })

            it("gives to the liquidatee", async () => {
                const liquidateeBalance = await tracer.balances(
                    liquidatee.address
                )
                expect(liquidateeBalance.position.quote).to.equal(
                    amountToGiveToLiquidatee
                )
            })
        })
    })
})
