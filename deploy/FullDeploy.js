module.exports = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('LibLiquidation', {
    from: deployer,
    log: true,
  });
};
module.exports.tags = ['LibLiquidation'];
