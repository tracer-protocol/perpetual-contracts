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
        
        // TODO: Need to update tracer-utils for this to work with ethers :(
        // generate sample makes and takes
        // sampleMakes = []
        // sampleTakes = []
        // for (var i = 0; i < 5; i++) {
        //     sampleMakes.push(
        //     {
        //         amount: ethers.utils.parseEther("1"),
        //         price: ethers.utils.parseEther("1"),
        //         side: true,
        //         user: accounts[1].address,
        //         expiration: 3021231888, //unrealistic expiry
        //         targetTracer: perpMockAddress,
        //         nonce: i
        //     }   
        //     ),
        //     sampleTakes.push(
        //         {
        //             amount: ethers.utils.parseEther("1"),
        //             price: ethers.utils.parseEther("1"),
        //             side: false,
        //             user: accounts[2].address,
        //             expiration: 3021231888, //unrealistic expiry
        //             targetTracer: perpMockAddress,
        //             nonce: i
        //         } 
        //     )
        // }
        // signedSampleMakes = await signOrders(ethers, sampleMakes, trader.address)
        // signedSampleTakes = await signOrders(ethers, sampleTakes, trader.address)
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
            it("skips that order pairing", async () => {

            })
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
                it("returns true", async () => {})
            }
        )

        context("When called with the zero address", async () => {
            it("returns false", async () => {})
        })
    })

    describe("verifyNonce", async () => {
        context("When called with a valid signedOrder", async () => {
            it("returns true", async () => {})
        })

        context("When called with an invalid signed order", async () => {
            it("returns false", async () => {})
        })
    })

    describe("verify", async () => {
        context("When called with a valid signature and nonce", async () => {
            it("returns true", async () => {})
        })

        context(
            "When called with a valid signature and invalid nonce",
            async () => {
                it("reverts", async () => {})
            }
        )

        context(
            "When called with a valid nonce and invalid signature",
            async () => {
                it("reverts", async () => {})
            }
        )
    })
})
