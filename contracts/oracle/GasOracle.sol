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
 *      estimate in USD. Both these feeds are converted to WAD format.
 */
contract GasOracle is IOracle, Ownable {
    using LibMath for uint256;
    IChainlinkOracle public gasOracle;
    IChainlinkOracle public priceOracle;
    uint8 public override decimals = 18;
    uint256 private constant MAX_DECIMALS = 18;
    uint256 private constant MAX_GWEI_DECIMALS = 9;

    constructor(address _priceOracle, address _gasOracle) {
        require(_gasOracle != address(0), "GasOracle: _gasOracle == 0");
        require(_priceOracle != address(0), "GasOracle: _priceOracle == 0");
        gasOracle = IChainlinkOracle(_gasOracle); /* Gas cost oracle */
        priceOracle = IChainlinkOracle(_priceOracle); /* Quote/ETH oracle */
    }

    /**
     * @notice Calculates the latest USD/Gas price
     * @dev Returned value is USD/Gas * 10^18 for compatibility with rest of calculations
     */
    function latestAnswer() external view override returns (uint256) {
        uint256 gasPrice = _gasPriceToWad();
        uint256 ethPrice = _ethPriceToWad();

        uint256 result = PRBMathUD60x18.mul(gasPrice, ethPrice);
        return result;
    }

    /**
     * @notice Returns the latest answer from the Fast Gas/Gwei oracle in WAD format (Gwei/Gas * 10^18).
     * @dev Since the answer is provided in Gwei, the number is scaled to 9 decimals to convert to WAD.
     */
    function _gasPriceToWad() internal view returns (uint256) {
        (uint80 roundID, int256 price, , uint256 timeStamp, uint80 answeredInRound) = gasOracle.latestRoundData();
        require(answeredInRound >= roundID, "GAS: Stale answer");
        require(timeStamp != 0, "GAS: Incomplete round");
        uint8 _decimals = gasOracle.decimals();
        require(_decimals <= MAX_GWEI_DECIMALS, "GAS: Too many decimals");
        uint256 scaler = uint256(10**(MAX_GWEI_DECIMALS - _decimals));
        return uint256(price) * scaler;
    }

    /**
     * @notice Returns the latest answer from the ETH/USD price feed and converts it to WAD format (USD/ETH * 10^18).
     */
    function _ethPriceToWad() internal view returns (uint256) {
        (uint80 roundID, int256 price, , uint256 timeStamp, uint80 answeredInRound) = priceOracle.latestRoundData();
        require(answeredInRound >= roundID, "GAS: Stale answer");
        require(timeStamp != 0, "GAS: Incomplete round");
        uint8 _decimals = priceOracle.decimals();
        require(_decimals <= MAX_DECIMALS, "GAS: Too many decimals");
        uint256 scaler = uint256(10**(MAX_DECIMALS - _decimals));
        return uint256(price) * scaler;
    }

    function setGasOracle(address _gasOracle) public nonZeroAddress(_gasOracle) onlyOwner {
        gasOracle = IChainlinkOracle(_gasOracle);
    }

    function setPriceOracle(address _priceOracle) public nonZeroAddress(_priceOracle) onlyOwner {
        priceOracle = IChainlinkOracle(_priceOracle);
    }

    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }

    modifier nonZeroAddress(address providedAddress) {
        require(providedAddress != address(0), "address(0) given");
        _;
    }
}
