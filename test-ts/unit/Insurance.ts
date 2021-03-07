//@ts-ignore
import { expectRevert } from "@openzeppelin/test-helpers"
import assert from "assert"
import {
    TestTokenInstance,
    InsuranceInstance,
    TracerInstance,
} from "../../types/truffle-contracts"
import { setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Insurance", async () => {
    let insurance: InsuranceInstance
    let tracer: TracerInstance
    let testToken: TestTokenInstance

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)
        insurance = deployed.insurance
        tracer = deployed.tracer
        testToken = deployed.testToken
    })

    describe("stake", () => {
        context("When the tracer market is not supported", () => {
            it("fails", async () => {
                await expectRevert(
                    insurance.stake(web3.utils.toWei("5"), accounts[0]),
                    "INS: Tracer not supported"
                )
            })
        })

        context("When the user does not hold enough margin tokens", () => {
            it("fails", async () => {
                await expectRevert(
                    insurance.stake(web3.utils.toWei("10000000"), tracer.address),
                    "ERC20: transfer amount exceeds balance"
                )
            })
        })
    })

    describe("withdraw", () => {
        context("Withdrawing 0 or less tokens", () => {
            it("fails", async () => {
                await expectRevert(
                    insurance.withdraw(web3.utils.toWei("0"), tracer.address),
                    "INS: amount <= 0"
                )
            })
        })

        context("Withdrawing more than the users pool token balance", () => {
            it("fails", async () => {
                await expectRevert(
                    insurance.withdraw(web3.utils.toWei("1"), tracer.address),
                    "INS: balance < amount"
                )
            })
        })
    })

    describe("updatePoolAmount", () => {
        it("Updates if the insurance contract does not have a account contract balance", async () => {
            let balanceBefore = await insurance.getPoolHoldings(tracer.address)
            await testToken.transfer(insurance.address, web3.utils.toWei("5"))
            await insurance.updatePoolAmount(tracer.address)
            let balanceAfter = await insurance.getPoolHoldings(tracer.address)
            assert.strict(balanceAfter.sub(balanceBefore), web3.utils.toWei("5"))
        })
    })

    describe("reward", () => {
        context("When not enough gov tokens are held", () => {
            it("fails", async () => {
                await expectRevert(
                    insurance.reward(web3.utils.toWei("50"), tracer.address),
                    "INS: amount > rewards"
                )
            })
        })
    })

    describe("deployInsurancePool", () => {
        context("When a pool already exists", () => {
            it("fails", async () => {
                await expectRevert(
                    insurance.deployInsurancePool(tracer.address),
                    "INS: pool already exists"
                )
            })
        })
    })
})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }
