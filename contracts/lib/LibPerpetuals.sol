//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library Perpetuals {
    enum Side {
        Long,
        Short
    }
    
    struct Order {
        address maker;
        uint256 price;
        uint256 amount;
        uint256 filled;
        Side side;
        uint256 expires;
        uint256 created;
    }
    
    struct Signature {
        bytes32 r;
        bytes32 s;
        uint8 v;
    }
    
    struct LimitOrder {
        Order order;
        address market;
        uint256 nonce;
    }
    
    struct SignedLimitOrder {
        LimitOrder order;
        Signature signature;
    }
}

