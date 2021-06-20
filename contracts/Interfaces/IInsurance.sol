//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IInsurance {
    function collateralAmount() external view returns (uint256);

    function withdrawalDelay() external view returns (uint256);

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function updatePoolAmount() external;

    function drainPool(uint256 amount) external;

    function transferOwnership(address newOwner) external;

    function getPoolUserBalance(address user) external view returns (uint256);

    function getPoolTarget() external view returns (uint256);

    function getPoolFundingRate() external view returns (uint256);
}
