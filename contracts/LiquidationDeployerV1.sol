// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./Liquidation.sol";
import "./Interfaces/ILiquidationDeployer.sol";

/**
 * Deployer contract. Used by the Tracer Factory to deploy new Tracer markets
 */
contract LiquidationDeployerV1 is ILiquidationDeployer {
    function deploy(
        address pricing,
        address tracer,
        address insuranceContract,
        uint256 maxSlippage,
        address gov
    ) external override returns (address) {
        Liquidation liquidation =
            new Liquidation(
                pricing,
                tracer,
                insuranceContract,
                maxSlippage,
                gov
            );
        return address(liquidation);
    }
}
