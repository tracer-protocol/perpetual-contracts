const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments

describe("Unit tests: LibInsurance.sol", function () {
    let libInsurance
    let accounts

    before(async function () {
        const { deployer } = await getNamedAccounts()

        libInsurance = await deploy("LibInsurance", {
            from: deployer,
            log: true,
        })

        await deploy("LibInsuranceMock", {
            from: deployer,
            log: true,
            libraries: {
                LibLiquidation: libInsurance.address,
            },
        })

        let deployment = await deployments.get("LibInsuranceMock")
        libInsurance = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    context("Its a test", async() => {
        it("Should pass", async() => {
            
        })
    })


})
