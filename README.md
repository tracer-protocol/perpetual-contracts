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

```
yarn test
```

## Constants
### Mainnet
| Contract | address                           |
|----------|-----------------------------------|
| TracerToken   | [0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050](https://etherscan.io/address/0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050) | 
| TracerDAO   | [0x515f2815c950C8385C1C3c30B63AdF3207Aa259a](https://etherscan.io/address/0x515f2815c950C8385C1C3c30B63AdF3207Aa259a) | 

## Tests
Tests use the mocha testing framework. We avoid using truffle globals such as to enable multi-core parrallel testing. Instead of using the global `artifacts` variable from the Truffle environment, contracts are instantiated in our own custom `artifacts.ts` file. This enables the child processes instantiated by mocha to access the Truffle contracts. We also use use ganache-core for testing as opposed to connecting to a server endpoint or using the Truffle web3 global. For more info check out this answer https://github.com/trufflesuite/truffle/issues/1707#issuecomment-748313997.
