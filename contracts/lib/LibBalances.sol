// SPDX-License-Identifier: GPL-3.0-or-later
pragma experimental ABIEncoderV2;
pragma solidity ^0.6.12;

import "./LibMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "../Interfaces/Types.sol";

library Balances {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;

    int256 private constant MARGIN_MUL_FACTOR = 10000; // Factor to keep precision in base calcs
    uint256 private constant FEED_UNIT_DIVIDER = 10e7; // used to normalise gas feed prices for base calcs

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
        int256 baseChange = (amount.toInt256().mul(price.abs())).div(priceMultiplier.toInt256());
        int256 fee = (baseChange.mul(feeRate.toInt256())).div(priceMultiplier.toInt256());
        if (side) {
            // LONG
            currentQuote = currentQuote.add(amount.toInt256());
            currentBase = currentBase.sub(baseChange.add(fee));
        } else {
            // SHORT
            currentQuote = currentQuote.sub(amount.toInt256());
            currentBase = currentBase.add(baseChange.sub(fee));
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

        baseCorrectUnits = base.abs().mul(priceMultiplier.toInt256().mul(MARGIN_MUL_FACTOR));
        positionValue = position.abs().mul(price);

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
        return (quote.abs().mul(price).div(priceMultiplier.toInt256())).sub(deposited.toInt256());
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
        return ((base.mul(priceMultiplier.toInt256())).add(quote.mul(price))).div(priceMultiplier.toInt256());
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
        int256 lgc = liquidationGasCost.mul(6); // 10^18
        // 10^26 * 10^4 / 10^4 / 10^8 = 10^18
        int256 baseMinimum = notionalValue.mul(MARGIN_MUL_FACTOR).div(maxLeverage).div(priceMultiplier.toInt256());
        return lgc.add(baseMinimum);
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
        int256 LNV = notionalValue.sub(margin.mul(priceMultiplier.toInt256())).div(priceMultiplier.toInt256());
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
        return quote.mul(price); // 10^18 * 10^8 = 10^26
    }
}
