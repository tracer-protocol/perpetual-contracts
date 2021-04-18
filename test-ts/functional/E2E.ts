//@ts-ignore
import { BN, constants, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import { ReceiptInstance, DeployerV1Instance, TestTokenInstance, TracerPerpetualsFactoryInstance, OracleInstance, GovInstance, InsuranceInstance, AccountInstance, PricingInstance, GasOracleInstance, TracerPerpetualSwapsInstance } from "../../types/truffle-contracts"
import { accounts, configure } from "../configure"
import { setupContractsAndTracer, deployMultiTracers } from "../lib/Setup"

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("E2E", async () => {

    let receipt: ReceiptInstance
    let deployer: DeployerV1Instance
    let testToken: TestTokenInstance
    let perpsFactory: TracerPerpetualsFactoryInstance
    let perps: TracerPerpetualSwapsInstance
    let oracle: OracleInstance
    let gov: GovInstance
    let govToken: TestTokenInstance
    let insurance: InsuranceInstance
    let account: AccountInstance
    let pricing: PricingInstance
    let gasPriceOracle: GasOracleInstance

    let now: any
    let sevenDays: any

    let tracers: TracerPerpetualSwapsInstance[]
    let tokens: TestTokenInstance[]

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        /*
        tracers = []
        tokens = []
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)
        receipt = deployed.receipt
        deployer = deployed.deployer
        testToken = deployed.testToken
        perpetualsFactory = deployed.perpsFactory
        perps = deployed.perps
        oracle = deployed.oracle
        gov = deployed.gov
        govToken = deployed.govToken
        insurance = deployed.insurance
        account = deployed.account
        pricing = deployed.pricing
        gasPriceOracle = deployed.gasPriceOracle

        //Deploy multiple tracers and tokens
        let tracerAndTokens = await deployMultiTracers(
            accounts,
            perpsFactory,
            gov,
            govToken,
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

        */
    })

})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }

