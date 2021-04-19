const hre = require("hardhat");
const TestToken = artifacts.require("TestToken");
const { BN, time } = require('@openzeppelin/test-helpers')
const Gov = artifacts.require("Gov");
const TracerFactory = artifacts.require("TracerFactory");

// small sample script for using deploys and then deploying a trace
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments } = hre;
    const twoDays = 172800
    let accounts = await web3.eth.getAccounts();

    // deploy all contracts
    await deployments.fixture(["FullDeploy"]);

    // todo how do collisions work on  multiple instances of a contract?
    let oracle = await deployments.get('Oracle');
    let gasPriceOracle = await deployments.get('Oracle');
    let account = await deployments.get('Account');
    let pricing = await deployments.get('Pricing');
    let maxLeverage = new BN("125000").toString();
    let gov = await deployments.get('Gov');
    let govToken = await deployments.get('TestToken');
    let factory = await deployments.get("TracerFactory")
    gov = await Gov.at(gov.address)
    govToken = await TestToken.at(govToken.address)
    factory = await TracerFactory.at(factory.address)

    // get the deployed gov token and send it out
    for (var i = 0; i < 6; i++) {
        await govToken.transfer(accounts[i], web3.utils.toWei("200"))
    }

    // use gov to deploy a tracer
    var token = await TestToken.new(web3.utils.toWei('1000000'))

    //Deploy a new Tracer contract per test
    var deployTracerData = web3.eth.abi.encodeParameters(
        ['bytes32', 'address', 'address', 'address', 'address', 'address', 'int256', 'uint256'],
        [
            web3.utils.fromAscii(`TEST1/USD`),
            token.address,
            oracle.address,
            gasPriceOracle.address,
            account.address,
            pricing.address,
            maxLeverage,
            1 //funding rate sensitivity
        ]
    )

    await factory.deployTracer(deployTracerData)
    let tracerAddr = await factory.tracersByIndex(0)
    console.log(`Tracer Deplpoyed: ${tracerAddr}`)
    console.log(`Margin Token Deplpoyed: ${token.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

