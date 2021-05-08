module.exports = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const libLiquidation = await deploy("LibLiquidation", {
    from: deployer,
    log: true,
  });

  await deploy("LibLiquidationMock", {
    from: deployer,
    log: true,
    libraries: {
      LibLiquidation: libLiquidation.address
    }
  });

  /*
  const deployerContract = await deploy("DeployerV1", {
    from: deployer,
    log: true,
    args: []
  });

  await deploy("TracerPerpetualsFactory", {
    from: deployer,
    log: true,
    args: [deployerContract.address, deployer]
  })
  */
};
module.exports.tags = ["LibLiquidationMock"];
