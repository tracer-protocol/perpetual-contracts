// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "../Interfaces/Types.sol";

library Balances {
    using LibMath for uint256;
    using LibMath for int256;

    int256 private constant MARGIN_MUL_FACTOR = 10000; // Factor to keep precision in base calcs
    uint256 private constant FEED_UNIT_DIVIDER = 10e7; // used to normalise gas feed prices for base calcs
    uint256 private constant MAX_DECIMALS = 18;

    /**
     * @notice Calculates the new base and position given trade details. Assumes the entire trade will execute
               to calculate the new base and position.
     * @param currentBase the users current base account balance
     * @param currentQuote the users current position balance
     * @param amount the amount of positions being purchased in this trade
     * @param price the price the positions are being purchased at
     * @param side the side of the order (true for LONG, false for SHORT)
     * @param priceMultiplier the price multiplier used for the tracer contract the calc is being run for
     * @param feeRate the current fee rate of the tracer contract the calc is being run for
     */
    function safeCalcTradeMargin(
        int256 currentBase,
        int256 currentQuote,
        uint256 amount,
        int256 price,
        bool side,
        uint256 priceMultiplier,
        uint256 feeRate
    ) internal pure returns (int256 _currentBase, int256 _currentQuote) {
        // Get base change and fee if present
        int256 baseChange = (amount.toInt256() * price.abs()) / priceMultiplier.toInt256();
        int256 fee = (baseChange * feeRate.toInt256()) / priceMultiplier.toInt256();
        if (side) {
            // LONG
            currentQuote = currentQuote + amount.toInt256();
            currentBase = currentBase - baseChange + fee;
        } else {
            // SHORT
            currentQuote = currentQuote - amount.toInt256();
            currentBase = currentBase + baseChange - fee;
        }

        return (currentBase, currentQuote);
    }


    /**
     * @notice calculates the net value of both the users base and position given a
     *         price and price multiplier.
     * @param base the base of a user
     * @param position the position of a user
     * @param price the price for which the value is being calculated at
     * @param priceMultiplier the multiplier value used for the price being referenced
    */
    function calcMarginPositionValue(
        int256 base,
        int256 position,
        int256 price,
        uint256 priceMultiplier
    ) internal pure returns (int256 _baseCorrectUnits, int256 _positionValue) {
        int256 baseCorrectUnits = 0;
        int256 positionValue = 0;

        baseCorrectUnits = base.abs() * priceMultiplier.toInt256() * MARGIN_MUL_FACTOR;
        positionValue = position.abs() * price;

        return (baseCorrectUnits, positionValue);
    }

    /**
     * @dev deprecated
     * @notice Calculates an accounts leveraged notional value
     * @param quote the quote assets of a user
     * @param deposited the amount of funds a user has deposited
     * @param price the fair rice for which the value is being calculated at
     * @param priceMultiplier the multiplier value used for the price being referenced
     */
    function calcLeveragedNotionalValue(
        int256 quote,
        int256 price,
        uint256 deposited,
        uint256 priceMultiplier
    ) internal pure returns (int256) {
        // quote * price - deposited
        return ((quote.abs() * price) / priceMultiplier.toInt256()) - deposited.toInt256();
    }

    /**
     * @notice Calculates the marign as base + quote * quote_price
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     * @param base The base units
     * @param priceMultiplier The multiplier for the price feed
     */
    function calcMargin(
        int256 quote,
        int256 price,
        int256 base,
        uint256 priceMultiplier
    ) internal pure returns (int256) {
        // (10^18 * 10^8 + 10^18 * 10^8) / 10^8
        // (10^26 + 10^26) / 10^8
        // 10^18
        return (((base * priceMultiplier.toInt256())) + quote * price) / priceMultiplier.toInt256();
    }

    /*
     * @notice Calculates what the minimum margin should be given a certain position
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     * @param base The base units
     * @param liquidationGasCost The cost to perform a liquidation
     * @param maxLeverage The maximum ratio of notional value/margin
     */
    function calcMinMargin(
        int256 quote, // 10^18
        int256 price, // 10^8
        int256 base,  // 10^18
        int256 liquidationGasCost, // USD/GAS 10^18
        int256 maxLeverage,
        uint256 priceMultiplier
    ) internal pure returns (int256) {
        int256 leveragedNotionalValue = newCalcLeveragedNotionalValue(quote, price, base, priceMultiplier);
        int256 notionalValue = calcNotionalValue(quote, price);

        if (leveragedNotionalValue <= 0 && quote >= 0) {
            // Over collateralised
            return 0;
        }
        // LGC * 6 + notionalValue/maxLeverage
        int256 lgc = liquidationGasCost * 6; // 10^18
        // 10^26 * 10^4 / 10^4 / 10^8 = 10^18
        int256 baseMinimum = (notionalValue * MARGIN_MUL_FACTOR / maxLeverage) / priceMultiplier.toInt256();
        return lgc + baseMinimum;
    }

    /**
     * @notice Calculates Leveraged Notional Value, a.k.a the borrowed amount
     *         The difference between the absolute value of the position and the margin
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     * @param base The base units
     */
    function newCalcLeveragedNotionalValue(
        int256 quote, // 10^18
        int256 price, // 10^8
        int256 base, // 10^18
        uint256 priceMultiplier // 10^8
    ) internal pure returns (int256) {
        int256 notionalValue = calcNotionalValue(quote, price);
        int256 margin = calcMargin(quote, price, base, priceMultiplier);
        int256 LNV = (notionalValue - margin * priceMultiplier.toInt256()) / priceMultiplier.toInt256();
        if (LNV < 0) {
            LNV = 0;
        }
        return LNV;
    }

    /**
     * @notice Calculates the notional value. i.e. the absolute value of a position
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     */
    function calcNotionalValue(
        int256 quote,
        int256 price
    ) internal pure returns (int256) {
        quote = quote.abs();
        return quote * price; // 10^18 * 10^8 = 10^26
    }

    /**
    * @notice converts a raw token amount to its WAD representation. Used for tokens
    * that don't have 18 decimal places
    */
    function tokenToWad(uint256 tokenDecimals, uint256 amount) internal pure returns (int256) {
        int scaler = int256(10**(MAX_DECIMALS - tokenDecimals));
        return amount.toInt256() * scaler;
    }

    /**
    * @notice converts a wad token amount to its raw representation.
    */
    function wadToToken(uint256 tokenDecimals, uint256 wadAmount) internal pure returns (uint256) {
        require(wadAmount >= 0, "LBS: wadAmount<0");
        int scaler = int256(10**(MAX_DECIMALS - tokenDecimals));
        return uint(wadAmount / scaler);
    }
}
