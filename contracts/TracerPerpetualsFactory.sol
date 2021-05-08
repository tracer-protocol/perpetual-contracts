// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/ITracerPerpetualsFactory.sol";
import "./Interfaces/IDeployer.sol";
import "./Insurance.sol";
import "./Pricing.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TracerPerpetualsFactory is Ownable, ITracerPerpetualsFactory {

    uint256 public tracerCounter;
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
        address _deployer,
        address _governance
    ) {
        setDeployerContract(_deployer);
        transferOwnership(_governance);
    }

    /**
     * @notice Allows any user to deploy a tracer market
     * @param _data The data that will be used as constructor parameters for the new Tracer market.
     */
    function deployTracer(
        bytes calldata _data,
        address oracle
    ) external {
        _deployTracer(_data, msg.sender, oracle);
    }

   /**
     * @notice Allows the Tracer DAO to deploy a DAO approved Tracer market
     * @param _data The data that will be used as constructor parameters for the new Tracer market.
     */
    function deployTracerAndApprove(
        bytes calldata _data,
        address oracle
    ) external onlyOwner() {
        address tracer = _deployTracer(_data, owner(), oracle);
        // DAO deployed markets are automatically approved
        setApproved(address(tracer), true);
    }

    /**
    * @notice internal function for the actual deployment of a Tracer market.
    */
    function _deployTracer(
        bytes calldata _data,
        address tracerOwner,
        address oracle
    ) internal returns (address) {
        // Create and link tracer to factory
        address market = IDeployer(deployer).deploy(_data);
        ITracerPerpetualSwaps tracer = ITracerPerpetualSwaps(market);

        validTracers[market] = true;
        tracersByIndex[tracerCounter] = market;
        tracerCounter++;
        
        // Instantiate Insurance contract for tracer
        address insurance = address(new Insurance(address(market), address(this)));

        address pricing = address(new Pricing(market, insurance, oracle));

        // Perform admin operations on the tracer to finalise linking
        tracer.setInsuranceContract(insurance);
        tracer.setPricingContract(pricing);

        // Ownership either to the deployer or the DAO
        tracer.transferOwnership(tracerOwner);
        emit TracerDeployed(tracer.marketId(), address(tracer));
        return market;
    }

    /**
     * @notice Sets the deployer contract for tracers markets.
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
