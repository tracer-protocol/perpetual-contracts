//@ts-ignore
import { BN, constants, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers"
//@ts-ignore
import { web3 } from "@openzeppelin/test-helpers/src/setup"
import assert from 'assert';
import truffleAssert from 'truffle-assertions'

import {
    ReceiptInstance,
    DeployerV1Instance,
    TestTokenInstance,
    TracerPerpetualsFactoryInstance,
    OracleInstance,
    GovInstance,
    InsuranceInstance,
    AccountInstance,
    PricingInstance,
    GasOracleInstance,
    TracerPerpetualSwapsInstance
} from "../../types/truffle-contracts"
import {
    TracerPerpetualSwaps,
    TracerPerpetualsFactory,
    TestToken,
    Oracle,
    GasOracle,
    Insurance,
    Account,
    Pricing,
    DeployerV1,
    Receipt,
    Gov
} from "../artifacts"

//All prices in price ($) * 1000000
const oneDollar = new BN("100000000")
const onePercent = new BN("1")
const oneHour = 3600
const twentyFourHours = 24 * oneHour
const threeDays = 259200
const twoDays = 172800

//Override default setup contracts
interface TracerFactoryConstructor {
    insuranceAddress: string
    deployerAddress: string
    govAddress: string
}

export async function setupOracles(): Promise<any> {
    let oracle: OracleInstance
    let gasPriceOracle: GasOracleInstance

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

export async function setupGovToken(accounts: Truffle.Accounts): Promise<any> {
    let govToken: TestTokenInstance

    govToken = await TestToken.new(web3.utils.toWei("100000"))

    //Send out 10000 test tokens to each address
    for (var i = 1; i < 6; i++) {
        await govToken.transfer(accounts[i], web3.utils.toWei("200"))
    }

    return govToken
}

export async function setupTestToken(accounts: Truffle.Accounts): Promise<any> {
    let testToken: TestTokenInstance

    //Deploy a test token
    testToken = await TestToken.new(web3.utils.toWei("100000"))

    //Send out 10000 test tokens to each address
    for (var i = 1; i < 6; i++) {
        await testToken.transfer(accounts[i], web3.utils.toWei("10000"), { from: accounts[0] })
    }

    return testToken
}

export async function setupTokens(accounts: Truffle.Accounts): Promise<any> {
    let testToken: TestTokenInstance = await setupTestToken(accounts);
    let govToken: TestTokenInstance = await setupGovToken(accounts);

    return { testToken, govToken }
}

export async function setupInsurance(govToken: TestTokenInstance): Promise<any> {
    // Remember to call insurance.setAccountContract() after account has been made
    return (await Insurance.new(govToken.address))
}

export async function setupInsuranceFull(accounts: Truffle.Accounts): Promise<any> {
    let govToken: TestTokenInstance = await setupGovToken(accounts);
    let insurance = await setupInsurance(govToken);
    let account = await setupAccountFull(accounts);
    insurance.setAccountContract(account.address);
    return { insurance, account, govToken }
}

export async function setupGov(govToken: TestTokenInstance): Promise<any> {
    return (await Gov.new(govToken.address))
}

export async function setupGovAndToken(accounts: Truffle.Accounts): Promise<any> {
    const govToken = await setupGovToken(accounts)
    const gov = await setupGov(govToken)
    return { gov, govToken }
}

export async function setupDeployer(): Promise<any> {
    return (await DeployerV1.new())
}

export async function setupPerpsFactory(
    insurance: InsuranceInstance,
    deployer: DeployerV1Instance,
    gov: GovInstance
): Promise<any> {
    let perpsFactory = await TracerPerpetualsFactory.new(insurance.address, deployer.address, gov.address)
    await insurance.setFactory(perpsFactory.address)
    return perpsFactory
}

export async function setupPerpsFactoryFull(accounts: Truffle.Accounts): Promise<any> {
    const { insurance, account, govToken } = await setupInsuranceFull(accounts)
    const deployer = await setupDeployer();
    const gov = await setupGov(govToken);
    const perpsFactory = await setupPerpsFactory(insurance, deployer, gov)
    await insurance.setFactory(perpsFactory.address)
    return { perpsFactory, gov, deployer, account, insurance, govToken }
}

export async function setupPricing(tracerFacAddress: string): Promise<any> {
    return (await Pricing.new(tracerFacAddress));
}

export async function setupAccount(
    insuranceAddr: string,
    gasPriceAddr: string,
    perpsFactoryAddr: string,
    pricingAddr: string,
    govAddr: string
): Promise<any> {
    return (await Account.new(insuranceAddr, gasPriceAddr, perpsFactoryAddr, pricingAddr, govAddr))
}

export async function setupAccountFull(accounts: Truffle.Accounts): Promise<any> {
    const { govToken } = await setupTokens(accounts);
    const insurance = await setupInsurance(govToken);
    const { gasPriceOracle } = await setupOracles();
    const gov = await setupGov(govToken);
    const deployer = await setupDeployer();
    const perpsFactory = await setupPerpsFactory(insurance, deployer, gov);
    const pricing = await setupPricing(perpsFactory.address);
    return await setupAccount(insurance.address, gasPriceOracle.address, perpsFactory.address, pricing.address, gov.address);
}

export async function setupReceipt(account: AccountInstance, govAddr: string): Promise<any> {
    let receipt = await Receipt.new(account.address, new BN("1000000"), govAddr) // Just set unlimited max slippage for flexibility in tests
    await account.setReceiptContract(receipt.address)
    return receipt
}

export async function setupContracts(accounts: Truffle.Accounts): Promise<any> {
    let receipt: ReceiptInstance
    let deployer: DeployerV1Instance
    let testToken: TestTokenInstance
    let perpsFactory: TracerPerpetualsFactoryInstance
    let oracle: OracleInstance
    let gov: GovInstance
    let govToken: TestTokenInstance
    let insurance: InsuranceInstance
    let account: AccountInstance
    let pricing: PricingInstance
    let gasPriceOracle: GasOracleInstance

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

    //Deploy the tracer perpsFactory
    perpsFactory = await setupPerpsFactory(insurance, deployer, gov)
    
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

export async function setupContractsAndTracer(accounts: Truffle.Accounts): Promise<any> {
    let receipt: ReceiptInstance
    let deployer: DeployerV1Instance
    let testToken: TestTokenInstance
    let perpsFactory: TracerPerpetualsFactoryInstance
    let perps: TracerPerpetualSwapsInstance
    let oracle: OracleInstance
    let gov: GovInstance
    let govToken: TestTokenInstance
    let insurance: InsuranceInstance
    let account: AccountInstance
    let pricing: PricingInstance
    let gasPriceOracle: GasOracleInstance
    let now: any

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
    const deleveragingCliff = 20 // 20% of ins pool

    //Deploy a new Tracer contract per test
    var deployTracerData = web3.eth.abi.encodeParameters(
        ["bytes32", "address", "address", "address", "address", "address", "int256", "uint256", "int256"],
        [
            web3.utils.fromAscii(`TEST/USD`),
            testToken.address,
            oracle.address,
            gasPriceOracle.address,
            account.address,
            pricing.address,
            maxLeverage,
            1, //funding rate sensitivity
            deleveragingCliff
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
    for (var i = 0; i < 6; i++) {
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

export async function deployMultiTracers(
    accounts: Truffle.Accounts,
    perpsFactory: TracerPerpetualsFactoryInstance,
    gov: GovInstance,
    govToken: TestTokenInstance,
    insurance: InsuranceInstance,
    oracle: OracleInstance,
    gasPriceOracle: GasOracleInstance,
    account: AccountInstance,
    pricing: PricingInstance
): Promise<any> {
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
    const deleveragingCliff = 20 // 20% of ins pool
    for (var i = 0; i < 4; i++) {
        var token = await TestToken.new(web3.utils.toWei("100000"))
        tokens.push(token)

        //Deploy a new Tracer contract per test
        var deployTracerData = web3.eth.abi.encodeParameters(
            ["bytes32", "address", "address", "address", "address", "address", "uint256", "uint256", "int256"],
            [
                web3.utils.fromAscii(`TEST${i}/USD`),
                token.address,
                oracle.address,
                gasPriceOracle.address,
                account.address,
                pricing.address,
                maxLeverage,
                1, //funding rate sensitivity
                deleveragingCliff
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
