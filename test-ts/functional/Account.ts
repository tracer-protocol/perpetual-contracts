//@ts-ignore
import { BN, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import { printValueLogs } from "../lib/EventLogging"
const truffleAssert = require('truffle-assertions');
import {
    TestTokenInstance,
    TracerFactoryInstance,
    OracleInstance,
    GovInstance,
    InsuranceInstance,
    AccountInstance,
    PricingInstance,
    GasOracleInstance,
    TracerInstance,
} from "../../types/truffle-contracts"
import { TestToken, InsurancePoolToken } from "../artifacts"
import { setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */

describe("Account", async () => {
    //All prices in price ($) * 1000000
    const oneDollar = new BN("100000000")
    const oneHour = 3600
    const twentyFourHours = 24 * oneHour

    let tracerFactory: TracerFactoryInstance
    let oracle: OracleInstance
    let gov: GovInstance
    let tracerGovToken: TestTokenInstance
    let insurance: InsuranceInstance
    let account: AccountInstance
    let pricing: PricingInstance
    let gasPriceOracle: GasOracleInstance
    let token: TestTokenInstance
    let tracer: TracerInstance

    let now
    let sevenDays: any

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)
        tracerFactory = deployed.tracerFactory
        oracle = deployed.oracle
        gov = deployed.gov
        insurance = deployed.insurance
        account = deployed.account
        pricing = deployed.pricing
        gasPriceOracle = deployed.gasPriceOracle
        tracerGovToken = deployed.govToken
        tracer = deployed.tracer
        token = deployed.testToken

        //Set end of test setup times for use throughout tests
        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now
    })

    context("Auction", async () => {
        it("E2E auction test", async () => {
            await token.approve(insurance.address, "50000000000000")
            await insurance.stake(500, tracer.address);
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[3] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[4] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[5] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("600"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("600"), { from: accounts[1] })

            //Price decreases to $0.01 long order now is underwater
            //margin = -100 + 600 * 0.01 = -94
            const lowerPrice = new BN("1000000")
            await oracle.setPrice(lowerPrice)

            await tracer.makeOrder(web3.utils.toWei("100000"), lowerPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(2, web3.utils.toWei("100000"), { from: accounts[3] })
            await tracer.makeOrder(web3.utils.toWei("100000"), lowerPrice, true, sevenDays, { from: accounts[4] })
            await tracer.takeOrder(3, web3.utils.toWei("100000"), { from: accounts[5] })
            /*
            let bal3 = await account.getBalance(accounts[3], tracer.address)
            console.log("====accounts[3]====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))


            bal3 = await account.getBalance(accounts[3], tracer.address)
            console.log("====accounts[3]====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))
            */

            console.log("INS")
            await insurance.updatePoolAmount(tracer.address)
            console.log((await insurance.getPoolHoldings(tracer.address)).toString());
            await insurance.withdraw(500, tracer.address);
            console.log((await insurance.getPoolHoldings(tracer.address)).toString());
            console.log("INS2")

            let bal0 = await account.getBalance(accounts[0], tracer.address)
            console.log("====accounts[0] (the underwater account)====")
            console.log("base: " + web3.utils.fromWei(bal0[0]))
            console.log("quote: " + web3.utils.fromWei(bal0[1]))
            let bal3 = await account.getBalance(accounts[3], tracer.address)
            console.log("====accounts[3] (the overwater account)====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))

            //Third party liquidates and takes on the short position
            const tx = await account.deleverage(tracer.address, [accounts[3], accounts[5]], accounts[0]);
            printValueLogs(tx)
            bal0 = await account.getBalance(accounts[0], tracer.address)
            bal3 = await account.getBalance(accounts[3], tracer.address)
            console.log("====accounts[0] (the underwater account)====")
            console.log("base: " + web3.utils.fromWei(bal0[0]))
            console.log("quote: " + web3.utils.fromWei(bal0[1]))

            console.log("====accounts[3] (the overwater account)====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))
        })

        it("Deleverage long accounts to bring short above water", async () => {
            console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
            await token.approve(insurance.address, "50000000000000")
            await insurance.stake(500, tracer.address);
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[3] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[4] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[5] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("600"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("600"), { from: accounts[1] })

            //Price decreases to $0.01 long order now is underwater
            //margin = -100 + 600 * 0.01 = -94
            const higherPrice = oneDollar.mul(new BN("10"))
            await oracle.setPrice(higherPrice)

            await tracer.makeOrder(web3.utils.toWei("100"), higherPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(2, web3.utils.toWei("100"), { from: accounts[3] })
            await tracer.makeOrder(web3.utils.toWei("100"), higherPrice, true, sevenDays, { from: accounts[4] })
            await tracer.takeOrder(3, web3.utils.toWei("100"), { from: accounts[5] })
            /*
            let bal3 = await account.getBalance(accounts[3], tracer.address)
            console.log("====accounts[3]====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))


            bal3 = await account.getBalance(accounts[3], tracer.address)
            console.log("====accounts[3]====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))
            */

            console.log("INS")
            await insurance.updatePoolAmount(tracer.address)
            console.log((await insurance.getPoolHoldings(tracer.address)).toString());
            await insurance.withdraw(500, tracer.address);
            console.log((await insurance.getPoolHoldings(tracer.address)).toString());
            console.log("INS2")

            let bal0 = await account.getBalance(accounts[1], tracer.address)
            console.log("====accounts[1] (the underwater account)====")
            console.log("base: " + web3.utils.fromWei(bal0[0]))
            console.log("quote: " + web3.utils.fromWei(bal0[1]))
            let bal3 = await account.getBalance(accounts[2], tracer.address)
            console.log("====accounts[2] (the overwater account)====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))

            //Third party liquidates and takes on the short position
            const tx = await account.deleverage(tracer.address, [accounts[2], accounts[4]], accounts[1]);
            printValueLogs(tx)
            bal0 = await account.getBalance(accounts[1], tracer.address)
            bal3 = await account.getBalance(accounts[2], tracer.address)
            console.log("====accounts[1] (the underwater account)====")
            console.log("base: " + web3.utils.fromWei(bal0[0]))
            console.log("quote: " + web3.utils.fromWei(bal0[1]))

            console.log("====accounts[2] (the overwater account)====")
            console.log("base: " + web3.utils.fromWei(bal3[0]))
            console.log("quote: " + web3.utils.fromWei(bal3[1]))
        })
    })
})