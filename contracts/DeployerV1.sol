// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;

import "./TracerPerpetualSwaps.sol";
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
            address _tracerBaseToken,
            address _oracle,
            address _gasPriceOracle,
            address _accountContract,
            address _pricingContract,
            int256 _maxLeverage,
            uint256 _fundingRateSensitivity
        ) = abi.decode(_data, (
            bytes32,
            address,
            address,
            address,
            address,
            address,
            int256,
            uint256
        ));
        TracerPerpetualSwaps tracer = new TracerPerpetualSwaps(
            _tracerId,
            _tracerBaseToken,
            _oracle,
            _gasPriceOracle,
            _accountContract,
            _pricingContract,
            _maxLeverage,
            _fundingRateSensitivity
        );
        tracer.transferOwnership(msg.sender);
        return address(tracer);
    }

}
