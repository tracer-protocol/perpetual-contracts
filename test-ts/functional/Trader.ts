//@ts-ignore
import { BN, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import { AccountInstance, DeployerV1Instance, GasOracleInstance, GovInstance, InsuranceInstance, OracleInstance, PricingInstance, ReceiptInstance, TestTokenInstance, TracerFactoryInstance, TracerInstance, TraderInstance } from "../../types/truffle-contracts"
import { Trader } from "../artifacts"
import { setupContractsAndTracer } from "../lib/Setup"
import { signOrder, signOrders, domain, domainData, limitOrder } from "../lib/Signing"
import { accounts, web3, configure } from "../configure"

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
    let limitOrder: any
    let domain: any
    let domainData: any

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

        //Signed Order Helpers

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

            let signedTakes: any = await Promise.all(await signOrders(web3, takes, domain, domainData(trader.address), limitOrder))
            let signedMakes: any = await Promise.all(await signOrders(web3, makes, domain, domainData(trader.address), limitOrder))

            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })

            await trader.executeTrade(signedMakes, signedTakes, tracer.address)

            //Check post trade positions
            //assert amount, filled
            let order = await tracer.getOrder(0)
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

        //TODO: Fix once we've had a chat about order matching on chain
        //the OME needs to be able to send an order that already been created
        //and the trader contract should not make a new order for it.
        it.skip("Can batch execute trades (complex)", async () => {
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
                {
                    amount: web3.utils.toWei("500"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
                {
                    amount: web3.utils.toWei("500"),
                    price: oneDollar.toString(),
                    side: true,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 1,
                },
            ]
            let takes = [
                {
                    amount: web3.utils.toWei("300"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[1],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
                {
                    amount: web3.utils.toWei("200"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[2],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
                {
                    amount: web3.utils.toWei("100"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[0],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 1,
                },
                {
                    amount: web3.utils.toWei("100"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[2],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 1,
                },
                {
                    amount: web3.utils.toWei("100"),
                    price: oneDollar.toString(),
                    side: false,
                    user: accounts[3],
                    expiration: sevenDays,
                    targetTracer: tracer.address,
                    nonce: 0,
                },
            ]

            let signedTakes: any = await Promise.all(await signOrders(web3, takes, domain, domainData, limitOrder))
            let signedMakes: any = await Promise.all(await signOrders(web3, makes, domain, domainData, limitOrder))

            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[3] })

            let batchTxn = await trader.executeTrade(signedMakes, signedTakes, tracer.address)

            //Check positions are updated
            let account1 = await account.getBalance(accounts[0], tracer.address)
            let account2 = await account.getBalance(accounts[1], tracer.address)
            let account3 = await account.getBalance(accounts[2], tracer.address)
            let account4 = await account.getBalance(accounts[3], tracer.address)

            //Account 1 margin and position (MAKER)
            //LONG 5, SHORT 1
            assert.equal(account1[0].toString(), web3.utils.toWei("100").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("400").toString())
            //Account 2 margin and position
            //LONG 5, SHORT 3, only 3 of long filled
            assert.equal(account2[0].toString(), web3.utils.toWei("500").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("0").toString())
            //Account 3 margin and position
            //SHORT 3
            assert.equal(account3[0].toString(), web3.utils.toWei("800").toString())
            assert.equal(account3[1].toString(), web3.utils.toWei("-300").toString())
            //Account 4 margin and position
            //SHORT 1
            assert.equal(account4[0].toString(), web3.utils.toWei("600").toString())
            assert.equal(account4[1].toString(), web3.utils.toWei("-100").toString())
        })
    })

    it("Validation of Signed Orders", async () => {
        const makeOrder = {
            amount: web3.utils.toWei("500"),
            price: oneDollar.toString(),
            side: true,
            user: accounts[0],
            expiration: sevenDays,
            targetTracer: tracer.address,
            nonce: 0,
        }

        const types = {
            EIP712Domain: domain,
            LimitOrder: limitOrder,
        }

        const data = {
            domain: domainData,
            primaryType: "LimitOrder",
            message: makeOrder,
            types: types,
        }

        const signer = web3.utils.toChecksumAddress(accounts[0])
        //@ts-ignore
        await web3.currentProvider!.send(
            {
                method: "eth_signTypedData",
                params: [signer, data],
                from: signer,
            },
            //@ts-ignore
            async (err, result) => {
                let parsedSig = result.result.substring(2)
                const r = "0x" + parsedSig.substring(0, 64)
                const s = "0x" + parsedSig.substring(64, 128)
                const v = parseInt(parsedSig.substring(128, 130), 16)
                let sigResult = await trader.verify(accounts[0], makeOrder, r, s, v)
                //assert.equal(sigResult, true)
            }
        )
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

        let signedTakesNormal: any = await Promise.all(await signOrders(web3, takes, domain, domainData, limitOrder))
        let signedTakesReplay: any = await Promise.all(await signOrders(web3, takesReplay, domain, domainData, limitOrder))
        let signedMakes: any = await Promise.all(await signOrders(web3, makes, domain, domainData, limitOrder))
        let signedTakes: any = signedTakesNormal.concat(signedTakesReplay)

        await account.deposit(web3.utils.toWei("500"), tracer.address)
        await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })

        await expectRevert(
            trader.executeTrade(signedMakes, signedTakes, tracer.address),
            "TDR: incorrect order sig or nonce"
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

        let signedTakesNormal: any = await Promise.all(await signOrders(web3, takes, domain, domainData, limitOrder))
        let signedTakesReplay: any = await Promise.all(await signOrders(web3, takesReplay, domain, domainData, limitOrder))
        let signedMakes: any = await Promise.all(await signOrders(web3, makes, domain, domainData, limitOrder))
        let signedMakes2: any = await Promise.all(await signOrders(web3, makes2, domain, domainData, limitOrder))
        await account.deposit(web3.utils.toWei("500"), tracer.address)
        await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })

        await trader.executeTrade(signedMakes, signedTakesNormal, tracer.address),

            await expectRevert(
                trader.executeTrade(signedMakes2, signedTakesReplay, tracer.address),
                "TDR: incorrect order sig or nonce"
            )
    })

    // it("Gas Usage Calc", async () => {
    //     let makes = []
    //     let takes = []
    //     await tracer.deposit(web3.utils.toWei("100"))
    //     await tracer.deposit(web3.utils.toWei("100"), { from: accounts[1] })

    //     for (var i = 0; i < 50; i++) {
    //         for (var j = 0; j < i; j++) {
    //             makes.push({
    //                 amount: web3.utils.toWei("0.1"),
    //                 price: oneDollar.toString(),
    //                 side: true,
    //                 user: accounts[0],
    //                 expiration: sevenDays,
    //                 targetTracer: tracer.address,
    //             })
    //             takes.push({
    //                 amount: web3.utils.toWei("0.1"),
    //                 price: oneDollar.toString(),
    //                 side: false,
    //                 user: accounts[1],
    //                 expiration: sevenDays,
    //                 targetTracer: tracer.address,
    //             })
    //         }

    //         let signedTakes = await Promise.all(await signOrders(web3, takes, domain, domainData, limitOrder))
    //         let signedMakes = await Promise.all(await signOrders(web3, makes, domain, domainData, limitOrder))

    //         let batchTxn = await trader.executeTrade(signedMakes, signedTakes, tracer.address)
    //         console.log(`Makes and Takes ${i + i}. Gas Used ${batchTxn.receipt.gasUsed}`)
    //         makes = []
    //         takes = []
    //     }
    // })
})


// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }

