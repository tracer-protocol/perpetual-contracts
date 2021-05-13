//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../lib/LibPerpetuals.sol";
import "../lib/LibPrices.sol";

interface Types {
    struct FundingRate {
        uint256 timestamp;
        int256 fundingRate;
        int256 cumulativeFundingRate;
    }

    struct PricesMetrics {
        Prices.PriceInstant[24] hourlyTracerPrices;
        Prices.PriceInstant[24] hourlyOraclePrices;
    }

    struct SignedLimitOrder {
        Perpetuals.Order order;
        uint256 nonce;
        bytes32 sigR;
        bytes32 sigS;
        uint8 sigV;
    }
}
