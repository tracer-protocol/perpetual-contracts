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
            "When called with normal position and minimum price",
            async () => {
                it("Returns the correct result", async () => {
                    const position = normalPosition
                    const price = minimumPrice

                    const actualNetValue = await libBalances.netValue(
                        position,
                        price
                    )

                    const expectedNetValue = ethers.utils.parseEther("0")

                    expect(actualNetValue).to.equal(expectedNetValue)
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Reverts", async () => {
                    const position = normalPosition
                    const price = maximumPrice

                    await expect(libBalances.netValue(position, price)).to.be
                        .reverted
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    const position = normalPosition
                    const price = normalPrice

                    const actualNetValue = await libBalances.netValue(
                        position,
                        price
                    )

                    const expectedNetValue = ethers.utils.parseEther("9900")

                    expect(actualNetValue).to.equal(expectedNetValue)
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
                    const position = normalPosition
                    const price = minimumPrice

                    const actualMargin = await libBalances.margin(
                        position,
                        price
                    )

                    const expectedMargin = ethers.utils.parseEther("12")

                    expect(actualMargin).to.equal(expectedMargin)
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Reverts", async () => {
                    const position = normalPosition
                    const price = maximumPrice

                    await expect(libBalances.margin(position, price)).to.be
                        .reverted
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    const position = normalPosition
                    const price = normalPrice

                    const actualMargin = await libBalances.margin(
                        position,
                        price
                    )

                    const expectedMargin = ethers.utils.parseEther("9912")

                    expect(actualMargin).to.equal(expectedMargin)
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
                    const position = normalPosition
                    const price = minimumPrice

                    const actualLeveragedNotionalValue =
                        await libBalances.leveragedNotionalValue(
                            position,
                            price
                        )

                    const expectedLeveragedNotionalValue =
                        ethers.utils.parseEther("0")

                    expect(actualLeveragedNotionalValue).to.equal(
                        expectedLeveragedNotionalValue
                    )
                })
            }
        )

        context(
            "When called with normal position and maximum price",
            async () => {
                it("Reverts", async () => {
                    const position = normalPosition
                    const price = maximumPrice

                    await expect(
                        libBalances.leveragedNotionalValue(position, price)
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with normal position and normal price",
            async () => {
                it("Returns the correct result", async () => {
                    const position = normalPosition
                    const price = normalPrice

                    const actualLeveragedNotionalValue =
                        await libBalances.leveragedNotionalValue(
                            position,
                            price
                        )

                    const expectedLeveragedNotionalValue =
                        ethers.utils.parseEther("0")

                    expect(actualLeveragedNotionalValue).to.equal(
                        expectedLeveragedNotionalValue
                    )
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
