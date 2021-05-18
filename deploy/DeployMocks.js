module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()

    const libLiquidation = await deploy("LibLiquidation", {
        from: deployer,
        log: true,
    })

    const libBalances = await deploy("Balances", {
        from: deployer,
        log: true,
    })

    await deploy("LibLiquidationMock", {
        from: deployer,
        log: true,
        libraries: {
            LibLiquidation: libLiquidation.address,
        },
    })

    await deploy("LibBalancesMock", {
        from: deployer,
        log: true,
        libraries: {
            Balances: libBalances.address,
        },
    })
}
module.exports.tags = ["LibLiquidationMock", "LibBalancesMock"]
