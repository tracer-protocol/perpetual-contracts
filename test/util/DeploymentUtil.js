const { ethers, getNamedAccounts, deployments } = require("hardhat")
const tracerAbi = require("../../abi/contracts/TracerPerpetualSwaps.sol/TracerPerpetualSwaps.json")
const insuranceAbi = require("../../abi/contracts/Insurance.sol/Insurance.json")
const pricingAbi = require("../../abi/contracts/Pricing.sol/Pricing.json")
const mockPricingAbi = require("../../abi/contracts/test/PricingMock.sol/PricingMock.json")
const liquidationAbi = require("../../abi/contracts/Liquidation.sol/Liquidation.json")
const tokenAbi = require("../../abi/contracts/TestToken.sol/TestToken.json")
const oracleAbi = require("../../abi/contracts/oracle/ChainlinkOracle.sol/ChainlinkOracle.json")

const deployTracer = deployments.createFixture(async () => {
    const { _deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["FullDeployTest"])
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
    let _pricing = await ethers.getContractAt(pricingAbi, Pricing)

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

const deployTracerWithTrader = deployments.createFixture(async () => {
    const { _deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["FullDeployTestWithTrader"])
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
    let _pricing = await ethers.getContractAt(pricingAbi, Pricing)

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

    const libPerpetualsDeployment = await deployments.get("Perpetuals")
    let libPerpetuals = await ethers.getContractAt(
        libPerpetualsDeployment.abi,
        libPerpetualsDeployment.address
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
    deployTracer,
    deployTracerMockPricing,
    deployTracerWithTrader,
}
