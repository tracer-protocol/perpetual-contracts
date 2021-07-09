const oracleAbi = require("../abi/contracts/oracle/Oracle.sol/Oracle.json")
const hre = require("hardhat")
const fs = require("fs")

module.exports.setPrice = async (privateKeyFile, price, oracleAddress) => {
    // deploy all contracts using hardhat deploy
    const { ethers } = hre

    // Get private key from pkey2.secret, and trim any newlines
    let pkey = fs.readFileSync(privateKeyFile, "utf-8")
    pkey = pkey.trim()

    // Create wallet with this private key, on kovan
    const wallet = new ethers.Wallet(pkey, ethers.getDefaultProvider("kovan"))

    // Set price to $0.96
    let oracle = new ethers.Contract(oracleAddress, oracleAbi)
    await oracle.connect(wallet).setPrice(price)
}
