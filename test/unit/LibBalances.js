const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Unit tests: LibBalances.sol", async () => {
    let accounts

    before(async () => {
        await deployments.fixture(["LibBalancesMock"])
        const { deployer } = await getNamedAccounts()
        const deployment = await deployments.get("LibBalancesMock")
        libLiquidation = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("netValue", async () => {
        /* normal position */

        context(
            "When called with normal position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )
    })

    describe("margin", async () => {
        /* normal position */

        context(
            "When called with normal position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )
    })

    describe("leveragedNotionalValue", async () => {
        /* normal position */

        context(
            "When called with normal position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )
    })

    describe("minimumMargin", async () => {
        /* normal position */

        context(
            "When called with normal position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )
    })
})
