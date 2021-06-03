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

    /**
     * TODO Test in E2E context
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
        if (poolTarget == 0) {
            return lowestMaxLeverage;
        }
        uint256 percentFull = PRBMathUD60x18.div(collateralAmount, poolTarget);
        percentFull = percentFull * 100; // To bring it up to the same percentage units as everything else

        if (percentFull >= deleveragingCliff) {
            return defaultMaxLeverage;
        }

        if (percentFull <= insurancePoolSwitchStage) {
            return lowestMaxLeverage;
        }

        if (deleveragingCliff == insurancePoolSwitchStage) {
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
        uint256 gradientDenominator =
            deleveragingCliff - insurancePoolSwitchStage;
        uint256 maxLeverageNotBumped =
            PRBMathUD60x18.mul(
                PRBMathUD60x18.div(gradientNumerator, gradientDenominator), // m
                percentFull // x
            );
        uint256 b =
            lowestMaxLeverage -
                PRBMathUD60x18.div(
                    defaultMaxLeverage - lowestMaxLeverage,
                    deleveragingCliff - insurancePoolSwitchStage
                );
        uint256 realMaxLeverage = maxLeverageNotBumped + b; // mx + b

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
