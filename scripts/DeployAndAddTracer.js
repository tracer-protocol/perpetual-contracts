const hre = require("hardhat")

// small sample script for using deploys and then deploying a trace
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments, ethers, getNamedAccounts } = hre
    const [deployer, ...accounts] = await ethers.getSigners()
    // deploy all contracts
    await deployments.fixture(["FullDeploy"])
    let maxLeverage = new ethers.BigNumber.from("125000").toString()
    let tokenDecimals = new ethers.BigNumber.from("1000000").toString()
    let feeRate = 0 // 0 percent
    let maxLiquidationSlippage = "50000000000000000000" // 50 percent
    let fundingRateSensitivity = 1
    let gasPriceOracle = await deployments.get("Oracle")
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
            "address", // _feeReceiver
        ],
        [
            ethers.utils.formatBytes32String("TEST1/USD"),
            token.address,
            tokenDecimals,
            gasPriceOracle.address,
            maxLeverage,
            fundingRateSensitivity,
            feeRate,
            deployer.address,
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
