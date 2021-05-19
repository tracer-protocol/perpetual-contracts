const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Unit tests: LibBalances.sol", async () => {
    let libBalances
    let accounts

    let normalPosition
    let minimumPrice

    before(async () => {
        await deployments.fixture(["LibBalancesMock"])
        const { deployer } = await getNamedAccounts()
        const deployment = await deployments.get("LibBalancesMock")
        libBalances = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()

        const normalBase = ethers.utils.parseEther("33")
        const normalQuote = ethers.utils.parseEther("12")
        normalPosition = [normalQuote, normalBase]

        minimumPrice = ethers.utils.parseEther("0")
        maximumPrice = ethers.constants.MaxInt256
        normalPrice = ethers.utils.parseEther("300")
    })

    describe("netValue", async () => {
        context(
            "When called with (minimum, minimum) position and minimum price",
            async () => {
                /* TODO: (min, min, min) */
            }
        )

        context(
            "When called with (minimum, minimum) position and normal price",
            async () => {
                /* TODO: (min, min, norm) */
            }
        )

        context(
            "When called with (minimum, minimum) position and maximum price",
            async () => {
                /* TODO: (min, min, max) */
            }
        )

        context(
            "When called with (minimum, normal) position and minimum price",
            async () => {
                /* TODO: (min, norm, min) */
            }
        )

        context(
            "When called with (minimum, normal) position and normal price",
            async () => {
                /* TODO: (min, norm, norm) */
            }
        )

        context(
            "When called with (minimum, normal) position and maximum price",
            async () => {
                /* TODO: (min, norm, min) */
            }
        )

        context(
            "When called with (minimum, maximum) position and minimum price",
            async () => {
                /* TODO: (min, max, min) */
            }
        )

        context(
            "When called with (minimum, maximum) position and normal price",
            async () => {
                /* TODO: (min, max, norm) */
            }
        )

        context(
            "When called with (minimum, maximum) position and maximum price",
            async () => {
                /* TODO: (min, max, max) */
            }
        )

        context(
            "When called with (normal, minimum) position and minimum price",
            async () => {
                /* TODO: (norm, min, min) */
            }
        )

        context(
            "When called with (normal, minimum) position and normal price",
            async () => {
                /* TODO: (norm, min, norm) */
            }
        )

        context(
            "When called with (normal, minimum) position and maximum price",
            async () => {
                /* TODO: (norm, min, max) */
            }
        )

        context(
            "When called with (normal, normal) position and minimum price",
            async () => {
                /* TODO: (norm, norm, min) */
            }
        )

        context(
            "When called with (normal, normal) position and normal price",
            async () => {
                /* TODO: (norm, norm, norm) */
            }
        )

        context(
            "When called with (normal, normal) position and maximum price",
            async () => {
                /* TODO: (norm, norm, min) */
            }
        )

        context(
            "When called with (normal, maximum) position and minimum price",
            async () => {
                /* TODO: (norm, max, min) */
            }
        )

        context(
            "When called with (normal, maximum) position and normal price",
            async () => {
                /* TODO: (norm, max, norm) */
            }
        )

        context(
            "When called with (normal, maximum) position and maximum price",
            async () => {
                /* TODO: (norm, max, max) */
            }
        )

        context(
            "When called with (maximum, minimum) position and minimum price",
            async () => {
                /* TODO: (max, min, min) */
            }
        )

        context(
            "When called with (maximum, minimum) position and normal price",
            async () => {
                /* TODO: (max, min, norm) */
            }
        )

        context(
            "When called with (maximum, minimum) position and maximum price",
            async () => {
                /* TODO: (max, min, max) */
            }
        )

        context(
            "When called with (maximum, normal) position and minimum price",
            async () => {
                /* TODO: (max, norm, min) */
            }
        )

        context(
            "When called with (maximum, normal) position and normal price",
            async () => {
                /* TODO: (max, norm, norm) */
            }
        )

        context(
            "When called with (maximum, normal) position and maximum price",
            async () => {
                /* TODO: (max, norm, min) */
            }
        )

        context(
            "When called with (maximum, maximum) position and minimum price",
            async () => {
                /* TODO: (max, max, min) */
            }
        )

        context(
            "When called with (maximum, maximum) position and normal price",
            async () => {
                /* TODO: (max, max, norm) */
            }
        )

        context(
            "When called with (maximum, maximum) position and maximum price",
            async () => {
                /* TODO: (max, max, max) */
            }
        )
    })

    describe("margin", async () => {
        context(
            "When called with (minimum, minimum) position and minimum price",
            async () => {
                /* TODO: (min, min, min) */
            }
        )

        context(
            "When called with (minimum, minimum) position and normal price",
            async () => {
                /* TODO: (min, min, norm) */
            }
        )

        context(
            "When called with (minimum, minimum) position and maximum price",
            async () => {
                /* TODO: (min, min, max) */
            }
        )

        context(
            "When called with (minimum, normal) position and minimum price",
            async () => {
                /* TODO: (min, norm, min) */
            }
        )

        context(
            "When called with (minimum, normal) position and normal price",
            async () => {
                /* TODO: (min, norm, norm) */
            }
        )

        context(
            "When called with (minimum, normal) position and maximum price",
            async () => {
                /* TODO: (min, norm, min) */
            }
        )

        context(
            "When called with (minimum, maximum) position and minimum price",
            async () => {
                /* TODO: (min, max, min) */
            }
        )

        context(
            "When called with (minimum, maximum) position and normal price",
            async () => {
                /* TODO: (min, max, norm) */
            }
        )

        context(
            "When called with (minimum, maximum) position and maximum price",
            async () => {
                /* TODO: (min, max, max) */
            }
        )

        context(
            "When called with (normal, minimum) position and minimum price",
            async () => {
                /* TODO: (norm, min, min) */
            }
        )

        context(
            "When called with (normal, minimum) position and normal price",
            async () => {
                /* TODO: (norm, min, norm) */
            }
        )

        context(
            "When called with (normal, minimum) position and maximum price",
            async () => {
                /* TODO: (norm, min, max) */
            }
        )

        context(
            "When called with (normal, normal) position and minimum price",
            async () => {
                /* TODO: (norm, norm, min) */
            }
        )

        context(
            "When called with (normal, normal) position and normal price",
            async () => {
                /* TODO: (norm, norm, norm) */
            }
        )

        context(
            "When called with (normal, normal) position and maximum price",
            async () => {
                /* TODO: (norm, norm, min) */
            }
        )

        context(
            "When called with (normal, maximum) position and minimum price",
            async () => {
                /* TODO: (norm, max, min) */
            }
        )

        context(
            "When called with (normal, maximum) position and normal price",
            async () => {
                /* TODO: (norm, max, norm) */
            }
        )

        context(
            "When called with (normal, maximum) position and maximum price",
            async () => {
                /* TODO: (norm, max, max) */
            }
        )

        context(
            "When called with (maximum, minimum) position and minimum price",
            async () => {
                /* TODO: (max, min, min) */
            }
        )

        context(
            "When called with (maximum, minimum) position and normal price",
            async () => {
                /* TODO: (max, min, norm) */
            }
        )

        context(
            "When called with (maximum, minimum) position and maximum price",
            async () => {
                /* TODO: (max, min, max) */
            }
        )

        context(
            "When called with (maximum, normal) position and minimum price",
            async () => {
                /* TODO: (max, norm, min) */
            }
        )

        context(
            "When called with (maximum, normal) position and normal price",
            async () => {
                /* TODO: (max, norm, norm) */
            }
        )

        context(
            "When called with (maximum, normal) position and maximum price",
            async () => {
                /* TODO: (max, norm, min) */
            }
        )

        context(
            "When called with (maximum, maximum) position and minimum price",
            async () => {
                /* TODO: (max, max, min) */
            }
        )

        context(
            "When called with (maximum, maximum) position and normal price",
            async () => {
                /* TODO: (max, max, norm) */
            }
        )

        context(
            "When called with (maximum, maximum) position and maximum price",
            async () => {
                /* TODO: (max, max, max) */
            }
        )
    })

    describe("leveragedNotionalValue", async () => {
        context(
            "When called with (minimum, minimum) position and minimum price",
            async () => {
                /* TODO: (min, min, min) */
            }
        )

        context(
            "When called with (minimum, minimum) position and normal price",
            async () => {
                /* TODO: (min, min, norm) */
            }
        )

        context(
            "When called with (minimum, minimum) position and maximum price",
            async () => {
                /* TODO: (min, min, max) */
            }
        )

        context(
            "When called with (minimum, normal) position and minimum price",
            async () => {
                /* TODO: (min, norm, min) */
            }
        )

        context(
            "When called with (minimum, normal) position and normal price",
            async () => {
                /* TODO: (min, norm, norm) */
            }
        )

        context(
            "When called with (minimum, normal) position and maximum price",
            async () => {
                /* TODO: (min, norm, min) */
            }
        )

        context(
            "When called with (minimum, maximum) position and minimum price",
            async () => {
                /* TODO: (min, max, min) */
            }
        )

        context(
            "When called with (minimum, maximum) position and normal price",
            async () => {
                /* TODO: (min, max, norm) */
            }
        )

        context(
            "When called with (minimum, maximum) position and maximum price",
            async () => {
                /* TODO: (min, max, max) */
            }
        )

        context(
            "When called with (normal, minimum) position and minimum price",
            async () => {
                /* TODO: (norm, min, min) */
            }
        )

        context(
            "When called with (normal, minimum) position and normal price",
            async () => {
                /* TODO: (norm, min, norm) */
            }
        )

        context(
            "When called with (normal, minimum) position and maximum price",
            async () => {
                /* TODO: (norm, min, max) */
            }
        )

        context(
            "When called with (normal, normal) position and minimum price",
            async () => {
                /* TODO: (norm, norm, min) */
            }
        )

        context(
            "When called with (normal, normal) position and normal price",
            async () => {
                /* TODO: (norm, norm, norm) */
            }
        )

        context(
            "When called with (normal, normal) position and maximum price",
            async () => {
                /* TODO: (norm, norm, min) */
            }
        )

        context(
            "When called with (normal, maximum) position and minimum price",
            async () => {
                /* TODO: (norm, max, min) */
            }
        )

        context(
            "When called with (normal, maximum) position and normal price",
            async () => {
                /* TODO: (norm, max, norm) */
            }
        )

        context(
            "When called with (normal, maximum) position and maximum price",
            async () => {
                /* TODO: (norm, max, max) */
            }
        )

        context(
            "When called with (maximum, minimum) position and minimum price",
            async () => {
                /* TODO: (max, min, min) */
            }
        )

        context(
            "When called with (maximum, minimum) position and normal price",
            async () => {
                /* TODO: (max, min, norm) */
            }
        )

        context(
            "When called with (maximum, minimum) position and maximum price",
            async () => {
                /* TODO: (max, min, max) */
            }
        )

        context(
            "When called with (maximum, normal) position and minimum price",
            async () => {
                /* TODO: (max, norm, min) */
            }
        )

        context(
            "When called with (maximum, normal) position and normal price",
            async () => {
                /* TODO: (max, norm, norm) */
            }
        )

        context(
            "When called with (maximum, normal) position and maximum price",
            async () => {
                /* TODO: (max, norm, min) */
            }
        )

        context(
            "When called with (maximum, maximum) position and minimum price",
            async () => {
                /* TODO: (max, max, min) */
            }
        )

        context(
            "When called with (maximum, maximum) position and normal price",
            async () => {
                /* TODO: (max, max, norm) */
            }
        )

        context(
            "When called with (maximum, maximum) position and maximum price",
            async () => {
                /* TODO: (max, max, max) */
            }
        )
    })
})
