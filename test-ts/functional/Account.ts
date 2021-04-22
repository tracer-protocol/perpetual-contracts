//@ts-ignore
import { BN, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import {
    AccountInstance,
    TestTokenInstance,
    OracleInstance,
    TracerPerpetualSwapsInstance,
    InsuranceInstance
} from "../../types/truffle-contracts"
import { setupContracts, setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"
import { printValueLogs } from "../lib/EventLogging"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Account", async () => {
    const oneDollar = new BN("100000000")

    let account: AccountInstance
    let testToken: TestTokenInstance
    let tracer: TracerPerpetualSwapsInstance
    let oracle: OracleInstance
    let insurance: InsuranceInstance

    const oneHour = 3600
    const twentyFourHours = 24 * oneHour
    const twoDays = twentyFourHours * 2

    let now: string
    let sevenDays: number

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)
        account = deployed.account
        testToken = deployed.testToken 
        tracer = deployed.perps
        insurance = deployed.insurance
        oracle = deployed.oracle
        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now
    })

    context("withdrawERC20Token", async() => {
        it ("Can withdraw an ERC20 token", async () => {
            await testToken.transfer(account.address, 123)
            const balanceAfter = await testToken.balanceOf(accounts[0])
            await account.withdrawERC20Token(testToken.address, accounts[0], 123);
            assert.notStrictEqual(
                await testToken.balanceOf(accounts[0]),
                balanceAfter.add(new BN(123))
            )
        })
    })

    context("Deleverage", async() => {
        it ("Correctly calculates the maxLeverage when an insurance pool is drained", async () => {
            // Deposit into market
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("200"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[3] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            /* Make a bunch of trades to fill up insurance pool a bit */
            await time.increase(twentyFourHours)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays, { from: accounts[2] })
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(2, web3.utils.toWei("500"), { from: accounts[3] })
            await time.increase(twentyFourHours)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays, { from: accounts[3] })
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(3, web3.utils.toWei("500"), { from: accounts[2] })
            await time.increase(twentyFourHours)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays, { from: accounts[3] })
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(4, web3.utils.toWei("500"), { from: accounts[2] })

            /*
             Global funding rate: 146092 
             User funding rate: 36523
             Amount to pay
               = (globalFundingRate - userFundingRate) * accountTotalLeveragedValue * 10^18 / 10^9
               = (146092 - 36523) * 300 * 10^18 / 10^8
               = 0.0328707 * 10^18
            */
            await tracer.settle(accounts[1])
            await insurance.updatePoolAmount(tracer.address)
            const insuranceHoldings = await insurance.getPoolHoldings(tracer.address);
            assert.equal(web3.utils.fromWei(insuranceHoldings), "0.0328707")

            // Currently, the total LNV of this market is 300, because accounts[1] is borrowing 300
            // Insurance pool holdings is 0.0328707 => 1.096% of the target (3), so maxLeverage should be 125000*0.0109 = 1362.5
            // 1362.5 is 0.13625 max leverage

            const realMaxLeverage = await account.realMaxLeverage(tracer.address)
            assert.equal(realMaxLeverage.toString(), "16267")
        })
        
        it("Correctly bottoms out the max leverage at 1", async () => {
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("200"), tracer.address, { from: accounts[1] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            // 300 total leveraged notional value, but insurance pool is 0% filled.
            const realMaxLeverage = await account.realMaxLeverage(tracer.address)
            // Should equal 10,000 since we times maxLeverage by 10k for decimal accuracy
            assert.equal(realMaxLeverage.toString(), "10000")
        })
    })
})