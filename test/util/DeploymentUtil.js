const { ethers, getNamedAccounts, deployments } = require("hardhat")
const tracerAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const mockPricingAbi = require("../../abi/contracts/test/PricingMock.sol/PricingMock.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const tokenAbi = require("../../abi/contracts/TestToken.sol/TestToken.json")
const oracleAbi = require("../../abi/contracts/oracle/ChainlinkOracle.sol/ChainlinkOracle.json")

const getFactory = async () => {
    const factory = await deployments.get("TracerPerpetualsFactory")
    return await ethers.getContractAt(factory.abi, factory.address)
}

const getTracer = async (factory) => {
    const tracerAddress = await factory.tracersByIndex(0)
    return await ethers.getContractAt(tracerAbi, tracerAddress)
}

const getInsurance = async (tracer) => {
    const Insurance = await tracer.insuranceContract()
    return await ethers.getContractAt(insuranceAbi, Insurance)
}

const getPricing = async (tracer) => {
    const Pricing = await tracer.pricingContract()
    return await ethers.getContractAt(pricingAbi, Pricing)
}

const getLiquidation = async (tracer) => {
    const Liquidation = await tracer.liquidationContract()
    return await ethers.getContractAt(liquidationAbi, Liquidation)
}

const getQuoteToken = async (tracer) => {
    const QuoteToken = await tracer.tracerQuoteToken()
    return await ethers.getContractAt(tokenAbi, QuoteToken)
}

const getTrader = async () => {
    const traderDeployment = await deployments.get("Trader")
    return await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )
}

const getPriceOracle = async () => {
    const Oracle = await deployments.get("PriceOracle")
    return await ethers.getContractAt(oracleAbi, Oracle.address)
}

const getGasEthOracle = async () => {
    const gasEthOracle = await deployments.get("EthOracle")
    return await ethers.getContractAt(oracleAbi, gasEthOracle.address)
}

const deployTracer = deployments.createFixture(async () => {
    const { _deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["FullDeployTest"])
    _factory = await getFactory()
    _tracer = await getTracer(_factory)

    return {
        deployer: _deployer,
        factory: _factory,
        tracer: _tracer,
        insurance: await getInsurance(_tracer),
        pricing: await getPricing(_tracer),
        liquidation: await getLiquidation(_tracer),
        quoteToken: await getQuoteToken(_tracer),
        trader: await getTrader(),
        oracle: await getPriceOracle(),
        gasEthOracle: await getGasEthOracle(),
    }
})

const deployTracerMockPricing = deployments.createFixture(async () => {
    const { _deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["MockPricingDeploy"])
    let factoryInstance = await deployments.get("TracerPerpetualsFactory")
    let _factory = await ethers.getContractAt(
        factoryInstance.abi,
        factoryInstance.address
    )
    let tracerAddress = await _factory.tracersByIndex(0)
    let _tracer = await ethers.getContractAt(tracerAbi, tracerAddress)

    // setup mocks for the contracts and relink
    const Insurance = await _tracer.insuranceContract()
    let _insurance = await ethers.getContractAt(insuranceAbi, Insurance)

    const Pricing = await _tracer.pricingContract()
    let _pricing = await ethers.getContractAt(mockPricingAbi, Pricing)

    const Liquidation = await _tracer.liquidationContract()
    let _liquidation = await ethers.getContractAt(liquidationAbi, Liquidation)

    const QuoteToken = await _tracer.tracerQuoteToken()
    let _quoteToken = await ethers.getContractAt(tokenAbi, QuoteToken)

    const traderDeployment = await deployments.get("Trader")
    let _trader = await ethers.getContractAt(
        traderDeployment.abi,
        traderDeployment.address
    )

    const Oracle = await deployments.get("PriceOracle")
    let _oracle = await ethers.getContractAt(oracleAbi, Oracle.address)

    // mock ETH / USD oracle used to set gas price
    const gasEthOracle = await deployments.get("EthOracle")
    let _gasEthOracle = await ethers.getContractAt(
        oracleAbi,
        gasEthOracle.address
    )

    return {
        deployer: _deployer,
        tracer: _tracer,
        insurance: _insurance,
        pricing: _pricing,
        liquidation: _liquidation,
        quoteToken: _quoteToken,
        factory: _factory,
        trader: _trader,
        oracle: _oracle,
        gasEthOracle: _gasEthOracle,
    }
})

module.exports = {
    getFactory,
    getTracer,
    getInsurance,
    getPricing,
    getLiquidation,
    getQuoteToken,
    getTrader,
    getPriceOracle,
    getGasEthOracle,
    deployTracer,
    deployTracerMockPricing,
}
