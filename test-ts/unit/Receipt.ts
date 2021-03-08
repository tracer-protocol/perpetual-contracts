//@ts-ignore
import { BN, ether, expectRevert, time } from "@openzeppelin/test-helpers"
import { ReceiptInstance, MockTracerInstance } from "../../types/truffle-contracts"
import { MockTracer, Receipt } from "../artifacts"
import { accounts, web3, configure } from "../configure"

describe("Receipt: unit tests", async () => {
    let receipt: ReceiptInstance
    let mockTracer: MockTracerInstance

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        //Deploy receipt contract and let account 4 be the accounts contract
        let block = new BN(await web3.eth.getBlockNumber())
        mockTracer = await MockTracer.new(
                5, 3, ether("1"), true, accounts[4], 1, new BN("100000000")
        );
        receipt = await Receipt.new(accounts[4])
        //Set up a receipt where accounts 1 is the liquidator
        //and accounts2 is the liquidatee
        await receipt.submitLiquidation(
            mockTracer.address,
            accounts[1],
            accounts[2],
            ether("1"),
            ether("5"),
            ether("3"),
            true,
            { from: accounts[4] }
        )
    })

    describe("claimReceipts", () => {
        context("When the claimer isnt the receipt owner", () => {
            it("fails", async () => {
                await expectRevert(
                    receipt.claimReceipts(0, [0, 1, 2], await mockTracer.priceMultiplier(), mockTracer.address, accounts[3], { from: accounts[4] }),
                    "REC: Liquidator mismatch"
                )
            })
        })

        context("When the claim time has passed", () => {
            it("fails", async () => {
                await time.increase(15 * 60) //15 mins
                await expectRevert(
                    receipt.claimReceipts(0, [0, 1, 2], await mockTracer.priceMultiplier(), mockTracer.address, accounts[1], { from: accounts[4] }),
                    "REC: claim time passed"
                )
            })
        })

        context("When the refund is already claimed", () => {
            it("fails", async () => {
                //Deploy a new mock tracer with 0 units so that a unit mismatch doesnt throw.
                let mockTracerWithCorrectUnits = await MockTracer.new(
                        0, 0, ether("1"), true, accounts[1], 0, new BN("100000000")
                );
                let receipt2 = await Receipt.new(accounts[4])
                await receipt2.submitLiquidation(
                    mockTracer.address,
                    accounts[1],
                    accounts[2],
                    ether("5"),
                    ether("0"),
                    ether("0"),
                    true,
                    { from: accounts[4] }
                )
                //Mark refund as claimed via account[4] (the aeccount contract)
                await receipt2.claimReceipts(0, [0, 1, 2], await mockTracer.priceMultiplier(), mockTracerWithCorrectUnits.address, accounts[1], { from: accounts[4] })
                await expectRevert(
                    receipt2.claimReceipts(0, [0, 1, 2], await mockTracer.priceMultiplier(), mockTracerWithCorrectUnits.address, accounts[1], { from: accounts[4] }),
                    "REC: Already claimed"
                )
            })
        })

        context("When not all units have been sold", () => {
            it("fails", async () => {
                await expectRevert(
                    receipt.claimReceipts(0, [0, 1, 2], await mockTracer.priceMultiplier(), mockTracer.address, accounts[1], { from: accounts[4] }),
                    "REC: Unit mismatch"
                )
            })
        })
    })

    describe("claimEscrow", () => {
        context("When the sender is not the party entitled to the escrowed funds", () => {
            it("fails", async () => {
                await expectRevert(
                    receipt.claimEscrow(0, accounts[3], { from: accounts[4] }),
                    "REC: Liquidatee mismatch"
                )
            })
        })

        context("When the escrow has already been claimed", () => {
            it("fails", async () => {
                time.increase(16 * 60) //16mins
                await receipt.claimEscrow(0, accounts[2], { from: accounts[4] })
                await expectRevert(
                    receipt.claimEscrow(0, accounts[2], { from: accounts[4] }),
                    "REC: Escrow claimed"
                )
            })
        })

        context("When the escrow has not expired", () => {
            it("fails", async () => {
                await expectRevert(
                    receipt.claimEscrow(0, accounts[2], { from: accounts[4] }),
                    "REC: Not released"
                )
            })
        })
    })
})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }

