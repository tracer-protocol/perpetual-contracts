//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Interfaces/ITracerPerpetualSwaps.sol";
import "../Interfaces/IInsurance.sol";
import "../Interfaces/ITracerPerpetualsFactory.sol";
import "../Interfaces/IDeployer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockTracerPerpetualsFactory is ITracerPerpetualsFactory {
    uint256 public tracerCounter;
    address public insurance;
    address public deployer;

    mapping(uint256 => address) public override tracersByIndex;
    mapping(address => bool) public override validTracers;
    mapping(address => bool) public override daoApproved;

    event TracerDeployed(bytes32 marketId, address market);

    constructor(address _insurance, address _deployer) {
        setInsuranceContract(_insurance);
        setDeployerContract(_deployer);
    }

    /**
     * @notice Allows the factory to absorb already deployed Tracers. This lets a third
     *         party deploy tracers and propose they become part of the factory.
     * @dev reverts if the address being passed in as the tracer does not implement the tracer hash function
     */
    function deployTracer(bytes calldata _data) external {}

    /**
     * @notice Allows the factory to deploy tracer markets.
     * @dev reverts if the market ID already exists.
     * @param _data The data that will be used as constructor parameters for the new Tracer market.
     */
    function deployTracerAndApprove(bytes calldata _data) external {}

    /**
     * @notice Allows for deploying a tracer without calling Deployer.deploy()
     * @param market The address for the new mock market
     * @dev useful for testing when you want to call functions with onlyTracer() modifier
     */
    function mockDeployTracer(address market) external {
        // ITracerPerpetualSwaps tracer = ITracerPerpetualSwaps(market);
        // bytes32 marketId = tracer.marketId();
        bytes32 marketId = bytes32("TEST/USD");
        validTracers[market] = true;
        tracersByIndex[tracerCounter] = market;

        tracerCounter++;

        emit TracerDeployed(marketId, market);
    }

    /**
     * @notice Sets the insurance contract for tracers. Allows the
     *         factory to be used as a point of reference for all pieces
     *         in the tracer protocol.
     * @param newInsurance the new insurance contract address
     */
    function setInsuranceContract(address newInsurance) public override {
        insurance = newInsurance;
    }

    /**
     * @notice Sets the insurance contract for tracers. Allows the
     *         factory to be used as a point of reference for all pieces
     *         in the tracer protocol.
     * @param newDeployer the new deployer contract address
     */
    function setDeployerContract(address newDeployer) public override {
        deployer = newDeployer;
    }

    function setApproved(address market, bool value) public override {
        daoApproved[market] = value;
    }
}
