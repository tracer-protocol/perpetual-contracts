// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;

import "./Tracer.sol";
import "./Interfaces/IDeployer.sol";

/**
 * Deployer contract. Used by the Tracer Factory to deploy new Tracer markets
 */
contract DeployerV1 is IDeployer {

    function deploy(
        bytes calldata _data
    ) external override returns(address) {
        (
            bytes32 _tracerId,
            uint256 _minMargin,
            address _tracerBaseToken,
            address _oracle,
            address _gasPriceOracle,
            address _accountContract,
            address _pricingContract,
            int256 _maxLeverage
        ) = abi.decode(_data, (
            bytes32,
            uint256,
            address,
            address,
            address,
            address,
            address,
            int256
        ));
        Tracer tracer = new Tracer(
            _tracerId,
            _minMargin,
            _tracerBaseToken,
            _oracle,
            _gasPriceOracle,
            _accountContract,
            _pricingContract,
            _maxLeverage
            );
        tracer.transferOwnership(msg.sender);
        return address(tracer);
    }

}
