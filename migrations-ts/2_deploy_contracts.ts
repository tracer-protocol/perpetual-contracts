//@ts-nocheck
import { BN, time } from '@openzeppelin/test-helpers'
const Web3 = require('web3');

const Tracer = artifacts.require('Tracer')
const Trader = artifacts.require('Trader')
const Token = artifacts.require('TestToken')
const TracerFactory = artifacts.require('TracerFactory')
const Oracle = artifacts.require('Oracle')
const Insurance = artifacts.require('Insurance')
const LibBalances = artifacts.require('Balances')
const Account = artifacts.require('Account')
const Pricing = artifacts.require('Pricing')
const DeployerV1 = artifacts.require('DeployerV1')
const Gov = artifacts.require('Gov')
const Trader = artifacts.require('Trader')

const fs = require('fs');

let endpoint
try {
  endpoint = fs.readFileSync(__dirname + "/../kovan.secret", 'utf8')
  endpoint = endpoint.trim()
} catch (err) {
  if (err.errno == -2) {
    console.error("../kovan.secret not found")
  } else {
    console.error(err)
  }
}

const deployerPrivKey
try {
  deployerPrivKey = fs.readFileSync(__dirname + "/../priv_key.secret", 'utf8')
  deployerPrivKey = deployerPrivKey.trim()
} catch (err) {
  if (err.errno == -2) {
    console.error("../priv_key.secret not found")
  } else {
    console.error(err)
  }
}

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

async function setupSingleAccount(
    tracerAddr: string,
    tokenAddr: string,
    accountAddr: string,
    traderAddr: string,
    deployerPrivKey: string,
    web3,
    network: string,
    deployer
) {
    let wallet = web3.eth.accounts.create();
    const transferData = web3.eth.abi.encodeFunctionCall(
        {
            name: "transfer",
            type: "function",
            inputs: [
                {
                    type: "address",
                    name: "to",
                },
                {
                    type: "uint256",
                    name: "amount",
                },
            ],
        },
        [wallet.address, web3.utils.toWei("1000")]
    )
    const transferTx = {
        to: tokenAddr,
        data: transferData,
        gas: 1000000,
    }

    const approveData = web3.eth.abi.encodeFunctionCall(
        {
            name: "approve",
            type: "function",
            inputs: [
                {
                    type: "address",
                    name: "spender",
                },
                {
                    type: "uint256",
                    name: "amount",
                },
            ],
        },
        [accountAddr, web3.utils.toWei("100000")]
    )
    const approveTx = {
        to: tokenAddr,
        data: approveData,
        gas: 1000000,
    }
    const depositData = web3.eth.abi.encodeFunctionCall(
        {
            name: "deposit",
            type: "function",
            inputs: [
                {
                    type: "uint256",
                    name: "amount",
                },
                {
                    type: "address",
                    name: "market",
                },
            ],
        },
        [web3.utils.toWei("1000"), tracerAddr]
    )
    const depositTx = {
        to: accountAddr,
        data: depositData,
        gas: 1000000,
    }
    const permissionsData = web3.eth.abi.encodeFunctionCall(
        {
            name: "setUserPermissions",
            type: "function",
            inputs: [
                {
                    type: "address",
                    name: "account",
                },
                {
                    type: "bool",
                    name: "permission",
                },
            ],
        },
        [traderAddr, true]
    )
    const permissionTx = {
        to: tracerAddr,
        data: permissionsData,
        gas: 1000000,
    }
    // Transfer each address a bit of ETH
    // Then transfer tokens from token deployer address to new address
    if (network == "ome") {
        // Since we are on network "ome"(localhost), we just want to send transactions direclty from
        // accounts[0] without signing
        await web3.eth.sendTransaction({
            from: deployer, to: wallet.address, value: web3.utils.toWei("0.2"), gas: 500000,
        })

        await web3.eth.sendTransaction({
            to: tokenAddr,
            from: deployer,
            data: transferData,
            gas: 10000000,
        })
    } else {
        // Since we are not on localhost, we want to sign transactions then send them
        const signedTransaction = await web3.eth.accounts.signTransaction({
            from: deployer, to: wallet.address, value: web3.utils.toWei("0.2"), gas: 900000},
            deployerPrivKey
        )
        await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)

        const signedTransfer = await web3.eth.accounts.signTransaction(transferTx, deployerPrivKey)
        await web3.eth.sendSignedTransaction(signedTransfer.rawTransaction)
    }

    // Approve Account to transfer token
    const signedTransaction = await web3.eth.accounts.signTransaction(approveTx, wallet.privateKey)
    await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)

    // Deposit into Account contract
    const signedDeposit = await web3.eth.accounts.signTransaction(depositTx, wallet.privateKey)
    await web3.eth.sendSignedTransaction(signedDeposit.rawTransaction)

    // Setting user permissions of Trader.sol to trade on wallet's behalf
    const signedPermission = await web3.eth.accounts.signTransaction(permissionTx, wallet.privateKey)
    await web3.eth.sendSignedTransaction(signedPermission.rawTransaction)

    fs.appendFileSync('./private_keys.txt', wallet.privateKey + "\n", (err, result) => {
        if (err) {
            console.log("Encounted an error when saving private key", err)
        }
    });

}

async function setupAccounts(
    numAccounts: number,
    tracerAddr: string,
    tokenAddr: string,
    accountAddr: string,
    traderAddr: string,
    deployerPrivKey: string,
    web3,
    network: string,
    deployer
) {
    // clear the file
    fs.writeFile('./private_keys.txt', "", (err, result) => {
        if (err) {
            console.log("Encounted an error when clearing private key file", err)
        }
    });

    for (let i = 0; i < numAccounts; i++) {
        console.log("Setting up account number " + i)
        await setupSingleAccount(
            tracerAddr,
            tokenAddr,
            accountAddr,
            traderAddr,
            deployerPrivKey,
            web3,
            network,
            deployer
        )
    }
}

module.exports = async function (deployer, network, accounts) {
    const numAccounts = 15
    const web3
    if (network == "kovan") {
        web3 = new Web3(endpoint)
    } else if (network == "development" || network == "ome") {
        web3 = new Web3("ws://localhost:8545")
    }

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

    await deployer.deploy(Trader)

    let trader = await Trader.deployed()

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

    await insurance.setFactory(tracerFactory.address)

    //Deploy pricing contract
    await deployer.deploy(Pricing, tracerFactory.address)
    let pricing = await Pricing.deployed()

    //Deploy accounts contract
    await deployer.deploy(Account, insurance.address, gasPriceOracle.address, tracerFactory.address, pricing.address, gov.address)
    let account = await Account.deployed()

    //Write contract addresses to JSON file, used for workspace setup script
    writeToJson(account.address, tracerFactory.address, insurance.address, pricing.address, oracle.address)

    //Send out gov tokens
    for (var i = 0; i < 3; i++) {
        await govToken.transfer(accounts[i], web3.utils.toWei('250'))
    }

    let tokens = []
    let tracers = []

    // maxLeveraged = 12.5 * 10,000. notional_value/margin is at most 12.5
    const maxLeverage = new BN("125000").toString();

    const tracerCount = network == "development" ? 4 : 1

    //Sample deploy some tracers
    //Deploy a few test tokens and tracers
    for (var i = 0; i < tracerCount; i++) {
        var token = await Token.new(web3.utils.toWei('1000000'))
        tokens.push(token.address)

        //Deploy a new Tracer contract per test
        var deployTracerData = web3.eth.abi.encodeParameters(
            ['bytes32', 'address', 'address', 'address', 'address', 'address', 'int256', 'uint256'],
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

        // Deploy a tracer, either through governance (localhost) or directly through factory (testnet)
        console.log("Deploying tracer")
        if (network == "kovan") {
            await tracerFactory.deployTracer(
                deployTracerData
            )
        } else {
            let proposalNum = 0
            await govToken.approve(gov.address, web3.utils.toWei('10'))
            await gov.stake(web3.utils.toWei('10'))
            await govToken.approve(gov.address, web3.utils.toWei('10'), { from: accounts[1] })
            await gov.stake(web3.utils.toWei('10'), { from: accounts[1] })
            await gov.propose([tracerFactory.address], [proposeTracerData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, web3.utils.toWei('10'), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.execute(proposalNum)
            proposalNum++
        }
        let tracerAddr = await tracerFactory.tracersByIndex(i)
        var tracer = await Tracer.at(tracerAddr)
        tracers.push(tracerAddr)
        console.log("Tracer: ")
        console.log(tracerAddr)
        console.log("Base token for above tracer: ")
        console.log(token.address)
        if (network == "kovan") {
            await setupAccounts(
                numAccounts,
                tracer.address,
                token.address,
                account.address,
                trader.address,
                deployerPrivKey,
                web3,
                network,
                accounts[0]
            )
        } else if (network == "ome") {
            //simple setup, transfer tokens and approve trader
            for (var i = 1; i < 5; i++) {
                await token.transfer(accounts[i], web3.utils.toWei('10000'), { from: accounts[0] })
            }
            //Get each user to 'deposit' 100 tokens into the platform
            for (var i = 0; i < 5; i++) {
                await token.approve(account.address, web3.utils.toWei('10000'), { from: accounts[i] })
                await account.deposit(web3.utils.toWei('10000'), tracer.address, { from: accounts[i] })
                await tracer.setUserPermissions(trader.address, true, { from: accounts[i]})
            }
        }

        if (network == "development") {
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
            await tracer.takeOrder(1, web3.utils.toWei("5"), { from: accounts[1] })
            //Long order for 2 TEST/USD at a price of $2
            await tracer.makeOrder(web3.utils.toWei("2"), new BN("200000000"), true, fourteenDays)
            //Short order for 2 TEST/USD against placed order
            await tracer.takeOrder(2, web3.utils.toWei("2"), { from: accounts[1] })
            //Long order for 1 TEST/USD at a price of $2
            await tracer.makeOrder(web3.utils.toWei("1"), new BN("300000000"), true, fourteenDays)
            //Short order for 1 TEST/USD against placed order
            await tracer.takeOrder(3, web3.utils.toWei("1"), { from: accounts[1] })

            //fast forward time
            // await time.increase(time.duration.hours(1) + 600)
            //Make a trade to tick over into the next hour
            await oracle.setPrice(new BN("200000000"))
            //Long order for 1 TEST/USD at a price of $2
            await tracer.makeOrder(web3.utils.toWei("1"), new BN("300000000"), true, fourteenDays)
            //Short order for 1 TEST/USD against placed order
            await tracer.takeOrder(4, web3.utils.toWei("1"), { from: accounts[1] })

            //fast forward 24 hours and check fair price has now updated
            // await time.increase(time.duration.hours(24))

            //Long order for 1 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("1"), new BN("100000000"), true, fourteenDays)
            //Short order for 1 TEST/USD against placed order
            await tracer.takeOrder(5, web3.utils.toWei("1"), { from: accounts[1] })

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
    }

    console.log(
        "SUMMARY: \n",
        "========\n",
        "Contracts:",
        "\nAccount.sol: " + account.address,
        "\nTrader.sol: " + trader.address,
        "\ngovToken: " + govToken.address,
        "\nGov.sol: " + gov.address,
        "\ngasPriceOracle: " + gasPriceOracle.address,
        "\noracle: " + oracle.address,
        "\ndeployerV1: " + deployerV1.address,
        "\nInsurance.sol: " + insurance.address,
        "\nTracerFactory.sol: " + tracerFactory.address,
        "\nPricing.sol: " + pricing.address,
        "\nTracers"
    )
    console.log(tracers)
    console.log("... and their corresponding base tokens (ordered):")
    console.log(tokens)

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
