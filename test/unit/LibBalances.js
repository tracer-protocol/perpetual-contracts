const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

/* integer bounds */
const minimumInt = ethers.constants.MaxUint256.div(
    ethers.BigNumber.from(2)
).mul(ethers.BigNumber.from(-1))
const maximumInt = ethers.constants.MaxUint256.div(ethers.BigNumber.from(1))

/* result set methods */
function generateResultsForNetValue(positions, prices) {
    var expectedNetValue = {}
    for (const position in positions) {
        for (const price in prices) {
            if (shouldNetValueRevert(position, price)) {
                expectedNetValue[position.toString()][price.toString()] = null
            } else {
                expectedNetValue[position.toString()][price.toString()] =
                    position[1].abs().mul(price)
            }
        }
    }

    return expectedNetValue
}

/* reversion deciders */
let shouldNetValueRevert = (position, price) => {
    position[1] == minimumInt || price == maximumInt
}

describe("Unit tests: LibBalances.sol", function () {
    let libBalances
    let accounts

    let positions
    let prices

    before(async function () {
        await deployments.fixture(["LibBalancesMock"])
        const { deployer } = await getNamedAccounts()
        const deployment = await deployments.get("LibBalancesMock")
        libBalances = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    
        /* sample sets */
        positions = [
            [minimumInt, minimumInt],
            [minimumInt, maximumInt],
            [minimumInt, ethers.utils.parseEther("330")],
            [maximumInt, minimumInt],
            [maximumInt, maximumInt],
            [maximumInt, ethers.utils.parseEther("-4320")],
            [ethers.utils.parseEther("88605"), minimumInt],
            [ethers.utils.parseEther("-777584"), maximumInt],
            [ethers.utils.parseEther("8889"), ethers.utils.parseEther("99763")],
        ]
        prices = [
            ethers.utils.parseEther("0"),
            ethers.constants.MaxUint256,
            ethers.utils.parseEther("785321"),
        ]
        
        /* expected result sets */
        expectedNetValue = generateResultsForNetValue(positions, prices)
    })

    describe("netValue", async () => {
        context(
            "When called with (minimum, minimum) position and minimum price",
            async () => {
                it("Returns the correct value", async () => {
                    const actualNetValue = await libBalances.netValue(
                        positions["min"]["min"],
                        prices["min"]
                    )
                    const expectedNetValue = ethers.utils.parseEther("0")

                    await expect(actualNetValue).to.equal(expectedNetValue)
                })
            }
        )

        context(
            "When called with (minimum, minimum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["min"]["min"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (minimum, minimum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["min"]["min"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (minimum, normal) position and minimum price",
            async () => {
                it("Returns the correct value", async () => {
                    const actualNetValue = await libBalances.netValue(
                        positions["min"]["norm"],
                        prices["min"]
                    )
                    const expectedNetValue = ethers.utils.parseEther("0")

                    await expect(actualNetValue).to.equal(expectedNetValue)
                })
            }
        )

        context(
            "When called with (minimum, normal) position and normal price",
            async () => {
                it("Returns the correct value", async () => {
                    const actualNetValue = await libBalances.netValue(
                        positions["min"]["norm"],
                        prices["norm"]
                    )
                    const expectedNetValue = ethers.utils.parseEther("2543970")

                    await expect(actualNetValue).to.equal(expectedNetValue)
                })
            }
        )

        context(
            "When called with (minimum, normal) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["min"]["norm"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (minimum, maximum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["min"]["max"],
                            prices["min"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (minimum, maximum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["min"]["max"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (minimum, maximum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["min"]["max"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (normal, minimum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    const actualNetValue = await libBalances.netValue(
                        positions["norm"]["min"],
                        prices["min"]
                    )

                    const expectedNetValue = ethers.utils.parseEther("3")
                })
            }
        )

        context(
            "When called with (normal, minimum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["norm"]["min"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (normal, minimum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["norm"]["min"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (normal, normal) position and minimum price",
            async () => {
                it("Returns the correct value", async () => {
                    const actualNetValue = await libBalances.netValue(
                        positions["norm"]["norm"],
                        prices["min"]
                    )
                    const expectedNetValue = ethers.utils.parseEther("0")

                    await expect(actualNetValue).to.equal(expectedNetValue)
                })
            }
        )

        context(
            "When called with (normal, normal) position and normal price",
            async () => {
                it("Returns the correct value", async () => {
                    const actualNetValue = await libBalances.netValue(
                        positions["norm"]["norm"],
                        prices["norm"]
                    )
                    const expectedNetValue = ethers.utils.parseEther("6783920")

                    await expect(actualNetValue).to.equal(expectedNetValue)
                })
            }
        )

        context(
            "When called with (normal, normal) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["norm"]["norm"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (normal, maximum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["norm"]["max"],
                            prices["min"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (normal, maximum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["norm"]["max"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (normal, maximum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["norm"]["max"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, minimum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["min"],
                            prices["min"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, minimum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["min"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, minimum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["min"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, normal) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["norm"],
                            prices["min"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, normal) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["norm"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, normal) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["norm"],
                            prices["max"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, maximum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["max"],
                            prices["min"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, maximum) position and normal price",
            async () => {
                it("Returns the correct value", async () => {
                    await expect(
                        libBalances.netValue(
                            positions["max"]["max"],
                            prices["norm"]
                        )
                    ).to.be.reverted
                })
            }
        )

        context(
            "When called with (maximum, maximum) position and maximum price",
            async () => {
                await expect(
                    libBalances.netValue(positions["max"]["max"], prices["max"])
                ).to.be.reverted
            }
        )

        context("Test Parameterised", async () => {
            it("Reverts", async () => {
                for (position in positions) {
                    for (price in prices) {
                        if (shouldNetValueRevert(position, price)) {
                            await expect(libBalances.netValue(position, price))
                                .to.be.reverted
                        }
                    }
                }
            })

            it("Returns the correct value", async () => {
                for (position in positions) {
                    for (price in prices) {
                        if (!shouldNetValueRevert(position, price)) {
                            await expect(
                                libBalances.netValue(position, price)
                            ).to.equal(
                                expectedNetValue[position.toString()][
                                    price.toString()
                                ]
                            )
                        }
                    }
                }
            })
        })
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
