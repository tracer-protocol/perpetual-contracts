//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;

interface IDeployer {

    function deploy(bytes calldata _data) external returns(address);
}
