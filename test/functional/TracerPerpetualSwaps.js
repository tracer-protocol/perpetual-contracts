const { expect, assert } = require("chai")
const { ethers, getNamedAccounts, deployments, network } = require("hardhat")
const { deploy } = deployments
const { time } = require("@openzeppelin/test-helpers")
const tracerAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const tokenAbi = require("../../abi/contracts/TestToken.sol/TestToken.json")
const { BN } = require("@openzeppelin/test-helpers/src/setup")

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["FullDeploy"])
    let Factory = await deployments.get("TracerPerpetualsFactory")
    let factory = await ethers.getContractAt(Factory.abi, Factory.address)
    let tracerAddress = await factory.tracersByIndex(0)
    let tracer = await ethers.getContractAt(tracerAbi, tracerAddress)

    // setup mocks for the contracts and relink
    const Insurance = await tracer.insuranceContract()
    let insurance = await ethers.getContractAt(insuranceAbi, Insurance)

    const Pricing = await tracer.pricingContract()
    let pricing = await ethers.getContractAt(pricingAbi, Pricing)

    const Liquidation = await tracer.liquidationContract()
    let liquidation = await ethers.getContractAt(liquidationAbi, Liquidation)

    const QuoteToken = await tracer.tracerQuoteToken()
    let quoteToken = await ethers.getContractAt(tokenAbi, QuoteToken)

    return {
        tracer,
        insurance,
        pricing,
        liquidation,
        quoteToken,
        deployer,
        factory,
    }
})

const forwardTime = async (seconds) => {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine")
}

const compareAccountState = (state, expectedState) => {
    expect(state.position.quote).to.equal(expectedState.position.quote)
    expect(state.position.base).to.equal(expectedState.position.base)
    expect(state.totalLeveragedValue).to.equal(expectedState.totalLeveragedValue)
    expect(state.lastUpdatedIndex).to.equal(expectedState.lastUpdatedIndex)
    expect(state.lastUpdatedGasPrice).to.equal(expectedState.lastUpdatedGasPrice)
}

describe("Functional tests: TracerPerpetualSwaps.sol", function () {
    let accounts, deployer
    let insurance, pricing, liquidation, tracer, quoteToken
    let now

    before(async function () {
        const _setup = await setup()
        quoteToken = _setup.quoteToken
        tracer = _setup.tracer
        insurance = _setup.insurance
        pricing = _setup.pricing
        liquidation = _setup.liquidation
        deployer = _setup.deployer
        accounts = await ethers.getSigners()
        // transfer tokesn to account 4
        await quoteToken.transfer(
            accounts[4].address,
            ethers.utils.parseEther("1000")
        )
        now = Math.floor(new Date().getTime() / 1000)
    })

    context("Regular Trading over 24 hours", async () => {
        describe("when markets are operating as normal", async () => {
            it("passes", async () => {
                // deposit from 4 accounts
                for (var i = 0; i < 4; i++) {
                    await quoteToken
                        .connect(accounts[i + 1])
                        .approve(
                            tracer.address,
                            ethers.utils.parseEther("1000")
                        )
                    await tracer
                        .connect(accounts[i + 1])
                        .deposit(ethers.utils.parseEther("1000"))
                }

                // make some basic trades
                let order1 = {
                    maker: accounts[1].address,
                    market: tracer.address,
                    price: ethers.utils.parseEther("1"),
                    amount: ethers.utils.parseEther("50"),
                    side: 0, // long,
                    expires: now + 604800, // now + 7 days
                    created: now,
                }

                let order2 = {
                    maker: accounts[2].address,
                    market: tracer.address,
                    price: ethers.utils.parseEther("0.9"),
                    amount: ethers.utils.parseEther("40"),
                    side: 1, // short,
                    expires: now + 604800, // now + 7 days
                    created: now,
                }

                let order3 = {
                    maker: accounts[3].address,
                    market: tracer.address,
                    price: ethers.utils.parseEther("0.9"),
                    amount: ethers.utils.parseEther("10"),
                    side: 1, // short,
                    expires: now + 604800, // now + 7 days
                    created: now,
                }

                // place trades
                await tracer.connect(accounts[0]).matchOrders(order1, order2)
                await tracer.connect(accounts[0]).matchOrders(order1, order3)

                // check account state
                let account1 = await tracer.balances(accounts[1].address)
                let account2 = await tracer.balances(accounts[2].address)
                let account3 = await tracer.balances(accounts[3].address)

                // gas price = fast gas in gwei * cost per eth
                // $3000 * 1 gwei fast gas = (3000 / 10^18) * (1 * 10^9)
                // = 3000 * 10^-9 gwei gas / usd = 3000 gas / usd
                let lastUpdatedGas = "3000000000000"
                let account1Expected = {
                    position: {
                        quote: ethers.utils.parseEther("950"),
                        base:  ethers.utils.parseEther("50")
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 1,
                    lastUpdatedGasPrice: lastUpdatedGas
                }
                let account2Expected = {
                    position: {
                        quote: ethers.utils.parseEther("1040"),
                        base:  ethers.utils.parseEther("-40")
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 1,
                    lastUpdatedGasPrice: lastUpdatedGas
                }
                let account3Expected = {
                    position: {
                        quote: ethers.utils.parseEther("1010"),
                        base:  ethers.utils.parseEther("-10")
                    },
                    totalLeveragedValue: 0,
                    lastUpdatedIndex: 1,
                    lastUpdatedGasPrice: lastUpdatedGas
                }

                compareAccountState(account1, account1Expected)
                compareAccountState(account2, account2Expected)
                compareAccountState(account3, account3Expected)
            })
        })
    })
})
