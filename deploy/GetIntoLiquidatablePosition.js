module.exports = async function (hre) {
    const { deployments, getNamedAccounts, ethers, BigNumber } = hre
    const { read, execute } = deployments
    const { deployer, acc1 } = await getNamedAccounts()

    await deployments.fixture("FullDeploy")
    const perps = await deployments.get("TracerPerpetualSwaps")
    const oracle = await deployments.get("PriceOracleAdapter")
    const price = (await read("PriceOracleAdapter", "latestAnswer")).toString()
    console.log("Price: " + price.toString())
    console.log(acc1)
    console.log(deployer)
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "approve",
        perps.address,
        ethers.BigNumber.from(1000 * 10**8)
        // ethers.utils.parseEther("1000")
    )
    console.log(1000 * 10**8)
    await execute(
        "QuoteToken",
        { from: acc1, log: true },
        "approve",
        perps.address,
        ethers.BigNumber.from(1000 * 10**8)
        // ethers.utils.parseEther("1000")
    )
    console.log(10**8)
    // console.log(await read("TracerPerpetualSwaps", "balances", deployer))
    await execute(
        "TracerPerpetualSwaps",
        { from: deployer, log: true },
        "deposit",
        ethers.BigNumber.from(1000 * 10**8)
        // ethers.utils.parseEther("1000")
    )
    await execute(
        "TracerPerpetualSwaps",
        { from: acc1, log: true },
        "deposit",
        ethers.BigNumber.from(1000 * 10**8)
        // ethers.utils.parseEther("1000")
    )
    console.log((await read("TracerPerpetualSwaps", "balances", deployer)).position.quote.toString())
    console.log("deployer and acc1 have deposited into perp swaps market")

    /*
    const provider = ethers.getDefaultProvider("http://localhost:8545")
    const block = await provider.getBlock("latest")
    */
    const block = await ethers.provider.getBlock("latest")
    console.log((await read("TracerPerpetualSwaps", "balances", deployer)).position.quote.toString())

    const makerOrder = [
        deployer, // maker
        perps.address, // market
        price, // price
        ethers.utils.parseEther("50"), // amount
        0, // side (0 == Long)
        block.timestamp + 100, // expiry
        0, // created
    ]
    const takerOrder = [
        acc1, // maker
        perps.address, // market
        price, // price
        ethers.utils.parseEther("50"), // amount
        1, // side (1 == Short)
        block.timestamp + 100, // expiry
        0, // created
    ]

    await execute(
        "TracerPerpetualSwaps",
        { from: deployer, log: true },
        "matchOrders",
        makerOrder,
        takerOrder,
        ethers.utils.parseEther("50"), // amount
    )

    console.log("quote and base after trade")
    console.log(ethers.utils.formatEther((await read("TracerPerpetualSwaps", "balances", deployer)).position.quote.toString()))
    console.log(ethers.utils.formatEther((await read("TracerPerpetualSwaps", "balances", deployer)).position.base.toString()))
    console.log((await read("TracerPerpetualSwaps", "balances", deployer)).lastUpdatedGasPrice.toString())

}