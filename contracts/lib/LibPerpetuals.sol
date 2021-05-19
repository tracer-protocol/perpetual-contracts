//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

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

    function orderId(Order calldata order) public pure returns (bytes32) {
        return keccak256(abi.encode(order));
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
        bool createdBefore = currentTime >= a.created && currentTime >= b.created;

        return
            pricesMatch &&
            opposingSides &&
            notExpired &&
            notFilled &&
            createdBefore;
    }
}
