const { expect, assert } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const {
    getTracer,
    getPricing,
    getQuoteToken,
    getTrader,
    getInsurance,
} = require("../util/DeploymentUtil.js")
const { depositQuoteTokens } = require("../util/OrderUtil.js")

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _tracer = await getTracer()

    return {
        trader: await getTrader(),
        tracer: _tracer,
        pricing: await getPricing(_tracer),
        insurance: await getInsurance(_tracer),
        quoteToken: await getQuoteToken(_tracer),
    }
})

describe("Unit tests: TracerPerpetualSwaps.sol Admin", function () {
    let tracer, trader, insurance, pricing, quoteToken
    let accounts
    let deployer

    beforeEach(async function () {
        ;({ tracer, trader, insurance, pricing, quoteToken } =
            await setupTests())
        accounts = await ethers.getSigners()
        deployer = (await getNamedAccounts()).deployer
    })

    describe("updateAccountsOnLiquidation", async () => {
        context("when not called by liquidation", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.updateAccountsOnLiquidation(
                        accounts[0].address,
                        accounts[1].address,
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1")
                    )
                ).to.be.revertedWith("TCR: Sender not liquidation")
            })
        })

        context("when the liquidators margin isn't valid", async () => {
            it("reverts", async () => {
                await tracer.setLiquidationContract(accounts[0].address)
                await expect(
                    tracer.updateAccountsOnLiquidation(
                        accounts[0].address,
                        accounts[1].address,
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1"),
                        ethers.utils.parseEther("1")
                    )
                ).to.be.revertedWith("TCR: Liquidator under min margin")
            })
        })

        context("when called with valid accounts", async () => {
            it("liquidates the account appropriately", async () => {
                await tracer.setLiquidationContract(accounts[0].address)
                await quoteToken
                    .connect(accounts[0])
                    .approve(tracer.address, ethers.utils.parseEther("500"))
                await tracer
                    .connect(accounts[0])
                    .deposit(ethers.utils.parseEther("500"))
                let balanceBeforeLiquidator = await tracer.balances(
                    accounts[0].address
                )
                let balanceBeforeLiquidatee = await tracer.balances(
                    accounts[1].address
                )
                await tracer.updateAccountsOnLiquidation(
                    accounts[0].address,
                    accounts[1].address,
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("-1"),
                    ethers.utils.parseEther("-1"),
                    ethers.utils.parseEther("0.5")
                )
                let balanceAfterLiquidator = await tracer.balances(
                    accounts[0].address
                )
                let balanceAfterLiquidatee = await tracer.balances(
                    accounts[1].address
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
                ).to.equal(ethers.utils.parseEther("1"))

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
                let one = ethers.utils.parseEther("1")
                await expect(
                    tracer.updateAccountsOnClaim(
                        deployer,
                        one,
                        deployer,
                        one,
                        one
                    )
                ).to.be.revertedWith("TCR: Sender not liquidation")
            })
        })

        context("when the insurance fund ends up empty", async () => {
            it("reverts", async () => {})
        })

        context("when called with valid params", async () => {
            it("takes from insurance", async () => {})

            it("gives to the claimaint", async () => {})

            it("gives to the liquidatee", async () => {})
        })
    })

    describe("setLiquidationContract", async () => {
        context("when called by the owner", async () => {
            it("sets a new liquidation contract address", async () => {
                await tracer.setLiquidationContract(deployer)

                expect(await tracer.liquidationContract()).to.equal(deployer)
            })

            it("emits an event", async () => {
                expect(await tracer.setLiquidationContract(deployer))
                    .to.emit(tracer, "LiquidationContractUpdated")
                    .withArgs(deployer)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                // Call setLiquidationContract by someone who isn't an owner -- used insurance contract as an example
                await expect(
                    tracer.connect(accounts[1]).setLiquidationContract(deployer)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("setInsuranceContract", async () => {
        context("when called by the owner", async () => {
            it("sets a new insurance contract address", async () => {
                await tracer.setInsuranceContract(deployer)

                expect(await tracer.insuranceContract()).to.equal(deployer)
            })

            it("emits an event", async () => {
                expect(await tracer.setInsuranceContract(deployer))
                    .to.emit(tracer, "InsuranceContractUpdated")
                    .withArgs(deployer)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.connect(accounts[1]).setLiquidationContract(deployer)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("setPricingContract", async () => {
        context("when called by the owner", async () => {
            it("sets a new pricing contract address", async () => {
                await tracer.setPricingContract(deployer)

                expect(await tracer.pricingContract()).to.equal(deployer)
            })

            it("emits an event", async () => {
                expect(await tracer.setPricingContract(deployer))
                    .to.emit(tracer, "PricingContractUpdated")
                    .withArgs(deployer)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.connect(accounts[1]).setPricingContract(deployer)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("setGasOracle", async () => {
        context("when called by the owner", async () => {
            it("sets a new gas oracle contract address", async () => {
                await tracer.setGasOracle(deployer)

                expect(await tracer.gasPriceOracle()).to.equal(deployer)
            })

            it("emits an event", async () => {
                expect(await tracer.setGasOracle(deployer))
                    .to.emit(tracer, "GasOracleUpdated")
                    .withArgs(deployer)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.connect(accounts[1]).setGasOracle(deployer)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("setFeeReceiver", async () => {
        context("when called by the owner", async () => {
            it("sets a new fee receiver contract address", async () => {
                await tracer.setFeeReceiver(insurance.address)

                expect(await tracer.feeReceiver()).to.equal(insurance.address)
            })

            context("when called by someone who isn't the owner", async () => {
                it("reverts", async () => {
                    await expect(
                        tracer.connect(accounts[1]).setFeeReceiver(deployer)
                    ).to.be.revertedWith("Ownable: caller is not the owner")
                })
            })

            it("emits an event", async () => {
                await expect(tracer.setFeeReceiver(insurance.address))
                    .to.emit(tracer, "FeeReceiverUpdated")
                    .withArgs(insurance.address)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.connect(accounts[1]).setGasOracle(deployer)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("withdrawFees", async () => {
        context("when called by the fee receiver", async () => {
            beforeEach(async () => {
                // make some trades and get some fees
                //1% fee
                await tracer.setFeeRate(ethers.utils.parseEther("0.01"))

                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [accounts[1], accounts[2]],
                    ethers.utils.parseEther("500")
                )

                now = Math.floor(new Date().getTime() / 1000)

                // make some basic trades
                let order1 = {
                    maker: accounts[1].address,
                    market: tracer.address,
                    price: ethers.utils.parseEther("1"),
                    amount: ethers.utils.parseEther("100"),
                    side: 0, // long,
                    expires: now + 604800, // now + 7 days
                    created: now - 100,
                }
                const mockSignedOrder1 = [
                    order1,
                    ethers.utils.formatBytes32String("DummyString"),
                    ethers.utils.formatBytes32String("DummyString"),
                    0,
                ]

                let order2 = {
                    maker: accounts[2].address,
                    market: tracer.address,
                    price: ethers.utils.parseEther("1"),
                    amount: ethers.utils.parseEther("100"),
                    side: 1, // short,
                    expires: now + 604800, // now + 7 days
                    created: now - 100,
                }
                const mockSignedOrder2 = [
                    order2,
                    ethers.utils.formatBytes32String("DummyString"),
                    ethers.utils.formatBytes32String("DummyString"),
                    0,
                ]

                await trader.executeTrade(
                    [mockSignedOrder1],
                    [mockSignedOrder2]
                )
            })

            it("withdraws the fees", async () => {
                let feeReceiver = await tracer.feeReceiver()
                let balanceBefore = await quoteToken.balanceOf(feeReceiver)
                await tracer.connect(accounts[0]).withdrawFees()
                let balanceAfter = await quoteToken.balanceOf(feeReceiver)
                // 2 quote tokens (8 decimals) received as fees (1% of 100 * 2)
                expect(balanceAfter.sub(balanceBefore)).to.equal("200000000")
            })

            it("resets fees to 0", async () => {
                let feesBefore = await tracer.fees()
                await tracer.connect(accounts[0]).withdrawFees()
                let feesAfter = await tracer.fees()
                expect(feesAfter).to.equal(0)
                // fees are represented in WAD format by the contract
                expect(feesBefore.sub(feesAfter)).to.equal(
                    ethers.utils.parseEther("2")
                )
            })

            it("emits a FeeWithdrawn event", async () => {
                let feeReceiver = await tracer.feeReceiver()
                await expect(tracer.withdrawFees())
                    .to.emit(tracer, "FeeWithdrawn")
                    .withArgs(feeReceiver, "200000000")
            })

            it("subtracts fees from the tvl of the market", async () => {
                let tvlBefore = await tracer.tvl()
                await tracer.connect(accounts[0]).withdrawFees()
                let tvlAfter = await tracer.tvl()
                expect(tvlBefore.sub(tvlAfter)).to.equal(
                    ethers.utils.parseEther("2")
                )
            })
        })
    })

    describe("setFeeRate", async () => {
        context("when called by the owner", async () => {
            it("sets a new fee rate", async () => {
                // See fee rate to 50%
                const newFeeRate = ethers.utils.parseEther("0.5")
                await tracer.setFeeRate(newFeeRate)

                expect(await tracer.feeRate()).to.equal(newFeeRate)
            })

            it("emits an event", async () => {
                expect(await tracer.setFeeRate(ethers.utils.parseEther("0.5")))
                    .to.emit(tracer, "FeeRateUpdated")
                    .withArgs(ethers.utils.parseEther("0.5"))
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setFeeRate(ethers.utils.parseEther("0.5"))
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context("when fee rate is greater than 100%", async () => {
            it("reverts", async () => {
                await expect(
                    // Set fee rate to 101%
                    tracer.setFeeRate(ethers.utils.parseEther("1.01"))
                ).to.be.revertedWith("TCR: Fee rate > 100")
            })
        })
    })

    describe("setMaxLeverage", async () => {
        context("when called by the owner", async () => {
            it("sets the new max leverage", async () => {
                await tracer.setMaxLeverage(ethers.utils.parseEther("12.5"))

                expect(await tracer.maxLeverage()).to.equal(
                    ethers.utils.parseEther("12.5")
                )
            })

            it("emits an event", async () => {
                expect(
                    await tracer.setMaxLeverage(ethers.utils.parseEther("12.5"))
                )
                    .to.emit(tracer, "MaxLeverageUpdated")
                    .withArgs(ethers.utils.parseEther("12.5"))
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setMaxLeverage(ethers.utils.parseEther("2"))
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context(
            "when max leverage is less than lowest max leverage",
            async () => {
                it("reverts", async () => {
                    await expect(
                        // lowest max leverage = 12.5
                        tracer.setMaxLeverage(ethers.utils.parseEther("2"))
                    ).to.be.revertedWith("TCR: Invalid max leverage")
                })
            }
        )
    })

    describe("setFundingRateSensitivity", async () => {
        context("when called by the owner", async () => {
            it("sets a new funding rate sensitivity", async () => {
                await tracer.setFundingRateSensitivity(
                    ethers.utils.parseEther("2")
                )

                expect(await tracer.fundingRateSensitivity()).to.equal(
                    ethers.utils.parseEther("2")
                )
            })

            it("emits an event", async () => {
                expect(
                    await tracer.setFundingRateSensitivity(
                        ethers.utils.parseEther("2")
                    )
                )
                    .to.emit(tracer, "FundingRateSensitivityUpdated")
                    .withArgs(ethers.utils.parseEther("2"))
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setFundingRateSensitivity(ethers.utils.parseEther("2"))
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("setDeleveragingCliff", async () => {
        context("when called by the owner", async () => {
            it("sets a new deleveraging cliff", async () => {
                await tracer.setDeleveragingCliff(ethers.utils.parseEther("2"))

                expect(await tracer.deleveragingCliff()).to.equal(
                    ethers.utils.parseEther("2")
                )
            })

            it("emits an event", async () => {
                expect(
                    await tracer.setDeleveragingCliff(
                        ethers.utils.parseEther("2")
                    )
                )
                    .to.emit(tracer, "DeleveragingCliffUpdated")
                    .withArgs(ethers.utils.parseEther("2"))
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setDeleveragingCliff(ethers.utils.parseEther("0.5"))
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context(
            "when deleveraging cliff is lower than pool switch stage",
            async () => {
                it("reverts", async () => {
                    // insurance pool switch stage = 1
                    await expect(
                        tracer.setDeleveragingCliff(
                            ethers.utils.parseEther("0.5")
                        )
                    ).to.be.revertedWith("TCR: Invalid delev cliff")
                })
            }
        )

        context("when deleveraging cliff is greater than 100%", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.setDeleveragingCliff(ethers.utils.parseEther("101"))
                ).to.be.revertedWith("TCR: Delev cliff > 100%")
            })
        })
    })

    describe("setLowestMaxLeverage", async () => {
        context("when called by the owner", async () => {
            it("sets a new lowest max leverage", async () => {
                await tracer.setLowestMaxLeverage(
                    ethers.utils.parseEther("0.5")
                )

                expect(await tracer.lowestMaxLeverage()).to.equal(
                    ethers.utils.parseEther("0.5")
                )
            })

            it("emits an event", async () => {
                expect(
                    await tracer.setLowestMaxLeverage(
                        ethers.utils.parseEther("0.5")
                    )
                )
                    .to.emit(tracer, "LowestMaxLeverageUpdated")
                    .withArgs(ethers.utils.parseEther("0.5"))
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setLowestMaxLeverage(ethers.utils.parseEther("0.5"))
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context(
            "when lowest max leverage is greater than max leverage",
            async () => {
                it("reverts", async () => {
                    // max leverage = 12.5
                    await expect(
                        tracer.setLowestMaxLeverage(
                            ethers.utils.parseEther("13")
                        )
                    ).to.be.revertedWith("TCR: Invalid low. max lev.")
                })
            }
        )
    })

    describe("setInsurancePoolSwitchStage", async () => {
        context("when called by the owner", async () => {
            it("sets a new insurance pool switch stage", async () => {
                await tracer.setInsurancePoolSwitchStage(
                    ethers.utils.parseEther("0.5")
                )

                expect(await tracer.insurancePoolSwitchStage()).to.equal(
                    ethers.utils.parseEther("0.5")
                )
            })

            it("emits an event", async () => {
                expect(
                    await tracer.setInsurancePoolSwitchStage(
                        ethers.utils.parseEther("0.5")
                    )
                )
                    .to.emit(tracer, "InsurancePoolSwitchStageUpdated")
                    .withArgs(ethers.utils.parseEther("0.5"))
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setInsurancePoolSwitchStage(
                            ethers.utils.parseEther("0.5")
                        )
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context(
            "when pool switch is greater than deleveraging cliff",
            async () => {
                it("reverts", async () => {
                    // deleveraging cliff = 20
                    await expect(
                        tracer.setInsurancePoolSwitchStage(
                            ethers.utils.parseEther("25")
                        )
                    ).to.be.revertedWith("TCR: Invalid pool switch")
                })
            }
        )
    })

    describe("setLiquidationGasCost", async () => {
        context("when called by the owner", async () => {
            it("sets the new liquidation gas cost", async () => {
                await tracer.setLiquidationGasCost(1)

                expect(await tracer.liquidationGasCost()).to.equal(1)
            })

            it("emits an event", async () => {
                expect(await tracer.setLiquidationGasCost(1))
                    .to.emit(tracer, "LiquidationGasCostUpdated")
                    .withArgs(1)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.connect(accounts[1]).setLiquidationGasCost(1)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("transferOwnership", async () => {
        context("when called by the owner", async () => {
            it("sets a new owner", async () => {
                await tracer.transferOwnership(insurance.address)

                expect(await tracer.owner()).to.equal(insurance.address)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .transferOwnership(pricing.address)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("setWhitelist", async () => {
        context("when called by the owner", async () => {
            it("whitelists a contract", async () => {
                await tracer.setWhitelist(accounts[1].address, true)

                expect(
                    await tracer.tradingWhitelist(accounts[1].address)
                ).to.equal(true)
            })

            it("can remove a contract from the whitelist", async () => {
                await tracer.setWhitelist(pricing.address, true)
                await tracer.setWhitelist(pricing.address, false)

                expect(await tracer.tradingWhitelist(pricing.address)).to.equal(
                    false
                )
            })

            it("emits an event", async () => {
                expect(await tracer.setWhitelist(accounts[1].address, true))
                    .to.emit(tracer, "WhitelistUpdated")
                    .withArgs(accounts[1].address, true)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                await expect(
                    tracer
                        .connect(accounts[1])
                        .setWhitelist(pricing.address, false)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })
})
