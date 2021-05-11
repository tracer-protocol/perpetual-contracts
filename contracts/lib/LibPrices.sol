//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library Prices {
    struct FundingRateInstant {
        uint256 timestamp;
        int256 fundingRate;
        int256 cumulativeFundingRate;
    }
}
