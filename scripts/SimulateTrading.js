const tracerAbi = require("../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const hre = require("hardhat")

// small sample script for using deploys and then deploying a trace
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments, ethers } = hre
    const [deployer, ...accounts] = await ethers.getSigners()

    // deploy all contracts
    await deployments.fixture(["FullDeploy"])

    let tracer = await deployments.read(
        "TracerPerpetualsFactory",
        "tracersByIndex",
        0
    )
    let tracerInstance = new ethers.Contract(tracer, tracerAbi)

    // approve for deployer
    console.log(`Approving tokens for the deployer: ${deployer.address}`)
    await deployments.execute(
        "QuoteToken",
        { from: deployer.address, log: true },
        "approve",
        tracer,
        ethers.BigNumber.from(1000 * 10 ** 8)
    )

    // approve and deposit for 2 accounts
    for (let i = 0; i < 2; i++) {
        // I know this is lame but connect returns a new instance
        tracerInstance = await tracerInstance.connect(accounts[i])
        console.log(`Approving and depositing for ${accounts[i].address}`)
        await deployments.execute(
            "QuoteToken",
            { from: accounts[i].address, log: true },
            "approve",
            tracer,
            ethers.utils.parseEther("10000")
        )
        await tracerInstance.deposit(ethers.utils.parseEther("10000"))
    }

    // attach the deployer
    tracerInstance = await tracerInstance.connect(deployer)
    // create 40 matched orders between acc1 and acc2
    // randomly increase/decrease price by 0.01 each loop
    // the first 20 orders will have accounts[0] as maker and accounts[1] as taker
    // the last 20 orders will have accounts[1] as maker and accounts[0] as taker
    // the traders swap between long and short incrementally
    // amount is randomly between 30 and 70
    console.log(`Simulating orders for market: ${tracer}`)
    let smallAmount = ethers.BigNumber.from("10000000000000000") // this is 0.01 in WAD
    for (let i = 0; i < 40; i++) {
        let price = ethers.BigNumber.from(
            await deployments.read("PriceOracleAdapter", "latestAnswer")
        )
        let block = await ethers.provider.getBlock("latest")
        console.log(
            `Current price: ${ethers.utils.formatEther(price)} at block: ${
                block.timestamp
            }`
        )
        // generate random number between 15 and 1
        // Math.floor(Math.random() * (max - min + 1) + min)
        let amount = ethers.utils.parseEther(
            Math.floor(Math.random() * (15 - 1 + 1) + 1).toString()
        )
        console.log(`Creating trades for amount: ${amount}`)
        let maker = accounts[0].address
        let makerSide = i % 2 ? 1 : 0
        let taker = accounts[1].address
        let takerSide = i % 2 ? 0 : 1
        console.log(
            `Maker: ${maker} is ${
                makerSide === 0 ? "long" : "short"
            }\nTaker: ${taker} is ${takerSide === 0 ? "long" : "short"}`
        )
        // side (0 === long, 1 === short)
        let makerOrder = [
            maker,
            tracer, // market
            price.toString(), // price
            amount.toString(), // amount
            makerSide, // side long on even numbers
            block.timestamp + 100, // expiry,
            0, // created
        ]
        let takerOrder = [
            taker, // taker
            tracer, // market
            price.toString(), // price
            amount.toString(), // amount
            takerSide, // side long on odd numbers
            block.timestamp + 100, // expiry,
            0, // created
        ]

        console.log("Matching orders")
        await tracerInstance.matchOrders(makerOrder, takerOrder, amount)
        console.log("Successfully matched orders")
        let newPrice = price
            .add(Math.random() > 0.5 ? smallAmount : smallAmount.mul(-1))
            .div(ethers.BigNumber.from("10000000000")) // convert back to 10^8

        console.log(`Updating Oracle price to $${newPrice.toString()}\n`)
        await deployments.execute(
            "EthOracle",
            { from: deployer.address, log: true },
            "setPrice",
            newPrice
        )
    }

    let factory = await deployments.get("TracerPerpetualsFactory")
    console.log(`Factory: ${factory.address}`)
    console.log(`Traded on tracer: ${tracer}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
