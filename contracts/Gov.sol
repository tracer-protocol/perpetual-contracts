// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Interfaces/IGov.sol";
import "./lib/SafeMath96.sol";

contract Gov is IGov {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using SafeMath96 for uint96;

    IERC20 public immutable govToken;
    uint32 public warmUp; // time before voting can start
    uint32 public coolingOff; // cooling off period in hours
    uint32 public proposalDuration; // proposal duration in days
    uint32 public lockDuration;
    // specifies the maximum number of targets each given proposal can have
    uint32 public maxProposalTargets;
    uint96 public proposalThreshold;
    uint256 public override totalStaked;
    uint256 public proposalCounter;

    struct Stake {
        bool acceptingDelegates;
        address delegate;
        uint96 stakedAmount;
        uint96 delegatedAmount;
        uint256 lockedUntil;
    }

    enum ProposalState { PROPOSED, PASSED, EXECUTED, REJECTED }

    struct Proposal {

        // who made the proposal
        address proposer;

        // the count for yes and no votes
        uint96 yes;
        uint96 no;

        // For storing the current state in the lifecycle of a proposal
        ProposalState state;

        // The time which the proposal was created
        uint256 startTime;

        // The time the proposal closes voting
        uint256 expiryTime;

        // The time the proposal passed. Initialized to 0.
        uint256 passTime;

        // The list of targets where calls will be made to
        address[] targets;

        // The list of the call datas for each individual call
        bytes[] proposalData;

        // The total voted amount. yes + no
        mapping(address => uint256) stakerTokensVoted;
    }

    // Staker => Stake
    mapping(address => Stake) public stakers;
    // Proposal ID => Proposal
    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 proposalId);
    event ProposalPassed(uint256 proposalId);
    event ProposalRejected(uint256 proposalId);
    event TargetExecuted(uint256 proposalId, address target, bytes returnData);
    event ProposalExecuted(uint256 proposalId);

    constructor(address _govToken) public {
        maxProposalTargets = uint32(10);
        govToken = IERC20(_govToken);
        warmUp = uint32(2 days);
        coolingOff = uint32(2 days);
        proposalDuration = uint32(3 days);
        lockDuration = uint32(7 days);
        proposalThreshold = uint96(1e19);
    }

    /**
     * @notice gets the total amount staked by a given user
     * @param account The user account address
     */
    function getUserStaked(address account) public view override returns (uint96) {
        return stakers[account].stakedAmount;
    }

    /**
     * @notice gets the total amount staked and delegated by a given user
     * @param account The user account address
     */
    function getStakedAndDelegated(address account) public view returns (uint96) {
        return stakers[account].stakedAmount.add96(stakers[account].delegatedAmount);
    }

    /**
     * @notice Stakes governance tokens allowing users voting rights and fee rights. Be sure to claim all 
     *         outstanding fees before calling this function to avoid losing out on earned fees.
     * @dev requires users to have approved this contract to transfer their gov tokens first
     * @param amount the amount of governance tokens to stake
     */
    function stake(uint96 amount) external override {
        Stake storage staker = stakers[msg.sender];
        staker.stakedAmount = staker.stakedAmount.add96(amount);
        address delegate = staker.delegate;
        if (delegate != address(0)) {
            // sender is already delegating. Update this delegation
            stakers[delegate].delegatedAmount = stakers[delegate].delegatedAmount.add96(amount);
        }
        totalStaked = totalStaked.add(amount);
        govToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraws from a given users stake. A user should be sure to claim all outstanding fees before 
     *         calling this function to avoid losing out on earned fees.
     * @param amount the amount of governance tokens to withdraw
     */
    function withdraw(uint96 amount) external override {
        Stake storage staker = stakers[msg.sender];
        require(staker.lockedUntil < block.timestamp, "GOV: Tokens vote locked");
        staker.stakedAmount = staker.stakedAmount.sub96(amount);
        address delegate = staker.delegate;
        if (delegate != address(0)) {
            // Delegatee's amount need to be reduced
            stakers[delegate].delegatedAmount = stakers[staker.delegate].delegatedAmount.sub96(amount);
        }
        totalStaked = totalStaked.sub(amount);
        govToken.safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Called by stakers in order to accept delegate tokens from other stakers
     */
    function acceptDelegates() external override {
        stakers[msg.sender].acceptingDelegates = true;
    }

    /**
     * @notice Called by stakers in order stop accepting delegate tokens
     */
    function disableDelegates() external override {
        require(stakers[msg.sender].delegatedAmount == 0, "GOVD: Already delegating");
        stakers[msg.sender].acceptingDelegates = false;
    }

    /**
     * @notice Delegates staked tokens to another address
     * @param to the address to delegate staked tokens to
     */
    function delegate(address to) external override onlyStaker() {
        Stake storage staker = stakers[msg.sender];
        require(stakers[to].acceptingDelegates, "GOVD: Delegate not accepting");
        require(staker.lockedUntil < block.timestamp, "GOVD: Vote locked");
        require(staker.delegatedAmount == 0, "GOVD: Already a delegate");
        staker.delegate = to;
        staker.lockedUntil = block.timestamp.add(lockDuration);
        stakers[to].delegatedAmount = stakers[to].delegatedAmount.add96(staker.stakedAmount);
    }

    /**
     * @notice Removes the delegated tokens of the caller from counting towards a delegate
     */
    function removeDelegate() external override {
        Stake storage staker = stakers[msg.sender];
        require(staker.lockedUntil < block.timestamp, "GOVD: Vote locked");
        address delegate = staker.delegate;
        stakers[delegate].delegatedAmount = stakers[delegate].delegatedAmount.sub96(staker.stakedAmount);
        delete staker.delegate;
        staker.lockedUntil = block.timestamp.add(lockDuration);
    }

    /**
     * @notice Proposes a function execution on a contract by the governance contract.
     * @param targets the target contracts to execute the proposalData on
     * @param  proposalData ABI encoded data containing the function signature and parameters to be 
     *         executed as part of this proposal.
     */
    function propose(
        address[] memory targets, bytes[] memory proposalData
    ) public override onlyStaker() {
        require(
                getStakedAndDelegated(msg.sender) >= proposalThreshold,
                "GOV: Not enough staked"
        );
        require(targets.length != 0, "GOV: targets = 0");
        require(targets.length < maxProposalTargets, "GOV: Targets > max");
        require(targets.length == proposalData.length, "GOV: Targets != Datas");
        stakers[msg.sender].lockedUntil = block.timestamp.add(lockDuration);

        Proposal storage newProposal = proposals[proposalCounter];
        newProposal.targets = targets;
        newProposal.proposalData = proposalData;
        newProposal.proposer = msg.sender;
        newProposal.yes = getStakedAndDelegated(msg.sender);
        newProposal.no = 0;
        newProposal.startTime = block.timestamp.add(warmUp);
        newProposal.expiryTime = block.timestamp.add(uint256(proposalDuration).add(warmUp));
        newProposal.passTime = 0;
        newProposal.state = ProposalState.PROPOSED;
        emit ProposalCreated(proposalCounter);
        proposalCounter += 1;
    }

    /**
     * @notice Executes a given proposal. This calls a function on some contract
     * @dev Ensures execution succeeds but ignores return data
     * @param proposalId the id of the proposal to execute
     */
    function execute(uint256 proposalId) external override {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.PASSED, "GOV: Proposal state != PASSED");
        require(
            block.timestamp.sub(coolingOff) >= proposal.passTime,
            "GOV: Cooling Off"
        );
        require(proposals[proposalId].expiryTime > block.timestamp, "GOV: Proposal expired");
        proposals[proposalId].state = ProposalState.EXECUTED; 
        for (uint i = 0; i < proposal.targets.length; i++) {
            (bool success, bytes memory data) = proposal.targets[i].call(proposal.proposalData[i]);
            require(success, "GOV: Failed execution");
            emit TargetExecuted(proposalId, proposal.targets[i], data);
        }
        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Allows a staker to vote on a given proposal. A staker may vote multiple times, and vote on either or both 
     *         sides. A vote may not be revoked once made
     * @param proposalId the id of the proposal to be voted on
     * @param userVote the vote on this proposal. True for yes, False for no
     * @param amount the amount of governance tokens to vote on this proposal with.
     */
    function _vote( 
        uint256 proposalId,
        bool userVote,
        uint256 amount
    ) internal {
        Proposal storage proposal = proposals[proposalId];
        uint256 stakedAmount = getStakedAndDelegated(msg.sender);
        require(proposal.startTime < block.timestamp, "GOV: Warming up");
        require(proposal.proposer != msg.sender, "GOV: Proposer cant vote");
        require(proposal.state == ProposalState.PROPOSED, "GOV: Proposal note voteable");
        require(
            proposal.stakerTokensVoted[msg.sender].add(amount) <= stakedAmount,
            "GOV: Vote amount > staked amount"
        );

        stakers[msg.sender].lockedUntil = block.timestamp.add(lockDuration);
        proposal.stakerTokensVoted[msg.sender] = proposal.stakerTokensVoted[msg.sender].add(amount);

        uint96 votes;
        if (userVote) {
            votes = proposal.yes.add96(uint96(amount));
            proposal.yes = votes;
            if (votes >= totalStaked.div(2)) {
                proposal.passTime = block.timestamp;
                proposal.state = ProposalState.PASSED;
                emit ProposalPassed(proposalId);
            }
        } else {
            votes = proposal.no.add96(uint96(amount));
            proposal.no = votes;
            if (votes >= totalStaked.div(2)) {
                proposal.state = ProposalState.REJECTED;
                emit ProposalRejected(proposalId);
            }
        }
    }

    /**
     * @notice Votes in favour of a proposal. A vote may not be revoked once made
     * @dev Calls the internal _vote function
     * @param proposalId the id of the proposal to be voted on
     * @param amount the amount of governance tokens to vote on this proposal with.
     */
    function voteFor(
        uint256 proposalId,
        uint256 amount
    ) external override onlyStaker() {
        _vote(proposalId, true, amount);
    }

    /**
     * @notice Votes against a proposal. A vote may not be revoked once made
     * @dev Calls the internal _vote function
     * @param proposalId the id of the proposal to be voted on
     * @param amount the amount of governance tokens to vote on this proposal with.
     */
    function voteAgainst(
        uint256 proposalId,
        uint256 amount
    ) external override onlyStaker() {
        _vote(proposalId, false, amount);
    }

    /**
     * @notice Sets the cooling off period for proposals
     * @param newCoolingOff the new cooling off period in seconds
     */
    function setCoolingOff(uint32 newCoolingOff) public onlyGov() {
        coolingOff = newCoolingOff;
    }

    /**
     * @notice Sets the warming up period for proposals
     * @param newWarmup the new warming up period in seconds
     */
    function setWarmUp(uint32 newWarmup) public onlyGov() {
        warmUp = newWarmup;
    }

    /**
     * @notice Sets the proposal duration
     * @param newProposalDuration the new proposalDuration in seconds
     */
    function setProposalDuration(uint32 newProposalDuration) public onlyGov() {
        proposalDuration = newProposalDuration;
    }

    /**
     * @notice Sets the vote lock duration
     * @param newLockDuration the new lockDuration in seconds
     */
    function setLockDuration(uint32 newLockDuration) public onlyGov() {
        lockDuration = newLockDuration;
    }

    /**
     * @notice Sets the maximum number of targets that a proposal can execute
     * @param newMaxProposalTargets the new maxProposalTargets
     */
    function setMaxProposalTargets(uint32 newMaxProposalTargets) public onlyGov() {
        maxProposalTargets = newMaxProposalTargets;
    }

    /**
     * @notice Sets the minimum number of tokens to be staked for proposing
     * @param newThreshold the new proposalThreshold
     */
    function setProposalThreshold(uint96 newThreshold) public onlyGov() {
        proposalThreshold = newThreshold;
    }

    /**
     * @dev reverts if caller is not this contract
     */
    modifier onlyGov() {
        require(msg.sender == address(this), "GOV: Only governance");
        _;
    }

    /**
     * @dev reverts if caller does not have tokens staked or has delegated their tokens to another address
     */
    modifier onlyStaker() {
        require(stakers[msg.sender].delegate == address(0) && getUserStaked(msg.sender) > 0, "GOV: Only staker");
        _;
    }
}
