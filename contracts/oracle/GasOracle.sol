// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Interfaces/IOracle.sol";
import "../Interfaces/IChainlinkOracle.sol";
import "../lib/LibMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

/**
 * @dev The following is a sample Gas Price Oracle Implementation for a Tracer Oracle.
 *      It references the Chainlink fast gas price and ETH/USD price to get a gas cost
 *      estimate in USD.
 */
contract GasOracle is IOracle, Ownable {
    using LibMath for uint256;
    IChainlinkOracle public gasOracle;
    IChainlinkOracle public priceOracle;
    uint256 public usdToGas;
    uint8 public override decimals = 8; // default of 8 decimals for USD price feeds in the Chainlink ecosystem
    uint256 private constant MAX_DECIMALS = 18;

    constructor(address _priceOracle, address _gasOracle) {
        gasOracle = IChainlinkOracle(_gasOracle); /* Gas cost oracle */
        priceOracle = IChainlinkOracle(_priceOracle); /* Quote/ETH oracle */
    }

    /**
     * @notice Calculates the latest USD/Gas price
     * @dev Returned value is USD/Gas * 10^18 for compatibility with rest of calculations
     */
    function latestAnswer() external view override returns (uint256) {
        if (usdToGas != 0) {
            // Default value has been manually set
            return usdToGas;
        }
        uint256 gweiDividor = 9;
        uint256 ten = 10; // Needed to allow compiler to exponentiate

        uint256 gasDecimals = gasOracle.decimals();
        uint256 priceDecimals = priceOracle.decimals();
        uint256 divisionPower =
            ten**((gasDecimals + priceDecimals) - gweiDividor);

        // todo sanity check on casting. int256->uint256 is safe
        return ((uint256(gasOracle.latestAnswer()) *
            uint256(priceOracle.latestAnswer())) / divisionPower);

        uint256 gasPrice = toWad(uint256(gasOracle.latestAnswer()), gasOracle);
        uint256 ethPrice =
            toWad(uint256(priceOracle.latestAnswer()), priceOracle);

        uint256 result = PRBMathUD60x18.mul(gweiToWei(gasPrice), ethPrice);
        return result;

        // todo sanity check on casting. int256->uint256 is safe
        return ((uint256(gasOracle.latestAnswer()) *
            uint256(priceOracle.latestAnswer())) / divisionPower);
    }

    /**
     * @dev Takes a gwei amount, in 10^18, and returns that amount in ether (in 10^18)
     * @dev e.g. gweiToWei(1*10^18) -> (1*10^9) or 1*10^18/10^9
     */
    function gweiToWei(uint256 _gwei) public pure returns (uint256) {
        return _gwei / (10**9);
    }

    /**
     * @notice converts a raw value to a WAD value.
     * @dev this allows consistency for oracles used throughout the protocol
     *      and allows oracles to have their decimals changed withou affecting
     *      the market itself
     */
    function toWad(uint256 raw, IChainlinkOracle _oracle)
        internal
        view
        returns (uint256)
    {
        IChainlinkOracle oracle = IChainlinkOracle(_oracle);
        // reset the scaler for consistency
        uint8 _decimals = oracle.decimals(); // 9
        require(_decimals <= MAX_DECIMALS, "GAS: too many decimals");
        uint256 scaler = uint256(10**(MAX_DECIMALS - _decimals));
        return raw * scaler;
    }

    /**
     * @notice Manually set the new ratio of USD/Gas
     */
    function setUsdToGas(uint256 _price) public {
        usdToGas = _price;
    }

    function setGasOracle(address _gasOracle) public onlyOwner {
        gasOracle = IChainlinkOracle(_gasOracle);
    }

    function setPriceOracle(address _priceOracle) public onlyOwner {
        priceOracle = IChainlinkOracle(_priceOracle);
    }

    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }
}
