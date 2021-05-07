const { expect } = require("chai")
const { BigNumber } = require("ethers")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
// 2^255 - 1
const MAX_INT256 = BigNumber.from(2)
    .pow(BigNumber.from(255))
    .sub(BigNumber.from(1))
const MIN_INT256 = BigNumber.from(-2).pow(BigNumber.from(255))
const MAX_UINT256 = BigNumber.from(2)
    .pow(BigNumber.from(256))
    .sub(BigNumber.from(1))
describe("Unit tests: LibBalances.sol", function () {
    let libLiquidation
    before(async function () {
        // todo plug in once LibBalances is done
        // await deployments.fixture(["LibLiquidation"])
        // const { deployer } = await getNamedAccounts();
        // const deployment = await deployments.get("LibLiquidation");
        // libLiquidation = await ethers.getContractAt(deployment.abi, deployment.address)
    })

    context("NetValue", async () => {
        // net value = abs(position) * price
        it("Supports a range of positions", async () => {
            let positions = [
                {
                    base: ethers.utils.parseEther("0"),
                    quote: ethers.utils.parseEther("1"),
                }, //single position long
                {
                    base: ethers.utils.parseEther("0"),
                    quote: ethers.utils.parseEther("-1"),
                }, //single position short
                {
                    base: ethers.utils.parseEther("0"),
                    quote: ethers.utils.parseEther("0"),
                }, //no positions
                { base: ethers.utils.parseEther("0"), quote: MAX_INT256 }, //max position supported
                { base: ethers.utils.parseEther("0"), quote: MIN_INT256 }, //min position supported
            ]

            let price = ethers.utils.parseEther("1")

            // generate results
            results = positions.forEach((position) => {
                let result = position.quote.mul(price)
                if (result.lt(BigNumber.from(0))) {
                    result = result.mul(BigNumber.from(-1))
                }
                return result
            })

            for (var i = 0; i < positions.length; i++) {
                // let result = await LibBalances.netValue(positions[i], price)
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })

        it("Supports a range of prices", async () => {
            let prices = [
                ethers.utils.parseEther("1"), //$1
                ethers.utils.parseEther("-1"), //-$1
                ethers.utils.parseEther("0"), //$0
                MAX_INT256, //$max_int256
                MIN_INT256, //$min_int256
            ]

            let position = {
                base: ethers.utils.parseEther("0"),
                quote: ethers.utils.parseEther("1"),
            }

            results = prices.forEach((price) => {
                let result = position.quote.mul(price)
                if (result.lt(BigNumber.from(0))) {
                    result = result.mul(BigNumber.from(-1))
                }
                return result
            })

            for (var i = 0; i < prices.length; i++) {
                // let result = await LibBalances.netValue(position, prices[i])
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })
    })

    context("margin", async () => {
        it("Supports a range of positions", async () => {
            let positions = [
                {
                    base: ethers.utils.parseEther("1"),
                    quote: ethers.utils.parseEther("1"),
                },
                {
                    base: ethers.utils.parseEther("-1"),
                    quote: ethers.utils.parseEther("-1"),
                },
                {
                    base: ethers.utils.parseEther("0"),
                    quote: ethers.utils.parseEther("0"),
                },
                {
                    base: ethers.utils.parseEther("1"),
                    quote: ethers.utils.parseEther("-1"),
                },
                { base: MAX_INT256, quote: MAX_INT256 }, //max position supported
                { base: MIN_INT256, quote: MIN_INT256 }, //min position supported
            ]

            let price = ethers.utils.parseEther("1")
            // generate results
            results = positions.forEach((position) => {
                // get the abs of the result
                let result = position.quote.add(position.base.mul(price))
                return result
            })

            for (var i = 0; i < positions.length; i++) {
                // let result = await LibBalances.netValue(positions[i], prices[j])
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })

        it("Supports a range of prices", async () => {
            let position = {
                base: ethers.utils.parseEther("-1"),
                quote: ethers.utils.parseEther("-1"),
            }

            let prices = [
                ethers.utils.parseEther("1"), //$1
                ethers.utils.parseEther("-1"), //-$1
                ethers.utils.parseEther("0"), //$0
                MAX_INT256, //$max_int256
                MIN_INT256, //$min_int256
            ]

            // generate results
            let results = prices.forEach((price) => {
                // get the abs of the result
                let result = position.quote.add(position.base.mul(price))
                return result
            })

            for (var i = 0; i < prices.length; i++) {
                // let result = await LibBalances.netValue(positions[i], prices[j])
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })
    })

    context("leveragedNotionalValue", async () => {
        it("Supports a range of positions", async () => {
            // leveraged notional value = netValue - margin
            let positions = [
                {
                    base: ethers.utils.parseEther("1"),
                    quote: ethers.utils.parseEther("1"),
                },
                {
                    base: ethers.utils.parseEther("-1"),
                    quote: ethers.utils.parseEther("-1"),
                },
                {
                    base: ethers.utils.parseEther("0"),
                    quote: ethers.utils.parseEther("0"),
                },
                {
                    base: ethers.utils.parseEther("1"),
                    quote: ethers.utils.parseEther("-1"),
                },
                { base: MAX_INT256, quote: MAX_INT256 }, //max position supported
                { base: MIN_INT256, quote: MIN_INT256 }, //min position supported
            ]

            let price = ethers.utils.parseEther("1")

            // generate results
            results = positions.forEach((position) => {
                // get the abs of the result
                let netValue = position.quote.mul(price)
                let margin = position.quote.add(position.base.mul(price))
                let result = netValue.sub(margin)
                // ensure result >= 0
                result = result.lt(BigNumber.from(0))
                    ? BigNumber.from(0)
                    : result
                return result
            })

            for (var i = 0; i < positions.length; i++) {
                // let result = await LibBalances.netValue(positions[i], prices[j])
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })

        it("Supports a range of prices", async () => {
            // leveraged notional value = netValue - margin
            let position = {
                base: ethers.utils.parseEther("-1"),
                quote: ethers.utils.parseEther("-1"),
            }

            let prices = [
                ethers.utils.parseEther("1"), //$1
                ethers.utils.parseEther("-1"), //-$1
                ethers.utils.parseEther("0"), //$0
                MAX_INT256, //$max_int256
                MIN_INT256, //$min_int256
            ]

            // generate results
            results = prices.forEach((price) => {
                // get the abs of the result
                let netValue = position.quote.mul(price)
                let margin = position.quote.add(position.base.mul(price))
                let result = netValue.sub(margin)
                // ensure result >= 0
                result = result.lt(BigNumber.from(0))
                    ? BigNumber.from(0)
                    : result
                return result
            })

            for (var i = 0; i < prices.length; i++) {
                // let result = await LibBalances.netValue(positions[i], prices[j])
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })
    })
})
