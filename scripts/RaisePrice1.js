const { setPrice } = require("./SetPrice")

// Address of the oracle to call `setPrice(...)` on
const ORACLE_ADDRESS = "0xf051bCd20F02deF359cE8aA03a9e4C38b6a55a7c"
const PRICE = "100000000"
const PRIVATE_KEY_FILE = "pkey2.secret"

async function main() {
    await setPrice(PRIVATE_KEY_FILE, PRICE, ORACLE_ADDRESS)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
