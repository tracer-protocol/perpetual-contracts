pragma solidity ^0.8.0;

import "../lib/LibPrices.sol";

contract LibPricesMock {
    function fairPrice(uint256 oraclePrice, int256 timeValue)
        public
        pure
        returns (uint256)
    {
        return Prices.fairPrice(oraclePrice, timeValue);
    }

    function timeValue(uint256 averageTracerPrice, uint256 averageOraclePrice)
        public
        pure
        returns (int256)
    {
        return Prices.timeValue(averageTracerPrice, averageOraclePrice);
    }

    function averagePrice(Prices.PriceInstant memory price)
        public
        pure
        returns (uint256)
    {
        return Prices.averagePrice(price);
    }

    function averagePriceForPeriod(Prices.PriceInstant[24] memory prices)
        public
        pure
        returns (uint256)
    {
        return Prices.averagePriceForPeriod(prices);
    }

    function globalLeverage(
        uint256 globalLeverage,
        uint256 oldLeverage,
        uint256 newLeverage
    ) public pure returns (uint256) {
        return Prices.globalLeverage(globalLeverage, oldLeverage, newLeverage);
    }

    function calculateTWAP(
        uint256 hour,
        Prices.PriceInstant[24] memory tracerPrices,
        Prices.PriceInstant[24] memory oraclePrices
    ) public pure returns (Prices.TWAP memory) {
        return Prices.calculateTWAP(hour, tracerPrices, oraclePrices);
    }
}
