//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "./LibBalances.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";

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
        return
            (averageTracerPrice.toInt256() - averageOraclePrice.toInt256()) /
            90;
    }

    /**
     * @notice Calculate the average price of trades in a PriceInstant instance
     * @param price Current cumulative price and number of trades in a time period
     * @return Average price for given instance
     */
    function averagePrice(PriceInstant memory price)
        public
        pure
        returns (uint256)
    {
        // todo double check safety of this.
        // average price == 0 is not neccesarily the
        // same as no trades in average
        if (price.trades == 0) {
            return 0;
        }
        return price.cumulativePrice / price.trades;
    }

    /**
     * @notice Calculates average price over a time period of 24 hours
     * @dev Ignores hours where the number of trades is zero
     * @param prices Array of PriceInstant instances in the 24 hour period
     * @return Average price in the time period (non-weighted)
     */
    function averagePriceForPeriod(PriceInstant[24] memory prices)
        public
        pure
        returns (uint256)
    {
        uint256[] memory averagePrices = new uint256[](24);

        // TODO: make sure this procedure is gas-optimised
        uint256 j = 0;
        for (uint256 i = 0; i < 24; i++) {
            PriceInstant memory currPrice = prices[i];

            // don't include periods that have no trades
            if (currPrice.trades == 0) {
                continue;
            } else {
                averagePrices[j] = averagePrice(currPrice);
                j++;
            }
        }

        return LibMath.meanN(averagePrices, j);
    }

    /**
     * @notice Calculate new global leverage
     * @param _globalLeverage Current global leverage
     * @param oldLeverage Old leverage of account
     * @param newLeverage New leverage of account
     * @return New global leverage, calculated from the change from
     *        the old to the new leverage for the account
     */
    function globalLeverage(
        uint256 _globalLeverage,
        uint256 oldLeverage,
        uint256 newLeverage
    ) public pure returns (uint256) {
        int256 newGlobalLeverage =
            int256(_globalLeverage) +
                (int256(newLeverage) - int256(oldLeverage));

        // note: this would require a bug in how account leverage was recorded
        // as newLeverage - oldLeverage (leverage delta) would be greater than the
        // markets leverage. This SHOULD NOT be possible, however this is here for sanity.
        if (newGlobalLeverage < 0) {
            return 0;
        }

        return uint256(newGlobalLeverage);
    }

    /**
     * @notice calculates an 8 hour TWAP starting at the hour index amd moving
     * backwards in time.
     * @dev Ignores hours where the number of trades is zero
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
        require(hour < 24, "Hour index not valid");

        uint256 totalDerivativeTimeWeight = 0;
        uint256 totalUnderlyingTimeWeight = 0;
        uint256 cumulativeDerivative = 0;
        uint256 cumulativeUnderlying = 0;

        for (uint256 i = 0; i < 8; i++) {
            uint256 currTimeWeight = 8 - i;
            // if hour < i loop back towards 0 from 23.
            // otherwise move from hour towards 0
            uint256 j = hour < i ? 24 - i + hour : hour - i;

            uint256 currDerivativePrice = averagePrice(tracerPrices[j]);
            uint256 currUnderlyingPrice = averagePrice(oraclePrices[j]);

            // don't include periods that have no trades
            if (tracerPrices[j].trades == 0) {
                continue;
            } else {
                totalDerivativeTimeWeight += currTimeWeight;
                cumulativeDerivative += currTimeWeight * currDerivativePrice;
            }

            // don't include periods that have no trades
            if (oraclePrices[j].trades == 0) {
                continue;
            } else {
                totalUnderlyingTimeWeight += currTimeWeight;
                cumulativeUnderlying += currTimeWeight * currUnderlyingPrice;
            }
        }

        return
            TWAP(
                cumulativeUnderlying / totalUnderlyingTimeWeight,
                cumulativeDerivative / totalDerivativeTimeWeight
            );
    }

    // TODO test these
    /**
     * @notice Calculates and returns the effect of the funding rate to a position.
     * @param position Position of the user
     * @param globalRate Global funding rate in current instance
     * @param userRate Last updated user funding rate
     */
    function applyFunding(
        Balances.Position memory position,
        FundingRateInstant memory globalRate,
        FundingRateInstant memory userRate
    ) internal pure returns (Balances.Position memory) {
        // quote after funding rate applied = quote -
        //        (cumulativeGlobalFundingRate - cumulativeUserFundingRate) * base
        return
            Balances.Position(
                position.quote -
                    PRBMathSD59x18.mul(
                        globalRate.cumulativeFundingRate -
                            userRate.cumulativeFundingRate,
                        position.base
                    ),
                position.base
            );
    }

    function applyInsurance(
        Balances.Position memory userPosition,
        Balances.Position memory insurancePosition,
        FundingRateInstant memory globalRate,
        FundingRateInstant memory userRate,
        uint256 totalLeveragedValue
    )
        internal
        pure
        returns (Balances.Position memory, Balances.Position memory)
    {
        int256 insuranceDelta =
            PRBMathSD59x18.mul(
                globalRate.fundingRate - userRate.fundingRate,
                int256(totalLeveragedValue)
            );

        if (insuranceDelta > 0) {
            Balances.Position memory newUserPos =
                Balances.Position(
                    userPosition.quote - insuranceDelta,
                    userPosition.base
                );

            Balances.Position memory newInsurancePos =
                Balances.Position(
                    insurancePosition.quote + insuranceDelta,
                    insurancePosition.base
                );

            return (newUserPos, newInsurancePos);
        } else {
            return (userPosition, insurancePosition);
        }
    }
}
