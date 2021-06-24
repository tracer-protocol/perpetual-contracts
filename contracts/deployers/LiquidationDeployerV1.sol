// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Liquidation.sol";
import "../Interfaces/deployers/ILiquidationDeployer.sol";

/**
 * Deployer contract. Used by the Tracer Factory to deploy new Tracer markets
 */
contract LiquidationDeployerV1 is ILiquidationDeployer {
    function deploy(
        address pricing,
        address tracer,
        address insurance,
        address fastGasOracle,
        uint256 maxSlippage
    ) external override returns (address) {
        require(pricing != address(0), "LIQDeploy: pricing = address(0)");
        require(tracer != address(0), "LIQDeploy: tracer = address(0)");
        require(insurance != address(0), "LIQDeploy: insurance = address(0)");
        require(fastGasOracle != address(0), "LIQDeploy: fastGasOracle = address(0)");
        Liquidation liquidation = new Liquidation(pricing, tracer, insurance, fastGasOracle, maxSlippage);
        liquidation.transferOwnership(msg.sender);
        return address(liquidation);
    }
}
