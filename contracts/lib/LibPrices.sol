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
}
