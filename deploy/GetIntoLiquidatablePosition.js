module.exports = async function (hre) {
    const { deployments, getNamedAccounts, ethers, BigNumber } = hre
    const { read, execute } = deployments
    const { deployer, acc1 } = await getNamedAccounts()

    await deployments.fixture("FullDeploy")
    const perps = await deployments.get("TracerPerpetualSwaps")
    const priceOracle = await deployments.get("PriceOracle")
    const price = (await read("PriceOracleAdapter", "latestAnswer")).toString()
    await execute(
        "QuoteToken",
        { from: deployer, log: true },
        "approve",
        perps.address,
        ethers.BigNumber.from(1000 * 10 ** 8)
        // ethers.utils.parseEther("1000")
    )
    await execute(
        "QuoteToken",
        { from: acc1, log: true },
        "approve",
        perps.address,
        ethers.BigNumber.from(1000 * 10 ** 8)
        // ethers.utils.parseEther("1000")
    )
    await execute(
        "TracerPerpetualSwaps",
        { from: deployer, log: true },
        "deposit",
        ethers.BigNumber.from(1000 * 10 ** 8)
        // ethers.utils.parseEther("1000")
    )
    await execute(
        "TracerPerpetualSwaps",
        { from: acc1, log: true },
        "deposit",
        ethers.BigNumber.from(1000 * 10 ** 8)
        // ethers.utils.parseEther("1000")
    )

    const block = await ethers.provider.getBlock("latest")

    const makerOrder = [
        deployer, // maker
        perps.address, // market
        price, // price
        ethers.utils.parseEther("10000"), // amount
        0, // side (0 == Long)
        block.timestamp + 100, // expiry
        0, // created
    ]
    const takerOrder = [
        acc1, // maker
        perps.address, // market
        price, // price
        ethers.utils.parseEther("10000"), // amount
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
        ethers.utils.parseEther("10000") // amount
    )

    // Reduce price by 5%
    await execute(
        "PriceOracle",
        { from: deployer, log: true },
        "setPrice",
        "95000000" // $0.95
    )

    const marginIsValid = (
        await read("TracerPerpetualSwaps", "userMarginIsValid", deployer)
    ).toString()
}

module.exports.tags = ["GetIntoLiquidatablePosition"]
