const perpsAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")

const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { smockit, smoddit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const insurancePoolTenPercent = require("../utils/InsurancePoolTenPercent")
const NonDeployContracts = require("../utils/GetNonDeployContracts")

const temp = async () => {
    await deployments.fixture("GetIntoLiquidatablePosition")
    // await deployments.fixture("FullDeploy")
    accounts = await ethers.getSigners()

    /*
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
    */
    // return await core()
}

describe("deleveraging functional tests", async () => {
    let accounts
    let tracerPerps
    let liquidation
    let insurance
    let trader
    let libPerpetuals
    before(async function () {
        accounts = await ethers.getSigners()
    })

    context("When insurance pool collateral = 10% of target", async () => {
        beforeEach(async () => {
            // const { tracerPerpsInstance, insuranceInstance } =
            const res =
                // await NonDeployContracts.liquidatablePositionContracts()
                await temp();
            /*
            tracerPerps = tracerPerpsInstance
            insurance = insuranceInstance
            await insurancePoolTenPercent(insuranceInstance)
            */
        })
        context(
            "and lowestMaxLeverage is 2",
            async () => {
                it("Calculates as expected", async () => {
                    /*
                    accounts = await ethers.getSigners()
                    // Set lowest maxLeverage to 2, as it is the same as defaultMaxLeverage by default
                    await tracerPerps.setLowestMaxLeverage(ethers.utils.parseEther("2") )
                    const trueMaxLeverage = await tracerPerps.trueMaxLeverage()

                    // See LibPerpetuals.calculateTrueMaxLeverage()
                    // (12.5-2)/(20-1) * 10 + (2 - (12.5-2)/(20-1))
                    // ~ 6.973684
                    const expectedMaxLeverage = ethers.utils.parseEther("6.973684")
                    const epsilon = ethers.utils.parseEther("0.000001")

                    expect(trueMaxLeverage).to.be.within(
                        expectedMaxLeverage.sub(epsilon),
                        expectedMaxLeverage.add(epsilon)
                    )
                    */
                })
            }
        )
        /*
        context(
            "and lowestMaxLeverage == defaultMaxLeverage",
            async () => {
                it("Doesn't decrease trueMaxLeverage", async () => {
                    await tracerPerps.setLowestMaxLeverage(ethers.utils.parseEther("12.5"))

                    const trueMaxLeverage = await tracerPerps.trueMaxLeverage()

                    // See LibPerpetuals.calculateTrueMaxLeverage()
                    // (12.5-12.5)/(20-1) * 10 + (2 - (12.5-2)/(20-1))
                    // ~ 6.973684
                    const expectedMaxLeverage = ethers.utils.parseEther("12.5")

                    expect(trueMaxLeverage).to.equal(expectedMaxLeverage)
                })
            }
        )
        */
    })
})