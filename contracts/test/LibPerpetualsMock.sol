pragma solidity ^0.8.0;

import "../lib/LibPerpetuals.sol";

contract PerpetualsMock {
    function orderId(Perpetuals.Order memory order)
        external
        pure
        returns (bytes32)
    {
        return Perpetuals.orderId(order);
    }

    function calculateTrueMaxLeverage(
        uint256 collateralAmount,
        uint256 poolTarget,
        uint256 baseMaxLeverage,
        uint256 lowestMaxLeverage,
        uint256 deleveragingCliff,
        uint256 insurancePoolSwitchStage
    ) external pure returns (uint256) {
        return
            Perpetuals.calculateTrueMaxLeverage(
                collateralAmount,
                poolTarget,
                baseMaxLeverage,
                lowestMaxLeverage,
                deleveragingCliff,
                insurancePoolSwitchStage
            );
    }

    function canMatch(
        Perpetuals.Order calldata a,
        uint256 aFilled,
        Perpetuals.Order calldata b,
        uint256 bFilled
    ) external view returns (bool) {
        return Perpetuals.canMatch(a, aFilled, b, bFilled);
    }
}
