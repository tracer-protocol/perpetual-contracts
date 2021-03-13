//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;
import "./Types.sol";

interface IDex {

    function orderIdByHash(bytes32 orderHash) external returns (uint256);

}