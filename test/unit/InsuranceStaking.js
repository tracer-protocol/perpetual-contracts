const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")
const {
    getQuoteToken,
    getInsurance,
    getTracer,
} = require("../util/DeploymentUtil")

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

    describe("withdraw", async () => {
        context("when the user does not have enough pool tokens", async () => {
            it("reverts", async () => {
                await expect(
                    insurance.withdraw(ethers.utils.parseEther("1"))
                ).to.be.revertedWith("INS: balance < amount")
            })
        })

        context("when the user has enough pool tokens", async () => {
            beforeEach(async () => {
                // get user tp acquire some pool tokens
                await quoteToken.approve(
                    insurance.address,
                    ethers.utils.parseEther("2")
                )
                await insurance.deposit(ethers.utils.parseEther("2"))
                // get user to burn some pool tokens
                await insurance.withdraw(ethers.utils.parseEther("1"))
            })

            it("burns pool tokens", async () => {
                let poolTokenHolding = await insurance.getPoolUserBalance(
                    accounts[0].address
                )
                expect(poolTokenHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("decreases the collateral holdings of the insurance fund", async () => {
                let collateralHolding = await insurance.publicCollateralAmount()
                expect(collateralHolding).to.equal(ethers.utils.parseEther("1"))
            })

            it("pulls in collateral from the tracer market", async () => {})

            it("emits an insurance withdraw event", async () => {})
        })
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
