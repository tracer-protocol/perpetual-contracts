//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";

library Prices {
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

    function averagePrice(PriceInstant price) returns (uint256) {
        return price.cumulativePrice / price.trades;
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

        for (uint256 i=0;i<8;i++) {
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
            }
            else {
                return TWAP(
                    cumulativeUnderlying / instantUnderlying,
                    cumulativeDerivative / instantDerivative
                );
            }
        }
    }
}
