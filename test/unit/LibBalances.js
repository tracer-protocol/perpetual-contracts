const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

/* integer bounds */
const minimumInt = ethers.constants.MaxUint256.div(
    ethers.BigNumber.from(2)
).mul(ethers.BigNumber.from(-1))
const maximumInt = ethers.constants.MaxUint256.div(ethers.BigNumber.from(1))

function generateResults(func, params) {
    /* dynamic dispatch! */
    switch (func) {
        case "netValue":
            return generateResultsForNetValue(
                params["positions"],
                params["prices"]
            )
            break
        default:
            return {} /* error, invalid function! */
            break
    }
}

/* result set methods */
function generateResultsForNetValue(positions, prices) {
    let expectedNetValue = {}

    for (const quoteType in positions) {
        expectedNetValue[quoteType] = {}

        for (const baseType in positions[quoteType]) {
            expectedNetValue[quoteType][baseType] = {}

            for (const priceType in prices) {
                var position = positions[quoteType][baseType]
                var base = position[1]
                var price = prices[priceType]

                /* if the current test case should revert, mark with sentinel */
                if (shouldNetValueRevert(position, price)) {
                    expectedNetValue[quoteType][baseType][priceType] = null 
                } else {
                    /* essentially reproducing `netValue`'s body - I feel this is
                     * justified as the code subject to testing here is guaranteed
                     * to be pure */
                    expectedNetValue[quoteType][baseType][priceType] = base
                        .abs()
                        .mul(price)
                }
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
    let expectedValues

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
        positions = {
            min: {
                min: [minimumInt, minimumInt],
                max: [minimumInt, maximumInt],
                norm: [minimumInt, ethers.utils.parseEther("330")],
            },
            max: {
                min: [maximumInt, minimumInt],
                max: [maximumInt, maximumInt],
                norm: [maximumInt, ethers.utils.parseEther("-4320")],
            },
            norm: {
                min: [ethers.utils.parseEther("88605"), minimumInt],
                max: [ethers.utils.parseEther("-777584"), maximumInt],
                norm: [
                    ethers.utils.parseEther("8889"),
                    ethers.utils.parseEther("99763"),
                ],
            },
        }
        prices = {
            min: ethers.utils.parseEther("0"),
            max: ethers.constants.MaxUint256,
            norm: ethers.utils.parseEther("785321"),
        }

        /* generate result sets */
        expectedValues = {}
        var functionsUnderTest = ["netValue"]

        for (let i = 0; i < functionsUnderTest.length; i++) {
            var func = functionsUnderTest[i]

            expectedValues[func] = generateResults(func, {
                positions: positions,
                prices: prices,
            })
        }
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
                    const expectedNetValue = ethers.utils.parseEther("259155930")

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
                    const expectedNetValue = ethers.utils.parseEther("78345978923")

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
                expectedNetValue = expectedValues["netValue"]
                for (const quoteType in positions) {
                    for (const baseType in positions[quoteType]) {
                        for (const priceType in prices) {
                            console.log(expectedNetValue[quoteType][baseType][priceType]); // DEBUG

                            var position = positions[quoteType][baseType]
                            var price = prices[priceType]

                            if (!shouldNetValueRevert(position, price)) {
                                await expect(
                                    libBalances.netValue(position, price)
                                ).to.equal(
                                    expectedNetValue[quoteType][baseType][priceType]
                                )
                            }
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
