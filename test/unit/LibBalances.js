const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

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

        const minimumInt = ethers.constants.MaxUint256.div(
            ethers.BigNumber.from(2)
        ).mul(ethers.BigNumber.from(-1))
        const maximumInt = ethers.constants.MaxUint256.div(
            ethers.BigNumber.from(1)
        )

        positions = {
            min: {
                min: [minimumInt, minimumInt],
                max: [minimumInt, maximumInt],
                norm: [minimumInt, ethers.utils.parseEther("330")],
            },
            max: {
                min: [maximumInt, minimumInt],
                max: [maximumInt, maximumInt],
                norm: [maximumInt, ethers.utils.parseEther("-5490")],
            },
            norm: {
                min: [ethers.utils.parseEther("450"), minimumInt],
                max: [ethers.utils.parseEther("450"), maximumInt],
                norm: [
                    ethers.utils.parseEther("450"),
                    ethers.utils.parseEther("-880"),
                ],
            },
        }

        prices = {
            min: ethers.utils.parseEther("0"),
            max: ethers.constants.MaxUint256,
            norm: ethers.utils.parseEther("7709"),
        }

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
                    await expect(libBalances.netValue(
                        positions["min"]["min"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (minimum, minimum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["min"]["min"],
                        prices["max"]
                    )).to.be.reverted;
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
                    await expect(libBalances.netValue(
                        positions["min"]["norm"],
                        prices["max"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (minimum, maximum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["min"]["max"],
                        prices["min"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (minimum, maximum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["min"]["max"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (minimum, maximum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["min"]["max"],
                        prices["max"]
                    )).to.be.reverted;
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

                    const expectedNetValue = ethers.utils.parseEther("3");
                })
            }
        )

        context(
            "When called with (normal, minimum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["norm"]["min"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (normal, minimum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["norm"]["min"],
                        prices["max"]
                    )).to.be.reverted;
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
                    await expect(libBalances.netValue(
                        positions["norm"]["norm"],
                        prices["max"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (normal, maximum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["norm"]["max"],
                        prices["min"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (normal, maximum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["norm"]["max"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (normal, maximum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["norm"]["max"],
                        prices["max"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, minimum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["min"],
                        prices["min"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, minimum) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["min"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, minimum) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["min"],
                        prices["max"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, normal) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["norm"],
                        prices["min"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, normal) position and normal price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["norm"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, normal) position and maximum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["norm"],
                        prices["max"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, maximum) position and minimum price",
            async () => {
                it("Reverts", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["max"],
                        prices["min"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, maximum) position and normal price",
            async () => {
                it("Returns the correct value", async () => {
                    await expect(libBalances.netValue(
                        positions["max"]["max"],
                        prices["norm"]
                    )).to.be.reverted;
                })
            }
        )

        context(
            "When called with (maximum, maximum) position and maximum price",
            async () => {
                await expect(libBalances.netValue(
                    positions["max"]["max"],
                    prices["max"]
                )).to.be.reverted;
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
