//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.4;

interface IOracle {
    function latestAnswer() external view returns (uint256);

    function decimals() external view returns (uint8);
}
