module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()
    console.log(deployer, "Deployer")
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

    // deploy token with an initial supply of 100000
    await deploy('TestToken', {
        args: ["100000000000000000000000"], 
        from: deployer,
        log: true,
    });

    // deploy deployers
    const liquidationDeployer = await deploy('LiquidationDeployerV1', {
        from: deployer,
        libraries: {
            LibLiquidation: libLiquidation.address,
            Balances: libBalances.address,
            LibMath: libMath.address
        },
        log: true
    })

    const insuranceDeployer = await deploy('InsuranceDeployerV1', {
        from: deployer,
        log: true
    })

    const pricingDeployer = await deploy('PricingDeployerV1', {
        from: deployer,
        log: true
    })

    // deploy Tracer perps deployer
    const perpsDeployer = await deploy('PerpsDeployerV1', {
        from: deployer,
        libraries: {
            Perpetuals: libPerpetuals.address,
            LibMath: libMath.address,
            SafetyWithdraw: safetyWithdraw.address,
            Balances: libBalances.address
        },
        log: true,
    });

    // deploy Tracer perps factory
    await deploy('TracerPerpetualsFactory', {
        args: [
            perpsDeployer.address, 
            liquidationDeployer.address,
            insuranceDeployer.address,
            pricingDeployer.address,
            deployer // governance address
        ],
        from: deployer,
        log: true,
    });
}
module.exports.tags = ["FullDeploy"]
