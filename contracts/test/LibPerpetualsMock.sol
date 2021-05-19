pragma solidity ^0.8.0;

import "../lib/LibPerpetuals.sol";

contract LibPerpetualsMock {
    function canMatch(
        Perpetuals.Order calldata a,
        uint256 aFilled,
        Perpetuals.Order calldata b,
        uint256 bFilled
    ) public view returns (bool) {
        return Perpetuals.canMatch(a, aFilled, b, bFilled);
    }
}
