const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { signOrders } = require("@tracer-protocol/tracer-utils")

describe("Unit tests: Trader.sol", function () {
    let trader
    let accounts
    let perpMockAddress
    let sampleMakes, sampleTakes
    let signedSampleMakes, signedSampleTakes
    let validSignedOrder,
        validSignedOrder2,
        orderSigner,
        orderSigner2,
        invalidSignedOrder,
        invalidSignedNonce

    before(async function () {
        const { deployer } = await getNamedAccounts()

        libPerpetuals = await deploy("Perpetuals", {
            from: deployer,
            log: true,
        })

        await deploy("Trader", {
            from: deployer,
            log: true,
            libraries: {
                Perpetuals: libPerpetuals.address,
            },
        })

        await deploy("TracerPerpetualSwapMock", {
            from: deployer,
            log: true,
        })

        perpMockAddress = await deployments.get("TracerPerpetualSwapMock")

        let traderDeployment = await deployments.get("Trader")
        trader = await ethers.getContractAt(
            traderDeployment.abi,
            traderDeployment.address
        )
        accounts = await ethers.getSigners()

        validSignedOrder = {
            order: [
                "1000000000000000000",
                "1000000000000000000",
                true,
                ethers.utils.getAddress("0x70aa3A48f576B9DEB37Ce20DB0a7c809AeE8EbfA"),
                1918373212,
                ethers.utils.getAddress("0x100b427A173fA3e66759449B4Cf63818Bedb9F47"),
                0,
            ],
            sigR: "0xd64508dfb0fc6c068cb7f98f180988f52e8740461b71e01b8d447487fa9f2295",
            sigS: "0x37562379971041278eb2b357615321f1eb177d659792f254346797ee017cf2a7",
            sigV: 27,
        }
        orderSigner = "0x70aa3A48f576B9DEB37Ce20DB0a7c809AeE8EbfA"
        validSignedOrder2 = {
            order: [
                "1000000000000000000",
                "1000000000000000000",
                false,
                ethers.utils.getAddress("0x90Df31f79BFDB76fB8aA7171135fF7aBC870957F"),
                1918373212,
                ethers.utils.getAddress("0x100b427A173fA3e66759449B4Cf63818Bedb9F47"),
                0,
            ],
            sigR: "0x77cee10d04cf433fc4e214205477a2fd60bfdc9cb4a3799dc03140ab4f81ac9f",
            sigS: "0x696e8be3afc0ee08ced9a58164e1bbe78f8a9a49566b5a5e9ef8a5ce4c1c9528",
            sigV: 28,
        }
        orderSigner2 = ethers.utils.getAddress("0x90Df31f79BFDB76fB8aA7171135fF7aBC870957F")
        invalidSignedOrder = validSignedOrder
        invalidSignedOrder.sigV = 28 //invalidate sig
        invalidSignedNonce = {
            order: [
                "1000000000000000000",
                "1000000000000000000",
                true,
                ethers.utils.getAddress("0x70aa3A48f576B9DEB37Ce20DB0a7c809AeE8EbfA"),
                1918373212,
                ethers.utils.getAddress("0x100b427A173fA3e66759449B4Cf63818Bedb9F47"),
                1,
            ],
            sigR: "0xc50b713c54f56d0fcab288641e9e9c49fd30e1179ff329adf1b4ba7609b9a4c8",
            sigS: "0x6e3d4c343aac8b6ea403a52c540be8170409037619277a517bb8791e596f18a4",
            sigV: 27,
        }
    })

    describe("executeTrader", async () => {
        context("When the makers array is empty", async () => {
            it("reverts", async () => {
                await expect(trader.executeTrade([], [])).to.be.revertedWith(
                    "TDR: Received empty arrays"
                )
            })
        })
        context("When the takers array is empty", async () => {
            it("reverts", async () => {
                await expect(trader.executeTrade([], [])).to.be.revertedWith(
                    "TDR: Received empty arrays"
                )
            })
        })
        context("When the maker and taker array lengths differ", async () => {
            it("reverts", async () => {
                await expect(trader.executeTrade([], [])).to.be.revertedWith(
                    "TDR: Received empty arrays"
                )
            })
        })
        context("When a single order signature is incorrect", async () => {
            it("skips that order pairing", async () => {})
        })
        context("When a single order nonce is incorrect", async () => {
            it("skips that order pairing", async () => {})
        })
        context("When an order already exists", async () => {
            it("does not create a new order", async () => {})

            it("processes the order as is", async () => {})
        })
        context("When the maker order has been completely filled", async () => {
            it("increments the nonce correctly", async () => {})

            it("prevents further submission of the order", async () => {})
        })

        context("When the taker order has been completely filled", async () => {
            it("increments the nonce correctly", async () => {})

            it("prevents further submission of the order", async () => {})
        })

        context("When two valid orders are submitted", async () => {
            it("updates the order states", async () => {})

            it("fills on the minimum amount of fillable space between the two orders", async () => {})
        })
    })

    describe("hashOrder", async () => {
        context("When called with a order", async () => {
            it("returns an EIP712 compliant hash", async () => {})
        })
    })

    describe("verifySignature", async () => {
        context(
            "When called with a valid signedOrder and signature data",
            async () => {
                it("returns true", async () => {
                    // todo fix circular dependency in testing this
                    // let result = await trader.verifySignature(
                    //     "0x70aa3A48f576B9DEB37Ce20DB0a7c809AeE8EbfA",
                    //     [
                    //         [
                    //             '0x70aa3A48f576B9DEB37Ce20DB0a7c809AeE8EbfA',
                    //             '0x100b427A173fA3e66759449B4Cf63818Bedb9F47',
                    //             '1000000000000000000',
                    //             '1000000000000000000',
                    //             1,
                    //             1918373212,
                    //             0
                    //         ],
                    //         "0x55ad6998f732fe2e7b98cf51ed79ff5aef6e67828078d20d1061a3a59ce03770",
                    //         "0x5ee5fae5c95bc0e700bf221c6652365cf2a6492c68dc8e775337fa8995bbd600",
                    //         27,
                    //     ],
                    // )
                    // expect(result).to.equal(true)
                    return true
                })
            }
        )

        context("When called with the zero address", async () => {
            it("returns false", async () => {
                // let result = await trader.verifySignature(
                //     ethers.utils.getAddress("0x0000000000000000000000000000000000000000"),
                //     validSignedOrder.order,
                //     validSignedOrder.sigR,
                //     validSignedOrder.sigS,
                //     validSignedOrder.sigV
                // )
                //expect(result).to.equal(false)
            })
        })
    })
})
