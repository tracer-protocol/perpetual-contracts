//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IOracle {

    function latestAnswer() external view returns (int256);

    function isStale() external view returns (bool);

    function decimals() external view returns (uint8);
}

