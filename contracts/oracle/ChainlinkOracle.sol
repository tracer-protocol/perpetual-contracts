// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../Interfaces/IChainlinkOracle.sol";

/**
 * @dev The following is a mock Chainlink Price Feed Implementation.
 *      It is used purely for the purpose of testing.
 *      All Chainlink price feeds should be wrapped in a Tracer Chainlink Adapter 
 *      to ensure answers are returned in WAD format.
 *      see contracts/oracle/ChainlinkOracleAdapter.sol.
 */
contract ChainlinkOracle is IChainlinkOracle {
    int256 public price = 100000000;
    uint8 public override decimals = 8; // default of 8 decimals for USD price feeds in the Chainlink ecosystem

    function latestAnswer() external view override returns (int256){
        revert("CO: Deprecated function");
    }

    function latestTimestamp() external view override returns (uint256){
        revert("CO: Deprecated function");
    }

    function latestRound() external view override returns (uint256){
        revert("CO: Deprecated function");
    }

    function getAnswer(uint256 roundId) external view override returns (int256){
        revert("CO: Deprecated function");
    }

    function getTimestamp(uint256 roundId) external view override returns (uint256){
        revert("CO: Deprecated function");
    }

    function description() external view override returns (string memory){
        revert("CO: Deprecated function");
    }

    function version() external view override returns (uint256){
        revert("CO: Unimplemented function");
    }

    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ){
        revert("CO: Deprecated function");
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
    ){
        roundId = 1;
        answer = price;
        startedAt = 0;
        updatedAt = 1;
        answeredInRound = 1;
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function setPrice(int256 _price) public {
        price = _price;
    }

    function setDecimals(uint8 _decimals) external {
        decimals = _decimals;
    }
}
