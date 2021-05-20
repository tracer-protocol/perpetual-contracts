module.exports = async function (hre) {
    const { deployments, getNamedAccounts, ethers } = hre
    const { read, execute } = deployments
    const { deployer, acc1 } = await getNamedAccounts()

    await deployments.fixture("FullDeploy")
    const perps = await deployments.get("TracerPerpetualSwaps")
    const oracle = await deployments.get("PriceOracleAdapter")
    const price = await read("PriceOracleAdapter", "latestAnswer")
    console.log(price.toString())
    console.log(acc1)
    console.log(deployer)
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "approve",
        perps.address,
        "1000"
    )
    await execute(
        "QuoteToken",
        { from: acc1, log: true },
        "approve",
        perps.address,
        "1000"
    )
    // console.log(await read("TracerPerpetualSwaps", "balances", deployer))
    await execute(
        "TracerPerpetualSwaps",
        { from: deployer, log: true },
        "deposit",
        "1000"
    )
    await execute(
        "TracerPerpetualSwaps",
        { from: acc1, log: true },
        "deposit",
        "1000"
    )
    // console.log((await read("TracerPerpetualSwaps", "balances", deployer)).position.quote.toString())
    console.log("deployer and acc1 have deposited into perp swaps market")

    /*
    const provider = ethers.getDefaultProvider("http://localhost:8545")
    const block = await provider.getBlock("latest")
    */
    const block = await ethers.provider.getBlock("latest")

    const makerOrder = [
        deployer, // maker
        perps.address, // market
        price, // price
        50, // amount
        0, // side (0 == Long)
        block.timestamp, 
        123, // expiry
    ]
    const takerOrder = [
        acc1, // maker
        perps.address, // market
        price, // price
        50, // amount
        1, // side (1 == Short)
        block.timestamp, 
        123, // expiry
    ]

    await execute(
        "TracerPerpetualSwaps",
        { from: deployer, log: true },
        "matchOrders",
        makerOrder,
        takerOrder,
        50
    )

    /*
    struct Order {
        address maker;
        address market;
        uint256 price;
        uint256 amount;
        Side side;
        uint256 expires;
        uint256 created;
    }
    */
}
