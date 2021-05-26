const tracerAbi = require("../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")

module.exports = async function (hre) {
    const { deployments, getNamedAccounts, ethers } = hre
    const { deploy, execute } = deployments
    const { deployer, acc1, acc2, acc3 } = await getNamedAccounts()
    const signers = await ethers.getSigners()
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
    const libPricing = await deploy("Prices", {
        from: deployer,
        log: true,
    })
    const libInsurance = await deploy("LibInsurance", {
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
    const priceOracle = await deploy("PriceOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    const gasOracle = await deploy("GasOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    const ethOracle = await deploy("EthOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    const oracleAdapter = await deploy("PriceOracleAdapter", {
        from: deployer,
        log: true,
        args: [priceOracle.address],
        contract: "OracleAdapter",
    })

    const gasPriceOracle = await deploy("GasPriceOracle", {
        from: deployer,
        log: true,
        args: [ethOracle.address, gasOracle.address],
        contract: "GasOracle",
    })

    const gasPriceOracleAdapter = await deploy("GasPriceOracleAdapter", {
        from: deployer,
        log: true,
        args: [gasPriceOracle.address],
        contract: "OracleAdapter",
    })

    // deploy token with an initial supply of 100000
    const token = await deploy("QuoteToken", {
        args: ["100000000000000000000000"],
        from: deployer,
        log: true,
        contract: "TestToken",
    })

    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "transfer",
        acc1,
        ethers.utils.parseEther("10000")
    )
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "transfer",
        acc2,
        ethers.utils.parseEther("10000")
    )
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "transfer",
        acc3,
        ethers.utils.parseEther("10000")
    )

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
        libraries: {
            LibMath: libMath.address,
            Prices: libPricing.address,
        },
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
            Prices: libPricing.address,
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

    let maxLeverage = ethers.utils.parseEther("12.5")
    let tokenDecimals = new ethers.BigNumber.from("8").toString()
    let feeRate = 0 // 0 percent
    let fundingRateSensitivity = 1
    let maxLiquidationSlippage = ethers.utils.parseEther("50") // 50 percent

    var deployTracerData = ethers.utils.defaultAbiCoder.encode(
        [
            "bytes32", //_marketId,a
            "address", //_tracerQuoteToken,
            "uint256", //_tokenDecimals,
            "address", //_gasPriceOracle,
            "uint256", //_maxLeverage,
            "uint256", //_fundingRateSensitivity,
            "uint256", //_feeRate
            "address", // _feeReceiver
        ],
        [
            ethers.utils.formatBytes32String("TEST1/USD"),
            token.address,
            tokenDecimals,
            gasPriceOracleAdapter.address,
            maxLeverage,
            fundingRateSensitivity,
            feeRate,
            deployer,
        ]
    )
    await deployments.execute(
        "TracerPerpetualsFactory",
        {
            from: deployer,
            log: true,
        },
        "deployTracer",
        deployTracerData,
        ethOracle.address,
        maxLiquidationSlippage
    )

    const tracerInstance = new ethers.Contract(
        await deployments.read("TracerPerpetualsFactory", "tracersByIndex", 0),
        tracerAbi
    ).connect(signers[0])

    const insurance = await deploy("Insurance", {
        args: [tracerInstance.address],
        from: deployer,
        libraries: {
            LibMath: libMath.address,
            SafetyWithdraw: safetyWithdraw.address,
            Balances: libBalances.address,
            LibInsurance: libInsurance.address,
        },
    })

    const pricing = await deploy("Pricing", {
        args: [
            tracerInstance.address,
            insurance.address,
            oracleAdapter.address,
        ],
        from: deployer,
        libraries: {
            LibMath: libMath.address,
            Prices: libPricing.address,
        },
        log: true,
    })

    const liquidation = await deploy("Liquidation", {
        args: [
            pricing.address,
            tracerInstance.address,
            insurance.address,
            maxLiquidationSlippage,
        ],
        from: deployer,
        log: true,
        libraries: {
            LibMath: libMath.address,
            Balances: libBalances.address,
            LibLiquidation: libLiquidation.address,
            Perpetuals: libPerpetuals.address,
        },
    })

    // Set insurance, pricing, liquidation contracts
    await tracerInstance.setInsuranceContract(insurance.address)
    await tracerInstance.setPricingContract(pricing.address)
    await tracerInstance.setLiquidationContract(liquidation.address)

    // Set Trader.sol to be whitelisted, as well as deployer (for testing purposes)
    await tracerInstance.setWhitelist(trader.address, true)
    await tracerInstance.setWhitelist(deployer, true)
}
module.exports.tags = ["FullDeploy", "TracerPerpetualSwaps"]
