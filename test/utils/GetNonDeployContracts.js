const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const perpsAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")

const { ethers, deployments } = require("hardhat")

/**
 * During FullDeploy.js, a number of contracts are not deployed using hardhat-deploy.
 * They are instead deployed via the factory (TracerPerpetualsFactory.sol).
 * This means you can't get them using `deployments.get(...)`.
 * Liquidation, Pricing, Insurance, TracerPerpetualSwaps
 */

module.exports.liquidatablePositionContracts = deployments.createFixture(async () => {
    await deployments.fixture("GetIntoLiquidatablePosition")
    accounts = await ethers.getSigners()

    let perpsAddress = await deployments.read(
        "TracerPerpetualsFactory",
        "tracersByIndex",
        0
    )
    let tracerPerpsInstance = new ethers.Contract(
        perpsAddress,
        perpsAbi,
        ethers.provider
    )
    tracerPerpsInstance = await tracerPerpsInstance.connect(accounts[0])

    let insuranceInstance = new ethers.Contract(
        await tracerPerpsInstance.insuranceContract(),
        insuranceAbi,
        ethers.provider
    )
    insuranceInstance = await insuranceInstance.connect(accounts[0])

    let pricingInstance = new ethers.Contract(
        await tracerPerpsInstance.pricingContract(),
        pricingAbi,
        ethers.provider
    )
    pricingInstance = await insuranceInstance.connect(accounts[0])

    let liquidationInstance = new ethers.Contract(
        await tracerPerpsInstance.liquidationContract(),
        liquidationAbi,
        ethers.provider
    )
    liquidationInstance = await liquidationInstance.connect(accounts[0])

    return { liquidationInstance, pricingInstance, insuranceInstance, tracerPerpsInstance }
    // return await core()
})

module.exports.fullDeployContracts = deployments.createFixture(async () => {
    await deployments.fixture("FullDeploy")
    return await core()
})

const core = async () => {
    accounts = await ethers.getSigners()

    let perpsAddress = await deployments.read(
        "TracerPerpetualsFactory",
        "tracersByIndex",
        0
    )
    let tracerPerpsInstance = new ethers.Contract(
        perpsAddress,
        perpsAbi,
        ethers.provider
    )
    tracerPerpsInstance = await tracerPerpsInstance.connect(accounts[0])

    let insuranceInstance = new ethers.Contract(
        await tracerPerpsInstance.insuranceContract(),
        insuranceAbi,
        ethers.provider
    )
    insuranceInstance = await insuranceInstance.connect(accounts[0])

    let pricingInstance = new ethers.Contract(
        await tracerPerpsInstance.pricingContract(),
        pricingAbi,
        ethers.provider
    )
    pricingInstance = await insuranceInstance.connect(accounts[0])

    let liquidationInstance = new ethers.Contract(
        await tracerPerpsInstance.liquidationContract(),
        liquidationAbi,
        ethers.provider
    )
    liquidationInstance = await liquidationInstance.connect(accounts[0])

    return { liquidationInstance, pricingInstance, insuranceInstance, tracerPerpsInstance }
}