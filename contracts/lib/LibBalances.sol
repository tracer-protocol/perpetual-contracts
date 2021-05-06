//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "./LibPerpetuals.sol";

library Balances {
    using LibMath for int256;

    struct Position {
        int256 base;
        int256 quote;
    }

    struct Trade {
        uint256 price;
        uint256 amount;
        Perpetuals.Side side;
    }

    function netValue(
        Position calldata position,
        uint256 price
    ) public pure returns (uint256) {
        /* cast is safe due to semantics of `abs` */
        return uint256(position.quote.abs()) * price;
    }
}

