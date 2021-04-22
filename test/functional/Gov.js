const { time, expectRevert } = require("@openzeppelin/test-helpers")
const { assert } = require("chai")
const { setupGovAndToken } = require("../lib/Setup")
const hre = require("hardhat");
const TestToken = artifacts.require("TestToken");
const Gov = artifacts.require("Gov");

describe("Gov", async () => {
    let sampleProposalData
    let sampleSelfUpdate
    let accounts
    let gov
    let govToken
    const twoDays = 172800

    before(async () => {
        accounts = await web3.eth.getAccounts();
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupGovAndToken(accounts);
        gov = deployed.gov
        govToken = deployed.govToken

        sampleProposalData = web3.eth.abi.encodeFunctionCall(
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
            ['12800']
        )

        sampleSelfUpdate = web3.eth.abi.encodeFunctionCall(
            {
                name: "setCoolingOff",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newCoolingOff",
                    },
                ],
            },
            ['1'] //set to 1
        )
    })

    context("Staking", async () => {
        it("Users can stake", async () => {
            let stakedBefore = await gov.getUserStaked(accounts[2])
            assert.equal(stakedBefore.toString(), "0")

            await govToken.approve(gov.address, web3.utils.toWei("10"), { from: accounts[2] })
            await gov.stake(web3.utils.toWei("10"), { from: accounts[2] })

            let stakedAfter = await gov.getUserStaked(accounts[2])
            assert.equal(stakedAfter.toString(), web3.utils.toWei("10").toString())
        })

        it("Users can withdraw their stake", async () => {
            let stakedBefore = await gov.getUserStaked(accounts[2])
            assert.equal(stakedBefore.toString(), "0")

            await govToken.approve(gov.address, web3.utils.toWei("10"), { from: accounts[2] })
            await gov.stake(web3.utils.toWei("10"), { from: accounts[2] })
            await gov.withdraw(web3.utils.toWei("5"), { from: accounts[2] })
            let stakedAfter = await gov.getUserStaked(accounts[2])
            assert.equal(stakedAfter.toString(), web3.utils.toWei("5").toString())
        })

        it("Users cant withdraw more then their stake", async () => {
            await govToken.approve(gov.address, web3.utils.toWei("10"), { from: accounts[2] })
            await gov.stake(web3.utils.toWei("10"), { from: accounts[2] })
            await expectRevert(gov.withdraw(web3.utils.toWei("11"), { from: accounts[2] }), "SafeMath96: subtraction underflow")
        })
    })

    context("Proposing", async () => {
        it("Stakers can propose function executions", async () => {
            //Stake
            await govToken.approve(gov.address, web3.utils.toWei("10"))
            await gov.stake(web3.utils.toWei("10"))

            //Propose to set accounts 1 to receive fees
            await gov.propose([gov.address], [sampleProposalData])
        })

        it("Stakers can propose multiple function executions", async () => {
            //Stake
            await govToken.approve(gov.address, web3.utils.toWei("10"))
            await gov.stake(web3.utils.toWei("10"))

            //Propose to set accounts 1 to receive fees
            await gov.propose([gov.address, gov.address], [sampleProposalData, sampleSelfUpdate])
        })

        it("If a proposal is given with incorrect arity, it should be reverted", async () => {
            //Stake
            await govToken.approve(gov.address, web3.utils.toWei("10"))
            await gov.stake(web3.utils.toWei("10"))

            await expectRevert(
                gov.propose([gov.address, gov.address], [sampleSelfUpdate]),
                "GOV: Targets != Datas"
            )
        })

        it("Below proposal threshold", async () => {
            //Stake
            await govToken.approve(gov.address, web3.utils.toWei("10"), { from: accounts[2] })
            await gov.stake(web3.utils.toWei("0.1"), { from: accounts[2] })

            await expectRevert(
                gov.propose([gov.address], [sampleProposalData], { from: accounts[2] }),
                "GOV: Not enough staked"
            )
        })

        it("Target length should be within bounds", async () => {
            //Stake
            await govToken.approve(gov.address, web3.utils.toWei("10"))
            await gov.stake(web3.utils.toWei("10"))

            await expectRevert(gov.propose([], []), "GOV: targets = 0")

            await expectRevert(
                gov.propose(Array(13).fill(gov.address), Array(13).fill(sampleProposalData)),
                "GOV: Targets > max"
            )
        })
    })


    context("Voting", async () => {
        it("Voting on an already-executed proposal should revert", async () => {
            await govToken.approve(gov.address, web3.utils.toWei("500"))
            await gov.stake(web3.utils.toWei("500"))
            await govToken.approve(gov.address, web3.utils.toWei("50"), { from: accounts[1] })
            await gov.stake(web3.utils.toWei("50"), { from: accounts[1] })
            const proposalId = await gov.proposalCounter()
            await gov.propose([gov.address], [sampleProposalData], { from: accounts[1] })
            await time.increase(twoDays + 1)
            await gov.voteFor(proposalId, web3.utils.toWei("500"))
            await time.increase(twoDays + 1)
            await gov.execute(proposalId);

            await govToken.approve(gov.address, web3.utils.toWei("5"), { from: accounts[2] })
            await gov.stake(web3.utils.toWei("5"), { from: accounts[2] })

            await expectRevert(
                gov.voteFor(0, web3.utils.toWei("5"), { from: accounts[2] }),
                "GOV: Proposal note voteable"
            )
        })
    })
})

