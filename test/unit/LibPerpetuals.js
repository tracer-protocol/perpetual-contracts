const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const zeroAddress = "0x0000000000000000000000000000000000000000"

describe("Unit tests: LibLiquidation.sol", function () {
    let accounts
    let libPerpetuals

    before(async function () {
        const { deployer } = await getNamedAccounts()

        libPerpetuals = await deploy("Perpetuals", {
            from: deployer,
            log: true,
        })

        await deploy("LibPerpetualsMock", {
            from: deployer,
            log: true,
            libraries: {
                Perpetuals: libPerpetuals.address,
            },
        })

        let deployment = await deployments.get("LibPerpetualsMock")
        libPerpetuals = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("canMatch", async () => {
        context("when called with different order prices", async () => {
            it("returns false", async () => {
                let priceA = ethers.utils.parseEther("1")
                let priceB = ethers.utils.parseEther("2")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    priceA,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    priceB,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
        })

        context("when called with the same side", async () => {
            it("returns false", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 0
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
        })

        context("when called with an expired order", async () => {
            it("returns false if order a is expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresA = 500
                let expiresB = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
            it("returns false if order b is expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresB = 250
                let expiresA = 3021382897 // large unix timestamp
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })

            it("returns false if both orders are expired", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expiresA = 350
                let expiresB = 750
                let created = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expiresA,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expiresB,
                    created,
                ]
                let result = await libPerpetuals.canMatch(orderA, 0, orderB, 0)
                expect(result).to.equal(false)
            })
        })

        context("when called with already filled orders", async () => {
            it("returns false if order a is filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = amount
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })

            it("returns false if order b is filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = amount
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })

            it("returns false if both orders are filled", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = amount
                let filledB = amount
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })
        })

        context("when called with orders that were created in the future", async() => {
            it("returns false if order a was created in the future", async() => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let createdA = 3021382897
                let createdB = 0
                let filledA = 0
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    createdA,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    createdB,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })

            it("returns false if order b was created in the future", async() => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let createdB = 3021382897
                let createdA = 0
                let filledA = 0
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    createdA,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    createdB,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })

            it("retuns false if both orders were created in the future", async() => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let createdA = 3021382897
                let createdB = 3021382897
                let filledA = 0
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    createdA,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    createdB,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(false)
            })
        })

        context("when called with valid orders", async () => {
            it("returns true", async () => {
                let price = ethers.utils.parseEther("1")
                let amount = ethers.utils.parseEther("1")
                let sideA = 1
                let sideB = 0
                let expires = 3021382897 // large unix timestamp
                let created = 0
                let filledA = 0
                let filledB = 0
                let orderA = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideA,
                    expires,
                    created,
                ]
                let orderB = [
                    zeroAddress,
                    zeroAddress,
                    price,
                    amount,
                    sideB,
                    expires,
                    created,
                ]
                let result = await libPerpetuals.canMatch(
                    orderA,
                    filledA,
                    orderB,
                    filledB
                )
                expect(result).to.equal(true)
            })
        })
    })
})
