// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

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
            uint256 _tokenDecimals,
            address _gasPriceOracle,
            address _pricingContract,
            address _liquidationContract,
            uint256 _maxLeverage,
            uint256 _fundingRateSensitivity,
            uint256 _feeRate,
            uint256 _oracleDecimals
        ) = abi.decode(_data, (
            bytes32,
            address,
            uint256,
            address,
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256
        ));
        TracerPerpetualSwaps tracer = new TracerPerpetualSwaps(
            _tracerId,
            _tracerBaseToken,
            _tokenDecimals,
            _gasPriceOracle,
            _pricingContract,
            _liquidationContract,
            _maxLeverage,
            _fundingRateSensitivity,
            _feeRate,
            _oracleDecimals
        );
        tracer.transferOwnership(msg.sender);
        return address(tracer);
    }

}
