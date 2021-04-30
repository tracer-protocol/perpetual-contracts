const Insurance = artifacts.require("Insurance");

module.exports = async (hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    // deploy trader
    const trader = await deploy("Trader", {
        from: deployer,
        log: true,
    });

    // deploy mock gov token
    const govToken = await deploy("TestToken", {
        args: [web3.utils.toWei("100000")],
        from: deployer,
        log: true,
    });

    // deploy governance module
    const gov = await deploy("Gov", {
        args: [govToken.address],
        from: deployer,
        log: true,
    });

    // deploy oracles
    const gasPriceOracle = await deploy("Oracle", {
        from: deployer,
        log: true,
    });

    // deploy Tracer perps deployer
    const deployerV1 = await deploy("DeployerV1", {
        from: deployer,
        log: true,
    });

    // deploy insurance
    const insurance = await deploy("Insurance", {
        args: [govToken.address],
        from: deployer,
        log: true,
    });

    // deploy Tracer perps factory
    const factory = await deploy("TracerPerpetualsFactory", {
        args: [insurance.address, deployerV1.address, gov.address],
        from: deployer,
        log: true,
    });

    // deploy pricing
    const pricing = await deploy("Pricing", {
        args: [factory.address],
        from: deployer,
        log: true,
    });

    // deploy accounts
    const account = await deploy("Account", {
        args: [
            insurance.address,
            gasPriceOracle.address,
            factory.address,
            pricing.address,
            gov.address,
        ],
        from: deployer,
        log: true,
    });

    let insuranceInstance = await Insurance.at(insurance.address);
    await insuranceInstance.setFactory(factory.address);
};
module.exports.tags = ["FullDeploy"];
