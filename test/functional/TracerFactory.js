const { assert } = require("chai")
const { setupPerpsFactoryFull } = require("../lib/Setup")

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("TracerFactory", async () => {

    let factory
    let gov
    let accounts

    before(async () => {
        accounts = await web3.eth.getAccounts();
    })

    beforeEach(async () => {
        //insurance, account, govToken
        let setupPerpsFactory = await setupPerpsFactoryFull(accounts)
        perpsFactory = setupPerpsFactory.perpsFactory
        gov = setupPerpsFactory.gov
    })

    context("Initilization", async () => {
        it("Deploying address owns the Tracer Factory", async () => {
            assert.equal(await perpsFactory.owner(), gov.address)
        })
    })

    context("Deploy and Approve", async () => {
        it.skip("approves the deployed market", async () => {
            let deployData = web3.eth.abi.encodeParameters(
                ["bytes32", "address", "address", "address", "address", "address", "int256"],
                [
                    web3.utils.fromAscii(`LINK/USD`),
                    // govToken.address,
                    // oracle,
                    // gasPriceOracle,
                    accounts[0],
                    accounts[0],
                    accounts[0],
                    accounts[0],
                    accounts[0],
                    //pricing,
                    125000, //12.5 max leverage,
                    1 //funding rate sensitivity
                ]
            )

            await perpsFactory.deployTracer(deployData)
            let market = await perpsFactory.tracersByIndex(0)
            let isApproved = await perpsFactory.daoApproved(market)
            assert.equal(isApproved, true);
        })
    })

})