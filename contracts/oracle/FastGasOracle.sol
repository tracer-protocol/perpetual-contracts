// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Interfaces/IOracle.sol";
import "../Interfaces/IChainlinkOracle.sol";
import "../lib/LibMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

/**
 * @dev The following is a sample Gas Price Oracle Implementation for a Liquidation Oracle.
 *      It references the Chainlink fast gas price and returns the fast price of gas in wei.
 */
contract FastGasOracle is IOracle, Ownable {
    using LibMath for uint256;
    IChainlinkOracle public fastGasOracle;
    uint8 public override decimals = 0;

    constructor(address _fastGasOracle) {
        fastGasOracle = IChainlinkOracle(_fastGasOracle); /* Gas cost oracle */
    }

    /**
     * @notice Calculates the latest fast gas price in wei
     */
    function latestAnswer() external view override returns (uint256) {
        return gweiToWei(uint256(fastGasOracle.latestAnswer()));
    }

    /**
     * @dev Takes a gwei amount, in 10^18, and returns that amount in ether (in 10^18)
     * @dev e.g. gweiToWei(1*10^18) -> (1*10^9) or 1*10^18/10^9
     */
    function gweiToWei(uint256 _gwei) public pure returns (uint256) {
        return _gwei / (10**9);
    }

    function setGasOracle(address _gasOracle) public onlyOwner {
        fastGasOracle = IChainlinkOracle(_gasOracle);
    }
}
