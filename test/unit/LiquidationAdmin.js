const { expect } = require("chai")
const { ethers, deployments, getNamedAccounts } = require("hardhat")
const {
    getFactory,
    getTracer,
    getLiquidation,
} = require("../util/DeploymentUtil")

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _factory = await getFactory()
    _tracer = await getTracer(_factory)

    return {
        liquidation: await getLiquidation(_tracer),
    }
})

describe("Unit tests: Liquidation.sol admin", async () => {
    let deployer
    before(async function () {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
    })

    context("setReleaseTime", async () => {
        context("releaseTime", async () => {
            it("correctly updates ", async () => {
                const { liquidation } = await setupTests()

                // set multiplier as 20 minutes
                let newReleaseTime = 20 * 60
                await liquidation
                    .connect(deployer)
                    .setReleaseTime(newReleaseTime)
                expect(await liquidation.releaseTime()).to.equal(newReleaseTime)
            })

            it("emits an event", async () => {
                const { liquidation } = await setupTests()

                // set multiplier as 20 minutes
                let newReleaseTime = 20 * 60
                expect(
                    await liquidation
                        .connect(deployer)
                        .setReleaseTime(newReleaseTime)
                )
                    .to.emit(liquidation, "ReleaseTimeUpdated")
                    .withArgs(newReleaseTime)
            })
        })
    })

    context("setMinimumLeftoverGasCostMultiplier", async () => {
        context("maxSlippage", async () => {
            it("correctly updates ", async () => {
                const { liquidation } = await setupTests()

                // set multiplier as 8
                let newMultiplier = 8
                await liquidation
                    .connect(deployer)
                    .setMinimumLeftoverGasCostMultiplier(newMultiplier)
                expect(
                    await liquidation.minimumLeftoverGasCostMultiplier()
                ).to.equal(newMultiplier)
            })

            it("emits an event", async () => {
                const { liquidation } = await setupTests()

                // set multiplier as 8
                let newMultiplier = 8
                expect(
                    await liquidation
                        .connect(deployer)
                        .setMinimumLeftoverGasCostMultiplier(newMultiplier)
                )
                    .to.emit(
                        liquidation,
                        "MinimumLeftoverGasCostMultiplierUpdated"
                    )
                    .withArgs(newMultiplier)
            })
        })
    })

    context("setMaxSlippage", async () => {
        context("maxSlippage", async () => {
            it("correctly updates ", async () => {
                const { liquidation } = await setupTests()

                // set max slippage as 50%
                let newMaxSlippage = ethers.utils.parseEther("0.5")
                await liquidation
                    .connect(deployer)
                    .setMaxSlippage(newMaxSlippage)
                expect(await liquidation.maxSlippage()).to.equal(newMaxSlippage)
            })

            it("emits an event", async () => {
                const { liquidation } = await setupTests()

                // set max slippage as 50%
                let newMaxSlippage = ethers.utils.parseEther("0.5")
                expect(
                    await liquidation
                        .connect(deployer)
                        .setMaxSlippage(newMaxSlippage)
                )
                    .to.emit(liquidation, "MaxSlippageUpdated")
                    .withArgs(newMaxSlippage)
            })
        })

        context("when max slippage is greater than 100%", async () => {
            it("reverts", async () => {
                const { liquidation } = await setupTests()

                // set max slippage as 123%
                await expect(
                    liquidation
                        .connect(deployer)
                        .setMaxSlippage(ethers.utils.parseEther("123"))
                ).to.be.revertedWith("LIQ: Invalid max slippage")
            })
        })
    })
})
