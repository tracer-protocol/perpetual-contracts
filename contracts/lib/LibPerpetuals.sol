//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "prb-math/contracts/PRBMathUD60x18.sol";

library Perpetuals {
    enum Side {Long, Short}

    struct Order {
        address maker;
        address market;
        uint256 price;
        uint256 amount;
        Side side;
        uint256 expires;
        uint256 created;
    }

    function orderId(Order memory order) internal pure returns (bytes32) {
        return keccak256(abi.encode(order));
    }

    function calculateTrueMaxLeverage(
        uint256 collateralAmount,
        uint256 poolTarget,
        uint256 defaultMaxLeverage,
        uint256 lowestMaxLeverage,
        uint256 deleveragingCliff
    ) internal pure returns (uint256) {
        if (poolTarget == 0) {
            return lowestMaxLeverage;
        }
        uint256 percentFull = PRBMathUD60x18.div(collateralAmount, poolTarget);

        if (percentFull > deleveragingCliff) {
            return defaultMaxLeverage;
        }

        // Linear function intercepting points (1, 0) and (INSURANCE_DELEVERAGING_CLIFF, defaultMaxLeverage)
        // Where the x axis is how full the insurance pool is as a percentage,
        // and the y axis is max leverage.
        // y = mx + b,
        // where m = (x2 - x1) / (y2 - y1) = (defaultMaxLeverage - lowestMaxLeverage)/(DELEVERAGING_CLIFF - 0)
        //       x = percentFull
        //       b = lowestMaxLeverage (since lowestMaxLeverage is the y-intercept)
        // m was reached as that is the formula for calculating the gradient of a linear function
        // (defaultMaxLeverage - LowestMaxLeverage)/cliff * percentFull + lowestMaxLeverage

        uint256 maxLeverageDifference = defaultMaxLeverage - lowestMaxLeverage;
        uint256 maxLeverageNotBumped =
            PRBMathUD60x18.mul(
                PRBMathUD60x18.div(maxLeverageDifference, deleveragingCliff),
                percentFull
            );
        uint256 realMaxLeverage = maxLeverageNotBumped + lowestMaxLeverage;

        return realMaxLeverage;
    }

    function canMatch(
        Order calldata a,
        uint256 aFilled,
        Order calldata b,
        uint256 bFilled
    ) public view returns (bool) {
        uint256 currentTime = block.timestamp;

        /* predicates */
        bool pricesMatch = a.price == b.price;
        bool opposingSides = a.side != b.side;
        bool notExpired = currentTime < a.expires && currentTime < b.expires;
        bool notFilled = aFilled < a.amount && bFilled < b.amount;
        bool createdBefore =
            currentTime >= a.created && currentTime >= b.created;

        return
            pricesMatch &&
            opposingSides &&
            notExpired &&
            notFilled &&
            createdBefore;
    }
}
