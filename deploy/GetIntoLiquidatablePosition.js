module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { read, execute } = deployments
    const { deployer, acc1 } = await getNamedAccounts()

    await deployments.fixture("FullDeploy")
    const perps = await deployments.get("TracerPerpetualSwaps")
    const oracle = await deployments.get("PriceOracleAdapter")
    const price = await read("PriceOracleAdapter", "latestAnswer")
    console.log(price.toString())
    console.log(acc1)
    console.log(deployer)
    await execute("QuoteToken", {from: deployer, log: true}, "approve", perps.address, "100");
    await execute("QuoteToken", {from: acc1, log: true}, "approve", perps.address, "100");
    // console.log(await read("TracerPerpetualSwaps", "balances", deployer))
    await execute("TracerPerpetualSwaps", {from: deployer, log: true}, "deposit", "100");
    await execute("TracerPerpetualSwaps", {from: acc1, log: true}, "deposit", "100");
    // console.log((await read("TracerPerpetualSwaps", "balances", deployer)).position.quote.toString())
    console.log("deployer and acc1 have deposited into perp swaps market")

    /*
    const makerOrder = [
        deployer.address,
        perps.address,
        1 * 10^()
    ]

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