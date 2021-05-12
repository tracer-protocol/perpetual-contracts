//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../lib/LibPerpetuals.sol";

interface Types {
    struct FundingRate {
        uint256 recordTime;
        uint256 recordPrice;
        int256 fundingRate; //positive value = longs pay shorts
        int256 fundingRateValue; //previous rate + (time diff * price * rate)
    }

    struct HourlyPrices {
        uint256 totalPrice;
        uint256 numTrades;
    }

    struct PricingMetrics {
        Types.HourlyPrices[24] hourlyTracerPrices;
        Types.HourlyPrices[24] hourlyOraclePrices;
    }

    struct SignedLimitOrder {
        Perpetuals.Order order;
        uint256 nonce;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }
}
