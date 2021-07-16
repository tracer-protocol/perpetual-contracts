//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

/**
 * This interface follows the AggregatorV3 interface
 * https://github.com/smartcontractkit/chainlink/blob/develop/evm-contracts/src/v0.8/interfaces/AggregatorV3Interface.sol
 * Before being used by the system, any Chainlink feeds that do not provide answers in WAD format (18 decimals) should be wrapped in a
 * Tracer Chainlink Adapter (see contrafts/oracle/ChainlinkOracleAdapter.sol) to ensure the correct number of decimals.
 */
interface IChainlinkOracle {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
