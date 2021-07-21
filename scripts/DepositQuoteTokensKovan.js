const tracerAbi = require("../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const tokenAbi = require("../abi/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json")
const hre = require("hardhat")
const fs = require("fs")

const { ethers } = hre
const DEPOSIT_AMOUNT = ethers.utils.parseEther("1000")
const NETWORK = "kovan"
const PRIVATE_KEY_FILE = "pkey2.secret"
const TRACER_ADDRESS = "0x5566eDe4eBF614831e6eFc538D51AF5c5FEeeA0d"

// deposits quote token into a Tracer market
// this assumes the the user accounts already have a sufficient balance of QuoteToken
// running FullDeployTest will give each account 10000 of them if a local deployment
async function main() {
    // deploy all contracts using hardhat deploy
    // first account is the deployer

    tracer = TRACER_ADDRESS
    let tracerInstance = new ethers.Contract(tracer, tracerAbi)

    let pkey = fs.readFileSync(PRIVATE_KEY_FILE, "utf-8")
    pkey = pkey.trim()
    const wallet = new ethers.Wallet(
        pkey,
        ethers.getDefaultProvider(NETWORK ? NETWORK : null)
    )
    let tokenInstance = new ethers.Contract(
        await tracerInstance.connect(wallet).tracerQuoteToken(),
        tokenAbi
    )

    // deposit some quote token into Tracer
    for (let i = 0; i < 1; i++) {
        tracerInstance = await tracerInstance.connect(wallet)
        const quote = (await tracerInstance.balances(wallet.address)).position
            .quote
        // In reality, this should be checking base as well, but suffices for use case
        if (quote.gt("0")) {
            const tx = await tracerInstance.withdraw(quote)
            await tx.wait()
        }
        if (
            (
                await tokenInstance
                    .connect(wallet)
                    .allowance(wallet.address, tracerInstance.address)
            ).lt(DEPOSIT_AMOUNT)
        ) {
            const tx = await tokenInstance
                .connect(wallet)
                .approve(
                    tracerInstance.address,
                    ethers.utils.parseEther(
                        DEPOSIT_AMOUNT.mul(ethers.utils.parseEther("99"))
                    )
                )
            await tx.wait()
        }
        const deposit = await tracerInstance.deposit(DEPOSIT_AMOUNT)
        await deposit.wait()
        console.log(
            `balance of ${wallet.address} is now ${ethers.utils.formatEther(
                (await tracerInstance.balances(wallet.address)).position.quote
            )}`
        )
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
