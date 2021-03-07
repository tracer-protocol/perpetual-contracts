// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >= 0.6.0;

import "./Interfaces/IOracle.sol";
import "./lib/LibMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev The following is a sample Gas Price Oracle Implementation for a Tracer Oracle.
 *      It references the Chainlink fast gas price and ETH/USD price to get a gas cost
 *      estimate in USD.
 */
contract GasOracle is IOracle, Ownable {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    IOracle public gasOracle;
    IOracle public priceOracle;
    int256 public usdToGas;
    uint8 public override decimals = 8; // default of 8 decimals for USD price feeds in the Chainlink ecosystem

    constructor(address _priceOracle, address _gasOracle) public {
        gasOracle = IOracle(_gasOracle); /* Gas cost oracle */
        priceOracle = IOracle(_priceOracle); /* Base/ETH oracle */
    }

    /**
     * @notice Calculates the latest USD/Gas price
     * @dev Returned value is USD/Gas * 10^18 for compatibility with rest of calculations
     */
    function latestAnswer() external override view returns (int256) {
        if (usdToGas != 0) {
            // Default value has been manually set
            return usdToGas;
        }
        uint256 gweiDividor = 9;
        uint256 ten = 10; // Needed to allow compiler to exponentiate

        uint256 gasDecimals = gasOracle.decimals();
        uint256 priceDecimals = priceOracle.decimals();
        uint256 divisionPower = ten**((gasDecimals.add(priceDecimals)).sub(gweiDividor));

        return gasOracle.latestAnswer().mul(priceOracle.latestAnswer()).div(divisionPower.toInt256());
    }

    function isStale() external override view returns (bool) {
        return false;
    }

    /**
     * @notice Manually set the new ratio of USD/Gas
     */
    function setUsdToGas(int256 _price) public {
        usdToGas = _price;
    }

    function setGasOracle(address _gasOracle) public onlyOwner {
        gasOracle = IOracle(_gasOracle);
    }

    function setPriceOracle(address _priceOracle) public onlyOwner {
        priceOracle = IOracle(_priceOracle);
    }

    function setDecimals(uint8 _decimals) external override {
        decimals = _decimals;
    }
}
