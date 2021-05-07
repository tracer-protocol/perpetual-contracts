// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "../Interfaces/Types.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

library Balances {
    using LibMath for uint256;
    using LibMath for int256;
    using PRBMathSD59x18 for int256;
    using PRBMathUD60x18 for uint256;

    uint256 private constant MARGIN_MUL_FACTOR = 10000; // Factor to keep precision in base calcs
    uint256 private constant FEED_UNIT_DIVIDER = 10e7; // used to normalise gas feed prices for base calcs

    /**
     * @notice Calculates the new base and position given trade details. Assumes the entire trade will execute
               to calculate the new base and position.
     * @param currentBase the users current base account balance
     * @param currentQuote the users current position balance
     * @param amount the amount of positions being purchased in this trade
     * @param price the price the positions are being purchased at
     * @param side the side of the order (true for LONG, false for SHORT)
     * @param feeRate the current fee rate of the tracer contract the calc is being run for
     */
    function safeCalcTradeMargin(
        int256 currentBase,
        int256 currentQuote,
        uint256 amount,
        uint256 price,
        bool side,
        uint256 feeRate
    ) internal pure returns (int256 _currentBase, int256 _currentQuote) {
        // Get base change and fee if present
        // todo CASTING CHECK
        int256 baseChange = PRBMathUD60x18.mul(amount, price).toInt256();
        // todo fee rate must be a WAD
        int256 fee = PRBMathSD59x18.mul(baseChange, feeRate.toInt256());
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
    */
    function calcMarginPositionValue(
        int256 base,
        int256 position,
        uint256 price
    ) internal pure returns (int256 _baseCorrectUnits, int256 _positionValue) {
        int256 positionValue = 0;

        // todo it appears both of the below params can be uints?
        positionValue = PRBMathSD59x18.mul(PRBMathSD59x18.abs(position), price.toInt256());
        return (base, positionValue);
    }

    /**
     * @notice Calculates the marign as base + quote * quote_price
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     * @param base The base units
     */
    function calcMargin(
        int256 quote, //10^18
        uint256 price, //10^18
        int256 base //10^18
    ) internal pure returns (int256) {
        // base + quote * price using WAD maths
        return base + PRBMathSD59x18.mul(quote, price.toInt256());
    }

    /**
     * @notice Calculates what the minimum margin should be given a certain position
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     * @param base The base units
     * @param liquidationGasCost The cost to perform a liquidation
     * @param maxLeverage The maximum ratio of notional value/margin
     */
    function calcMinMargin(
        int256 quote, // 10^18
        uint256 price, // 10^8
        int256 base,  // 10^18
        uint256 liquidationGasCost, // USD/GAS 10^18
        uint256 maxLeverage
    ) internal pure returns (uint256) {
        uint256 leveragedNotionalValue = newCalcLeveragedNotionalValue(quote, price, base);
        uint256 notionalValue = calcNotionalValue(quote, price);

        if (leveragedNotionalValue == 0 && quote >= 0) {
            // Over collateralised
            return 0;
        }
        // LGC * 6 + notionalValue/maxLeverage
        uint256 lgc = liquidationGasCost * 6; // 10^18
         uint256 baseMinimum = PRBMathUD60x18.div(notionalValue, maxLeverage);
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
        uint256 price, // 10^18
        int256 base // 10^18
    ) internal pure returns (uint256) {
        uint256 notionalValue = calcNotionalValue(quote, price);
        int256 margin = calcMargin(quote, price, base);
        // todo margin should be greater than minMargin for valid positions.
        // ensure this is safe
        uint256 _margin = margin > 0 ? uint(margin) : uint(0);
        return notionalValue - _margin;
    }

    /**
     * @notice Calculates the notional value. i.e. the absolute value of a position
     * @param quote The amount of quote units
     * @param price The price of the quote asset
     */
    function calcNotionalValue(
        int256 quote,
        uint256 price
    ) internal pure returns (uint256) {
        // todo CASTING CHECK
        uint256 _quote = uint256(PRBMathSD59x18.abs(quote));
        return PRBMathUD60x18.mul(_quote, price);
    }
}
