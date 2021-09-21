const { expect, assert } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const {
    getFactory,
    getTracer,
    getQuoteToken,
    getTrader,
} = require("../util/DeploymentUtil.js")

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _factory = await getFactory()
    _tracer = await getTracer(_factory)

    return {
        trader: await getTrader(),
        tracer: _tracer,
        quoteToken: await getQuoteToken(_tracer),
    }
})

describe("Unit tests: TracerPerpetualSwaps.sol Margins", function () {
    let tracer, quoteToken
    let accounts
    let deployer

    beforeEach(async function () {
        ;({ tracer, quoteToken } = await setupTests())
        accounts = await ethers.getSigners()
        deployer = (await getNamedAccounts()).deployer
    })

    describe("deposit", async () => {
        context("when the user has set allowance", async () => {
            beforeEach(async () => {
                await quoteToken.approve(
                    tracer.address,
                    ethers.utils.parseEther("5")
                )
                await tracer.deposit(ethers.utils.parseEther("5"))
            })
            it("updates their quote", async () => {
                let balance = await tracer.balances(deployer)
                await expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("5")
                )
            })

            it("updates the total TVL", async () => {
                let tvl = await tracer.tvl()
                expect(tvl).to.equal(ethers.utils.parseEther("5"))
            })

            it("emits an event", async () => {
                await quoteToken.approve(
                    tracer.address,
                    ethers.utils.parseEther("5")
                )

                await expect(tracer.deposit(ethers.utils.parseEther("5")))
                    .to.emit(tracer, "Deposit")
                    .withArgs(accounts[0].address, "5000000000000000000")
            })
        })

        context("when the user has not set allowance", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.deposit(ethers.utils.parseEther("5"))
                ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
            })
        })

        context("when the token amount is a WAD value", async () => {
            it("updates their quote without dust", async () => {
                let tokenBalanceBefore = await quoteToken.balanceOf(deployer)

                // token has 8 decimals, deposit 1 token with 1 dust
                await quoteToken.approve(
                    tracer.address,
                    ethers.utils.parseEther("1.000000001")
                )
                await tracer.deposit(ethers.utils.parseEther("1.000000001"))

                // ensure that token amount has decreased correctly
                let tokenBalanceAfter = await quoteToken.balanceOf(deployer)
                let difference = tokenBalanceBefore.sub(tokenBalanceAfter)

                // difference should be 1 token (with 8 decimals)
                expect(difference.toString()).to.equal("100000000")

                // default token only uses 8 decimals, so the last bit should be ignored in contract balance
                let expected = ethers.utils.parseEther("1.000000000")
                let balance = await tracer.balances(deployer)
                await expect(balance.position.quote).to.equal(expected)

                // check TVL has been updated without dust
                let tvl = await tracer.tvl()
                await expect(tvl).to.be.equal(expected)
            })
        })
    })

    describe("withdraw", async () => {
        beforeEach(async () => {
            await quoteToken.approve(
                tracer.address,
                ethers.utils.parseEther("5")
            )
            await tracer.deposit(ethers.utils.parseEther("5"))
        })
        context("when the user is withdrawing to below margin", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.withdraw(ethers.utils.parseEther("6"))
                ).to.be.revertedWith("TCR: Withdraw below valid Margin")
            })
        })

        context("when the user is making a valid withdraw", async () => {
            beforeEach(async () => {
                await tracer.withdraw(ethers.utils.parseEther("1"))
            })
            it("updates their quote", async () => {
                let balance = await tracer.balances(deployer)
                expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("4")
                )
            })

            it("updates their leverage", async () => {})

            it("updates the total TVL", async () => {
                let tvl = await tracer.tvl()
                expect(tvl).to.equal(ethers.utils.parseEther("4"))
            })

            it("emits an event", async () => {
                await expect(tracer.withdraw(ethers.utils.parseEther("1")))
                    .to.emit(tracer, "Withdraw")
                    .withArgs(accounts[0].address, "1000000000000000000")
            })
        })

        context("when the token amount is a WAD value", async () => {
            it("returns the correct amount of tokens", async () => {
                let tokenBalanceBefore = await quoteToken.balanceOf(deployer)

                // withdraw 1 token with dust
                await tracer.withdraw(ethers.utils.parseEther("1.000000001"))

                // ensure that token amount has decreased by correct units
                let tokenBalanceAfter = await quoteToken.balanceOf(deployer)
                let difference = tokenBalanceAfter.sub(tokenBalanceBefore)

                // user token balance should decrease by 1 (with 8 decimals)
                expect(difference).to.equal("100000000")

                // default token only uses 8 decimals, so the last bit should be ignored in contract balance
                let expected = ethers.utils.parseEther("4.000000000")
                let balance = await tracer.balances(deployer)
                await expect(balance.position.quote).to.equal(expected)

                // check TVL has been updated without dust
                let tvl = await tracer.tvl()
                await expect(tvl).to.be.equal(expected)
            })
        })
    })
})
