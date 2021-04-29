//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

interface IGov {
    function stake(uint96 amount) external;

    function withdraw(uint96 amount) external;

    function propose(address[] memory targets, bytes[] memory proposalData) external;

    function voteFor(uint256 proposalId, uint256 amount) external;

    function voteAgainst(uint256 proposalId, uint256 amount) external;

    function execute(uint256 proposalId) external;

    function acceptDelegates() external;

    function disableDelegates() external;

    function delegate(address to) external;

    function removeDelegate() external;

    function getUserStaked(address account) external view returns (uint96);

    function totalStaked() external view returns(uint256);
}
