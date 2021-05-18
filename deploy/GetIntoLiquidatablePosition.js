module.exports = async function (hre) {
    const { deployments, getNamedAccounts } = hre
    const { read, execute } = deployments
    const { deployer, acc1 } = await getNamedAccounts()

    await deployments.fixture("FullDeploy")
    const temp = await deployments.get("TracerPerpetualSwaps")
    await execute("TestToken", {from: deployer, log: true}, "approve", temp.address, "100");
    console.log(await read("TracerPerpetualSwaps", "balances", deployer))
    await execute("TracerPerpetualSwaps", {from: deployer, log: true}, "deposit", "100");
    console.log((await read("TracerPerpetualSwaps", "balances", deployer)).position.quote.toString())

}