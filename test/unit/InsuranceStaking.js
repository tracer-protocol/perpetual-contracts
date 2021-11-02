const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")
const {
    getQuoteToken,
    getInsurance,
    getTracer,
} = require("../util/DeploymentUtil")
const { depositToInsurance } = require("../util/InsuranceUtil")

const withdrawCooldown = 5 * 86400 // 5 days
const withdrawWindow = 2 * 86400 // 2 days

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    tracer = await getTracer()

    return {
        tracer: tracer,
        quoteToken: await getQuoteToken(tracer),
        insurance: await getInsurance(tracer),
    }
})

describe("Unit tests: Insurance.sol", function () {
    let accounts
    let tracer, quoteToken, insurance

    beforeEach(async function () {
        ;({ tracer, quoteToken, insurance } = await setupTests())
        accounts = await ethers.getSigners()
    })

    describe("deposit", async () => {
        context("when the user does not have enough tokens", async () => {
            it("reverts", async () => {
                await expect(
                    insurance.deposit(ethers.utils.parseEther("1"))
                ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
            })
        })

        context("when the user has enough tokens", async () => {
            beforeEach(async () => {
                await quoteToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("1")
                )
                await insurance.deposit(ethers.utils.parseEther("1"))
            })

            it("mints them pool tokens", async () => {
                let poolTokenHolding = await insurance.getPoolUserBalance(
                    accounts[0].address
                )
                expect(poolTokenHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("increases the collateral holding of the insurance fund", async () => {
                let collateralHolding = await insurance.publicCollateralAmount()
                expect(collateralHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("pulls in collateral from the tracer market", async () => {})

            it("emits an insurance deposit event", async () => {
                await quoteToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("1")
                )
                expect(await insurance.deposit(ethers.utils.parseEther("1")))
                    .to.emit(insurance, "InsuranceDeposit")
                    .withArgs(
                        tracer.address,
                        accounts[0].address,
                        ethers.utils.parseEther("1")
                    )
            })
        })
    })

    describe("intendToWithdraw", async () => {
        context("when user has zero balance", async () => {
            it("reverts", async () => {
                await expect(
                    insurance
                        .intendToWithdraw()
                        .to.be.revertedWith("INS: Zero balance")
                )
            })
        })

        context("when user has balance", async () => {
            it("emits event", async () => {
                await depositToInsurance(
                    insurance,
                    quoteToken,
                    ethers.utils.parseEther("1")
                )
                await expect(
                    insurance.intendToWithdraw().to.emit(insurance, "Cooldown")
                )
            })
        })
    })

    describe("cancelWithdraw", async () => {
        context("when user has not called intendToWithdraw", async () => {
            it("reverts", async () => {
                await expect(
                    insurance
                        .cancelWithdraw()
                        .to.be.revertedWith("INS: Not withdrawing")
                )
            })
        })

        context("when user has called intendToWithdraw", async () => {
            let tx

            beforeEach(async () => {
                await depositToInsurance(
                    insurance,
                    quoteToken,
                    ethers.utils.parseEther("1")
                )
                await insurance.intendToWithdraw()
                tx = await insurance.cancelWithdraw()
            })

            it("resets the users cooldown", async () => {
                await expect(
                    insurance.withdrawCooldown(accounts[0].address)
                ).to.equal(0)
            })

            it("resets the users cooldown", async () => {
                await expect(tx)
                    .to.emit(insurance, "Cooldown")
                    .withArgs(accounts[0].address, 0)
            })
        })
    })

    describe("withdraw", async () => {
        context("when the user has not called intendToWithdraw", async () => {
            it("reverts", async () => {
                await expect(
                    insurance
                        .withdraw(ethers.utils.parseEther("1"))
                        .to.be.revertedWith("INS: Funds locked")
                )
            })
        })

        context(
            "when the user calls intendToWithdraw but cooldown window has not passed",
            async () => {
                it("reverts", async () => {
                    await depositToInsurance(
                        insurance,
                        quoteToken,
                        ethers.utils.parseEther("2")
                    )
                    await insurance.intendToWithdraw()
                    await expect(
                        insurance
                            .withdraw(ethers.utils.parseEther("1"))
                            .to.be.revertedWith("INS: Funds locked")
                    )
                })
            }
        )

        context(
            "when the user calls intendToWithdraw and is in withdraw window",
            async () => {
                context(
                    "when the user does not have enough pool tokens",
                    async () => {
                        it("reverts", async () => {
                            await depositToInsurance(
                                insurance,
                                quoteToken,
                                ethers.utils.parseEther("2")
                            )
                            await insurance.intendToWithdraw()
                            await forwardTime(withdrawCooldown)
                            await expect(
                                insurance.withdraw(ethers.utils.parseEther("5"))
                            ).to.be.revertedWith("INS: balance < amount")
                        })
                    }
                )

                context("when the user has enough pool tokens", async () => {
                    let tx, amount

                    beforeEach(async () => {
                        // get user tp acquire some pool tokens
                        await depositToInsurance(
                            insurance,
                            quoteToken,
                            ethers.utils.parseEther("2")
                        )
                        await insurance.intendToWithdraw()
                        await forwardTime(withdrawCooldown)
                        // get user to burn some pool tokens
                        amount = ethers.utils.paresEther("1")
                        tx = await insurance.withdraw(amount)
                    })

                    it("burns pool tokens", async () => {
                        let poolTokenHolding =
                            await insurance.getPoolUserBalance(
                                accounts[0].address
                            )
                        expect(poolTokenHolding).to.equal(amount)
                    })

                    it("decreases the collateral holdings of the insurance fund", async () => {
                        let collateralHolding =
                            await insurance.publicCollateralAmount()
                        expect(collateralHolding).to.equal(amount)
                    })

                    it("emits an insurance withdraw event", async () => {
                        expect(tx)
                            .to.emit(insurance, "InsuranceWithdraw")
                            .withArgs(
                                tracer.address,
                                accounts[0].address,
                                amount
                            )
                    })
                })
            }
        )

        context(
            "when the user calls intendToWithdraw and withdraw window has passed",
            async () => {
                it("reverts", async () => {
                    await depositToInsurance(
                        insurance,
                        quoteToken,
                        ethers.utils.parseEther("2")
                    )
                    await insurance.intendToWithdraw()
                    await forwardTime(withdrawCooldown + withdrawWindow)
                    await expect(
                        insurance.withdraw(ethers.utils.parseEther("5"))
                    ).to.be.revertedWith("INS: balance < amount")
                })
            }
        )
    })

    describe("getPoolBalance", async () => {
        context("when called", async () => {
            it("returns the balance of a user in terms of the pool token", async () => {
                await quoteToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("2")
                )
                await insurance.deposit(ethers.utils.parseEther("2"))
                let poolBalance = await insurance.getPoolUserBalance(
                    accounts[0].address
                )
                expect(poolBalance).to.equal(ethers.utils.parseEther("2"))
            })
        })
    })
})
