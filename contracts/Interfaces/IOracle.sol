//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;

interface IOracle {

    function latestAnswer() external view returns (int256);

    function isStale() external view returns (bool);

    function decimals() external view returns (uint8);

    function setDecimals(uint8 _decimals) external;
}

