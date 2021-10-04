const { expect } = require("chai")
const { ethers, deployments } = require("hardhat")
const {
    getTracer,
    getQuoteToken,
    getTrader,
    getGasEthOracle,
    getPriceOracle,
} = require("../util/DeploymentUtil.js")
const { executeTrade, depositQuoteTokens } = require("../util/OrderUtil.js")

const setupTests = deployments.createFixture(async () => {
    await deployments.fixture(["FullDeployTest"])
    _tracer = await getTracer()

    return {
        trader: await getTrader(),
        tracer: _tracer,
        quoteToken: await getQuoteToken(_tracer),
        gasEthOracle: await getGasEthOracle(),
        oracle: await getPriceOracle(),
    }
})

const getIntoLeveragedPosition = async (
    tracer,
    trader,
    quoteToken,
    oracle,
    gasEthOracle,
    accounts
) => {
    // sets leveraged value of accounts[0] to 15
    // initial balance: quote: 5, base: 0
    await depositQuoteTokens(
        tracer,
        quoteToken,
        [accounts[0], accounts[1]],
        ethers.utils.parseEther("5")
    )

    const markPrice = 2 * 10 ** 8
    await oracle.setPrice(markPrice)
    await gasEthOracle.setPrice(markPrice)

    orderPrice = ethers.utils.parseEther("2")
    orderAmount = ethers.utils.parseEther("10")

    await executeTrade(
        tracer,
        trader,
        orderPrice,
        orderAmount,
        accounts[0].address,
        accounts[1].address
    )
    // balance after trade: quote: -15, base: 10
    // leveraged value of accounts[0]: 15
    const priorBalance = await tracer.balances(accounts[0].address)
    expect(priorBalance.totalLeveragedValue).to.equal(
        ethers.utils.parseEther("15")
    )
}

describe("Unit tests: TracerPerpetualSwaps.sol Margins", function () {
    let tracer, trader, quoteToken, gasEthOracle, oracle
    let accounts

    beforeEach(async function () {
        ;({ tracer, trader, quoteToken, gasEthOracle, oracle } =
            await setupTests())
        accounts = await ethers.getSigners()
    })

    describe("deposit", async () => {
        context("when the user has set allowance", async () => {
            it("updates their quote", async () => {
                const balance = await tracer.balances(accounts[0].address)
                await expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("5")
                )
            })

            it("updates their leverage", async () => {
                await getIntoLeveragedPosition(
                    tracer,
                    trader,
                    quoteToken,
                    oracle,
                    gasEthOracle,
                    accounts
                )

                // deposit 5 quote tokens
                await depositQuoteTokens(
                    tracer,
                    quoteToken,
                    [accounts[0]],
                    ethers.utils.parseEther("5")
                )

                const postBalance = await tracer.balances(accounts[0].address)
                expect(postBalance.totalLeveragedValue).to.equal(
                    ethers.utils.parseEther("10")
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
                let tokenBalanceBefore = await quoteToken.balanceOf(
                    accounts[0].address
                )

                // token has 8 decimals, deposit 1 token with 1 dust
                await quoteToken.approve(
                    tracer.address,
                    ethers.utils.parseEther("1.000000001")
                )
                await tracer.deposit(ethers.utils.parseEther("1.000000001"))

                // ensure that token amount has decreased correctly
                let tokenBalanceAfter = await quoteToken.balanceOf(
                    accounts[0].address
                )
                let difference = tokenBalanceBefore.sub(tokenBalanceAfter)

                // difference should be 1 token (with 8 decimals)
                expect(difference.toString()).to.equal("100000000")

                // default token only uses 8 decimals, so the last bit should be ignored in contract balance
                let expected = ethers.utils.parseEther("1.000000000")
                let balance = await tracer.balances(accounts[0].address)
                await expect(balance.position.quote).to.equal(expected)

                // check TVL has been updated without dust
                let tvl = await tracer.tvl()
                await expect(tvl).to.be.equal(expected)
            })
        })
    })

    describe("withdraw", async () => {
        beforeEach(async () => {
            await depositQuoteTokens(
                tracer,
                quoteToken,
                [accounts[0]],
                ethers.utils.parseEther("5")
            )
        })
        context("when the user is withdrawing to below margin", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.withdraw(ethers.utils.parseEther("6"))
                ).to.be.revertedWith("TCR: Withdraw below valid Margin")
            })
        })

        context("when the user is making a valid withdraw", async () => {
            it("updates their quote", async () => {
                await tracer.withdraw(ethers.utils.parseEther("1"))
                let balance = await tracer.balances(accounts[0].address)
                expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("4")
                )
            })

            it("updates their leverage", async () => {
                await getIntoLeveragedPosition(
                    tracer,
                    trader,
                    quoteToken,
                    oracle,
                    gasEthOracle,
                    accounts
                )

                // withdraw 1 quote token
                await tracer.withdraw(ethers.utils.parseEther("1"))

                const postBalance = await tracer.balances(accounts[0].address)
                expect(postBalance.totalLeveragedValue).to.equal(
                    ethers.utils.parseEther("16")
                )
            })

            it("updates the total TVL", async () => {
                await tracer.withdraw(ethers.utils.parseEther("1"))
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
                let tokenBalanceBefore = await quoteToken.balanceOf(
                    accounts[0].address
                )

                // withdraw 1 token with dust
                await tracer.withdraw(ethers.utils.parseEther("1.000000001"))

                // ensure that token amount has decreased by correct units
                let tokenBalanceAfter = await quoteToken.balanceOf(
                    accounts[0].address
                )
                let difference = tokenBalanceAfter.sub(tokenBalanceBefore)

                // user token balance should decrease by 1 (with 8 decimals)
                expect(difference).to.equal("100000000")

                // default token only uses 8 decimals, so the last bit should be ignored in contract balance
                let expected = ethers.utils.parseEther("4.000000000")
                let balance = await tracer.balances(accounts[0].address)
                await expect(balance.position.quote).to.equal(expected)

                // check TVL has been updated without dust
                let tvl = await tracer.tvl()
                await expect(tvl).to.be.equal(expected)
            })
        })
    })
})
