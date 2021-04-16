
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-truffle5";
import 'hardhat-contract-sizer'

export default {
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