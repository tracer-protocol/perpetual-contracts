//@ts-ignore
import { BN, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
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
import { deployMultiTracers, setupContracts, setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */

describe("Insurance", async () => {
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
    let tokens: TestTokenInstance[]
    let tracers: TracerInstance[]

    let now
    let sevenDays: any

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContracts(accounts)
        tracerFactory = deployed.tracerFactory
        oracle = deployed.oracle
        gov = deployed.gov
        insurance = deployed.insurance
        account = deployed.account
        pricing = deployed.pricing
        gasPriceOracle = deployed.gasPriceOracle
        tracerGovToken = deployed.govToken

        //Deploy multiple tracers and tokens
        let tracerAndTokens = await deployMultiTracers(
            accounts,
            tracerFactory,
            gov,
            tracerGovToken,
            insurance,
            oracle,
            gasPriceOracle,
            account,
            pricing
        )

        tracers = tracerAndTokens.tracers
        tokens = tracerAndTokens.tokens

        //Set end of test setup times for use throughout tests
        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now
    })

    context("Stake", async () => {
        it("Allows users to deposit into pools", async () => {
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            assert.equal((await insurance.getPoolUserBalance(tracers[0].address, accounts[0])).toString(), web3.utils.toWei("5"))
        })

        it("Allows users to update their stake", async () => {
            await tokens[0].approve(insurance.address, web3.utils.toWei("8"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            await insurance.stake(web3.utils.toWei("3"), tracers[0].address)
            assert.equal((await insurance.getPoolUserBalance(tracers[0].address, accounts[0])).toString(), web3.utils.toWei("8"))
        })


        it("Gets the correct ratio of tokens on stake", async () => {
            //User stakes in at a 1:1 ratio (MT to PT)
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)

            //Insurance state: 5 margin tokens, 5 pool tokens

            let tracerMarginAddr = await tracers[0].tracerBaseToken()
            let tracerBaseToken = await TestToken.at(tracerMarginAddr)
            await tracerBaseToken.transfer(insurance.address, web3.utils.toWei("5"))

            //Sync the insurance pool with its margin holding
            await insurance.updatePoolAmount(tracers[0].address)

            // let poolTokensBefore = await insurance.getPoolUserBalance(tracers[0].address, accounts[1])

            //Insurance state: margin: 10, outstandingPoolTokens: 5. (2:1)
            await tokens[0].approve(insurance.address, web3.utils.toWei("10"), { from: accounts[1] })
            await insurance.stake(web3.utils.toWei("10"), tracers[0].address, { from: accounts[1] })

            let poolTokensAfter = await insurance.getPoolUserBalance(tracers[0].address, accounts[1])
            // The ratio of MT:PT is 2:1. Therefore, staking 10 tokens should give 5 pool tokens
            assert.equal(poolTokensAfter.toString(), web3.utils.toWei("5"));
        })

    })

    context("Withdraw", async () => {
        it("Allows users to withdraw from pools", async () => {
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            await insurance.withdraw(web3.utils.toWei("5"), tracers[0].address)
            assert.equal((await insurance.getPoolUserBalance(tracers[0].address, accounts[0])).toString(), web3.utils.toWei("0"))
        })

        it("Allows users to partially withdraw from pools", async () => {
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            await insurance.withdraw(web3.utils.toWei("2"), tracers[0].address)
            assert.equal((await insurance.getPoolUserBalance(tracers[0].address, accounts[0])).toString(), web3.utils.toWei("3"))
        })


        it("Gets the correct ratio of tokens on withdraw", async () => {
            //User stakes in at a 1:1 ratio (MT to PT)
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)

            //Insurance state: 5 margin tokens, 5 pool tokens

            let tracerMarginAddr = await tracers[0].tracerBaseToken()
            let tracerBaseToken = await TestToken.at(tracerMarginAddr)
            await tracerBaseToken.transfer(insurance.address, web3.utils.toWei("5"))

            //Sync the insurance pool with its margin holding
            await insurance.updatePoolAmount(tracers[0].address)

            //Insurance state: margin: 10, outstandingPoolTokens: 5
            //each pool token is withdrawable for 2 margin tokens
            let marginBefore = await tracerBaseToken.balanceOf(accounts[0])
            let poolTokensBefore = await insurance.getPoolUserBalance(tracers[0].address, accounts[0])
            //Withdraw all pool tokens. Exchanges 5 pool tokens for 10 margin tokens
            await insurance.withdraw(poolTokensBefore, tracers[0].address)
            let marginAfter = await tracerBaseToken.balanceOf(accounts[0])
            let poolTokensAfter = await insurance.getPoolUserBalance(tracers[0].address, accounts[0])
            assert.equal((marginAfter.sub(marginBefore)).toString(), web3.utils.toWei("10"))
            assert.equal(poolTokensAfter.toString(), web3.utils.toWei("0"))
        })
        //TODO test for when the ratio is below 1 (i.e. totalSupply increases while pool.margin does not)

    })

    context("Add Pool", async () => {
        it("Only the owner can deploy a pool", async () => {
            await expectRevert(
                insurance.deployInsurancePool(tracers[0].address, { from: accounts[1] }),
                "Ownable: caller is not the owner"
            )
        })
    })

    context("Rewards", async () => {
        it("Allows rewards to be deposited to a pool and be claimed", async () => {
            //Stake
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            //Send rewards to the pool
            await tracerGovToken.transfer(insurance.address, web3.utils.toWei("50"))
            await insurance.reward(web3.utils.toWei("50"), tracers[0].address)
            //Check that pool has rewards to claim
            let rewards = await insurance.getRewardsPerToken(tracers[0].address)
            //5 tokens staked and a reward of 50 = 10 rewards per token staked
            assert.equal(rewards.toString(), web3.utils.toWei("10"))
            let balanceBefore = await tracerGovToken.balanceOf(accounts[0])
            //await insurance.claim(tracers[0].address)
            let poolTokenAddr = await insurance.getPoolToken(tracers[0].address)
            let poolToken = await InsurancePoolToken.at(poolTokenAddr)
            await poolToken.withdrawFunds()
            let balanceAfter = await tracerGovToken.balanceOf(accounts[0])
            assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei("50").toString())
        })

        it("Stops users claiming a reward multiple times", async () => {
            //Stake
            await tokens[0].approve(insurance.address, web3.utils.toWei("5"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            //Send rewards to the pool
            await tracerGovToken.transfer(insurance.address, web3.utils.toWei("50"))
            await insurance.reward(web3.utils.toWei("50"), tracers[0].address)
            //Claim reward
            let poolTokenAddr = await insurance.getPoolToken(tracers[0].address)
            let poolToken = await InsurancePoolToken.at(poolTokenAddr)
            await poolToken.withdrawFunds()
            //Record balance before attempted next claim
            let balanceBefore = await tracerGovToken.balanceOf(accounts[0])
            await poolToken.withdrawFunds()
            let balanceAfter = await tracerGovToken.balanceOf(accounts[0])
            assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei("0").toString())
        })

        it("Transferring pool tokens claims any outstanding rewards", async () => {
            //Stake
            await tokens[0].approve(insurance.address, web3.utils.toWei("50"))
            await insurance.stake(web3.utils.toWei("50"), tracers[0].address)
            //Send rewards to the pool
            await tracerGovToken.transfer(insurance.address, web3.utils.toWei("50"))
            await insurance.reward(web3.utils.toWei("50"), tracers[0].address)
            //Transfer
            let balanceBefore = await tracerGovToken.balanceOf(accounts[0])

            let poolTokenAddr = await insurance.getPoolToken(tracers[0].address)
            let poolToken = await InsurancePoolToken.at(poolTokenAddr)
            await poolToken.transfer(accounts[0], web3.utils.toWei("50"))
            //Check balance has updated
            let balanceAfter = await tracerGovToken.balanceOf(accounts[0])
            assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei("50").toString())
        })

        it("Staking more and withdrawing claims rewards", async () => {
            //Stake
            await tokens[0].approve(insurance.address, web3.utils.toWei("8"))
            await insurance.stake(web3.utils.toWei("5"), tracers[0].address)
            //Send rewards to the pool
            await tracerGovToken.transfer(insurance.address, web3.utils.toWei("50"))
            await insurance.reward(web3.utils.toWei("50"), tracers[0].address)
            let balanceBefore = await tracerGovToken.balanceOf(accounts[0])
            //Add to stake which will claim outstanding rewards first
            await insurance.stake(web3.utils.toWei("3"), tracers[0].address)
            let balanceAfter = await tracerGovToken.balanceOf(accounts[0])
            assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei("50").toString())

            //Add more rewards in
            await tracerGovToken.transfer(insurance.address, web3.utils.toWei("50"))
            await insurance.reward(web3.utils.toWei("50"), tracers[0].address)

            //Withdraw
            let balanceBeforeWithdraw = await tracerGovToken.balanceOf(accounts[0])
            await insurance.withdraw(web3.utils.toWei("8"), tracers[0].address)
            let balanceAfterWithdraw = await tracerGovToken.balanceOf(accounts[0])
            assert.equal(balanceAfterWithdraw.sub(balanceBeforeWithdraw).toString(), web3.utils.toWei("50").toString())
        })
    })

    it("Correctly records the insurance fund variables (target and funding rate)", async () => {
        //Make some leveraged trades on the tracer
        let tracer = tracers[0]
        await account.deposit(web3.utils.toWei("1000"), tracer.address)
        await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[1] })
        await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[2] })
        await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[3] })
        await oracle.setPrice(oneDollar)
        //Long order for 20 TEST/USD at a price of $1 (2x leverage)
        //Leveraged notional value = $10
        await tracer.makeOrder(web3.utils.toWei("10000"), oneDollar, true, sevenDays)
        //Short order for 20 TEST/USD against placed order
        await tracer.takeOrder(0, web3.utils.toWei("10000"), { from: accounts[1] })

        //Leveraged notional value = $180
        let lev = await tracer.leveragedNotionalValue()
        assert.equal(lev.toString(), web3.utils.toWei("18000"))

        let target = await insurance.getPoolTarget(tracer.address)
        assert.equal(target.toString(), web3.utils.toWei("180")) //1% of 18000

        //Get funding rate
        //Funding rate should be:
        // max(0 , 0.0036523 * (insurance_fund_target - insurance_fund_holdings) / leveraged_notional_value)
        // = 0.000036523 --> including 1000000000 multiply factor
        // = 365
        let holdings = await insurance.getPoolHoldings(tracer.address)
        let rate = Math.max(0, new BN("3652300").mul(target.sub(holdings)).div(lev))
        let actualRate = await insurance.getPoolFundingRate(tracer.address)
        assert.equal(rate.toString(), actualRate.toString())
    })

    context("Withdrawing earned insurance fees", async () => {
        it("Earned insurance fees are deposited back into the pool", async () => {
            let tracer = tracers[0]
            //Setup leveraged positions
            await oracle.setPrice(oneDollar)
            await account.deposit(web3.utils.toWei("1000"), tracer.address)
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[1] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("1000"), tracer.address, { from: accounts[3] })
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("2000"), oneDollar, true, sevenDays)
            //Short order for 5 TEST/USD against placed order
            await tracer.takeOrder(0, web3.utils.toWei("2000"), { from: accounts[1] })
            //Total Leveraged Value = $20

            //Time travel a day
            await time.increase(twentyFourHours)
            //Place order to trigger updates in contract pricing for the 24 hour period
            await tracer.makeOrder(web3.utils.toWei("1000"), oneDollar, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(1, web3.utils.toWei("1000"), { from: accounts[3] })
            //Total leveraged value = $40

            //Funding rate should now be 0 as price is the same
            //Insurance funding rate should be
            // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
            // = 0.000036523% --> including 1000000000 multiply factor = 36523
            await tracer.settle(accounts[0])
            await tracer.settle(accounts[1])

            //00036523 * 2 = 0.00073046
            //Pull fees into insurance pool
            await insurance.updatePoolAmount(tracer.address)

            let poolHoldings = await insurance.getPoolHoldings(tracer.address)
            assert.equal(poolHoldings.toString(), web3.utils.toWei("0.073046"))
        })
    })

    context("Liquidation", async () => {
        it ("Keeps one token in the insurance pool when pool is completely drained", async() => {
            let tracer = tracers[0];
            await account.deposit(web3.utils.toWei("500"), tracer.address)
            await account.deposit(web3.utils.toWei("500"), tracer.address, { from: accounts[1] })
            await tokens[0].approve(insurance.address, web3.utils.toWei("2000"));
            await insurance.stake(web3.utils.toWei("250"), tracer.address)
            //Long order for 5 TEST/USD at a price of $1
            await tracer.makeOrder(web3.utils.toWei("500"), oneDollar, true, sevenDays)
            await oracle.setPrice(oneDollar);

            await tracer.takeOrder(0, web3.utils.toWei("500"), { from: accounts[1] })

            //Price increases 95%, short order now is under margin requirements
            //$1 + 95% = 1.95
            //margin = (1000 - 42.8) / (500 * 1.80) - 1 = 6.34%
            await oracle.setPrice(new BN("195000000"))

            //Third party liquidates and takes on the short position
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[2] })
            await account.deposit(web3.utils.toWei("750"), tracer.address, { from: accounts[3] })
            await account.liquidate(web3.utils.toWei("500"), accounts[1], tracer.address, { from: accounts[2] })

            //Before liquidator sells, price drops
            const newPrice = new BN("99900")
            await oracle.setPrice(newPrice)

            //Liquidator sells his positions across multiple orders, and as maker and taker
            await tracer.makeOrder(web3.utils.toWei("200"), newPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(1, web3.utils.toWei("200"), { from: accounts[3] })

            await tracer.makeOrder(web3.utils.toWei("100"), newPrice, false, sevenDays, {
                from: accounts[3],
            })
            await tracer.takeOrder(2, web3.utils.toWei("100"), { from: accounts[2] })

            await tracer.makeOrder(web3.utils.toWei("200"), newPrice, true, sevenDays, { from: accounts[2] })
            await tracer.takeOrder(3, web3.utils.toWei("200"), { from: accounts[3] })
            
            await account.claimReceipts(0, [1, 2, 3], tracer.address, { from: accounts[2] })

            let insuranceBalance = await insurance.getPoolHoldings(tracer.address);
            assert.equal(insuranceBalance.toString(), web3.utils.toWei("1"))
        })
    })
})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }
