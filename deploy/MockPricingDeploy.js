const tracerAbi = require("../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")

module.exports = async function (hre) {
    const { deployments } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const signers = await ethers.getSigners()

    const tracerInstance = new ethers.Contract(
        await deployments.read("TracerPerpetualsFactory", "tracersByIndex", 0),
        tracerAbi
    ).connect(signers[0])

    const libMath = await deployments.get("LibMath")

    // Create a mock pricing contract and set it as the contract for the market
    const mockPricing = await deploy("PricingMock", {
        from: deployer,
        libraries: {
            LibMath: libMath.address,
        },
        log: true,
    })

    await tracerInstance.setPricingContract(mockPricing.address)
}
module.exports.tags = ["MockPricingDeploy"]
module.exports.dependencies = ["FullDeployTest"]
