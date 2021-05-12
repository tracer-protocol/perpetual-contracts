const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments

describe("Unit tests: LibInsurance.sol", function () {
    let libInsurance
    let accounts
    const zero = ethers.utils.parseEther("0")
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

    context("calcMintAmount", async() => {
        it("returns 0 if pool token total supply is 0", async() => {
            let result = await libInsurance.calcMintAmount(
                zero,
                zero,
                zero
            )
            expect(result.toString()).to.equal(
                zero.toString()
            )
        })

        it("returns 0 if the amount to stake is 0", async() => {
            let result = await libInsurance.calcMintAmount(
                ethers.utils.parseEther("10"), //pool token supply
                ethers.utils.parseEther("5"), //collateral held
                ethers.utils.parseEther("0") //amount of collateral to deposit
            )
            expect(result.toString()).to.equal(
                zero.toString()
            )
        })

        it("returns 0 if the pool token underlying is 0", async() => {
            let result = await libInsurance.calcMintAmount(
                ethers.utils.parseEther("10"), //pool token supply
                ethers.utils.parseEther("0"), //collateral held
                ethers.utils.parseEther("10") //amount of collateral to deposit
            )
            expect(result.toString()).to.equal(
                zero.toString()
            )
        })

        it("returns the expected amount", async() => {
            let expectedResult = ethers.utils.parseEther("20")
            let result = await libInsurance.calcMintAmount(
                ethers.utils.parseEther("10"), //pool token supply
                ethers.utils.parseEther("5"), //collateral held
                ethers.utils.parseEther("10") //amount of collateral to deposit
            )
            expect(result.toString()).to.equal(
                expectedResult.toString()
            )   
        })
    })

    context('calcWithdrawAmount', async() => {
        it("returns 0 if pool token total supply is 0", async() => {
            let result = await libInsurance.calcWithdrawAmount(
                zero,
                zero,
                zero
            )
            expect(result.toString()).to.equal(
                zero.toString()
            )
        })

        it("returns 0 if the amount to withdraw is 0", async() => {
            let result = await libInsurance.calcWithdrawAmount(
                ethers.utils.parseEther("10"), //pool token supply
                ethers.utils.parseEther("5"), //collateral held
                ethers.utils.parseEther("0") //amount of collateral to deposit
            )
            expect(result.toString()).to.equal(
                zero.toString()
            )
        })

        it("returns 0 if the pool token supply is 0", async() => {
            let result = await libInsurance.calcWithdrawAmount(
                ethers.utils.parseEther("0"), //pool token supply
                ethers.utils.parseEther("10"), //collateral held
                ethers.utils.parseEther("10") //amount of collateral to deposit
            )
            expect(result.toString()).to.equal(
                zero.toString()
            )
        })

        it("returns the expected amount", async() => {
            let expectedResult = ethers.utils.parseEther("5")
            let result = await libInsurance.calcWithdrawAmount(
                ethers.utils.parseEther("10"), //pool token supply
                ethers.utils.parseEther("5"), //collateral held
                ethers.utils.parseEther("10") //amount of pool tokens to withdraw
            )
            expect(result.toString()).to.equal(
                expectedResult.toString()
            )
        })
    })


})
