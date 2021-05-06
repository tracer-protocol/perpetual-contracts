//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library Perpetuals {
    enum Side {
        Long,
        Short
    }
    
    struct Order {
        address maker;
        address market;
        uint256 price;
        uint256 amount;
        Side side;
        uint256 expires;
        uint256 created;
    }

    function orderId(Order calldata order) returns (bytes32) {
        return keccak256(abi.encode(order));
    }
}

