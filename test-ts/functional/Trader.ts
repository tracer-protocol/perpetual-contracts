//@ts-ignore
import { BN, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import { AccountInstance, DeployerV1Instance, GasOracleInstance, GovInstance, InsuranceInstance, OracleInstance, PricingInstance, ReceiptInstance, TestTokenInstance, TracerFactoryInstance, TracerInstance, TraderInstance } from "../../types/truffle-contracts"
import { Trader } from "../artifacts"
import { setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"
import { signOrders } from "@tracer-protocol/tracer-utils";

require("dotenv").config()


const threeDays = 259200
const twoDays = 172800

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */

describe("Trader", async () => {
    //All prices in price ($) * 1000000
    const oneDollar = new BN("100000000")

    let deployer: DeployerV1Instance
    let testToken: TestTokenInstance
    let tracerFactory: TracerFactoryInstance
    let tracer: TracerInstance
    let oracle: OracleInstance
    let trader: TraderInstance
    let receipt: ReceiptInstance
    let gov: GovInstance
    let govToken: TestTokenInstance
    let insurance: InsuranceInstance
    let account: AccountInstance

    let now
    let sevenDays: any

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)
        receipt = deployed.receipt
        deployer = deployed.deployer
        testToken = deployed.testToken
        tracerFactory = deployed.tracerFactory
        tracer = deployed.tracer
        oracle = deployed.oracle
        gov = deployed.gov
        govToken = deployed.govToken
        insurance = deployed.insurance
        account = deployed.account

        //Set end of test setup times for use throughout tests
        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now

        trader = await Trader.new()

        //Get each user to "deposit" 100 tokens into the platform and approve the trader
        for (var i = 0; i < 6; i++) {
            await tracer.setUserPermissions(trader.address, true, { from: accounts[i] })
        }

        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now
    })

    context("Trading", async () => {
        it("Can batch execute trades (simple)", async () => {
            //Build some make and take orders
            let makes = [
                {
                    amount: web3.utils.toWei("500"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]
            let takes = [
                {
                    amount: web3.utils.toWei("500"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                }
            ]

            let signedTakes: any = await Promise.all(await signOrders(web3, takes, trader.address))
            let signedMakes: any = await Promise.all(await signOrders(web3, makes, trader.address))

            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })

            await trader.executeTrade(signedMakes, signedTakes, tracer.address)

            //Check post trade positions
            //assert amount, filled
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("500").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("500").toString())

            //Check positions are updated
            let account1 = await account.getBalance(accounts[0], tracer.address)
            let account2 = await account.getBalance(accounts[1], tracer.address)

            //Account 1 margin and position (MAKER)
            assert.equal(account1[0].toString(), web3.utils.toWei("0").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("500").toString())
            //Account 2 margin and position
            assert.equal(account2[0].toString(), web3.utils.toWei("1000").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("-500").toString())
        })


        it("Detects replay attacks in the same batch", async () => {
            let makes = [
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 1,
                },
            ]
            let takes = [
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]

            let takesReplay = [
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]

            let signedTakesNormal: any = await Promise.all(await signOrders(web3, takes, trader.address))
            let signedTakesReplay: any = await Promise.all(await signOrders(web3, takesReplay, trader.address))
            let signedMakes: any = await Promise.all(await signOrders(web3, makes, trader.address))
            let signedTakes: any = signedTakesNormal.concat(signedTakesReplay)

            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })

            await expectRevert(
                trader.executeTrade(signedMakes, signedTakes, tracer.address),
                "TDR: Incorrect nonce"
            )
        })

        it("Detects replay attacks in the different batches", async () => {
            let makes = [
                {
                    amount: web3.utils.toWei("500"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]
            let takes = [
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]

            let makes2 = [
                {
                    amount: web3.utils.toWei("500"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 1,
                },
            ]

            let takesReplay = [
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]

            let signedTakesNormal: any = await Promise.all(await signOrders(web3, takes, trader.address))
            let signedTakesReplay: any = await Promise.all(await signOrders(web3, takes, trader.address))
            let signedMakes: any = await Promise.all(await signOrders(web3, makes, trader.address))
            let signedMakes2: any = await Promise.all(await signOrders(web3, makes2, trader.address))
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })

            await trader.executeTrade(signedMakes, signedTakesNormal, tracer.address),

                await expectRevert(
                    trader.executeTrade(signedMakes2, signedTakesReplay, tracer.address),
                    "TDR: Incorrect nonce"
                )
        })
    })

})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }

