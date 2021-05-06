//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibPerpetuals.sol";

library Balances {
    struct Position {
        int256 base;
        int256 quote;
    }

    struct Trade {
        uint256 price;
        uint256 amount;
        Perpetuals.Side side;
    }
}

