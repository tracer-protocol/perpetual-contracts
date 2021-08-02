const tracerAbi = require("../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const hre = require("hardhat")

// deposits 100 quote token into a locally deployed Tracer
// this assumes the the user accounts already have a sufficient balance of QuoteToken
// running FullDeployTest will give each account 10000 of them
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments, ethers } = hre
    // first account is the deployer
    const [, ...accounts] = await ethers.getSigners()

    let tracer = await deployments.read(
        "TracerPerpetualsFactory",
        "tracersByIndex",
        0
    )
    let tracerInstance = new ethers.Contract(tracer, tracerAbi)

    // deposit some quote token into Tracer
    for (let i = 0; i < 2; i++) {
        tracerInstance = await tracerInstance.connect(accounts[i])
        await deployments.execute(
            "QuoteToken",
            { from: accounts[i].address, log: true },
            "approve",
            tracer,
            ethers.utils.parseEther("10000")
        )
        await tracerInstance.deposit(ethers.utils.parseEther("1000"))
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
