const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments

describe("Unit tests: LibInsurance.sol", function () {
    let trader
    let accounts
    const zero = ethers.utils.parseEther("0")
    before(async function () {
        const { deployer } = await getNamedAccounts()

        await deploy("Trader", {
            from: deployer,
            log: true,
        })

        let traderDeployment = await deployments.get("Trader")
        trader = await ethers.getContractAt(
            traderDeployment.abi,
            traderDeployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("executeTrader", async () => {
        context("When the makers array is empty", async () => {
            it("reverts", async () => {})
        })
        context("When the takers array is empty", async () => {
            it("reverts", async () => {})
        })
        context("When the maker and taker array lengths differ", async () => {
            it("reverts", async () => {})
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
        context(
            "When the order market does not match the target market",
            async () => {
                it("skips that order pairing", async () => {
                    // todo this test maybe shouldn't exist
                })
            }
        )

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

    describe("hashOrder", async() => {
        context("When called with a order", async() => {
            it("returns an EIP712 compliant hash", async() => {})
        })
    })


    describe("verifySignature", async() => {
        context("When called with a valid signedOrder and signature data", async() => {
            it("returns true", async() => {})
        })

        context("When called with the zero address", async() => {
            it("returns false", async() => {})
        })
    })

    describe("verifyNonce", async() => {
        context("When called with a valid signedOrder", async() => {
            it("returns true", async() => {})
        })

        context("When called with an invalid signed order", async() => {
            it("returns false", async() => {})
        })
    })

    describe("verify", async() => {
        context("When called with a valid signature and nonce", async() => {
            it("returns true", async() => {})
        })

        context("When called with a valid signature and invalid nonce", async() => {
            it("reverts", async() => {})
        })

        context("When called with a valid nonce and invalid signature", async() => {
            it("reverts", async() => {})
        })
    })
})
