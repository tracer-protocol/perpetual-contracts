const hre = require("hardhat");
const { BN } = require("@openzeppelin/test-helpers");

// small sample script for using deploys and then deploying a trace
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments } = hre;
    const twoDays = 172800;
    // deploy all contracts
    await deployments.fixture(["FullDeploy"]);

    let maxLeverage = new BN("125000").toString();
    let tokenDecimals = new BN("1000000").toString();
    let fundingRateSensitivity = 1;
    let feeRate = 1;
    let gasPriceOracle = await deployments.get('Oracle');
    // let liquidation = await deployments.get('Liquidation');
    let trader = await deployments.get("Trader");
    let factory = await deployments.get("TracerPerpetualsFactory");
    let token = await deployments.get("TestToken");


    //Deploy a new Tracer contract per test
    // var deployTracerData = ethers.utils.defaultAbiCoder.encode(
    //     [
    //         "bytes32", //_marketId,
    //         "address", //_tracerQuoteToken,
    //         "uint256", //_tokenDecimals,
    //         "address", //_gasPriceOracle,
    //         "address", //_liquidationContract,
    //         "uint256", //_maxLeverage,
    //         "uint256", //_fundingRateSensitivity,
    //         "uint256", //_feeRate
    //     ],
    //     [
    //         ethers.utils.hexlify(ethers.utils.toUtf8Bytes('TEST1/USD')),
    //         token.address,
    //         tokenDecimals,
    //         gasPriceOracle.address,
    //         liquidation.address,
    //         maxLeverage,
    //         fundingRateSensitivity,
    //         feeRate
    //     ]
    // )

    // await factory.deployTracer(deployTracerData)
    // let tracerAddr = await factory.tracersByIndex(0)
    console.log(`Factory Deplpoyed: ${factory.address}`)
    // console.log(`Tracer Deplpoyed: ${tracerAddr}`)
    console.log(`Trader Deplpoyed: ${trader.address}`)
    console.log(`Margin Token Deplpoyed: ${token.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
