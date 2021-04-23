const { BN } = require("@openzeppelin/test-helpers")
const { assert } = require("chai")
const { setupContracts } = require("../lib/Setup")

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Unit tests: Account", async () => {
    let account
    let testToken
    let accounts

    before(async () => {
        accounts = await web3.eth.getAccounts();
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContracts(accounts)
        account = deployed.account
        testToken = deployed.testToken 
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