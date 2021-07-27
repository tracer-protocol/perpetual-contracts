//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.4;

interface ILiquidationDeployer {
    function deploy(
        address pricing,
        address tracer,
        address insuranceContract,
        address fastGasOracle,
        uint256 maxSlippage
    ) external returns (address);
}
