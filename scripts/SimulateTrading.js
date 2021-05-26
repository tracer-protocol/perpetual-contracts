const { BigNumber } = require("@ethersproject/bignumber")
const hre = require("hardhat")

// small sample script for using deploys and then deploying a trace
async function main() {
    // deploy all contracts using hardhat deploy
    const { deployments, ethers } = hre
    const [deployer, ...accounts] = await ethers.getSigners()

    // deploy all contracts
    await deployments.fixture(["FullDeploy"])

    let tracer = await deployments.get("TracerPerpetualSwaps")

    // approve for deployer
    console.log(`Approving tokens for the deployer: ${deployer.address}`)
    await deployments.execute(
        "QuoteToken",
        { from: deployer.address, log: true },
        "approve",
        tracer.address,
        ethers.BigNumber.from(1000 * 10 ** 8)
    )

    // approve and deposit for 2 accounts
    for (let i = 0; i < 2; i++) {
        console.log(`Approving and depositing for ${accounts[i].address}`)
        await deployments.execute(
            "QuoteToken",
            { from: accounts[i].address, log: true },
            "approve",
            tracer.address,
            ethers.BigNumber.from(10000 * 10 ** 8)
        )
        await deployments.execute(
            "TracerPerpetualSwaps",
            { from: accounts[i].address, log: true },
            "deposit",
            ethers.BigNumber.from(10000 * 10 ** 8)
        )
    }

    // create 40 matched orders between acc1 and acc2
    // randomly increase/decrease price by 0.01 each loop
    // the first 20 orders will have accounts[0] as maker and accounts[1] as taker
    // the last 20 orders will have accounts[1] as maker and accounts[0] as taker
    // the traders swap between long and short incrementally
    // amount is randomly between 30 and 70
    console.log(`Simulating orders for market: ${tracer.address}`)
    let smallAmount = ethers.BigNumber.from("10000000000000000") // this is 0.01 in WAD
    for (let i = 0; i < 40; i++) {
        let price = ethers.BigNumber.from(
            await deployments.read("PriceOracleAdapter", "latestAnswer")
        )
        let block = await ethers.provider.getBlock("latest")
        console.log(`Current price: ${price} at block: ${block.timestamp}`)
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
            tracer.address, // market
            price.toString(), // price
            amount.toString(), // amount
            makerSide, // side long on even numbers
            block.timestamp + 100, // expiry,
            0, // created
        ]
        let takerOrder = [
            taker, // taker
            tracer.address, // market
            price.toString(), // price
            amount.toString(), // amount
            takerSide, // side long on odd numbers
            block.timestamp + 100, // expiry,
            0, // created
        ]

        console.log("Executing trade")
        await deployments.execute(
            "TracerPerpetualSwaps",
            { from: deployer.address, log: true },
            "matchOrders",
            makerOrder,
            takerOrder,
            amount
        )
        console.log("Successfully executed trade")
        let newPrice = price.add(
            Math.random() > 0.5 ? smallAmount : smallAmount.mul(-1)
        )
        console.log(
            `Updating Oracle price to $${ethers.utils.formatEther(newPrice)}\n`
        )
        // await deployments.execute(
        //     "PriceOracle",
        //     { from: deployer.address, log: true },
        //     "setPrice",
        //     newPrice.toString()
        // )
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
