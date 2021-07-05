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
        contract: "TraderMock",
    })

    // deploy oracles
    // asset price oracle => ASSET / USD
    const priceOracle = await deploy("PriceOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    // Gas price oracle => fast gas / gwei
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

    await execute(
        "EthOracle",
        { from: deployer, log: true },
        "setDecimals",
        "8"
    )

    await execute(
        "EthOracle",
        { from: deployer, log: true },
        "setPrice",
        "300000000000" // 3000 USD / ETH
    )

    await execute(
        "GasOracle",
        { from: deployer, log: true },
        "setDecimals",
        "9"
    )

    await execute(
        "GasOracle",
        { from: deployer, log: true },
        "setPrice",
        "20000000000" // 20 Gwei
    )

    // adapter converting asset oracle to WAD
    const oracleAdapter = await deploy("PriceOracleAdapter", {
        from: deployer,
        log: true,
        args: [priceOracle.address],
        contract: "OracleAdapter",
    })

    // adapter converting ETH / USD to WAD
    const ethOracleAdapter = await deploy("EthOracleAdapter", {
        from: deployer,
        log: true,
        args: [ethOracle.address],
        contract: "OracleAdapter",
    })

    const gasPriceOracle = await deploy("GasPriceOracle", {
        from: deployer,
        log: true,
        args: [ethOracleAdapter.address, gasOracle.address],
        contract: "GasOracle",
    })

    // deploy token with an initial supply of 100000
    const token = await deploy("QuoteToken", {
        args: [ethers.utils.parseEther("10000000")], //10 mil supply
        from: deployer,
        log: true,
        contract: "TestToken",
    })

    const tokenAmount = ethers.utils.parseEther("10000")
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "transfer",
        acc1,
        tokenAmount
    )
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "transfer",
        acc2,
        tokenAmount
    )
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "transfer",
        acc3,
        tokenAmount
    )
    console.log(`Quote Tokens transfered from ${deployer} to ${acc1}`)
    console.log(`Quote Tokens transfered from ${deployer} to ${acc2}`)
    console.log(`Quote Tokens transfered from ${deployer} to ${acc3}`)

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
        libraries: {
            LibMath: libMath.address,
            Balances: libBalances.address,
            SafetyWithdraw: safetyWithdraw.address,
            Insurance: libInsurance.address,
        },
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
    let factory = await deploy("TracerPerpetualsFactory", {
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
    let tokenDecimals = new ethers.BigNumber.from("18").toString()
    let feeRate = 0 // 0 percent
    let fundingRateSensitivity = ethers.utils.parseEther("1")
    let maxLiquidationSlippage = ethers.utils.parseEther("0.5") // 50 percent
    let deleveragingCliff = ethers.utils.parseEther("20") // 20 percent
    let lowestMaxLeverage = ethers.utils.parseEther("12.5") // Default -> Doesn't go down
    let _insurancePoolSwitchStage = ethers.utils.parseEther("1") // Switches mode at 1%

    var deployTracerData = ethers.utils.defaultAbiCoder.encode(
        [
            "bytes32", //_marketId,
            "address", //_tracerQuoteToken,
            "uint256", //_tokenDecimals,
            "address", //_gasPriceOracle,
            "uint256", //_maxLeverage,
            "uint256", //_fundingRateSensitivity,
            "uint256", //_feeRate
            "address", // _feeReceiver,
            "uint256", // _deleveragingCliff
            "uint256", // _lowestMaxLeverage
            "uint256", // _insurancePoolSwitchStage
        ],
        [
            ethers.utils.formatBytes32String("TEST1/USD"),
            token.address,
            tokenDecimals,
            gasPriceOracle.address,
            maxLeverage,
            fundingRateSensitivity,
            feeRate,
            deployer,
            deleveragingCliff,
            lowestMaxLeverage,
            _insurancePoolSwitchStage,
        ]
    )

    // this deploys a tracer, insurance, pricing and liquidation contract
    await deployments.execute(
        "TracerPerpetualsFactory",
        {
            from: deployer,
            log: true,
        },
        "deployTracer",
        deployTracerData,
        oracleAdapter.address,
        gasOracle.address,
        maxLiquidationSlippage
    )

    const tracerInstance = new ethers.Contract(
        await deployments.read("TracerPerpetualsFactory", "tracersByIndex", 0),
        tracerAbi
    ).connect(signers[0])

    console.log(`Deployed Tracer Instance: ${tracerInstance.address}`)
    console.log(`Deployed Factory: ${factory.address}`)
    console.log(`Deployed Trader: ${trader.address}`)

    let insurance = await tracerInstance.insuranceContract()
    let pricing = await tracerInstance.pricingContract()
    let liquidation = await tracerInstance.liquidationContract()

    // Set Trader.sol to be whitelisted, as well as deployer (for testing purposes)
    await tracerInstance.setWhitelist(trader.address, true)
    await tracerInstance.setWhitelist(deployer, true)
}
module.exports.tags = ["FullDeployTest", "TracerPerpetualSwaps"]
