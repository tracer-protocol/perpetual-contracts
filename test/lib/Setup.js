const { BN, time } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")
const Account = artifacts.require("Account");
const GasOracle = artifacts.require("GasOracle");
const Oracle = artifacts.require("Oracle");
const Insurance = artifacts.require("Insurance");
const Pricing = artifacts.require("Pricing");
const Receipt = artifacts.require("Receipt");
const TestToken = artifacts.require("TestToken");
const TracerPerpetualSwaps = artifacts.require("TracerPerpetualSwaps");
const TracerFactory = artifacts.require("TracerPerpetualsFactory");
const DeployerV1 = artifacts.require("DeployerV1");
const Gov = artifacts.require("Gov");
const twoDays = 172800
let accounts

async function setupOracles() {
    let oracle
    let gasPriceOracle

    //Deploy oracle
    oracle = await Oracle.new()

    //Deploy gas price oracle
    let gasOracle = await Oracle.new()
    await gasOracle.setDecimals(9);
    await gasOracle.setPrice(web3.utils.toWei("250", "gwei"))

    let priceOracle = await Oracle.new()
    //price * 10^8 as represented by chainlink feeds
    await priceOracle.setPrice(160000000000) //$1600

    //Reports the gas price in USD per gwei (eg 250gwei @ 450 USD per ETH in wei)
    //to get a gas cost, simply multiply this value by amount of gas
    gasPriceOracle = await GasOracle.new(priceOracle.address, gasOracle.address)

    return { oracle, gasPriceOracle }
}

async function setupGovToken(accounts) {
    let govToken

    govToken = await TestToken.new(web3.utils.toWei("100000"))

    //Send out 10000 test tokens to each address
    for (var i = 1; i < 7; i++) {
        await govToken.transfer(accounts[i], web3.utils.toWei("200"))
    }

    return govToken
}

async function setupTestToken(accounts) {
    let testToken

    //Deploy a test token
    testToken = await TestToken.new(web3.utils.toWei("100000"))

    //Send out 10000 test tokens to each address
    for (var i = 1; i < 7; i++) {
        await testToken.transfer(accounts[i], web3.utils.toWei("10000"), { from: accounts[0] })
    }

    return testToken
}

async function setupTokens(accounts) {
    let testToken = await setupTestToken(accounts);
    let govToken = await setupGovToken(accounts);

    return { testToken, govToken }
}

async function setupInsurance(govToken) {
    // Remember to call insurance.setAccountContract() after account has been made
    return (await Insurance.new(govToken.address))
}

async function setupInsuranceFull(accounts) {
    let govToken = await setupGovToken(accounts);
    let insurance = await setupInsurance(govToken);
    let account = await setupAccountFull(accounts);
    insurance.setAccountContract(account.address);
    return { insurance, account, govToken }
}

async function setupGov(govToken) {
    return (await Gov.new(govToken.address))
}

async function setupGovAndToken(accounts) {
    const govToken = await setupGovToken(accounts)
    const gov = await setupGov(govToken)
    return { gov, govToken }
}

async function setupDeployer() {
    return (await DeployerV1.new())
}

async function setupPerpsFactory(
    insurance,
    deployer,
    gov
) {
    let factory = await TracerFactory.new(insurance.address, deployer.address, gov.address)
    await insurance.setFactory(factory.address)
    return factory
}

async function setupPerpsFactoryFull(accounts) {
    const { insurance, account, govToken } = await setupInsuranceFull(accounts)
    const deployer = await setupDeployer();
    const gov = await setupGov(govToken);
    const perpsFactory = await setupPerpsFactory(insurance, deployer, gov)
    await insurance.setFactory(perpsFactory.address)
    return { perpsFactory, gov, deployer, account, insurance, govToken }
}

async function setupPricing(tracerFacAddress) {
    return (await Pricing.new(tracerFacAddress));
}

async function setupAccount(
    insuranceAddr,
    gasPriceAddr,
    factoryAddr,
    pricingAddr,
    govAddr
) {
    return (await Account.new(insuranceAddr, gasPriceAddr, factoryAddr, pricingAddr, govAddr))
}

async function setupAccountFull(accounts) {
    const { govToken } = await setupTokens(accounts);
    const insurance = await setupInsurance(govToken);
    const { gasPriceOracle } = await setupOracles();
    const gov = await setupGov(govToken);
    const deployer = await setupDeployer();
    const perpsFactory = await setupPerpsFactory(insurance, deployer, gov);
    const pricing = await setupPricing(perpsFactory.address);
    return await setupAccount(insurance.address, gasPriceOracle.address, perpsFactory.address, pricing.address, gov.address);
}

async function setupReceipt(account, govAddr) {
    let receipt = await Receipt.new(account.address, new BN("1000000"), govAddr) // Just set unlimited max slippage for flexibility in tests
    await account.setReceiptContract(receipt.address)
    return receipt
}

async function setupContracts(accounts) {
    let receipt
    let deployer
    let testToken
    let perpsFactory
    let oracle
    let gov
    let govToken
    let insurance
    let account
    let pricing
    let gasPriceOracle

    const oracles = await setupOracles()
    const tokens = await setupTokens(accounts)
    oracle = oracles.oracle
    gasPriceOracle = oracles.gasPriceOracle
    testToken = tokens.testToken
    govToken = tokens.govToken

    //Deploy insurance
    insurance = await setupInsurance(govToken)

    //Deploy tracer deployer
    deployer = await setupDeployer();

    //Deploy gov
    gov = await setupGov(govToken);

    //Deploy the tracer factory
    perpsFactory = await setupFactory(insurance, deployer, gov)

    //Deploy pricing contract
    pricing = await setupPricing(perpsFactory.address)

    //Deploy account state contract
    account = await setupAccount(insurance.address, gasPriceOracle.address, perpsFactory.address, pricing.address, accounts[0])

    //Deploy and link receipt contract
    receipt = await setupReceipt(account, gov.address)

    //Link insurance contract
    await insurance.setAccountContract(account.address)

    return {
        gov,
        govToken,
        perpsFactory,
        testToken,
        account,
        pricing,
        insurance,
        receipt,
        oracle,
        gasPriceOracle,
        deployer,
    }
}


async function setupContractsAndTracer(accounts) {
    let receipt
    let deployer
    let testToken
    let tracerFactory
    let tracer
    let oracle
    let gov
    let govToken
    let insurance
    let account
    let pricing
    let gasPriceOracle
    let now

    const contracts = await setupContracts(accounts)
    gov = contracts.gov
    govToken = contracts.govToken
    perpsFactory = contracts.perpsFactory
    testToken = contracts.testToken
    account = contracts.account
    pricing = contracts.pricing
    insurance = contracts.insurance
    receipt = contracts.receipt
    oracle = contracts.oracle
    gasPriceOracle = contracts.gasPriceOracle
    deployer = contracts.deployer

    // maxLeveraged = 12.5 * 10,000. notional_value/margin is at most 12.5
    const maxLeverage = 125000

    //Deploy a new Tracer contract per test
    var deployTracerData = web3.eth.abi.encodeParameters(
        ["bytes32", "address", "address", "address", "address", "address", "int256", "uint256"],
        [
            web3.utils.fromAscii(`TEST/USD`),
            testToken.address,
            oracle.address,
            gasPriceOracle.address,
            account.address,
            pricing.address,
            maxLeverage,
            1 //funding rate sensitivity
        ]
    )

    const proposeTracerData = web3.eth.abi.encodeFunctionCall(
        {
            name: "deployTracer",
            type: "function",
            inputs: [
                {
                    type: "bytes",
                    name: "_data",
                },
            ],
        },
        [deployTracerData]
    )

    await govToken.approve(gov.address, web3.utils.toWei("10"))
    await gov.stake(web3.utils.toWei("10"))
    await govToken.approve(gov.address, web3.utils.toWei("10"), { from: accounts[1] })
    await gov.stake(web3.utils.toWei("10"), { from: accounts[1] })
    await gov.propose([perpsFactory.address], [proposeTracerData])
    await time.increase(twoDays + 1)
    await gov.voteFor(0, web3.utils.toWei("10"), { from: accounts[1] })
    await time.increase(twoDays + 1)
    await gov.execute(0)

    let tracerAddr = await perpsFactory.tracersByIndex(0)
    perps = await TracerPerpetualSwaps.at(tracerAddr)

    //Get each user to "deposit" 100 tokens into the platform
    for (var i = 0; i < 7; i++) {
        await testToken.approve(account.address, web3.utils.toWei("10000"), { from: accounts[i] })
    }

    //Transfer ownership to account 0 to make testing of the tracer easier
    const transferOwnershipProposal = web3.eth.abi.encodeFunctionCall(
        {
            name: "transferOwnership",
            type: "function",
            inputs: [
                {
                    type: "address",
                    name: "newOwner",
                },
            ],
        },
        [accounts[0]]
    )
    await gov.propose([perps.address], [transferOwnershipProposal])
    //4th proposal
    await time.increase(twoDays + 1)
    await gov.voteFor(1, web3.utils.toWei("10"), { from: accounts[1] })
    await time.increase(twoDays + 1)
    await gov.execute(1)

    //Set time as of end of setup
    now = await time.latest()
    return {
        gov,
        govToken,
        perpsFactory,
        testToken,
        perps,
        account,
        pricing,
        insurance,
        receipt,
        oracle,
        gasPriceOracle,
        deployer,
    }
}

async function deployMultiTracers(
    accounts,
    tracerFactory,
    gov,
    govToken,
    insurance,
    oracle,
    gasPriceOracle,
    account,
    pricing
) {
    //Deploy a few test tokens and tracers
    let proposalNum = parseInt((await gov.proposalCounter()).toString());
    let tokens = []
    let tracers = []
    await govToken.approve(gov.address, web3.utils.toWei("10"))
    await gov.stake(web3.utils.toWei("10"))
    await govToken.approve(gov.address, web3.utils.toWei("10"), { from: accounts[1] })
    await gov.stake(web3.utils.toWei("10"), { from: accounts[1] })

    // maxLeveraged = 12.5 * 10,000. notional_value/margin is at most 12.5
    const maxLeverage = 125000
    for (var i = 0; i < 4; i++) {
        var token = await TestToken.new(web3.utils.toWei("100000"))
        tokens.push(token)

        //Deploy a new Tracer contract per test
        var deployTracerData = web3.eth.abi.encodeParameters(
            ["bytes32", "address", "address", "address", "address", "address", "uint256", "uint256"],
            [
                web3.utils.fromAscii(`TEST${i}/USD`),
                token.address,
                oracle.address,
                gasPriceOracle.address,
                account.address,
                pricing.address,
                maxLeverage,
                1 //funding rate sensitivity
            ]
        )
        const proposeTracerData = web3.eth.abi.encodeFunctionCall(
            {
                name: "deployTracer",
                type: "function",
                inputs: [
                    {
                        type: "bytes",
                        name: "_data",
                    },
                ],
            },
            [deployTracerData]
        )

        await gov.propose([perpsFactory.address], [proposeTracerData])
        await time.increase(twoDays + 1)
        await gov.voteFor(proposalNum, web3.utils.toWei("10"), { from: accounts[1] })
        await time.increase(twoDays)
        await gov.execute(proposalNum)
        let tracerAddr = await perpsFactory.tracersByIndex(i)
        var perps = await TracerPerpetualSwaps.at(tracerAddr)
        tracers.push(perps)
        //create insurance pools
        proposalNum++
    }

    //Send out and approve margin tokens
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 6; j++) {
            await tokens[i].transfer(accounts[j], web3.utils.toWei("5000"), { from: accounts[0] })
            await tokens[i].approve(account.address, web3.utils.toWei("5000"), { from: accounts[j] })
        }
    }

    return { tracers, tokens }

}

module.exports = {
    setupOracles,
    setupGovToken,
    setupTestToken,
    setupTokens,
    setupInsurance,
    setupInsuranceFull,
    setupGov,
    setupGovAndToken,
    setupDeployer,
    setupPerpsFactory,
    setupPerpsFactoryFull,
    setupPricing,
    setupInsurance,
    setupInsuranceFull,
    setupReceipt,
    setupContracts,
    setupContractsAndTracer,
    deployMultiTracers
}