// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;

import "./Interfaces/ITracer.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/ITracerFactory.sol";
import "./Interfaces/IDeployer.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TracerFactory is Ownable, ITracerFactory {

    uint256 public tracerCounter;
    address public insurance;
    address public deployer;

    // Index of Tracer (where 0 is index of first Tracer market), corresponds to tracerCounter => market address
    mapping(uint256 => address) public override tracersByIndex;
    // Tracer market => whether that address is a valid Tracer or not
    mapping(address => bool) public override validTracers;
    // Tracer market => whether this address is a DAO approved market.
    // note markets deployed by the DAO are by default approved
    mapping(address => bool) public override daoApproved;

    event TracerDeployed(bytes32 indexed marketId, address indexed market);

    constructor(
        address _insurance,
        address _deployer,
        address _governance
    ) public {
        setInsuranceContract(_insurance);
        setDeployerContract(_deployer);
        transferOwnership(_governance);
    }

    /**
     * @notice Allows any user to deploy a tracer market
     * @param _data The data that will be used as constructor parameters for the new Tracer market.
     */
    function deployTracer(
        bytes calldata _data
    ) external {
        //TODO: Security check on owner of a market being the deployer. May be problematic.
        _deployTracer(_data, msg.sender);
    }

   /**
     * @notice Allows the Tracer DAO to deploy a DAO approved Tracer market
     * @param _data The data that will be used as constructor parameters for the new Tracer market.
     */
    function deployTracerAndApprove(
        bytes calldata _data
    ) external onlyOwner() {
        address tracer = _deployTracer(_data, owner());
        // DAO deployed markets are automatically approved
        setApproved(address(tracer), true);
    }

    /**
    * @notice internal function for the actual deployment of a Tracer market.
    */
    function _deployTracer(
        bytes calldata _data,
        address tracerOwner
    ) internal returns (address) {
        // Create and link tracer to factory
        address market = IDeployer(deployer).deploy(_data);
        ITracer tracer = ITracer(market);

        validTracers[market] = true;
        tracersByIndex[tracerCounter] = market;

        IInsurance(insurance).deployInsurancePool(market);
        tracerCounter++;

        // Perform admin operations on the tracer to finalise linking
        tracer.setInsuranceContract(insurance);
        tracer.initializePricing();

        // Ownership either to the deployer or the DAO
        tracer.transferOwnership(tracerOwner);
        emit TracerDeployed(tracer.marketId(), address(tracer));
        return market;
    }

    /**
     * @notice Sets the insurance contract for tracers. Allows the
     *         factory to be used as a point of reference for all pieces
     *         in the tracer protocol.
     * @param newInsurance the new insurance contract address
     */
    function setInsuranceContract(address newInsurance) public override onlyOwner() {
        insurance = newInsurance;
    }

    /**
     * @notice Sets the insurance contract for tracers. Allows the
     *         factory to be used as a point of reference for all pieces
     *         in the tracer protocol.
     * @param newDeployer the new deployer contract address
     */
    function setDeployerContract(address newDeployer) public override onlyOwner() {
        deployer = newDeployer;
    }

    /**
    * @notice Sets a contracts approval by the DAO. This allows the factory to
    *         identify contracts that the DAO has "absorbed" into its control
    * @dev requires the contract to be owned by the DAO if being set to true.
    */
    function setApproved(address market, bool value) public override onlyOwner() {
        if(value) { require(Ownable(market).owner() == owner(), "TFC: Owner not DAO"); }
        daoApproved[market] = value;
    }

}
