//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "./Types.sol";

interface IDex {

    function orderIdByHash(bytes32 orderHash) external returns (uint256);

}