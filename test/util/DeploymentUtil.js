const { ethers, getNamedAccounts, deployments } = require("hardhat")
const tracerAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const mockTracerAbi = require("../../abi/contracts/test/TracerPerpetualSwapsMock.sol/TracerPerpetualSwapsMock.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const mockPricingAbi = require("../../abi/contracts/test/PricingMock.sol/PricingMock.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const tokenAbi = require("../../abi/contracts/TestToken.sol/TestToken.json")
const gasOracleAbi = require("../../abi/contracts/oracle/GasOracle.sol/GasOracle.json")
const oracleAbi = require("../../abi/contracts/oracle/ChainlinkOracle.sol/ChainlinkOracle.json")
const poolTokenAbi = require("../../abi/contracts/InsurancePoolToken.sol/InsurancePoolToken.json")

const getTracer = async () => {
    const factoryDeployment = await deployments.get("TracerPerpetualsFactory")
    const factory = await ethers.getContractAt(
        factoryDeployment.abi,
        factoryDeployment.address
    )
    const tracerAddress = await factory.tracersByIndex(0)
    return await ethers.getContractAt(tracerAbi, tracerAddress)
}

const getMockTracer = async () => {
    const factoryDeployment = await deployments.get("TracerPerpetualsFactory")
    const factory = await ethers.getContractAt(
        factoryDeployment.abi,
        factoryDeployment.address
    )
    const tracerAddress = await factory.tracersByIndex(0)
    return await ethers.getContractAt(mockTracerAbi, tracerAddress)
}

const getInsurance = async (tracer) => {
    const insuranceAddress = await tracer.insuranceContract()
    return await ethers.getContractAt(insuranceAbi, insuranceAddress)
}

const getPricing = async (tracer) => {
    const pricingAddress = await tracer.pricingContract()
    return await ethers.getContractAt(pricingAbi, pricingAddress)
}

const getMockPricing = async (tracer) => {
    const pricingAddress = await tracer.pricingContract()
    return await ethers.getContractAt(mockPricingAbi, pricingAddress)
}

const getLiquidation = async (tracer) => {
    const liquidationAddress = await tracer.liquidationContract()
    return await ethers.getContractAt(liquidationAbi, liquidationAddress)
}

const getQuoteToken = async (tracer) => {
    const quoteTokenAddress = await tracer.tracerQuoteToken()
    return await ethers.getContractAt(tokenAbi, quoteTokenAddress)
}

const getTrader = async () => {
    const traderDeployment = await deployments.get("Trader")
    return await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )
}

const getGasOracle = async (tracer) => {
    const gasOracleAddress = await tracer.gasPriceOracle()
    return await ethers.getContractAt(gasOracleAbi, gasOracleAddress)
}

const getPriceOracle = async () => {
    const Oracle = await deployments.get("PriceOracle")
    return await ethers.getContractAt(oracleAbi, Oracle.address)
}

const getGasEthOracle = async () => {
    const gasEthOracle = await deployments.get("EthOracle")
    return await ethers.getContractAt(oracleAbi, gasEthOracle.address)
}

const getPoolToken = async (insurance) => {
    return await ethers.getContractAt(poolTokenAbi, await insurance.token())
}

module.exports = {
    getTracer,
    getMockTracer,
    getInsurance,
    getPricing,
    getMockPricing,
    getLiquidation,
    getQuoteToken,
    getTrader,
    getGasOracle,
    getPriceOracle,
    getGasEthOracle,
    getPoolToken,
}
