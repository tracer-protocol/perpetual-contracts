//@ts-ignore
import { BN, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import {
    AccountInstance,
    TestTokenInstance,
} from "../../types/truffle-contracts"
import { setupContracts } from "../lib/Setup"
import { accounts, configure } from "../configure"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Unit tests: Account", async () => {
    const oneDollar = new BN("100000000")

    let account: AccountInstance
    let testToken: TestTokenInstance

    const oneHour = 3600
    const twentyFourHours = 24 * oneHour

    let now: string
    let sevenDays: number

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContracts(accounts)
        account = deployed.account
        testToken = deployed.testToken 
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
})