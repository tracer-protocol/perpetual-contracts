//@ts-ignore
import { BN, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import {
    ReceiptInstance,
    DeployerV1Instance,
    TestTokenInstance,
    TracerFactoryInstance,
    OracleInstance,
    InsuranceInstance,
    AccountInstance,
    PricingInstance,
    TracerInstance,
    GasOracleInstance,
    GovInstance,
} from "../../types/truffle-contracts"
import { setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"
const truffleAssert = require('truffle-assertions');


/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Tracer", async () => {
    //All prices in price ($) * 1000000
    const oneDollar = new BN("100000000")
    const oneHour = 3600
    const twentyFourHours = 24 * oneHour
    const twoDays = twentyFourHours * 2

    let receipt: ReceiptInstance
    let deployer: DeployerV1Instance
    let testToken: TestTokenInstance
    let tracerFactory: TracerFactoryInstance
    let tracer: TracerInstance
    let oracle: OracleInstance
    let insurance: InsuranceInstance
    let account: AccountInstance
    let pricing: PricingInstance
    let gasPriceOracle: GasOracleInstance
    let gov: GovInstance

    let now: any
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
        insurance = deployed.insurance
        account = deployed.account
        pricing = deployed.pricing
        gasPriceOracle = deployed.gasPriceOracle
        gov = deployed.gov

        //Set end of test setup times for use throughout tests
        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now
    })

    context("Initialization", async () => {
        it("Balances are set to 0", async () => {
            //let tracer = await Tracer.deployed()
            let balance = await tracer.tracerGetBalance(accounts[0])

            assert.equal(balance[0].toString(), new BN("0").toString())
            assert.equal(balance[1].toString(), new BN("0").toString())
        })
    })

    context("Deposit", async () => {
        it("Updates balances and tvl accordingly", async () => {
            //let tracer = await Tracer.deployed()
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            let balance = await tracer.tracerGetBalance(accounts[0])
            let contractTokenBal = await testToken.balanceOf(account.address)
            let tvl = await account.tvl(tracer.address)
            assert.equal(balance[0].toString(), web3.utils.toWei("500").toString())
            assert.equal(contractTokenBal.toString(), web3.utils.toWei("500").toString())
            assert.equal(tvl.toString(), web3.utils.toWei("500"))
        })
    })

    context("Withdraw", async () => {
        it("Updates balance and tvl accordingly", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.withdraw(web3.utils.toWei("2"), tracer.address)
            let balance = await account.getBalance(accounts[0], tracer.address)
            assert.equal(balance[0].toString(), web3.utils.toWei("498").toString())
            let tvl = await account.tvl(tracer.address)
            assert.equal(tvl.toString(), web3.utils.toWei("498"))
        })

        it("Prevents withdrawing more than available from margin", async () => {
            //let tracer = await Tracer.deployed()
            await account.deposit(web3.utils.toWei("5"), tracer.address)
            await expectRevert(
                account.withdraw(web3.utils.toWei("6"), tracer.address),
                "ACT: Withdraw below valid Margin"
            )
        })

        it("Prevents withdrawing to below the margin percentage", async () => {
            //let tracer = await Tracer.deployed()
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1 5x leverage
            await tracer.makeOrder(web3.utils.toWei("1000"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order 5x leverage
            await tracer.takeOrder(1, web3.utils.toWei("1000"), { from: accounts[1] })

            //Current margin % = 1 - ((500 + gas cost (42.87)) / 1000)
            await expectRevert(
                account.withdraw(web3.utils.toWei("400"), tracer.address),
                "ACT: Withdraw below valid Margin"
            )
        })
    })

    context("Make Order Onchain", async () => {
        it("Creates a successful order (no leverage)", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            //Long order for 5 TEST/USD at a price of $1
            const tx = await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)
            await expectEvent(tx.receipt, "OrderMade", {
                //DEPRECATED: tracerId: web3.utils.padRight(web3.utils.asciiToHex("TEST/USD"), 64),
                orderId: new BN("1"),
                amount: web3.utils.toWei("500").toString(),
                price: oneDollar,
                maker: accounts[0],
                isLong: true,
            })

            //amount, filled, price, side
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("500").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("0").toString())
            assert.equal(order[2].toString(), oneDollar.toString())
            assert.equal(order[3], true)
        })

        it("Creates a successful order (8x leverage)", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            //Long order for 4000 TEST/USD at a price of $1
            const tx = await tracer.makeOrder(web3.utils.toWei("4000"), oneDollar, true, sevenDays)

            await expectEvent(tx.receipt, "OrderMade", {
                //DEPRECATED: tracerId: web3.utils.padRight(web3.utils.asciiToHex("TEST/USD"), 64),
                orderId: new BN("1"),
                amount: web3.utils.toWei("4000").toString(),
                price: oneDollar,
                maker: accounts[0],
                isLong: true,
            })

            //amount, filled, price, side
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("4000").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("0").toString())
            assert.equal(order[2].toString(), oneDollar.toString())
            assert.equal(order[3], true)
        })

        it("Enforces requiring enough margin for the order", async () => {
            await account.deposit(web3.utils.toWei("100"), tracer.address)
            
            // Minimum Margin becomes 6*25.4064 + 1000/12.5 = 232.44
            // but margin is just 100
            await expectRevert(
                //Order over 10x leverage
                tracer.makeOrder(web3.utils.toWei("1000"), oneDollar, true, sevenDays),
                "TCR: Invalid margin"
            )
        })
    })

    context("Take Order Onchain", async () => {
        it("Fully matches an order successfully", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //assert amount, filled
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("500").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("500").toString())

            //Check positions are updated
            let account1 = await tracer.tracerGetBalance(accounts[0])
            let account2 = await account.getBalance(accounts[1], tracer.address)

            //Account 1 margin and position (MAKER)
            assert.equal(account1[0].toString(), web3.utils.toWei("0").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("500").toString())
            //Account 2 margin and position (TAKER)
            assert.equal(account2[0].toString(), web3.utils.toWei("1000").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("-500").toString())

            //Order takers state is updated
            let orderTakerAmount = await tracer.getOrderTakerAmount(1, accounts[1])
            assert.equal(orderTakerAmount.toString(), web3.utils.toWei("500").toString())
        })

        it("Fully matches an order successfully (leveraged)", async () => {
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("1000"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("1000"), { from: accounts[1] })

            //assert amount, filled
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("1000").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("1000").toString())

            //Check positions are updated
            let account1 = await tracer.tracerGetBalance(accounts[0])
            let account2 = await account.getBalance(accounts[1], tracer.address)

            //Account 1 margin and position (MAKER)
            assert.equal(account1[0].toString(), web3.utils.toWei("0").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("1000").toString())
            assert.equal(account1[2].toString(), web3.utils.toWei("0").toString())
            //Account 2 margin and position (TAKER)
            assert.equal(account2[0].toString(), web3.utils.toWei("1500").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("-1000").toString())
            assert.equal(account2[2].toString(), web3.utils.toWei("500").toString())

            //Order takers state is updated
            let orderTakerAmount = await tracer.getOrderTakerAmount(1, accounts[1])
            assert.equal(orderTakerAmount.toString(), web3.utils.toWei("1000").toString())
        })

        it("Rejects taking a fully matched order", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Short order for 3 TEST/USD against placed order
            await expectRevert(
                //Order over 10x leverage
                tracer.takeOrder(2, web3.utils.toWei("3"), { from: accounts[2] }),
                "SDX: Order filled"
            )
        })

        it("Partially matches an order successfully", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })

            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 3 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("30"), { from: accounts[1] })

            //Short order for 3 TEST/USD against placed order, only fills 2
            await tracer.takeOrder(1, web3.utils.toWei("30"), { from: accounts[2] })

            //assert amount, filled
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("500").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("60").toString())

            //Check positions are updated
            let account1 = await tracer.tracerGetBalance(accounts[0])
            let account2 = await account.getBalance(accounts[1], tracer.address)
            let account3 = await account.getBalance(accounts[2], tracer.address)

            //Account 1 margin and position (MAKER)
            assert.equal(account1[0].toString(), web3.utils.toWei("440").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("60").toString())
            //Account 2 margin and position (TAKER)
            assert.equal(account2[0].toString(), web3.utils.toWei("530").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("-30").toString())
            //Account 3 margin and position (2nd TAKER)
            assert.equal(account3[0].toString(), web3.utils.toWei("530").toString())
            assert.equal(account3[1].toString(), web3.utils.toWei("-30").toString())
        })

        it("Rejects taking an expired order", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, now)

            //Short order for 3 TEST/USD against placed order
            await expectRevert(
                //Order over 10x leverage

                tracer.takeOrder(1, web3.utils.toWei("3"), { from: accounts[2] }),
                "SDX: Order expired"
            )
        })
    })

    context("Liquidation", async () => {
        /* Current liquidation gas cost is 25.4064 * 10^18 USD */
        /* maxLeverage is 12.5 */

        it("Updates balances after liquidation with 0 escrow amount", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 80%, short order now is under margin requirements
            //$1 + 80% = 1.80
            //margin = 1000 + -500 * 1.8 = $100
            //minMargin = 6*25.4064 + 900/12.5 = 224.44
            await oracle.setPrice(new BN("180000000"))

            //Third party liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })

            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })
            let account1 = await account.getBalance(accounts[1], tracer.address)
            let account2 = await account.getBalance(accounts[2], tracer.address)
            //Account 2 base and quote (Liquidated fully with some in escrow)
            assert.equal(account1[0].toString(), web3.utils.toWei("0").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("0").toString())
            //Account 3 margin and position (Taking on liquidated position)
            //quote = -500
            //base = 1000
            //margin = 1000
            //amount to escrow = max(0, 100 - (224 - 100)) = 0
            // Base and quote do not change
            // base = 1000 + 750 where 750 is the deposited amount, which doesn't decrease due to 0 escrow
            assert.equal(account2[0].toString(), web3.utils.toWei("1750").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("-500").toString())
        })

        it("Updates balances after liquidation with non-zero escrow amount", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 60%, short order now is under margin requirements
            //$1 + 60% = 1.60
            //margin = 1000 + -500 * 1.6 = $200
            //minMargin = 6*25.4064 + 800/12.5 = 216.44
            await oracle.setPrice(new BN("160000000"))

            //Third party liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })

            const result = await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })
            let account1 = await account.getBalance(accounts[1], tracer.address)
            let account2 = await account.getBalance(accounts[2], tracer.address)
            //Account 2 base and quote (Liquidated fully with some in escrow)
            assert.equal(account1[0].toString(), web3.utils.toWei("0").toString())
            assert.equal(account1[1].toString(), web3.utils.toWei("0").toString())
            //Account 3 margin and position (Taking on liquidated position)
            //quote = -500
            //base = 1000
            //margin = 1000
            //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
            // Base and quote do not change
            // base = 1000 + 750 - 183.5616 where 183.5616 is the escrow amount
            assert.equal(account2[0].toString(), web3.utils.toWei("1566.4384").toString())
            assert.equal(account2[1].toString(), web3.utils.toWei("-500").toString())
        })

        it("Only liquidates accounts under margin", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("5"), { from: accounts[1] })

            //Price increases 10%, both accounts still in margin
            //$1 + 10% = 1.1
            await oracle.setPrice(new BN("110000000"))

            //Short order for 3 TEST/USD against placed order
            await expectRevert(
                //Order over 10x leverage
                account.liquidate(web3.utils.toWei("3"), accounts[1], tracer.address, { from: accounts[0] }),
                "ACTL: Account above margin "
            )
        })

        it("Keeps an accurate record of liquidation receipts", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 58%, short order now is under margin requirements
            //$1 + 58% = 1.58
            //margin = 1000 + -500 * 1.58 = $200
            //minMargin = 6*25.4064 + 790/12.5 = 215.6384
            await oracle.setPrice(new BN("158000000"))

            //Third party liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })
            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })

            //Check liquidation receipt
            //amount escrowed = 204.3616
            let liquidatorReceipt = await receipt.getLiquidationReceipt(0)
            assert.equal(liquidatorReceipt[0].toString(), tracer.address) // market
            assert.equal(liquidatorReceipt[1].toString(), accounts[2]) // liquidator
            assert.equal(liquidatorReceipt[2].toString(), accounts[1]) // liquidatee
            assert.equal(liquidatorReceipt[3].toString(), new BN("158000000")) // price
            assert.equal(liquidatorReceipt[5].toString(), web3.utils.toWei("204.3616").toString()) // escrowedAmount
            assert.equal(liquidatorReceipt[6].sub(liquidatorReceipt[4]).toString(), new BN(900)) // releaseTime: 15 mins in secs
        })

        it("Trader can claim escrowed funds after the 15 minute safety period", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 60%, short order now is under margin requirements
            //$1 + 60% = 1.60
            //margin = 1000 + -500 * 1.6 = $200
            //minMargin = 6*25.4064 + 800/12.5 = 216.44
            await oracle.setPrice(new BN("160000000"))

            //Third party liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })
            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })

            //Time not passed to claim escrow, will revert
            await expectRevert(account.claimEscrow(0, { from: accounts[1] }), "ACTL: Not yet released")

            //15 mins + 1s
            await time.increase(901)
            let balanceBefore = await account.getBalance(accounts[1], tracer.address)

            //Invalid account trying to claim escrow
            await expectRevert(account.claimEscrow(0, { from: accounts[2] }), "ACTL: Not Entitled ")

            //Claim escrow from the liquidation
            await account.claimEscrow(0, { from: accounts[1] })
            let balanceAfter = await account.getBalance(accounts[1], tracer.address)
            let escrowReceipt = await receipt.getLiquidationReceipt(0)
            assert.equal(escrowReceipt[8], true)
            //Balance has increased by 183.5616 (Escrowed amount)
            assert.equal(balanceAfter[0].sub(balanceBefore[0]).toString(), web3.utils.toWei("183.5616"))

            //Will reject if they attempt to claim again
            await expectRevert(account.claimEscrow(0, { from: accounts[1] }), "ACTL: Already claimed")
        })

        it("Liquidator can claim escrowed funds with valid receipts", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 60%, short order now is under margin requirements
            //$1 + 60% = 1.60
            //margin = 1000 + -500 * 1.6 = $200
            //minMargin = 6*25.4064 + 800/12.5 = 216.44
            await oracle.setPrice(new BN("160000000"))

            //accounts[2] liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[3] })
            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })
            //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
            const lowerPrice = new BN("161000000")
            //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
            await oracle.setPrice(lowerPrice)

            //Liquidator sells his positions across multiple orders, and as maker and taker
            await tracer.makeOrder(web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(2, web3.utils.toWei("200"), { from: accounts[3] })

            await tracer.makeOrder(web3.utils.toWei("100"), lowerPrice, false, sevenDays, {
                from: accounts[3],
            })
            await tracer.takeOrder(3, web3.utils.toWei("100"), { from: accounts[2] })

            await tracer.makeOrder(web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(4, web3.utils.toWei("200"), { from: accounts[3] })

            // Liquidated at $1.6, sold at $1.61.
            // 1.61*500 - 1.6 * 500 = $5

            let balanceBefore = await account.getBalance(accounts[2], tracer.address)
            let traderBalanceBefore = await account.getBalance(accounts[1], tracer.address)

            await account.claimReceipts(0, [2, 3, 4], tracer.address, { from: accounts[2] })

            let balanceAfter = await account.getBalance(accounts[2], tracer.address)
            let traderBalanceAfter = await account.getBalance(accounts[1], tracer.address)
            //Refunded $5 of the escrowed amount, because that's how much was lost due to slippage
            assert.equal(balanceAfter[0].sub(balanceBefore[0]).toString(), web3.utils.toWei("5"))
            //escrowedAmount - amountRefunded = 183.5616 - 5 = $178.5616 returned to trader
            assert.equal(traderBalanceAfter[0].sub(traderBalanceBefore[0]).toString(), web3.utils.toWei("178.5616"))
        })

        it("Appropriately caps the slippage", async () => {

            // Set the max slippage to 1%
            const setMaxSlippage = web3.eth.abi.encodeFunctionCall(
                {
                    name: "setMaxSlippage",
                    type: "function",
                    inputs: [
                        {
                            type: "int256",
                            name: "_maxSlippage",
                        },
                    ],
                },
                ["100"] // 1% * 10000
            )
            await gov.propose([receipt.address], [setMaxSlippage])
            const proposalId = (await gov.proposalCounter()).sub(new BN("1"))
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalId, web3.utils.toWei("10"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.execute(proposalId)

            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 60%, short order now is under margin requirements
            //$1 + 60% = 1.60
            //margin = 1000 + -500 * 1.6 = $200
            //minMargin = 6*25.4064 + 800/12.5 = 216.44
            await oracle.setPrice(new BN("160000000"))

            //accounts[2] liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[3] })
            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })
            //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616

            //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
            //But it is 1.25%, which is greater than the max slippage of 1%.
            const lowerPrice = new BN("162000000")
            await oracle.setPrice(lowerPrice)

            //Liquidator sells his positions across multiple orders, and as maker and taker
            await tracer.makeOrder(web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(2, web3.utils.toWei("200"), { from: accounts[3] })

            await tracer.makeOrder(web3.utils.toWei("100"), lowerPrice, false, sevenDays, {
                from: accounts[3],
            })
            await tracer.takeOrder(3, web3.utils.toWei("100"), { from: accounts[2] })

            await tracer.makeOrder(web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(4, web3.utils.toWei("200"), { from: accounts[3] })

            // Liquidated at $1.6, sold at $1.62.
            // 1.62*500 - 1.6 * 500 = $10
            // However, that is over the 1%. A 1% slippage would be $8 loss

            let balanceBefore = await account.getBalance(accounts[2], tracer.address)
            let traderBalanceBefore = await account.getBalance(accounts[1], tracer.address)

            await account.claimReceipts(0, [2, 3, 4], tracer.address, { from: accounts[2] })

            let balanceAfter = await account.getBalance(accounts[2], tracer.address)
            let traderBalanceAfter = await account.getBalance(accounts[1], tracer.address)
            //Refunded $5 of the escrowed amount, because that's how much was lost due to slippage
            assert.equal(balanceAfter[0].sub(balanceBefore[0]).toString(), web3.utils.toWei("8"))
            //escrowedAmount - amountRefunded = 183.5616 - 8 = $175.5616 returned to trader
            assert.equal(traderBalanceAfter[0].sub(traderBalanceBefore[0]).toString(), web3.utils.toWei("175.5616"))

            // Set the max slippage back to a high number to ensure flexibility in all remaining tests
            const setMaxSlippageBack = web3.eth.abi.encodeFunctionCall(
                {
                    name: "setMaxSlippage",
                    type: "function",
                    inputs: [
                        {
                            type: "int256",
                            name: "_maxSlippage",
                        },
                    ],
                },
                ["100000"] // 1000% * 10000
            )
            await gov.propose([receipt.address], [setMaxSlippage])
            const nextProposalId = (await gov.proposalCounter()).sub(new BN("1"))
            await time.increase(twoDays + 1)
            await gov.voteFor(nextProposalId, web3.utils.toWei("10"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.execute(nextProposalId)
        })

        it("Liquidator can not claim escrowed funds with orders that are too old", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            let currentOrderId = 1;
            const oneSixtyOne = new BN("161000000")
            const oneSixty = new BN("160000000")

            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[3] })
            // Price rises before any liquidation happens, which could allow short 
            // liquidator to trick contracts in the future
            await oracle.setPrice(oneSixtyOne)

            await tracer.makeOrder(web3.utils.toWei("500"), oneSixtyOne, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(currentOrderId, web3.utils.toWei("500"), { from: accounts[3] })


            await oracle.setPrice(oneDollar)

            currentOrderId++
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(currentOrderId, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 60%, short order now is under margin requirements
            //$1 + 60% = 1.60
            //margin = 1000 + -500 * 1.6 = $200
            //minMargin = 6*25.4064 + 800/12.5 = 216.44
            await oracle.setPrice(oneSixty)

            //accounts[2] liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[3] })
            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })
            //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
            //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
            await oracle.setPrice(oneSixtyOne)

            currentOrderId++
            await expectRevert(
                account.claimReceipts(0, [0], tracer.address, { from: accounts[2] }),
                "REC: Order creation before liquidation"
            );
        })
    })

    context("Calculates Margin Correctly", async () => {
        it("Gives correct margin on deposits", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            //let balance = await account.getBalance(accounts[0], tracer.address)
            // let gasCost = web3.utils.toWei("7348050000", "gwei") //250 gwei * gas used of 63516 8 eth price of 450
            // let margin = await tracer.calcMarginPercent(balance[0].toString(), balance[1].toString(), gasCost)
            let margin = await account.unsafeGetUserMargin(accounts[0], tracer.address)
            assert.equal(margin.toString(), "10000")
        })

        it("Factors in the gas cost of liquidation while calculating minimum margin", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("750"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("750"), { from: accounts[1] })

            //Check margin of account
            //margin = 1 - ((margin + liquidation gas) / position value)
            //liquidation gas = 7.145 * 6 = 42.87
            //margin = 500 - 750 = -250
            //position = 750
            //margin = 1 - ((250 + 42.87) / 750) = 0.6095 (dust = 0.6096?)
            //TODO --> investigate decimal accuracy and why these end up as different
            let minMargin0 = await account.getUserMinMargin(accounts[0], tracer.address)
            let minMargin1 = await account.getUserMinMargin(accounts[1], tracer.address)
            assert.equal(minMargin0.toString(), web3.utils.toWei("212.4384"))
            assert.equal(minMargin1.toString(), web3.utils.toWei("212.4384"))
        })

        it("Gives correct margin and notional value after trades", async () => {
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("200"), tracer.address, { from: accounts[1] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Check margin of leveraged account (SHORT)
            //margin is ((600 - 42.87) / 500) - 1
            // let balance = await tracer.getBalance(accounts[1])
            // let gasCost = new BN("714555000000000000000000000")
            // let margin = await tracer.calcMarginPercent(balance[0].toString(), balance[1].toString(), gasCost)
            let margin = await account.getUserMargin(accounts[0], tracer.address)
            let margin2 = await account.getUserMargin(accounts[1], tracer.address)
            let notional1 = await account.getUserNotionalValue(accounts[0], tracer.address)
            let notional2 = await account.getUserNotionalValue(accounts[1], tracer.address)

            assert.equal(web3.utils.fromWei(margin.toString()), "1000")
            assert.equal(web3.utils.fromWei(margin2.toString()), "200")
            assert.equal(web3.utils.fromWei(notional1.toString()), "500")
            assert.equal(web3.utils.fromWei(notional2.toString()), "500")
        })

        it("Gives correct margin after price changes", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //50% price increase to $1.5
            await oracle.setPrice(new BN("150000000"))

            //New margin on accounts
            //acc1 --> 1 - ((42.87) / (500 * 1.5))
            //acc2 --> ((1000 - 42.87) / 500 * 1.5) - 1
            let margin1 = await account.getUserMargin(accounts[0], tracer.address)
            assert.equal(margin1.toString(), web3.utils.toWei("750"))
            let margin2 = await account.getUserMargin(accounts[1], tracer.address)
            assert.equal(margin2.toString(), web3.utils.toWei("250"))
        })
    })

    context("Settlement", async () => {
        it("Handles complex funding rate settlements", async () => {
            //Setup orders -> average order price $1 about oracle price (10% price diff)
            await oracle.setPrice(oneDollar)
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[3] })
            //Long order for 5 TEST/USD at a price of $1.01
            await tracer.makeOrder(web3.utils.toWei("505"), new BN("101000000"), true, sevenDays)
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("505"), { from: accounts[1] })

            //Time travel a day
            await time.increase(twentyFourHours)

            // Place order to trigger updates in contract pricing for the 24 hour period
            await tracer.makeOrder(web3.utils.toWei("505"), new BN("101000000"), true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(2, web3.utils.toWei("505"), { from: accounts[3] })

            //Check 24 hour prices
            let currentHour = (await tracer.currentHour()).toNumber()
            let twap = await pricing.getTWAPs(tracer.address, currentHour - 1)

            //underlying twap price should be (8*1 + 7*1) / (8+7) = 1
            assert.equal(twap[0].toString(), new BN("100000000").toString())
            //derivative twap price should be (8*1.1 + 7*1.1) / (8+7) = 1.1
            assert.equal(twap[1].toString(), new BN("101000000").toString())

            await tracer.settle(accounts[0])
            await tracer.settle(accounts[1])

            //Funding rate should now be
            //1.01 - 1 - ((1.01 - 1) / 90) = 0.00988888889
            //global funding rate = 0.01 * 1 = 0.00988888889
            //due to rounding this becomes     0.00988889 -> 8dp of precision when values are cents
            let account0 = await account.getBalance(accounts[0], tracer.address)
            let account1 = await account.getBalance(accounts[1], tracer.address)

            //Ensure positions are updated
            //Account 1 --> LONG
            //Originally 0 margin, 5 position
            //Must pay short 1% the value of his position from current margin account
            // initial_base - (amount_spent_on_order) - (funding_rate * notional_value)
            // 1000 - (505*1.01) - 0.00988889*505*1 = 484.95611055
            assert.equal(account0[0].toString(), web3.utils.toWei("484.95611055").toString())
            //Account 2 --> SHORT has gained opposite amount
            //1000 + (505*1.01) + 0.00988889*505*1 = 1515.04388945
            assert.equal(account1[0].toString(), web3.utils.toWei("1515.04388945").toString())
        })

        it("Handles complex funding rate settlements with insurance funding rate", async () => {
            //Setup orders -> average order price $1 about oracle price (10% price diff)
            await oracle.setPrice(oneDollar)
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[3] })
            //Long order
            await tracer.makeOrder(web3.utils.toWei("2000"), oneDollar, true, sevenDays)
            //Short order
            await tracer.takeOrder(1, web3.utils.toWei("2000"), { from: accounts[1] })
            //Total Leveraged Value = $2000

            //Time travel a day
            await time.increase(twentyFourHours)
            //Place order to trigger updates in contract pricing for the 24 hour period
            await tracer.makeOrder(web3.utils.toWei("1000"), oneDollar, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(2, web3.utils.toWei("1000"), { from: accounts[3] })
            //Total leveraged value = $4000

            //Funding rate should now be 0 as price is the same
            //Insurance funding rate should be
            // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
            // = 0.000036523% --> including 1000000000 multiply factor = 36523
            await tracer.settle(accounts[0])
            await tracer.settle(accounts[1])

            //Ensure positions are updated
            let account1 = await account.getBalance(accounts[0], tracer.address)
            let account2 = await account.getBalance(accounts[1], tracer.address)
            //Account 1 --> LONG
            //Originally 0 margin, 5 position
            //Must pay short 1% the value of his position from current margin account
            // 1000 - (2000*1) - 0.000036523 * 1000 (leveraged notional value = $10)
            //= -10.00036523
            assert.equal(account1[0].toString(), web3.utils.toWei("-1000.036523").toString())
            //Account 2 --> SHORT has paid same amount
            //1000 + (2000 * 1) - 0.000036523 * 1000
            assert.equal(account2[0].toString(), web3.utils.toWei("2999.963477").toString())
            //total = 0.073046

            //These fees go into the insurance pools margin account
            let poolBalance = await account.getBalance(insurance.address, tracer.address)
            assert.equal(poolBalance[0].toString(), web3.utils.toWei("0.073046"))
        })
    })

    context("Permissioned Orders", async () => {
        it("Allows permissioned users to make and take orders", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await tracer.setUserPermissions(accounts[1], true)
            //Long order for 5 TEST/USD at a price of $1
            const tx = await tracer.permissionedMakeOrder(
                web3.utils.toWei("5"),
                oneDollar,
                true,
                sevenDays,
                accounts[0],
                { from: accounts[1] }
            )
            await expectEvent(tx.receipt, "OrderMade", {
                //DEPRECATED: tracerId: web3.utils.padRight(web3.utils.asciiToHex("TEST/USD"), 64),
                orderId: new BN("1"),
                amount: web3.utils.toWei("5").toString(),
                price: oneDollar,
                maker: accounts[0],
                isLong: true,
            })

            //amount, filled, price, side
            let order = await tracer.getOrder(1)
            assert.equal(order[0].toString(), web3.utils.toWei("5").toString())
            assert.equal(order[1].toString(), web3.utils.toWei("0").toString())
            assert.equal(order[2].toString(), oneDollar.toString())
            assert.equal(order[3], true)
        })

        it("Rejects addresses with TCR: No trade permission from making orders", async () => {
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            //Long order for 5 TEST/USD at a price of $1
            await expectRevert(
                tracer.permissionedMakeOrder(web3.utils.toWei("5"), oneDollar, true, sevenDays, accounts[0], {
                    from: accounts[1],
                }),
                "TCR: No trade permission"
            )
        })
    })

    context("internal state", async () => {
        it("Keeps track of the rolling hourly average price and oracle price", async () => {
            //Make trades
            await account.deposit(web3.utils.toWei("2000"), tracer.address)
            await account.deposit(web3.utils.toWei("2000"), tracer.address, { from: accounts[1] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("5"), oneDollar, true, sevenDays)
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("5"), { from: accounts[1] })
            //Long order for 2 TEST/USD at a price of $2
            await tracer.makeOrder(web3.utils.toWei("2"), new BN("200000000"), true, sevenDays)
            //Short order for 2 TEST/USD against placed order
            await tracer.takeOrder(2, web3.utils.toWei("2"), { from: accounts[1] })
            //Long order for 1 TEST/USD at a price of $2
            await tracer.makeOrder(web3.utils.toWei("1"), new BN("300000000"), true, sevenDays)
            //Short order for 1 TEST/USD against placed order
            
            await tracer.takeOrder(3, web3.utils.toWei("1"), { from: accounts[1] })

            //fast forward time
            await time.increase(oneHour + 600)
            //Make a trade to tick over into the next hour
            await oracle.setPrice(new BN("200000000"))
            //Long order for 1 TEST/USD at a price of $2
            await tracer.makeOrder(web3.utils.toWei("1"), new BN("300000000"), true, sevenDays)
            //Short order for 1 TEST/USD against placed order
            await tracer.takeOrder(4, web3.utils.toWei("1"), { from: accounts[1] })

            //Average price over last hour = 1+2+3/3 = 2
            //average oracle price over last hour = 200000000
            let currentHour = (await tracer.currentHour()).toNumber()
            let averagePrice = await pricing.getHourlyAvgTracerPrice(currentHour - 1, tracer.address)
            let oracleAverage = await pricing.getHourlyAvgOraclePrice(currentHour - 1, tracer.address)
            let fairPrice = await pricing.fairPrices(tracer.address)

            assert.equal(averagePrice.toString(), new BN("200000000").toString())
            assert.equal(oracleAverage.toString(), new BN("100000000").toString())
            assert.equal(fairPrice.toString(), new BN("200000000").toString())
            //Average price over last 24 hours = 2.5 for derivative and 1.5 for oracle
            let avgPrices = await pricing.get24HourPrices(tracer.address)
            assert.equal(avgPrices[0].toString(), new BN("250000000").toString())
            assert.equal(avgPrices[1].toString(), new BN("150000000").toString())

            //fast forward 24 hours and check fair price has now updated
            await time.increase(24*oneHour)
            //Long order for 1 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("1"), new BN("100000000"), true, sevenDays)
            //Short order for 1 TEST/USD against placed order
            await tracer.takeOrder(5, web3.utils.toWei("1"), { from: accounts[1] })
            let fairPriceUpdated = await pricing.fairPrices(tracer.address)
            let avgPricesUpdated = await pricing.get24HourPrices(tracer.address)
            //fair price = oracle price - time value = $1 - (avg derivative price - average oracle price)/90
            let avgDerivativePrice = new BN(avgPricesUpdated[0].toString())
            let avgOraclePrice = new BN(avgPricesUpdated[1].toString())
            let timeValue = avgDerivativePrice.sub(avgOraclePrice).div(new BN(90))
            //current oracle price - time value
            let expectedFairPrice = (new BN("200000000")).sub(timeValue)
            assert.equal(fairPriceUpdated.toString(), expectedFairPrice.toString())
        })

        it("Keeps track of the leveraged notional value", async () => {
            //Make trades
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("2000"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("2200"), tracer.address, { from: accounts[3] })
            await oracle.setPrice(oneDollar)
            //Long order for 2000 TEST/USD at a price of $1 (2x leverage)
            //Leveraged notional value = $1000
            await tracer.makeOrder(web3.utils.toWei("2000"), oneDollar, true, sevenDays)
            //Short order for 2000 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("2000"), { from: accounts[1] })

            //Leveraged notional value = $1000
            let userBalance = await account.getBalance(accounts[0], tracer.address)
            assert.equal(userBalance[2].toString(), web3.utils.toWei("1000"))
            let lev = await tracer.leveragedNotionalValue()
            assert.equal(lev.toString(), web3.utils.toWei("1000"))

            //fast forward time
            await time.increase(oneHour + 600)
            //Make a trade to tick over into the next hour
            await oracle.setPrice(new BN("100000000"))

            //Long order for 200 TEST/USD at a price of $1.
            //user deposited in 1000 so is borrowing 1200 to get to a notional value of $1200
            await tracer.makeOrder(web3.utils.toWei("200"), oneDollar, true, sevenDays)
            //Short order for 200 TEST/USD against placed order
            await tracer.takeOrder(2, web3.utils.toWei("200"), { from: accounts[2] })
            //Leveraged notional value = $1000 + $200
            let updatedLev = await tracer.leveragedNotionalValue()
            assert.equal(updatedLev.toString(), web3.utils.toWei("1200"))

            //Account 1 goes further short to increase leverage
            //leverage increased by $300
            await tracer.makeOrder(web3.utils.toWei("300"), oneDollar, false, sevenDays, { from: accounts[1] })
            await tracer.takeOrder(3, web3.utils.toWei("300"), { from: accounts[2] })

            //Account 1 has deposited $2000 and now has 2300 short positions worth $2300
            //total Leveraged notional value = $1200 + $300 = accounts[0].leveragedNotionalValue + accounts[1].leveragedNotionalValue
            let updatedLev2 = await tracer.leveragedNotionalValue()
            assert.equal(updatedLev2.toString(), web3.utils.toWei("1500"))

            //Account 0 sells off all of their long, reducing system leverage
            await tracer.makeOrder(web3.utils.toWei("1200"), oneDollar, true, sevenDays, { from: accounts[3] })
            await tracer.takeOrder(4, web3.utils.toWei("1200"), { from: accounts[0] })

            //total Leveraged notional value = $15 - $12
            let updatedLev3 = await tracer.leveragedNotionalValue()
            assert.equal(updatedLev3.toString(), web3.utils.toWei("300"))
        })
    })
})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }
