//@ts-nocheck
import { BN, time } from '@openzeppelin/test-helpers'

const Tracer = artifacts.require('Tracer')
const Token = artifacts.require('TestToken')
const TracerFactory = artifacts.require('TracerFactory')
const Oracle = artifacts.require('Oracle')
const Insurance = artifacts.require('Insurance')
const LibBalances = artifacts.require('Balances')
const Types = artifacts.require('Types')
const Account = artifacts.require('Account')
const Pricing = artifacts.require('Pricing')
const DeployerV1 = artifacts.require('DeployerV1')
const Gov = artifacts.require('Gov')

const fs = require('fs');

/**
 * Writes several addresses to json
 * 
 * @param account contract address
 * @param factory contract address
 * @param insurance contract address
 */
const writeToJson = (account, factory, insurance, pricing, oracle) => {

    console.log("Writing out contract addresses")
    const obj = {
        'account': account,
        'factory': factory,
        'insurance': insurance,
        'pricing': pricing,
        'oracle': oracle
    }
    let json = JSON.stringify(obj);
    console.log(json)
    fs.writeFile('./contract-addresses.json', json, (err, result) => {
        if (err) {
            console.log("Encounted an error when saving contract addresses", err)
        }
    });
    return
}


module.exports = async function (deployer, network, accounts) {
    if (network === 'test') {
        //Dont deploy everything for tests
        console.log('Running test network')
        return
    }

    //Consts for test deployment
    const oneDollar = new BN('1000000')
    const fourteenDays = (Math.floor(Date.now() / 1000) + 604800) * 2 //14 days from now
    const twoDays = 172800

    //Libs
    deployer.deploy(LibBalances)
    //Links
    deployer.link(LibBalances, Tracer)
    deployer.link(LibBalances, TracerFactory)

    deployer.link(LibBalances, Account)

    //Deploys
    await deployer.deploy(Token, web3.utils.toWei('100000'))
    let govToken = await Token.deployed()

    //Deploy gov
    await deployer.deploy(Gov, govToken.address)
    let gov = await Gov.deployed()

    //Deploy gas price oracle
    await deployer.deploy(Oracle)
    let gasPriceOracle = await Oracle.deployed()

    //Deploy price oracle
    await deployer.deploy(Oracle)
    let oracle = await Oracle.deployed()
    oracle.setPrice(oneDollar)

    //Deploy tracer deployer
    await deployer.deploy(DeployerV1)
    let deployerV1 = await DeployerV1.deployed()

    //Deploy insurance
    await deployer.deploy(Insurance, govToken.address)
    let insurance = await Insurance.deployed()

    //Deploy factory
    await deployer.deploy(TracerFactory, insurance.address, deployerV1.address, gov.address)
    let tracerFactory = await TracerFactory.deployed()

    //Deploy pricing contract
    await deployer.deploy(Pricing, tracerFactory.address)
    let pricing = await Pricing.deployed()

    //Deploy accounts contract
    await deployer.deploy(Account, insurance.address, gasPriceOracle.address, tracerFactory.address, pricing.address)
    let account = await Account.deployed()

    //Write contract addresses to JSON file, used for workspace setup script
    writeToJson(account.address, tracerFactory.address, insurance.address, pricing.address, oracle.address)

    //Send out gov tokens
    for (var i = 0; i < 3; i++) {
        await govToken.transfer(accounts[i], web3.utils.toWei('250'))
    }


    let tokens = []
    let tracers = []
    //Sample deploy some tracers
    //Deploy a few test tokens and tracers
    let proposalNum = 0
    await govToken.approve(gov.address, web3.utils.toWei('10'))
    await gov.stake(web3.utils.toWei('10'))
    await govToken.approve(gov.address, web3.utils.toWei('10'), { from: accounts[1] })
    await gov.stake(web3.utils.toWei('10'), { from: accounts[1] })

    // maxLeveraged = 12.5 * 10,000. notional_value/margin is at most 12.5
    const maxLeverage = new BN("125000").toString();

    for (var i = 0; i < 4; i++) {
        var token = await Token.new(web3.utils.toWei('1000000'))
        tokens.push(token)

        //Deploy a new Tracer contract per test
        var deployTracerData = web3.eth.abi.encodeParameters(
            ['bytes32', 'uint256', 'address', 'address', 'address', 'address', 'address', 'int256'],
            [
                web3.utils.fromAscii(`TEST${i}/USD`),
                750, //0.075 * 10000 (eg 7.5% scaled)
                token.address,
                oracle.address,
                gasPriceOracle.address,
                account.address,
                pricing.address,
                maxLeverage
            ]
        )
        const proposeTracerData = web3.eth.abi.encodeFunctionCall(
            {
                name: 'deployTracer',
                type: 'function',
                inputs: [
                    {
                        type: 'bytes',
                        name: '_data',
                    },
                ],
            },
            [deployTracerData]
        )

        await gov.propose([tracerFactory.address], [proposeTracerData])
        await time.increase(twoDays + 1)
        await gov.voteFor(proposalNum, web3.utils.toWei('10'), { from: accounts[1] })
        await time.increase(twoDays + 1)
        await gov.execute(proposalNum)
        let tracerAddr = await tracerFactory.tracersByIndex(i)
        var tracer = await Tracer.at(tracerAddr)
        tracers.push(tracer)
        //create insurance pools
        await insurance.deployInsurancePool(tracer.address)
        
        //Pass proposal to set the insurance for this tracer to the insurance pool
        const setInsuranceProposal = web3.eth.abi.encodeFunctionCall(
            {
                name: 'setInsuranceContract',
                type: 'function',
                inputs: [
                    {
                        type: 'address',
                        name: 'insurance',
                    },
                ],
            },
            [insurance.address]
        )

        proposalNum++
        await gov.propose([tracerFactory.address], [setInsuranceProposal])
        //4th proposal
        await time.increase(twoDays + 1)
        await gov.voteFor(proposalNum, web3.utils.toWei('10'), { from: accounts[1] })
        await time.increase(twoDays + 1)
        await gov.execute(proposalNum)
        proposalNum++

        //Send out 100 test tokens to each address
        for (var i = 1; i < 3; i++) {
            await token.transfer(accounts[i], web3.utils.toWei('10000'), { from: accounts[0] })
        }

        //Get each user to 'deposit' 100 tokens into the platform
        for (var i = 0; i < 3; i++) {
            await token.approve(account.address, web3.utils.toWei('10000'), { from: accounts[i] })
            await account.deposit(web3.utils.toWei('10000'), tracer.address, { from: accounts[i] })
        }

        console.log("\nTesting fair price\n")
        // Take some orders to adjust the fair price
        //Long order for 5 TEST/USD at a price of $1
        await tracer.makeOrder(web3.utils.toWei("5"), oneDollar, true, fourteenDays)
        //Short order for 5 TEST/USD against placed order
        await tracer.takeOrder(0, web3.utils.toWei("5"), { from: accounts[1] })
        //Long order for 2 TEST/USD at a price of $2
        await tracer.makeOrder(web3.utils.toWei("2"), new BN("200000000"), true, fourteenDays)
        //Short order for 2 TEST/USD against placed order
        await tracer.takeOrder(1, web3.utils.toWei("2"), { from: accounts[1] })
        //Long order for 1 TEST/USD at a price of $2
        await tracer.makeOrder(web3.utils.toWei("1"), new BN("300000000"), true, fourteenDays)
        //Short order for 1 TEST/USD against placed order
        await tracer.takeOrder(2, web3.utils.toWei("1"), { from: accounts[1] })

        //fast forward time
        await time.increase(time.duration.hours(1) + 600)
        //Make a trade to tick over into the next hour
        await oracle.setPrice(new BN("200000000"))
        //Long order for 1 TEST/USD at a price of $2
        await tracer.makeOrder(web3.utils.toWei("1"), new BN("300000000"), true, fourteenDays)
        //Short order for 1 TEST/USD against placed order
        await tracer.takeOrder(3, web3.utils.toWei("1"), { from: accounts[1] })

        //fast forward 24 hours and check fair price has now updated
        await time.increase(time.duration.hours(24))

        //Long order for 1 TEST/USD at a price of $1
        await tracer.makeOrder(web3.utils.toWei("1"), new BN("100000000"), true, fourteenDays)
        //Short order for 1 TEST/USD against placed order
        await tracer.takeOrder(4, web3.utils.toWei("1"), { from: accounts[1] })

        await oracle.setPrice(new BN("100000000"))
        //OR  Place long and short orders either side of $1
        for (var n = 0; n < 50; n++) {
            //Maximum per order of 50 units @ $1.5 to keep account collateralised
            let amount = Math.round(Math.random() * 50)
            //Generate a random price between $0.5 and $1.5
            let price = Math.random() > 0.5 ? 1 + Math.random() * 0.5 : 1 - Math.random() * 0.5
            let onChainPrice = Math.round(price * 1000000)
            let side = Math.random() > 0.5 ? true : false
            await tracer.makeOrder(web3.utils.toWei(amount.toString()), onChainPrice, side, fourteenDays, {
                from: accounts[0],
            })
            let sideText = side ? 'LONG' : 'SHORT'
            console.log(`Order placed ${sideText} for ${amount} at a price of ${onChainPrice} ($${price})`)
        }
    }

    if (network === 'localtestnet') {
        //Users addresses to give some tokens and ETH to
        let addresses = [
            '0x3FB4600736d306Ee2A89EdF0356D4272fb095768',
            '0x50E4177970781BDb2B44D008224D01da0fD5e574',
            '0x4D1271Bf27901DfCB3Fe8D67C52C907B2BB7afcA',
            '0x70863aB59740b9517523a3F5d4817b549a830515',
            '0x895E27509E8A2c48Bd3185Fed6caE02E3447eb50',
            '0xc3A944Ea37623cF1A3d22FBD13EB49AF4B622412',
            '0xe182c70Ca247853D7e14aE41a02dF89AF1507E56',
            '0xBB7ff7967148afDf5977E482f8ebA74945bA9C25',
        ]

        //Send tokens and eth
        console.log('Token Addresses')
        tokens.forEach((token) => {
            console.log(token.address)
        })

        for (var a = 0; a < addresses.length; a++) {
            let address = addresses[a]
            await web3.eth.sendTransaction({ from: accounts[0], to: address, value: web3.utils.toWei('5') })
            console.log(`ETH sent to ${address}`)
            for (var t = 0; t < tokens.length; t++) {
                let tokenInstance = tokens[t]
                await tokenInstance.transfer(address, web3.utils.toWei('10000'), { from: accounts[0] })
                console.log(`Tokens from ${tokenInstance.address} sent to ${address}`)
            }
        }
    }
} as Truffle.Migration