const hre = require("hardhat")

// small sample script for using deploys and then deploying a trace
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments, ethers, getNamedAccounts } = hre
    const [deployer, ...accounts] = await ethers.getSigners()
    // deploy all contracts
    await deployments.fixture(["FullDeployTest"])
    let maxLeverage = ethers.utils.parseEther("12.5")
    let tokenDecimals = 18
    let feeRate = 0 // 0 percent
    let maxLiquidationSlippage = "50000000000000000000" // 50 percent
    let fundingRateSensitivity = ethers.utils.parseEther("1")
    let gasPriceOracleAdapter = await deployments.get("GasPriceOracleAdapter")
    let trader = await deployments.get("Trader")
    let factory = await deployments.get("TracerPerpetualsFactory")
    let oracle = await deployments.get("Oracle")
    let factoryInstance = new ethers.Contract(
        factory.address,
        factory.abi
    ).connect(deployer)
    let token = await deployments.get("QuoteToken")

    //Deploy a new Tracer contract per test
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
            gasPriceOracleAdapter.address,
            maxLeverage,
            fundingRateSensitivity,
            feeRate,
            deployer,
            ethers.utils.parseEther("20"), // 20 percent
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("1"), // Switches mode at 1%
        ]
    )
    await factoryInstance.deployTracer(
        deployTracerData,
        oracle.address,
        maxLiquidationSlippage
    )
    let tracerAddr = await factoryInstance.tracersByIndex(0)
    console.log(`Factory Deployed: ${factory.address}`)
    console.log(`Tracer Deployed: ${tracerAddr}`)
    console.log(`Trader Deployed: ${trader.address}`)
    console.log(`Margin Token Deployed: ${token.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
