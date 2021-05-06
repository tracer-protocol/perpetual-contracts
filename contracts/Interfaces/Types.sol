//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface Types {

    struct AccountBalance {
        int256 base; // The amount of units in the base asset
        int256 quote; // The amount of units in the quote asset
        uint256 totalLeveragedValue;
        uint256 lastUpdatedIndex;
        uint256 lastUpdatedGasPrice;
    }

    struct FundingRate {
        uint256 recordTime;
        uint256 recordPrice;
        int256 fundingRate; //positive value = longs pay shorts
        int256 fundingRateValue; //previous rate + (time diff * price * rate)
    }

    struct Order {
        address maker;
        uint256 amount;
        uint256 price;
        uint256 filled;
        bool side; //true for long, false for short
        uint256 expiration;
        uint256 creation;
        address targetTracer;
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
        Order order;
        uint256 nonce;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }


}