//@ts-ignore
import { BN, constants, ether, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from 'chai';
import { Gov, TestToken } from "../artifacts"
import { TestTokenInstance, GovInstance } from "../../types/truffle-contracts"
import { accounts, web3, configure } from "../configure"


describe("Gov: unit tests", async () => {
    //All prices in price ($) * 1000000
    //const oneDollar = new BN("1000000")
    const twoDays = 172800
    const sevenDays = 604800
    const maxLeverage = 12500

    let sampleProposalData: any;
    let setCoolingOffData: any;
    let setWarmUpData: any;
    let gov: GovInstance
    let govToken: TestTokenInstance
    let proposalNum = 0

    before(async () => {
        await configure()

        sampleProposalData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setFeeReceiver",
                type: "function",
                inputs: [
                    {
                        type: "address",
                        name: "receiver",
                    },
                ],
            },
            [accounts[1]]
        )

        setCoolingOffData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setCoolingOff",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newProposalDuration",
                    },
                ],
            },
            ['1']
        )

        setWarmUpData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setWarmUp",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newWarmup",
                    },
                ],
            },
            ['1']
        )
    })

    beforeEach(async () => {
        //Setup all contracts
        govToken = await TestToken.new(ether("1000000")) //1million
        await govToken.transfer(accounts[1], ether("100")) //100
        await govToken.transfer(accounts[2], ether("100"))
        await govToken.transfer(accounts[3], ether("100"))
        gov = await Gov.new(govToken.address)
        proposalNum = 0
    })

    describe("stake", () => {
        it("reverts if gov is not approved to transfer", async () => {
            await expectRevert(gov.stake(ether("100"), { from: accounts[1] }), "ERC20: transfer amount exceeds allowance")
        })

        it("reverts if staking more than tokens held", async () => {
            await govToken.approve(gov.address, ether("100"), { from: accounts[1] })
            await expectRevert(
                gov.stake(ether("101"), { from: accounts[1] }),
                "ERC20: transfer amount exceeds balance"
            )
        })

        it("reverts if stake amount would overflow", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("50"))
            await expectRevert(
                gov.stake(new BN("79228162514264337593543950335")), // MAX_UINT95 - 1
                "SafeMath96: addition overflow"
            )
        })

        it("starts accounts with 0 staked", async () => {
            const staked = await gov.getUserStaked(accounts[2])
            assert.isTrue(staked.eq(new BN("0")))
        })

        it("increases totalStaked by the amount staked", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            const stakedBefore = await await gov.totalStaked()
            await gov.stake(ether("50"))
            const stakedAfter = await gov.totalStaked()
            assert.isTrue(stakedAfter.sub(stakedBefore).eq(ether("50")))
        })

        it("transfers the staked tokens to the Gov contract", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            const stakedBefore = await govToken.balanceOf(gov.address)
            await gov.stake(ether("50"))
            const stakedAfter = await govToken.balanceOf(gov.address)
            assert.isTrue(stakedAfter.sub(stakedBefore).eq(ether("50")))
        })

        it("updates the staked amount of the user", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            const stakedBefore = await gov.getUserStaked(accounts[0])
            await gov.stake(ether("50"))
            const stakedAfter = await gov.getUserStaked(accounts[0])
            assert.isTrue(stakedAfter.sub(stakedBefore).eq(ether("50")))
        })

        it("uses an expected amount of gas", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            const { receipt } = await gov.stake(ether("50"))
            assert.isAtMost(receipt.gasUsed, 107000) //106500
        })

        it("uses an expected amount of gas for additional stakes", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("25"))
            const { receipt } = await gov.stake(ether("25"))
            assert.isAtMost(receipt.gasUsed, 62000)
        })

        context("when delegating votes", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, constants.MAX_UINT256)
                await gov.stake(ether("25"))
                await gov.acceptDelegates({ from: accounts[1] })
                await gov.delegate(accounts[1])
            })

            it("adds to the staker's stakedAmount", async () => {
                assert.isTrue(ether("25").eq(await gov.getUserStaked(accounts[0])))
            })

            it("adds to the delegated user's delegatedAmount", async () => {
                assert.isTrue(ether("25").eq(await gov.getStakedAndDelegated(accounts[1])))
            })

            it("additional staked amounts are added to the staker's stakedAmount", async () => {
                assert.isTrue(ether("25").eq(await gov.getUserStaked(accounts[0])))
                await gov.stake(ether("25"))
                assert.isTrue(ether("50").eq(await gov.getUserStaked(accounts[0])))
            })

            it("additional staked amounts are added to the delegated user's delegatedAmount", async () => {
                assert.isTrue(ether("25").eq(await gov.getStakedAndDelegated(accounts[1])))
                await gov.stake(ether("25"))
                assert.isTrue(ether("50").eq(await gov.getStakedAndDelegated(accounts[1])))
            })
        })
    })

    describe("withdraw", () => {
        context("after staking", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await gov.stake(ether("50"))
            })

            it("reverts if withdrawing more than tokens staked", async () => {
                await expectRevert(gov.withdraw(ether("51")), "SafeMath96: subtraction underflow")
            })

            it("updates the staked amount of the user", async () => {
                await gov.withdraw(ether("50"))
                const staked = await gov.getUserStaked(accounts[0])
                assert.isTrue(staked.eq(new BN("0")))
            })

            it("uses an expected amount of gas", async () => {
                const { receipt } = await gov.withdraw(ether("50"))
                assert.isAtMost(receipt.gasUsed, 28000) //27000
            })

            it("uses an expected amount of gas for additional withdrawals", async () => {
                await gov.withdraw(ether("25"))
                const { receipt } = await gov.withdraw(ether("25"))
                assert.isAtMost(receipt.gasUsed, 28000)
            })

            context("when delegating votes", () => {
                beforeEach(async () => {
                    await gov.acceptDelegates({ from: accounts[1] })
                    await gov.delegate(accounts[1])
                    await time.increase(sevenDays + 1)
                })

                it("removes from the staker's stakedAmount", async () => {
                    const staked = await gov.getUserStaked(accounts[0])
                    await gov.withdraw(ether("25"))
                    assert.isTrue(ether("25").eq(await gov.getUserStaked(accounts[0])))
                })

                it("removes from the delegated user's delegatedAmount", async () => {
                    await gov.withdraw(ether("25"))
                    assert.isTrue(ether("25").eq(await gov.getStakedAndDelegated(accounts[1])))
                })

                it("additional withdrawn amounts are removed from the staker's stakedAmount", async () => {
                    await gov.withdraw(ether("25"))
                    assert.isTrue(ether("25").eq(await gov.getUserStaked(accounts[0])))
                    await gov.withdraw(ether("25"))
                    assert.isTrue(ether("0").eq(await gov.getUserStaked(accounts[0])))
                })

                it("additional withdrawn amounts are removed from the delegated user's delegatedAmount", async () => {
                    await gov.withdraw(ether("25"))
                    assert.isTrue(ether("25").eq(await gov.getStakedAndDelegated(accounts[1])))
                    await gov.withdraw(ether("25"))
                    assert.isTrue(ether("0").eq(await gov.getStakedAndDelegated(accounts[1])))
                })
            })
        })
    })

    describe("propose", () => {
        it("reverts if the proposer does not have enough staked", async () => {
            await govToken.approve(gov.address, ether("1"))
            await gov.stake(ether("1"))
            await expectRevert(
                gov.propose([accounts[0]], [sampleProposalData]),
                "GOV: Not enough staked"
            )
        })

        context("with enough staked", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await gov.stake(ether("50"))
            })

            it("reverts if no target is specified", async () => {
                await expectRevert(gov.propose([], [sampleProposalData]), "GOV: targets = 0")
            })

            it("reverts if GOV: Targets > max", async () => {
                await expectRevert(
                    gov.propose(
                        [
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                        ],
                        [sampleProposalData]
                    ),
                    "GOV: Targets > max"
                )
            })

            it("reverts if argument length mismatch", async () => {
                await expectRevert(
                    gov.propose(
                        [accounts[0], accounts[0], accounts[0], accounts[0]],
                        [sampleProposalData, sampleProposalData]
                    ),
                    "GOV: Targets != Datas"
                )
            })

            it("stores the successful proposal", async () => {
                await gov.propose([accounts[0]], [sampleProposalData])
                const proposal = await gov.proposals(0)
                const staked = await gov.getStakedAndDelegated(accounts[0])
                //@ts-ignore
                assert.equal(accounts[0], proposal.proposer)
                //@ts-ignore
                assert.isTrue(proposal.yes.eq(staked))
                //@ts-ignore
                assert.equal(0, proposal.no)
                //@ts-ignore
                assert.equal(0, proposal.passTime)

                // The number associated with ProposalState.PROPOSED
                const proposedState = 0;
                //@ts-ignore
                assert.equal(proposedState, proposal.state)
            })

            it("emits a ProposalCreated event", async () => {
                const { receipt } = await gov.propose([accounts[0]], [sampleProposalData])
                expectEvent(receipt, "ProposalCreated", {
                    proposalId: "0",
                })
            })

            it("uses an expected amount of gas", async () => {
                const { receipt } = await gov.propose([accounts[0]], [sampleProposalData])
                assert.isAtMost(receipt.gasUsed, 275000)
            })

            context("when delegating votes", () => {
                beforeEach(async () => {
                    await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                    await gov.stake(ether("50"), { from: accounts[1] })
                    await gov.acceptDelegates({ from: accounts[1] })
                    await gov.delegate(accounts[1])
                })

                it("creates the proposal with the staked and delegated amount counted", async () => {
                    await gov.propose([accounts[0]], [sampleProposalData], { from: accounts[1] })
                    const proposal = await gov.proposals(0)
                    const staked = await gov.getStakedAndDelegated(accounts[1])
                    //@ts-ignore
                    assert.equal(accounts[1], proposal.proposer)
                    //@ts-ignore
                    assert.isTrue(proposal.yes.eq(staked))
                    //@ts-ignore
                    assert.equal(0, proposal.no)
                    //@ts-ignore
                    assert.equal(0, proposal.passTime)

                    // The number associated with ProposalState.PROPOSED
                    const proposedState = 0;
                    //@ts-ignore
                    assert.equal(proposedState, proposal.state)
                })
            })
        })
    })

    describe("vote", () => {
        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await govToken.approve(gov.address, ether("50"), { from: accounts[2] })
            await govToken.approve(gov.address, ether("50"), { from: accounts[3] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"), { from: accounts[2] })
            await gov.stake(ether("50"), { from: accounts[3] })
            await gov.propose([accounts[0]], [sampleProposalData])
        })

        it("reverts if the proposal hasn't started", async () => {
            await expectRevert(gov.voteFor(proposalNum, ether("50"), { from: accounts[1] }), "GOV: Warming up")
        })

        context("after the proposal is ready", () => {
            beforeEach(async () => {
                await time.increase(twoDays + 1)
            })

            it("reverts if called by the proposer", async () => {
                await expectRevert(gov.voteFor(proposalNum, ether("50")), "GOV: Proposer cant vote")
            })

            it("reverts if proposal was passed", async () => {
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await expectRevert(
                    gov.voteFor(0, ether("50"), { from: accounts[2] }),
                    "GOV: Proposal note voteable"
                )
            })

            it("reverts if proposal was rejected", async () => {
                await gov.voteAgainst(proposalNum, ether("50"), { from: accounts[1] })
                await gov.voteAgainst(proposalNum, ether("50"), { from: accounts[2] })

                await expectRevert(
                    gov.voteAgainst(proposalNum, ether("50"), { from: accounts[3] }),
                    "GOV: Proposal note voteable"
                )
            })

            it("reverts if proposal was executed", async () => {
                await gov.voteFor(0, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                await expectRevert(
                    gov.voteFor(proposalNum, ether("50"), { from: accounts[2] }),
                    "GOV: Proposal note voteable"
                )
            })

            it("reverts if voting with more tokens than staked", async () => {
                await expectRevert(
                    gov.voteFor(proposalNum, ether("51"), { from: accounts[1] }),
                    "GOV: Vote amount > staked amount"
                )
            })

            it("allows voting both yes and no", async () => {
                await gov.voteAgainst(proposalNum, ether("25"), { from: accounts[1] })
                await gov.voteFor(proposalNum, ether("25"), { from: accounts[1] })
            })

            it("vote locks the caller", async () => {
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await gov.acceptDelegates({ from: accounts[0] })
                await expectRevert(gov.delegate(accounts[0], { from: accounts[1] }), "GOVD: Vote locked")
            })

            it("uses an expected amount of gas", async () => {
                const { receipt } = await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                assert.isAtMost(receipt.gasUsed, 121000)
            })
        })
    })

    describe("delegate", () => {
        it("reverts if caller is not a staker", async () => {
            await expectRevert(gov.delegate(accounts[1]), "GOV: Only staker")
        })

        it("reverts if the to address is not accepting delegates", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await expectRevert(gov.delegate(accounts[1]), "GOVD: Delegate not accepting")
        })

        it("reverts if GOVD: Vote locked", async () => {
            await gov.removeDelegate() // with no delegate set, this basically just locks an account
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await expectRevert(gov.delegate(accounts[1]), "GOVD: Vote locked")
        })

        it("reverts if a delegate is already set", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            await time.increase(sevenDays + 1)
            await expectRevert(gov.delegate(accounts[1]), "GOV: Only staker")
        })

        it("reverts if tokens are already delegated to the caller", async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
            await gov.acceptDelegates({ from: accounts[0] })
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            await expectRevert(gov.delegate(accounts[0], { from: accounts[1] }), "GOVD: Already a delegate")
        })

        it("reverts if trying to propose when delegating", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            await expectRevert(gov.propose([accounts[0]], [sampleProposalData]), "GOV: Only staker")
        })

        it("reverts if trying to vote when delegating", async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            await gov.propose([accounts[0]], [sampleProposalData], { from: accounts[1] })
            await expectRevert(gov.voteFor(proposalNum, ether("50")), "GOV: Only staker")
        })

        it("counts the caller's stakedAmount to the delegate", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            assert.isTrue(ether("50").eq(await gov.getStakedAndDelegated(accounts[1])))
        })

        it("locks the caller's tokens", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            const staker = await gov.stakers(accounts[0])
            //@ts-ignore
            assert.isAbove(Number(staker.lockedUntil), 0)
        })

        it("sets the caller's delegate", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            const staker = await gov.stakers(accounts[0])
            //@ts-ignore
            assert.equal(staker.delegate, accounts[1])
        })

        it("adds to the delegate's amount", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            assert.isTrue(ether("50").eq(await gov.getStakedAndDelegated(accounts[1])))
        })

        it("Uses an expected amount of gas", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            const { receipt } = await gov.delegate(accounts[1])
            assert.isAtMost(receipt.gasUsed, 91500)
        })
    })

    describe("removeDelegate", () => {
        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
        })

        it("reverts if GOVD: Vote locked", async () => {
            await expectRevert(gov.removeDelegate(), "GOVD: Vote locked")
        })

        it("removes from the delegated address delegatedAmount", async () => {
            const delegateBefore = await gov.stakers(accounts[1])
            const stakedAndDelegatedBefore = await gov.getStakedAndDelegated(accounts[1])
            assert.isTrue(stakedAndDelegatedBefore.eq(ether("50")))
            //@ts-ignore
            assert.isTrue(delegateBefore.delegatedAmount.eq(ether("50")))
            await time.increase(sevenDays + 1)
            await gov.removeDelegate()
            const delegatedAfter = await gov.stakers(accounts[1])
            const stakedAndDelegatedAfter = await gov.getStakedAndDelegated(accounts[1])
            assert.isTrue(stakedAndDelegatedAfter.eq(ether("0")))
            //@ts-ignore
            assert.isTrue(delegatedAfter.delegatedAmount.eq(ether("0")))
        })

        it("clears the delegate address for the staker", async () => {
            const stakerBefore = await gov.stakers(accounts[0])
            //@ts-ignore
            assert.equal(accounts[1], stakerBefore.delegate)
            await time.increase(sevenDays + 1)
            await gov.removeDelegate()
            const stakerAfter = await gov.stakers(accounts[0])
            //@ts-ignore
            assert.equal(constants.ZERO_ADDRESS, stakerAfter.delegate)
        })

        it("Uses an expected amount of gas", async () => {
            await time.increase(sevenDays + 1)
            const { receipt } = await gov.removeDelegate()
            assert.isAtMost(receipt.gasUsed, 21400);
        })
    })

    describe("acceptDelegates", () => {
        it("delegating reverts if this has not been called from a delegate", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await expectRevert(gov.delegate(accounts[1]), "GOVD: Delegate not accepting")
        })

        it("enables the accepting of delegate tokens", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            const delegatedAmount = await gov.getStakedAndDelegated(accounts[1])
            assert.isTrue(ether("50").eq(delegatedAmount))
        })
    })

    describe("disableDelegates", () => {
        it("reverts if tokens are already delegated", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            await gov.delegate(accounts[1])
            await expectRevert(gov.disableDelegates({ from: accounts[1] }), "GOVD: Already delegating")
        })

        it("disables the acceptingDelegates flag", async () => {
            await govToken.approve(gov.address, ether("50"))
            await gov.stake(ether("50"))
            await gov.acceptDelegates({ from: accounts[1] })
            const stakerBefore = await gov.stakers(accounts[1])
            //@ts-ignore
            assert.isTrue(stakerBefore.acceptingDelegates)
            await gov.disableDelegates({ from: accounts[1] })
            const stakerAfter = await gov.stakers(accounts[1])
            //@ts-ignore
            assert.isFalse(stakerAfter.acceptingDelegates)
        })
    })

    describe("execute", () => {
        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts if the proposalId does not exist", async () => {
            await expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")
        })

        it("reverts if the proposal has not passed", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")
        })

        it("reverts if the proposal was rejected", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays + 1)
            await gov.voteAgainst(proposalNum, ether("50"), { from: accounts[1] })
            const proposal = await gov.proposals(0)

            // The number associated with ProposalState.REJECTED
            const rejectedState = 3;
            //@ts-ignore
            assert.equal(rejectedState, proposal.state)
            await expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")
        })

        it("reverts if the proposal was already executed", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.execute(0)
            const proposal = await gov.proposals(0)

            // The number associated with ProposalState.EXECUTED
            const executedState = 2;
            //@ts-ignore
            assert.equal(executedState, proposal.state)
            await expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")
        })

        it("reverts if the proposal is still cooling off", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await expectRevert(gov.execute(0), "GOV: Cooling Off")
        })

        it("reverts if the proposal is expired", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await time.increase(twoDays * 200)
            await expectRevert(gov.execute(0), 'GOV: Proposal expired')
        })
        it("reverts if the target function call fails", async () => {
            await gov.propose([gov.address], [sampleProposalData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await expectRevert(gov.execute(0), "GOV: Failed execution")
        })

        it("executes internal function calls", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.execute(0)
            //@ts-ignore
            assert.equal(1, await gov.coolingOff())
        })

        it("uses an expected amount of gas", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            const { receipt } = await gov.execute(0)
            assert.isAtMost(receipt.gasUsed, 66000)
        })

        /*
        it("executes external function calls", async () => {
            var deployTracerData = web3.eth.abi.encodeParameters(
                ["bytes32", "uint256", "address", "address", "address", "address", "address", "uint256"],
                [
                    web3.utils.fromAscii(`TEST/USD`),
                    750, //0.075 * 10000 (eg 7.5% scaled)
                    testToken.address,
                    oracle.address,
                    gasPriceOracle.address,
                    account.address,
                    pricing.address,
                    oneDollar,
                ]
            )
            const proposeTracerData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "deployTracer",
                    type: "function",
                    inputs: [
                        {
                            type: "bytes",
                            name: "_data",
                        },
                    ],
                },
                [deployTracerData]
            )

            await gov.propose([tracerFactory.address], [proposeTracerData])
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.execute(0)
            let tracerAddress = await tracerFactory.tracers(web3.utils.fromAscii(`TEST/USD`))
            assert.equal(true, await tracerFactory.validTracers(tracerAddress))
        })
    })
    */

        describe("setCoolingOff", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                await gov.stake(ether("50"))
                await gov.stake(ether("50"), { from: accounts[1] })
            })

            it("reverts when called by an external account", async () => {
                await expectRevert(gov.setCoolingOff(0), "GOV: Only governance")
            })

            it("sets through a proposal", async () => {
                await gov.propose([gov.address], [setCoolingOffData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                //@ts-ignore
                assert.equal(1, await gov.coolingOff())
            })
        })

        describe("setWarmUp", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                await gov.stake(ether("50"))
                await gov.stake(ether("50"), { from: accounts[1] })
            })

            it("reverts when called by an external account", async () => {
                await expectRevert(gov.setWarmUp(0), "GOV: Only governance")
            })

            it("sets through a proposal", async () => {
                await gov.propose([gov.address], [setWarmUpData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                //@ts-ignore
                assert.equal(1, await gov.warmUp())
            })
        })

        describe("setProposalDuration", () => {
            let setProposalDurationData: any
            before(() => {
                setProposalDurationData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: "setProposalDuration",
                        type: "function",
                        inputs: [
                            {
                                type: "uint32",
                                name: "newProposalDuration",
                            },
                        ],
                    },
                    ['1'])
            })

            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                await gov.stake(ether("50"))
                await gov.stake(ether("50"), { from: accounts[1] })
            })

            it("reverts when called by an external account", async () => {
                await expectRevert(gov.setProposalDuration(0), "GOV: Only governance")
            })

            it("sets through a proposal", async () => {
                await gov.propose([gov.address], [setProposalDurationData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                //@ts-ignore
                assert.equal(1, await gov.proposalDuration())
            })
        })

        describe("setLockDuration", () => {
            let setLockDurationData: any
            before(() => {
                setLockDurationData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: "setLockDuration",
                        type: "function",
                        inputs: [
                            {
                                type: "uint32",
                                name: "newLockDuration",
                            },
                        ],
                    },
                    ['1']
                )
            })

            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                await gov.stake(ether("50"))
                await gov.stake(ether("50"), { from: accounts[1] })
            })

            it("reverts when called by an external account", async () => {
                await expectRevert(gov.setLockDuration(0), "GOV: Only governance")
            })

            it("sets through a proposal", async () => {
                await gov.propose([gov.address], [setLockDurationData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                //@ts-ignore
                assert.equal(1, await gov.lockDuration())
            })
        })

        describe("setMaxProposalTargets", () => {
            let setMaxProposalTargetsData: any
            before(() => {
                setMaxProposalTargetsData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: "setMaxProposalTargets",
                        type: "function",
                        inputs: [
                            {
                                type: "uint32",
                                name: "newMaxProposalTargets",
                            },
                        ],
                    },
                    ['1']
                )
            })

            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                await gov.stake(ether("50"))
                await gov.stake(ether("50"), { from: accounts[1] })
            })

            it("reverts when called by an external account", async () => {
                await expectRevert(gov.setMaxProposalTargets(0), "GOV: Only governance")
            })

            it("sets through a proposal", async () => {
                await gov.propose([gov.address], [setMaxProposalTargetsData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                //@ts-ignore
                assert.equal(1, await gov.maxProposalTargets())
            })
        })

        describe("setProposalThreshold", () => {
            let setProposalThresholdData: any
            before(() => {
                setProposalThresholdData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: "setProposalThreshold",
                        type: "function",
                        inputs: [
                            {
                                type: "uint96",
                                name: "newThreshold",
                            },
                        ],
                    },
                    ['1']
                )
            })

            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
                await gov.stake(ether("50"))
                await gov.stake(ether("50"), { from: accounts[1] })
            })

            it("reverts when called by an external account", async () => {
                await expectRevert(gov.setProposalThreshold(0), "GOV: Only governance")
            })

            it("sets through a proposal", async () => {
                await gov.propose([gov.address], [setProposalThresholdData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                //@ts-ignore
                assert.equal(1, await gov.proposalThreshold())
            })
        })
    })
})

// because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
export { }

