# Tracer
https://tracer.finance

This repository contains the smart contract source code powering the Tracer perpetual swaps protocol.

For a brief overview of each core contract, view [contracts/README_Contracts.md](./contracts/README_Contracts.md).

For an explanation of each error code, view [contracts/README_Errors.md](./contracts/README_Errors.md).

For more on the Tracer protoco and the Tracer DAO, view the DAO's [Twitter](https://twitter.com/tracer_finance), join the [Discord](https://discord.gg/kvJEwfvyrW) and check out the [Discourse](https://discourse.tracer.finance/)

##### Contributions guide
[ContributionsGuide.md](./ContributionsGuide.md)

## Install

```
yarn install
```
## Test
Testing uses the [Hardhat](https://hardhat.org/) framework

To run all tests
```
yarn test
```
To run individual test files, use
```
yarn hardhat test <PATH_TO_TEST>
```
## Deployment
Hardhat does not support native deployments. To aid in deployment, hardhat-deploy is being used. You can see the deployment scripts in the `/deploy` directory.

Tracer also supports programatic verification of contracts during deployment. Use the `hardhat.config.js` file to set your Etherscan API key in order for this to be enabled.

To run deploys to a live network
```
yarn hardhat deploy --network NETWORK --tags LiveDeploy
```
This will run the LiveDeployment script which is made to deploy to a real network. If there is any issues with verification, you may run
```
yarn hardhat deploy --network NETWORK --tags LiveVerify
```
in order to reverify any deployed contracts.

Some helper scripts have also been created to run deployments and add supporting function calls. For example, `DeployAndAddTracer.js` runs the `FullDeploy.js` file and then creates a Tracer market with this deployment.

To run a specific script, run
```
yarn hardhat run <PATH_TO_SCRIPT>
```
## Constants
### Mainnet
| Contract | address                           |
|----------|-----------------------------------|
| TracerToken   | [0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050](https://etherscan.io/address/0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050) | 
| TracerDAO   | [0x515f2815c950C8385C1C3c30B63AdF3207Aa259a](https://etherscan.io/address/0x515f2815c950C8385C1C3c30B63AdF3207Aa259a) | 
