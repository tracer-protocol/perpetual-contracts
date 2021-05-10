const hre = require("hardhat")
const TestToken = artifacts.require("TestToken")

// small sample script for using deploys and then funding accounts after
async function main() {
    // deploy all contracts using hardhat deploy
    const { ethers, deployments, getNamedAccounts } = hre
    let accounts = await web3.eth.getAccounts()

    // deploy all contracts
    await deployments.fixture(["FullDeploy"])

    // get the deployed gov token and send it out
    let govToken = await deployments.get("TestToken")
    govToken = await TestToken.at(govToken.address)
    for (var i = 0; i < 6; i++) {
        await govToken.transfer(accounts[i], web3.utils.toWei("200"))
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
