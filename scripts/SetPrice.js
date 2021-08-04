const oracleAbi = require("../abi/contracts/oracle/Oracle.sol/Oracle.json")
const { Command } = require("commander")
const hre = require("hardhat")
const fs = require("fs")
const program = new Command()

program
    .version("0.0.1")
    .requiredOption("-pk, --privatekey", "private key filename")
    .requiredOption("-p, --price", "price to set, in dollars")
    .requiredOption("-o, --oracleAddress", "address of oracle to set price on")
    .parse(process.argv)

async function main() {
    const { ethers } = hre
    const privateKeyFilename = program.args[0]
    const price = parseInt(parseFloat(program.args[1]) * 100000000)
    const oracleAddress = program.args[2]

    // Get private key from pkey2.secret, and trim any newlines
    let pkey = fs.readFileSync(privateKeyFilename, "utf-8")
    pkey = pkey.trim()

    // Create wallet with this private key, on kovan
    const wallet = new ethers.Wallet(pkey, ethers.getDefaultProvider("kovan"))

    // Set price to $0.96
    let oracle = new ethers.Contract(oracleAddress, oracleAbi)
    await oracle.connect(wallet).setPrice(price)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
