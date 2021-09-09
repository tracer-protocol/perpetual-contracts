const { expect } = require("chai")
const { ethers } = require("hardhat")
const { deployTracerWithTrader } = require("../util/DeploymentUtil.js")
const { customOrder, attachSignatureToOrders } = require("../util/OrderUtil.js")

const createWallet = async () => {
    const wallet = await ethers.Wallet.createRandom()
    return wallet.connect(ethers.provider)
}

describe("Unit tests: Trader.sol", function () {
    let contracts
    let accounts
    let trader

    describe("executeTrade", async () => {
        context("When the maker and taker array lengths differ", async () => {
            it("reverts", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()
                maker = await createWallet()

                const unsignedOrder = customOrder(
                    contracts,
                    10,
                    10,
                    0,
                    maker.address
                )
                let signedOrders = attachSignatureToOrders(
                    contracts.trader.address,
                    maker,
                    [unsignedOrder]
                )

                await expect(
                    trader.executeTrade([], signedOrders)
                ).to.be.revertedWith("TDR: Lengths differ")
            })
        })

        context("When the arrays are empty", async () => {
            it("reverts", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                await expect(trader.executeTrade([], [])).to.be.revertedWith(
                    "TDR: Received empty arrays"
                )
            })
        })
        context("When an order signature is incorrect", async () => {
            it("does not fill that order", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()
                maker = await createWallet()
                taker = await createWallet()

                const unsignedMaker = customOrder(
                    contracts,
                    10,
                    10,
                    0,
                    maker.address
                )
                let signedMakers = attachSignatureToOrders(
                    contracts.trader.address,
                    maker,
                    [unsignedMaker]
                )
                const unsignedTaker = customOrder(
                    contracts,
                    10,
                    10,
                    1,
                    taker.address
                )
                // sign the taker order with the maker
                let signedTakers = attachSignatureToOrders(
                    contracts.trader.address,
                    maker,
                    [unsignedTaker]
                )

                await trader.executeTrade(signedMakers, signedTakers)
                const makerId = await contracts.trader.getOrderId(unsignedMaker)
                const takerId = await contracts.trader.getOrderId(unsignedTaker)
                const makerFilled = await contracts.trader.filled(makerId)
                const takerFilled = await contracts.trader.filled(takerId)
                expect(makerFilled).to.equal(0)
                expect(takerFilled).to.equal(0)
            })
        })

        context("When the markets of the orders do not match", async () => {
            it("does not fill that order", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()
                maker = await createWallet()
                taker = await createWallet()

                const unsignedMaker = customOrder(
                    contracts,
                    10,
                    10,
                    0,
                    maker.address
                )
                let signedMakers = attachSignatureToOrders(
                    contracts.trader.address,
                    maker,
                    [unsignedMaker]
                )
                // set taker market as a random address
                const unsignedTaker = customOrder(
                    contracts,
                    10,
                    10,
                    1,
                    taker.address,
                    accounts[5].address
                )
                let signedTakers = attachSignatureToOrders(
                    contracts.trader.address,
                    taker,
                    [unsignedTaker]
                )

                await trader.executeTrade(signedMakers, signedTakers)
                const makerId = await contracts.trader.getOrderId(unsignedMaker)
                const takerId = await contracts.trader.getOrderId(unsignedTaker)
                const makerFilled = await contracts.trader.filled(makerId)
                const takerFilled = await contracts.trader.filled(takerId)
                expect(makerFilled).to.equal(0)
                expect(takerFilled).to.equal(0)
            })
        })

        context("When the market of order is not whitelisted", async () => {
            it("does not fill that order", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()
                maker = await createWallet()
                taker = await createWallet()

                // set market as random address
                const unsignedMaker = customOrder(
                    contracts,
                    10,
                    10,
                    0,
                    maker.address,
                    accounts[5].address
                )
                let signedMakers = attachSignatureToOrders(
                    contracts.trader.address,
                    maker,
                    [unsignedMaker]
                )
                const unsignedTaker = customOrder(
                    contracts,
                    10,
                    10,
                    1,
                    taker.address,
                    accounts[5].address
                )
                let signedTakers = attachSignatureToOrders(
                    contracts.trader.address,
                    taker,
                    [unsignedTaker]
                )

                await trader.executeTrade(signedMakers, signedTakers)
                const makerId = await contracts.trader.getOrderId(unsignedMaker)
                const takerId = await contracts.trader.getOrderId(unsignedTaker)
                const makerFilled = await contracts.trader.filled(makerId)
                const takerFilled = await contracts.trader.filled(takerId)
                expect(makerFilled).to.equal(0)
                expect(takerFilled).to.equal(0)
            })
        })

        context("When an order already exists", async () => {
            it("processes existing order", async () => {})
        })

        context("When the maker order has been completely filled", async () => {
            it("prevents further submission of the order", async () => {})
        })

        context("When the taker order has been completely filled", async () => {
            it("prevents further submission of the order", async () => {})
        })

        context("When two valid orders are submitted", async () => {
            it("updates the order states", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()
                maker = await createWallet()
                taker = await createWallet()

                // set market as random address
                const price = 1000000000
                const amount = 1000000000
                const unsignedMaker = customOrder(
                    contracts,
                    price,
                    amount,
                    0,
                    maker.address
                )
                let signedMakers = attachSignatureToOrders(
                    contracts.trader.address,
                    maker,
                    [unsignedMaker]
                )
                const unsignedTaker = customOrder(
                    contracts,
                    price,
                    amount,
                    1,
                    taker.address
                )
                let signedTakers = attachSignatureToOrders(
                    contracts.trader.address,
                    taker,
                    [unsignedTaker]
                )

                let tx = await trader.executeTrade(signedMakers, signedTakers)
                /*const makerId = await contracts.trader.getOrderId(unsignedMaker)
                const takerId = await contracts.trader.getOrderId(unsignedTaker)
                const makerFilled = await contracts.trader.filled(makerId)
                const takerFilled = await contracts.trader.filled(takerId)
                expect(makerFilled).to.equal(10)
                expect(takerFilled).to.equal(10)*/
            })
        })
    })

    describe("verifySignature", async () => {
        context(
            "When called with a valid signedOrder and signature data",
            async () => {
                it("returns true", async () => {})
            }
        )

        context("When called with the zero address", async () => {
            it("returns false", async () => {})
        })
    })

    describe("setWhitelist", async () => {
        context("when called by the owner", async () => {
            it("sets an address to whitelisted", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                const tx = await trader.setWhitelist(accounts[1].address, true)
                const whitelistStatus = await trader.marketWhitelist(
                    accounts[1].address
                )

                expect(tx)
                    .to.emit(trader, "WhitelistUpdated")
                    .withArgs(accounts[1].address, true)
                expect(whitelistStatus).to.equal(true)
            })

            it("sets an address to unwhitelisted", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                const tx = await trader.setWhitelist(accounts[1].address, false)
                const whitelistStatus = await trader.marketWhitelist(
                    accounts[1].address
                )

                expect(tx)
                    .to.emit(trader, "WhitelistUpdated")
                    .withArgs(accounts[1].address, false)
                expect(whitelistStatus).to.equal(false)
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                await expect(
                    trader
                        .connect(accounts[1])
                        .setWhitelist(accounts[2].address, true)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })
    })

    describe("transferOwnership", async () => {
        context("when provided a 0 address", async () => {
            it("reverts", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                await expect(
                    trader.transferOwnership(ethers.constants.AddressZero)
                ).to.be.revertedWith("TDR: address(0) given")
            })
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                await expect(
                    trader
                        .connect(accounts[2])
                        .transferOwnership(accounts[3].address)
                ).to.be.revertedWith("Ownable: caller is not the owner")
            })
        })

        context("when called by the owner", async () => {
            it("sets a new owner", async () => {
                contracts = await deployTracerWithTrader()
                trader = contracts.trader
                accounts = await ethers.getSigners()

                await trader.transferOwnership(accounts[1].address)

                expect(await trader.owner()).to.equal(accounts[1].address)
            })
        })
    })
})
