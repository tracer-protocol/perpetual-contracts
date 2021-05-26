pragma solidity ^0.8.0;

import "../lib/LibPerpetuals.sol";

contract LibPerpetualsMock {
    function orderId(Perpetuals.Order memory order) external returns (bytes32) {
        return Perpetuals.orderId(order);
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
