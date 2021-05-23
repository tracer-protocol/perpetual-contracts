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

    function fairPrice(uint256 oraclePrice, int256 timeValue)
        public
        pure
        returns (uint256)
    {
        // todo should we enforce timeValue <= oraclePrice?
        return uint256(LibMath.abs(oraclePrice.toInt256() - timeValue));
    }

    function timeValue(uint256 averageTracerPrice, uint256 averageOraclePrice)
        public
        pure
        returns (int256)
    {
        // todo if averageOraclePrice > averageTracerPrice this will cast to zero
        // this shouldn't be the case imo
        return int256((averageTracerPrice - averageOraclePrice) / 90);
    }

    function averagePrice(PriceInstant memory price)
        public
        pure
        returns (uint256)
    {
        return price.cumulativePrice / price.trades;
    }

    function averagePriceForPeriod(PriceInstant[24] memory prices)
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
        bool leverageHasIncreased = newLeverage > oldLeverage;

        if (leverageHasIncreased) {
            return globalLeverage + (newLeverage - oldLeverage);
        } else {
            return globalLeverage - (newLeverage - oldLeverage);
        }
    }

    // todo it looks like this functionality is now wrong?
    function calculateTWAP(
        uint256 hour,
        PriceInstant[24] memory tracerPrices,
        PriceInstant[24] memory oraclePrices
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

            // todo since average price should return >= 0, these ifs should not be needed
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
                        PRBMathUD60x18.div(
                            cumulativeUnderlying,
                            instantUnderlying
                        ),
                        PRBMathUD60x18.div(
                            cumulativeDerivative,
                            instantDerivative
                        )
                    );
            }
        }
    }
}
