//@ts-ignore
import { BN, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import {
    AccountInstance,
    TestTokenInstance,
    OracleInstance,
    TracerInstance,
    InsuranceInstance
} from "../../types/truffle-contracts"
import { setupContracts, setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Unit tests: Account", async () => {
    const oneDollar = new BN("100000000")

    let account: AccountInstance
    let testToken: TestTokenInstance
    let tracer: TracerInstance
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
        tracer = deployed.tracer
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
            await account.deposit(web3.utils.toWei("200"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("200"), tracer.address, { from: accounts[3] })
            await oracle.setPrice(oneDollar)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(1, web3.utils.toWei("500"), { from: accounts[1] })

            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("200"), oneDollar, true, sevenDays, { from: accounts[2] })

            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(2, web3.utils.toWei("500"), { from: accounts[3] })

            // Make trades
            // See what new tracer leveraged notional value is after these trades
            const tcrLNV = await account.tracerLeveragedNotionalValue(tracer.address);
            console.log("TCR LNV: " + web3.utils.fromWei(tcrLNV.toString()));
            const insurancePoolTarget = await insurance.getPoolTarget(tracer.address);
            console.log("pool target: " + web3.utils.fromWei(insurancePoolTarget.toString()));
            await insurance.updatePoolAmount(tracer.address)
            const insuranceHoldings = await insurance.getPoolHoldings(tracer.address);
            console.log("pool holdings: " + web3.utils.fromWei(insuranceHoldings.toString()));
            // Currently, the total LNV of this market is 300, because accounts[1] is borrowing 300
            // Reason about this
            // Get current insurance pool holdings
            // write test calling realMaxLeverage using these
        })
    })
})