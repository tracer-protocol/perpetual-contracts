//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "../Interfaces/Types.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "./LibPerpetuals.sol";

library Balances {
    using LibMath for int256;
    using LibMath for uint256;
    using PRBMathSD59x18 for int256;
    using PRBMathUD60x18 for uint256;

    uint256 public constant MAX_DECIMALS = 18;

    struct Position {
        int256 quote;
        int256 base;
    }

    struct Trade {
        uint256 price;
        uint256 amount;
        Perpetuals.Side side;
    }

    struct Account {
        Position position;
        uint256 totalLeveragedValue;
        uint256 lastUpdatedIndex;
        uint256 lastUpdatedGasPrice;
    }

    function netValue(Position calldata position, uint256 price)
        public
        pure
        returns (uint256)
    {
        /* cast is safe due to semantics of `abs` */
        return PRBMathUD60x18.mul(uint256(LibMath.abs(position.base)), price);
    }

    /**
     * @notice Calculates the margin as quote + base * base_price
     * @param position the position the account is currently in
     * @param price The price of the base asset
     */
    function margin(Position calldata position, uint256 price)
        public
        pure
        returns (int256)
    {
        /*
         * A cast *must* occur somewhere here in order for this to type check.
         *
         * After you've convinced yourself of this, the next intellectual jump
         * that needs to be made is *what* to cast. We can't cast `quote` as it's
         * allowed to be negative. We can't cast `base` as it's allowed to be
         * negative. Thus, by elimination, the only thing we're left with is
         * `price`.
         *
         * `price` has type `uint256` (i.e., it's unsigned). Thus, our below
         * cast **will** throw iff. `price >= type(int256).max()`.
         */
        int256 signedPrice = LibMath.toInt256(price);
        return position.quote + PRBMathSD59x18.mul(position.base, signedPrice);
    }

    /**
     * @notice Calculates the notional value. i.e. the absolute value of a position
     * @param position The position the account is currently in
     * @param price The price of the base asset
     */
    function leveragedNotionalValue(Position calldata position, uint256 price)
        public
        pure
        returns (uint256)
    {
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

        // There should be no Minimum margin when user has no position
        if (notionalValue == 0) {
            return 0;
        }

        uint256 liquidationGasCost = liquidationCost * 6;

        uint256 minimumMarginWithoutGasCost = notionalValue / maximumLeverage;

        return liquidationGasCost + minimumMarginWithoutGasCost;
    }

    function applyTrade(
        Position calldata position,
        Trade calldata trade,
        uint256 feeRate
    ) public pure returns (Position memory) {
        int256 signedAmount = LibMath.toInt256(trade.amount);
        int256 signedPrice = LibMath.toInt256(trade.price);
        int256 signedFeeRate = LibMath.toInt256(feeRate);

        int256 quoteChange = PRBMathSD59x18.mul(signedAmount, signedPrice);
        int256 fee = PRBMathSD59x18.mul(quoteChange, signedFeeRate);

        int256 newQuote = 0;
        int256 newBase = 0;

        if (trade.side == Perpetuals.Side.Long) {
            newBase = position.base + signedAmount;
            newQuote = position.quote - quoteChange + fee;
        } else if (trade.side == Perpetuals.Side.Short) {
            newBase = position.base - signedAmount;
            newQuote = position.quote + quoteChange - fee;
        }

        Position memory newPosition = Position(newQuote, newBase);

        return newPosition;
    }

    /**
     * @notice converts a raw token amount to its WAD representation. Used for tokens
     * that don't have 18 decimal places
     */
    function tokenToWad(uint256 tokenDecimals, uint256 amount)
        internal
        pure
        returns (int256)
    {
        int256 scaler = int256(10**(MAX_DECIMALS - tokenDecimals));
        return amount.toInt256() * scaler;
    }

    /**
     * @notice converts a wad token amount to its raw representation.
     */
    function wadToToken(uint256 tokenDecimals, uint256 wadAmount)
        internal
        pure
        returns (uint256)
    {
        uint256 scaler = uint256(10**(MAX_DECIMALS - tokenDecimals));
        return uint256(wadAmount / scaler);
    }
}
