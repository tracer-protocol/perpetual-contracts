//@ts-ignore
import { expectRevert, time } from "@openzeppelin/test-helpers"
import assert from "assert"
//@ts-ignore
import {
    TestTokenInstance,
    GovInstance,
    TracerPerpetualSwapsInstance,
} from "../../types/truffle-contracts"
import { setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"

const twoDays = 172800

/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("TracerPerpetualSwaps: units tests", async () => {
    const oneHour = 3600

    let gov: GovInstance
    let tracer: TracerPerpetualSwapsInstance
    let govToken: TestTokenInstance

    let now
    let sevenDays: any

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)
        gov = deployed.gov
        govToken = deployed.govToken
        tracer = deployed.perps

        //Set end of test setup times for use throughout tests
        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now
    })

    describe("initializePricing", () => {
        context("When pricing has already been initialized", () => {
            it("fails", async () => {
                await govToken.approve(gov.address, web3.utils.toWei("50"), { from: accounts[1] })
                await gov.stake(web3.utils.toWei("50"), { from: accounts[1] })

                // Get governance contract to call initializePricing again
                const proposeInitData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: "initializePricing",
                        type: "function",
                        inputs: [],
                    },
                    []
                )

                const proposalCounter = await gov.proposalCounter()
                await gov.propose([tracer.address], [proposeInitData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalCounter, web3.utils.toWei("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                // Should fail since initializePricing is already called in perpsFactory.deployTracer
                await expectRevert(
                    gov.execute(proposalCounter),
                    "GOV: Failed execution"
                )
            })
        })
    })


})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }
