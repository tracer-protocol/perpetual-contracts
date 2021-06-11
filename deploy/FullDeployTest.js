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
    })

    console.log(`Trader Deployed ${trader.address}`)

    // deploy oracles
    const priceOracle = await deploy("PriceOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    console.log(`Price Oracle Deployed ${priceOracle.address}`)

    const gasOracle = await deploy("GasOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    console.log(`Gas Oracle Deployed ${gasOracle.address}`)

    const ethOracle = await deploy("EthOracle", {
        from: deployer,
        log: true,
        contract: "Oracle",
    })

    console.log(`ETH Oracle Deployed ${ethOracle.address}`)

    await execute(
        "EthOracle",
        { from: deployer, log: true },
        "setDecimals",
        "18" // https://etherscan.io/address/0xe5bbbdb2bb953371841318e1edfbf727447cef2e#readContract
    )

    await execute(
        "EthOracle",
        { from: deployer, log: true },
        "setPrice",
        ethers.utils.parseEther("3000") // 3000 USD / ETH
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
        "1000000000" // 1 Gwei
    )

    const oracleAdapter = await deploy("PriceOracleAdapter", {
        from: deployer,
        log: true,
        args: [priceOracle.address],
        contract: "OracleAdapter",
    })

    console.log(`Oracle Adapter Deployed ${oracleAdapter.address}`)

    const gasPriceOracle = await deploy("GasPriceOracle", {
        from: deployer,
        log: true,
        args: [ethOracle.address, gasOracle.address],
        contract: "GasOracle",
    })

    console.log(`Gas Price Oracle Deployed ${gasPriceOracle.address}`)

    const gasPriceOracleAdapter = await deploy("GasPriceOracleAdapter", {
        from: deployer,
        log: true,
        args: [gasPriceOracle.address],
        contract: "OracleAdapter",
    })

    console.log(
        `Gas Price Oracle Adapter Deployed ${gasPriceOracleAdapter.address}`
    )

    // deploy token with an initial supply of 100000
    const token = await deploy("QuoteToken", {
        args: [ethers.utils.parseEther("10000000")], //10 mil supply
        from: deployer,
        log: true,
        contract: "TestToken",
    })

    console.log(`Quote Token Deployed ${token.address}`)

    const tokenAmount = ethers.utils.parseEther("1000")
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

    console.log(`Factory Deployed: ${factory.address}`)

    let maxLeverage = ethers.utils.parseEther("12.5")
    let tokenDecimals = new ethers.BigNumber.from("18").toString()
    let feeRate = 0 // 0 percent
    let fundingRateSensitivity = ethers.utils.parseEther("1")
    let maxLiquidationSlippage = ethers.utils.parseEther("50") // 50 percent
    let deleveragingCliff = ethers.utils.parseEther("20") // 20 percent
    let lowestMaxLeverage = ethers.utils.parseEther("12.5") // Default -> Doesn't go down
    let _insurancePoolSwitchStage = ethers.utils.parseEther("1") // Switches mode at 1%

    var deployTracerData = ethers.utils.defaultAbiCoder.encode(
        [
            "bytes32", //_marketId,a
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
            gasPriceOracleAdapter.address,
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

    console.log(`Tracer Deployed ${tracerInstance.address}`)

    let insurance = await tracerInstance.insuranceContract()
    console.log(`Insurance Deployed ${insurance}`)

    let pricing = await tracerInstance.pricingContract()
    console.log(`Pricing Deployed ${pricing}`)

    let liquidation = await tracerInstance.liquidationContract()
    console.log(`Liquidation Deployed ${liquidation}`)

    // Set Trader.sol to be whitelisted, as well as deployer (for testing purposes)
    await tracerInstance.setWhitelist(trader.address, true)
    await tracerInstance.setWhitelist(deployer, true)
}
module.exports.tags = ["FullDeployTest", "TracerPerpetualSwaps"]
