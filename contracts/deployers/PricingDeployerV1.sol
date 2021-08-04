// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.4;

import "../Pricing.sol";
import "../Interfaces/deployers/IPricingDeployer.sol";

/**
 * Deployer contract. Used by the Tracer Factory to deploy new Tracer markets
 */
contract PricingDeployerV1 is IPricingDeployer {
    function deploy(
        address tracer,
        address insurance,
        address oracle
    ) external override returns (address) {
        require(tracer != address(0), "PRCDeploy: tracer = address(0)");
        require(insurance != address(0), "PRCDeploy: insurance = address(0)");
        require(oracle != address(0), "PRCDeploy: oracle = address(0)");
        Pricing pricing = new Pricing(tracer, insurance, oracle);
        return address(pricing);
    }
}
