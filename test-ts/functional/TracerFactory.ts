//@ts-ignore
import { assert } from "chai"
import { GovInstance, TracerFactoryInstance, AccountInstance, PricingInstance, InsuranceInstance, TestTokenInstance, OracleInstance, GasOracleInstance } from "../../types/truffle-contracts"
import { setupFactoryFull, setupInsuranceFull, setupDeployer, setupGov, setupOracles, setupAccount } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"
import { TracerFactory } from "../artifacts"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("TracerFactory", async () => {

    let factory: TracerFactoryInstance
    let account: AccountInstance
    let gov: GovInstance
    // let pricing: PricingInstance
    // let insurance: InsuranceInstance
    // let govToken: TestTokenInstance
    // let oracle: OracleInstance
    // let gasPriceOracle: GasOracleInstance

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //insurance, account, govToken
        let setupFactory = await setupFactoryFull(accounts)
        factory = setupFactory.factory
        gov = setupFactory.gov


        //oracles
        let oracles = await setupOracles()

    })

    context("Initilization", async () => {
        it("Deploying address owns the Tracer Factory", async () => {
            assert.equal(await factory.owner(), gov.address)
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

            await factory.deployTracer(deployData)
            let market = await factory.tracersByIndex(0)
            let isApproved = await factory.daoApproved(market)
            assert.equal(isApproved, true);
        })
    })

})
