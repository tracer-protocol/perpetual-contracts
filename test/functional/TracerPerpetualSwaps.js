const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { deployTracer } = require("../utils/DeploymentUtil.js")
const { executeTrade } = require("../utils/OrderUtil.js")

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine", [])
}

const compareAccountState = (state, expectedState) => {
    expect(state.position.quote).to.equal(expectedState.position.quote)
    expect(state.position.base).to.equal(expectedState.position.base)
    expect(state.totalLeveragedValue).to.equal(
        expectedState.totalLeveragedValue
    )
    expect(state.lastUpdatedIndex).to.equal(expectedState.lastUpdatedIndex)
    expect(state.lastUpdatedGasPrice).to.equal(
        expectedState.lastUpdatedGasPrice
    )
}

describe("Functional tests: TracerPerpetualSwaps.sol", function () {
    let accounts, deployer
    let insurance, pricing, tracer, quoteToken, trader
    let tx

    beforeEach(async () => {
        contracts = await deployTracer()
        deployer = contracts.deployer
        quoteToken = contracts.quoteToken
        tracer = contracts.tracer
        insurance = contracts.insurance
        pricing = contracts.pricing
        trader = contracts.trader
        oracle = contracts.oracle
        accounts = await ethers.getSigners()
        // transfer tokesn to account 4
        await quoteToken.transfer(
            accounts[4].address,
            ethers.utils.parseEther("1000")
        )

        // set up accounts
        for (var i = 0; i < 4; i++) {
            await quoteToken
                .connect(accounts[i + 1])
                .approve(tracer.address, ethers.utils.parseEther("1000"))
            await tracer
                .connect(accounts[i + 1])
                .deposit(ethers.utils.parseEther("1000"))
        }
    })

    describe("matchOrders", async () => {
        context("when the orders can match", async () => {
            beforeEach(async () => {
                // set underlying price to 10 (oracle takes in 8 decimal answer)
                await oracle.setPrice(10 * 10 ** 8)
                // match order at price 10, amount 2 from acc 1 (long) and acc 2 (short)
                tx = await executeTrade(contracts, accounts, ethers.utils.parseEther("10"), ethers.utils.parseEther("2"))
            })

            it("settles the accounts", async () => {
            })

            it("executes the trades", async () => {})

            it("updates the account leverage", async () => {})

            it("records the trade with pricing", async () => {})
        })

        context("when the orders can't match", async () => {
            it("emit a FailedOrders event", async () => {
            })
        })

        context("when users don't have margin", async () => {
            
        })
    })
})
