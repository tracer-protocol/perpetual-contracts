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
        it("Supports the full range of the quote parameter", async () => {
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

            // constant price of $1
            let price = ethers.utils.parseEther("1")

            // expected netValue results at a value of $1
            let results = [
                ethers.utils.parseEther("1"), //single position long
                ethers.utils.parseEther("1"), //single position short
                ethers.utils.parseEther("0"), //no positions
                MAX_INT256, //max position supported
                MIN_INT256.mul(-1),
            ]

            for (var i = 0; i < positions; i++) {
                // todo fill in function call
                // let result = await LibBalances.netValue(positions[i], price)
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })

        it("Supports the full range of the price parameter", async () => {
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

            let results = [
                ethers.utils.parseEther("1"), //$1
                ethers.utils.parseEther("1"), //$1
                ethers.utils.parseEther("0"), //no positions
                MAX_INT256, //max position supported
                MIN_INT256.mul(-1),
            ]

            for (var i = 0; i < prices; i++) {
                // todo fill in function call
                // let result = await LibBalances.netValue(position, prices[i])
                // expect(result.toString()).to.equal(results[i].toString())
            }
        })

        it("Supports upper and lower bounds", async () => {
            let upperBound = {
              base: ethers.utils.parseEther("0"),
              quote: MAX_INT256,
              price: MAX_INT256,
              result: MAX_INT256.mul(MAX_INT256)
            }

            let lowerBound = {
              base: ethers.utils.parseEther("0"),
              quote: MIN_INT256,
              price: MIN_INT256,
              result: MIN_INT256.mul(MIN_INT256)
            }

            // let upperResult = await LibBalances.netValue({base: upperBound.base, quote: upperBound.quote}, upperBound.price)
            // expect(upperResult.toString()).to.equal(upperBound.result.toString())

            // let lowerResult = await LibBalances.netValue({base: lowerBound.base, quote: lowerBound.quote}, upplowerBounderBound.price)
            // expect(lowerResult.toString()).to.equal(lowerBound.result.toString())
        })
    })
})
