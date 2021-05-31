// small sample script for using deploys and then funding accounts after
async function main() {
    // deploy all contracts
    await deployments.fixture(["FullDeploy"])
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
