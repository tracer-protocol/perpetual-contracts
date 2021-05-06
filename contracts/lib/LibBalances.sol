//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "./LibPerpetuals.sol";

library Balances {
    using LibMath for int256;

    struct Position {
        int256 base;
        int256 quote;
    }

    struct Trade {
        uint256 price;
        uint256 amount;
        Perpetuals.Side side;
    }

    function netValue(
        Position calldata position,
        uint256 price
    ) public pure returns (uint256) {
        /* cast is safe due to semantics of `abs` */
        return uint256(position.quote.abs()) * price;
    }

    function margin(
        Position calldata position,
        uint256 price
    ) public pure returns (int256) {
        /*
         * A cast *must* occur somewhere here in order for this to type check.
         *
         * After you've convinced yourself of this, the next intellectual jump
         * that needs to be made is *what* to cast. We can't cast `base` as it's
         * allowed to be negative. We can't cast `quote` as it's allowed to be
         * negative. Thus, by elimination, the only thing we're left with is
         * `price`.
         *
         * `price` has type `uint256` (i.e., it's unsigned). Thus, our below
         * cast **will** throw iff. `price >= type(int256).max()`.
         */
        int256 signedPrice = LibMath.toInt256(price);
        return position.quote + position.base * signedPrice;
    }

    function leveragedNotionalValue(
        Position calldata position,
        uint256 price
    ) public pure returns (uint256) {
        uint256 notionalValue = netValue(position, price);
        int256 marginValue = margin(position, price);

        int256 signedNotionalValue = LibMath.toInt256(notionalValue);

        if (signedNotionalValue - marginValue < 0) {
            return 0;
        } else {
            return uint256(signedNotionalValue - marginValue);
        }
    }

    function minimumMargin(
        Position calldata position,
        uint256 price,
        uint256 liquidationCost,
        uint256 maximumLeverage
    ) public pure returns (uint256) {
        uint256 notionalValue = netValue(position, price);

        uint256 liquidationGasCost = liquidationCost * 6;
        
        uint256 minimumBase = notionalValue / maximumLeverage;

        return liquidationGasCost + minimumBase;
    }

    function applyTrade(
        Position calldata position,
        Trade calldata trade,
        uint256 feeRate
    ) public pure returns (Position memory) {
        int256 signedAmount = LibMath.toInt256(trade.amount);
        int256 signedPrice = LibMath.toInt256(trade.price);
        int256 signedFeeRate = LibMath.toInt256(feeRate);

        int256 baseChange = signedAmount * signedPrice;
        int256 fee = baseChange * signedFeeRate;

        int256 newBase = 0;
        int256 newQuote = 0;

        if (trade.side == Perpetuals.Side.Long) {
            newQuote = position.quote + signedAmount;
            newBase = position.base - baseChange + fee;
        } else if (trade.side == Perpetuals.Side.Short) {
            newQuote = position.quote - signedAmount;
            newBase = position.base + baseChange - fee;
        }

        Position memory newPosition = Position(newBase, newQuote);

        return newPosition;
    }
}

