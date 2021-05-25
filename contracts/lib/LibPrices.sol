//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

library Prices {
    using LibMath for uint256;

    struct FundingRateInstant {
        uint256 timestamp;
        int256 fundingRate;
        int256 cumulativeFundingRate;
    }

    struct PriceInstant {
        uint256 cumulativePrice;
        uint256 trades;
    }

    struct TWAP {
        uint256 underlying;
        uint256 derivative;
    }

    function fairPrice(uint256 oraclePrice, int256 _timeValue)
        public
        pure
        returns (uint256)
    {
        return uint256(LibMath.abs(oraclePrice.toInt256() - _timeValue));
    }

    function timeValue(uint256 averageTracerPrice, uint256 averageOraclePrice)
        public
        pure
        returns (int256)
    {
        return (averageTracerPrice.toInt256() - averageOraclePrice.toInt256()) / 90;
    }

    function averagePrice(PriceInstant memory price)
        public
        pure
        returns (uint256)
    {
        if (price.trades == 0) {
            return 0;
        }
        return price.cumulativePrice / price.trades;
    }

    function averagePriceForPeriod(PriceInstant[24] memory prices)
        public
        pure
        returns (uint256)
    {
        uint256 n = (prices.length <= 24) ? prices.length : 24;
        uint256[] memory averagePrices = new uint256[](24);

        for (uint256 i = 0; i < n; i++) {
            PriceInstant memory currPrice = prices[i];
            averagePrices[i] = averagePrice(currPrice);
        }

        return LibMath.mean(averagePrices);
    }

    function globalLeverage(
        uint256 _globalLeverage,
        uint256 oldLeverage,
        uint256 newLeverage
    ) public pure returns (uint256) {
        return uint256(int256(_globalLeverage) + (int256(newLeverage) - int256(oldLeverage)));
    }

    /**
     * @notice calculates an 8 hour TWAP starting at the hour index amd moving
     * backwards in time.
     * @param hour the 24 hour index to start at
     * @param tracerPrices the average hourly prices of the derivative over the last
     * 24 hours
     * @param oraclePrices the average hourly prices of the oracle over the last
     * 24 hours
     */
    function calculateTWAP(
        uint256 hour,
        PriceInstant[24] memory tracerPrices,
        PriceInstant[24] memory oraclePrices
    ) public pure returns (TWAP memory) {
        uint256 totalTimeWeight = 0;
        uint256 cumulativeDerivative = 0;
        uint256 cumulativeUnderlying = 0;

        for (uint256 i = 0; i < 8; i++) {
            uint256 currTimeWeight = 8 - i;
            // if hour < i loop back towards 0 from 23.
            // otherwise move from hour towards 0
            uint256 j = hour < i ? 24 - i + hour : hour - i;

            uint256 currDerivativePrice = averagePrice(tracerPrices[j]);
            uint256 currUnderlyingPrice = averagePrice(oraclePrices[j]);

            totalTimeWeight += currTimeWeight;
            cumulativeDerivative += currTimeWeight * currDerivativePrice;
            cumulativeUnderlying += currTimeWeight * currUnderlyingPrice;
        }

        return
            TWAP(
                PRBMathUD60x18.div(
                    cumulativeUnderlying,
                    totalTimeWeight
                ),
                PRBMathUD60x18.div(
                    cumulativeDerivative,
                    totalTimeWeight
                )
            );
    }
}
