const { web3 } = require("@openzeppelin/test-helpers/src/setup");

module.exports = async (hre) => {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    // deploy mock gov token
    const govToken = await deploy('TestToken', {
        args: [web3.utils.toWei("100000")],
        from: deployer,
        log: true,
    });

    // deploy governance module
    const gov = await deploy('Gov', {
        args: [govToken.address],
        from: deployer,
        log: true,
    });
};
module.exports.tags = ['GovAndToken'];