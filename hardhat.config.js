
require("@nomiclabs/hardhat-truffle5");
require('hardhat-contract-sizer')

module.exports = {
    solidity: {
        version: "0.6.12",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000
            }
        }
    },
    networks: {
        hardhat: {
            blockGasLimit: 12450000
        },
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: false,
    }
};