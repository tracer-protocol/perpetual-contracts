//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";

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

    function fairPrice(uint256 oraclePrice, int256 timeValue)
        public
        pure
        returns (uint256)
    {
        return uint256(LibMath.abs(oraclePrice.toInt256() - timeValue));
    }

    function timeValue(uint256 averageTracerPrice, uint256 averageOraclePrice)
        public
        pure
        returns (int256)
    {
        return int256((averageTracerPrice - averageOraclePrice) / 90);
    }

    function averagePrice(PriceInstant memory price)
        public
        pure
        returns (uint256)
    {
        return price.cumulativePrice / price.trades;
    }

    function averagePriceForPeriod(PriceInstant[] memory prices)
        public
        pure
        returns (uint256)
    {
        uint256 n = prices.length <= 24 ? prices.length : 24;
        uint256[] memory averagePrices = new uint256[](24);

        for (uint256 i = 0; i < n; i++) {
            PriceInstant memory currPrice = prices[i];
            averagePrices[i] = averagePrice(currPrice);
        }

        return LibMath.mean(averagePrices);
    }

    function globalLeverage(
        uint256 globalLeverage,
        uint256 oldLeverage,
        uint256 newLeverage
    ) public pure returns (uint256) {
        uint256 delta = oldLeverage - newLeverage;

        if (oldLeverage < newLeverage) {
            return globalLeverage + delta;
        } else {
            if (delta == globalLeverage) {
                return 0;
            } else {
                return uint256(globalLeverage - delta);
            }
        }
    }

    function calculateTWAP(
        uint256 hour,
        PriceInstant[] memory tracerPrices,
        PriceInstant[] memory oraclePrices
    ) public pure returns (TWAP memory) {
        uint256 instantDerivative = 0;
        uint256 cumulativeDerivative = 0;
        uint256 instantUnderlying = 0;
        uint256 cumulativeUnderlying = 0;

        for (uint256 i = 0; i < 8; i++) {
            uint256 currTimeWeight = 8 - i;
            uint256 j = 8 - i;

            uint256 currDerivativePrice = averagePrice(tracerPrices[j]);
            uint256 currUnderlyingPrice = averagePrice(oraclePrices[j]);

            if (currDerivativePrice > 0) {
                instantDerivative += currTimeWeight;
                cumulativeDerivative += currTimeWeight * currDerivativePrice;
            }

            if (currUnderlyingPrice > 0) {
                instantUnderlying += currTimeWeight;
                cumulativeUnderlying += currTimeWeight * currUnderlyingPrice;
            }

            if (instantDerivative == 0) {
                return TWAP(0, 0);
            } else {
                return
                    TWAP(
                        cumulativeUnderlying / instantUnderlying,
                        cumulativeDerivative / instantDerivative
                    );
            }
        }
    }
}
