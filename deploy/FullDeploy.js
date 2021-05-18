module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { read, deploy, execute } = deployments
    console.log(execute);

    const { deployer } = await getNamedAccounts()
    // deploy libs
    const safetyWithdraw = await deploy("SafetyWithdraw", {
        from: deployer,
        log: true,
    })
    const libMath = await deploy("LibMath", {
        from: deployer,
        log: true,
    })
    const libPerpetuals = await deploy("Perpetuals", {
        from: deployer,
        log: true,
    })
    const libBalances = await deploy("Balances", {
        from: deployer,
        log: true,
    })
    const libLiquidation = await deploy("LibLiquidation", {
        from: deployer,
        log: true,
    })

    // deploy trader
    const trader = await deploy("Trader", {
        from: deployer,
        log: true,
        libraries: {
            Perpetuals: libPerpetuals.address,
        },
    })

    // deploy oracles
    const priceOracle = await deploy("Oracle", {
        from: deployer,
        log: true,
    })

    const oracleAdapter = await deploy("OracleAdapter", {
        from: deployer,
        log: true,
        args: [priceOracle.address]
    })

    const gasOracle = await deploy("Oracle", {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: false
    })

    const ethOracle = await deploy("Oracle", {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: false
    })

    const gasPriceOracle = await deploy("GasOracle", {
        from: deployer,
        log: true,
        args: [ethOracle.address, gasOracle.address]
    })

    const gasPriceOracleAdapter = await deploy("OracleAdapter", {
        from: deployer,
        log: true,
        args: [gasPriceOracle.address],
        skipIfAlreadyDeployed: false
    })

    // deploy token with an initial supply of 100000
    const token = await deploy("TestToken", {
        args: ["100000000000000000000000"],
        from: deployer,
        log: true,
    })

    // deploy deployers
    const liquidationDeployer = await deploy("LiquidationDeployerV1", {
        from: deployer,
        libraries: {
            LibLiquidation: libLiquidation.address,
            Balances: libBalances.address,
            LibMath: libMath.address,
        },
        log: true,
    })

    const insuranceDeployer = await deploy("InsuranceDeployerV1", {
        from: deployer,
        log: true,
    })

    const pricingDeployer = await deploy("PricingDeployerV1", {
        from: deployer,
        log: true,
    })

    // deploy Tracer perps deployer
    const perpsDeployer = await deploy("PerpsDeployerV1", {
        from: deployer,
        libraries: {
            Perpetuals: libPerpetuals.address,
            LibMath: libMath.address,
            SafetyWithdraw: safetyWithdraw.address,
            Balances: libBalances.address,
        },
        log: true,
    })

    // deploy Tracer perps factory
    await deploy("TracerPerpetualsFactory", {
        args: [
            perpsDeployer.address,
            liquidationDeployer.address,
            insuranceDeployer.address,
            pricingDeployer.address,
            deployer, // governance address
        ],
        from: deployer,
        log: true,
    })

    let maxLeverage = new ethers.BigNumber.from("125000").toString()
    let tokenDecimals = new ethers.BigNumber.from("1000000").toString()
    let feeRate = "5000000000000000000" // 5 percent
    let fundingRateSensitivity = 1

    console.log(deployer)
    const tracer = await deploy("TracerPerpetualSwaps", {
        args: [
            ethers.utils.formatBytes32String("TEST1/USD"),
            token.address,
            tokenDecimals,
            gasPriceOracleAdapter.address,
            maxLeverage,
            fundingRateSensitivity,
            feeRate,
            deployer,
        ],
        from: deployer,
        log: true,
        libraries: {
            LibMath: libMath.address,
            SafetyWithdraw: safetyWithdraw.address,
            Balances: libBalances.address,
            Perpetuals: libPerpetuals.address
        }
    })

    const insurance = await deploy("Insurance", {
        args: [
            tracer.address,
        ],
        from: deployer,
        libraries: {
            Balances: libBalances.address
        }
    })

    const pricing = await deploy("Pricing", {
        args: [
            tracer.address,
            insurance.address,
            oracleAdapter.address
        ],
        from: deployer,
        log: true
    })

    let maxLiquidationSlippage = ethers.utils.parseEther("50")// 50 percent
    console.log(maxLiquidationSlippage)

    const liquidation = await deploy("Liquidation", {
        args: [
            pricing.address,
            tracer.address,
            insurance.address,
            maxLiquidationSlippage
        ],
        from: deployer,
        log: true,
        libraries: {
            LibMath: libMath.address,
            Balances: libBalances.address,
            LibLiquidation: libLiquidation.address
        }
    })

    await execute("TracerPerpetualSwaps", {from: deployer, log: true}, "setInsuranceContract", insurance.address);
    await execute("TracerPerpetualSwaps", {from: deployer, log: true}, "setPricingContract", pricing.address);
    await execute("TracerPerpetualSwaps", {from: deployer, log: true}, "setLiquidationContract", liquidation.address);
}
module.exports.tags = ["FullDeploy"]
