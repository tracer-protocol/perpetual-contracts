//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.4;
import "prb-math/contracts/PRBMathUD60x18.sol";

library Perpetuals {
    uint256 private constant PERCENT_MULTIPLIER = 100;

    // Sides that an order can take
    enum Side {
        Long,
        Short
    }

    enum OrderMatchingResult {
        VALID,
        MARKET_MISMATCH,
        SIDE_MISMATCH,
        PRICE_MISMATCH,
        SAME_MAKER,
        EXPIRED,
        FILLED,
        INVALID_TIME,
        LONG_MARGIN,
        SHORT_MARGIN
    }

    // Information about a given order
    struct Order {
        address maker;
        address market;
        uint256 price;
        uint256 amount;
        Side side;
        uint256 expires;
        uint256 created;
    }

    /**
     * @notice Get the hash of an order from its information, used to unique identify orders
     *      in a market
     * @param order Order that we're getting the hash of
     */
    function orderId(Order memory order) internal pure returns (bytes32) {
        return keccak256(abi.encode(order));
    }

    /**
     * @return An updated average execution price, based on previous rolling average, and new average
     * @param oldFilledAmount The filled amount that will be getting changed
     * @param oldAverage The average rolling execution price that will be updated
     * @param fillChange The amount of units being added to the filledAmount
     * @param newFillExecutionPrice The execution price of the fillChange units
     */
    function calculateAverageExecutionPrice(
        uint256 oldFilledAmount,
        uint256 oldAverage,
        uint256 fillChange,
        uint256 newFillExecutionPrice
    ) internal pure returns (uint256) {
        uint256 oldFactor = PRBMathUD60x18.mul(oldFilledAmount, oldAverage);
        uint256 newFactor = PRBMathUD60x18.mul(fillChange, newFillExecutionPrice);
        uint256 newTotalAmount = oldFilledAmount + fillChange;
        if (newTotalAmount == 0) {
            return 0;
        }
        uint256 average = PRBMathUD60x18.div(oldFactor + newFactor, newTotalAmount);
        return average;
    }

    /**
     * @notice Calculate the max leverage based on how full the insurance pool is
     * @param collateralAmount Amount of collateral in insurance pool
     * @param poolTarget Insurance target
     * @param defaultMaxLeverage The max leverage assuming pool is sufficiently full
     * @param lowestMaxLeverage The lowest that max leverage can ever drop to
     * @param deleveragingCliff The point of insurance pool full-ness,
              below which deleveraging begins
     * @param insurancePoolSwitchStage The point of insurance pool full-ness,
              at or below which the insurance pool switches funding rate mechanism
     */
    function calculateTrueMaxLeverage(
        uint256 collateralAmount,
        uint256 poolTarget,
        uint256 defaultMaxLeverage,
        uint256 lowestMaxLeverage,
        uint256 deleveragingCliff,
        uint256 insurancePoolSwitchStage
    ) internal pure returns (uint256) {
        require(insurancePoolSwitchStage < deleveragingCliff, "Switch >= delevCliff");
        if (poolTarget == 0) {
            return lowestMaxLeverage;
        }

        uint256 percentFull = PRBMathUD60x18.div(collateralAmount, poolTarget);
        percentFull = percentFull * PERCENT_MULTIPLIER; // To bring it up to the same percentage units as everything else

        if (percentFull >= deleveragingCliff) {
            return defaultMaxLeverage;
        }

        if (percentFull <= insurancePoolSwitchStage) {
            return lowestMaxLeverage;
        }

        // Linear function intercepting points:
        //       (insurancePoolSwitchStage, lowestMaxLeverage) and (INSURANCE_DELEVERAGING_CLIFF, defaultMaxLeverage)
        // Where the x axis is how full the insurance pool is as a percentage,
        // and the y axis is max leverage.
        // y = mx + b,
        // where m = (y2 - y1) / (x2 - x1)
        //         = (defaultMaxLeverage - lowestMaxLeverage)/
        //           (DELEVERAGING_CLIFF - insurancePoolSwitchStage)
        //       x = percentFull
        //       b = lowestMaxLeverage -
        //           ((defaultMaxLeverage - lowestMaxLeverage) / (deleveragingCliff - insurancePoolSwitchStage))
        // m was reached as that is the formula for calculating the gradient of a linear function
        // (defaultMaxLeverage - LowestMaxLeverage)/cliff * percentFull + lowestMaxLeverage

        uint256 gradientNumerator = defaultMaxLeverage - lowestMaxLeverage;
        uint256 gradientDenominator = deleveragingCliff - insurancePoolSwitchStage;
        uint256 maxLeverageNotBumped = PRBMathUD60x18.mul(
            PRBMathUD60x18.div(gradientNumerator, gradientDenominator), // m
            percentFull // x
        );
        uint256 b = lowestMaxLeverage -
            PRBMathUD60x18.div(defaultMaxLeverage - lowestMaxLeverage, deleveragingCliff - insurancePoolSwitchStage);
        uint256 realMaxLeverage = maxLeverageNotBumped + b; // mx + b

        return realMaxLeverage;
    }

    /**
     * @notice Checks if two orders can be matched given their price, side of trade
     *  (two longs can't can't trade with one another, etc.), expiry times, fill amounts,
     *  markets being the same, makers being different, and time validation.
     * @param long The long side order
     * @param longFilled Amount of the first order that has already been filled
     * @param short The short side order
     * @param shortFilled Amount of the second order that has already been filled
     * @return OrderMatchingResult indicating if the two orders can be matched, or the reason if they can't
     */
    function canMatch(
        Order calldata long,
        uint256 longFilled,
        Order calldata short,
        uint256 shortFilled
    ) internal view returns (OrderMatchingResult) {
        uint256 currentTime = block.timestamp;

        if (long.market != short.market) {
            return OrderMatchingResult.MARKET_MISMATCH;
        } else if (long.side == short.side) {
            return OrderMatchingResult.SIDE_MISMATCH;
        }
        // long order must have a price >= short order
        else if (long.price < short.price) {
            return OrderMatchingResult.PRICE_MISMATCH;
        } else if (long.maker == short.maker) {
            return OrderMatchingResult.SAME_MAKER;
        } else if (currentTime > long.expires || currentTime > short.expires) {
            return OrderMatchingResult.EXPIRED;
        } else if (longFilled >= long.amount || shortFilled >= short.amount) {
            return OrderMatchingResult.FILLED;
        } else if (currentTime < long.created || currentTime < short.created) {
            return OrderMatchingResult.INVALID_TIME;
        } else {
            return OrderMatchingResult.VALID;
        }
    }

    /**
     * @notice Gets the execution price of two orders, given their creation times
     * @param a The first order
     * @param b The second order
     * @return Price that the orders will be executed at
     */
    function getExecutionPrice(Order memory a, Order memory b) internal pure returns (uint256) {
        bool aIsFirst = a.created <= b.created;
        if (aIsFirst) {
            return a.price;
        } else {
            return b.price;
        }
    }
}
