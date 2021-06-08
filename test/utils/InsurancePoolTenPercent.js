const { ethers, deployments } = require("hardhat")
const { BigNumber } = require("ethers")

module.exports = async (insuranceInstance) => {
    const { execute } = deployments
    accounts = await ethers.getSigners()

    const target = await insuranceInstance.getPoolTarget()
    const tenPercent = target.div(BigNumber.from(10))
    await execute(
        "QuoteToken",
        { from: accounts[0].address, log: true },
        "approve",
        insuranceInstance.address,
        tenPercent
    )

    await insuranceInstance.deposit(tenPercent)
}