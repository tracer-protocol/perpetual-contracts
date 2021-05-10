//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface ITracerPerpetualsFactory {
    function tracersByIndex(uint256 count) external view returns (address);

    function validTracers(address market) external view returns (bool);

    function daoApproved(address market) external view returns (bool);

    function setDeployerContract(address newDeployer) external;

    function setApproved(address market, bool value) external;
}
