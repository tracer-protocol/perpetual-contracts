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

        /* minimum position.base */

        context(
            "When called with minimum-base position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with minimum-base position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with minimum-base position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        /* maximum position.base */

        context(
            "When called with maximum-base position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with maximum-base position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with maximum-base position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        /* minimum position.quote */

        context(
            "When called with minimum-quote position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with minimum-quote position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with minimum-quote position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        /* maximum position.quote */

        context(
            "When called with maximum-quote position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with maximum-quote position and maximum price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )

        context(
            "When called with maximum-quote position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    /* TODO: implement */
                })
            }
        )
    })
})
