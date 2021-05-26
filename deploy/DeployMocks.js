module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()

    const libPerpetuals = await deploy("Perpetuals", {
        from: deployer,
        log: true,
    })

    const libLiquidation = await deploy("LibLiquidation", {
        from: deployer,
        log: true,
        libraries: {
            Perpetuals: libPerpetuals.address,
        },
    })

    await deploy("LibLiquidationMock", {
        from: deployer,
        log: true,
        libraries: {
            LibLiquidation: libLiquidation.address,
            Perpetuals: libPerpetuals.address,
        },
    })
}
module.exports.tags = ["LibLiquidationMock"]
