module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()

    // deploy libs
    const safetyWithdraw = await deploy('SafetyWithdraw', {
        from: deployer,
        log: true,
    })
    const libMath = await deploy('LibMath', {
        from: deployer,
        log: true,
    })
    const libPerpetuals = await deploy('Perpetuals', {
        from: deployer,
        log: true,
    })
    const libBalances = await deploy('Balances', {
        from: deployer,
        log: true,
    })
    const libLiquidation = await deploy('LibLiquidation', {
        from: deployer,
        log: true,
    })

    // deploy trader
    await deploy('Trader', {
        from: deployer,
        log: true,
        libraries: {
            Perpetuals: libPerpetuals.address
        }
    });

    // deploy oracles
    await deploy('Oracle', {
        from: deployer,
        log: true,
    });

    // deploy token
    await deploy('TestToken', {
        args: ["100000000000000000000000"],
        from: deployer,
        log: true,
    });

    // deploy Tracer perps deployer
    const deployerV1 = await deploy('DeployerV1', {
        from: deployer,
        libraries: {
            Perpetuals: libPerpetuals.address,
            LibMath: libMath.address,
            SafetyWithdraw: safetyWithdraw.address,
            Balances: libBalances.address
        },
        log: true,
    });

    // // deploy Tracer perps factory
    await deploy('TracerPerpetualsFactory', {
        args: [deployerV1.address, deployer],
        from: deployer,
        log: true,
    });
}
module.exports.tags = ["FullDeploy"]
