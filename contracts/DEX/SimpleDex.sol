//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "../lib/LibMath.sol";
import "../Interfaces/Types.sol";
import "../Interfaces/IDex.sol";

/**
 * SimpleDex Contract: Implements the Tracer make/take without underlying
 * management checks.
 */
contract SimpleDex is IDex {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;

    // Order counter starts at 1 due to logic in Trader.sol
    uint256 public orderCounter = 1;
    mapping(uint256 => Types.Order) public orders;
    mapping(bytes32 => uint256) public override orderIdByHash;

    /**
     * @notice Places an on chain order via a permissioned contract, fillable by any part on chain.
     * @param amount the amount of Tracers to buy
     * @param price the price in dollars to buy the tracer at
     * @param side the side of the order. True for long, false for short.
     * @param expiration the expiry time for this order
     * @param maker the makers address for this order to be associated with
     */
    function _makeOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration,
        address maker
    ) internal returns (uint256) {
        //Create unfilled order
        Types.Order storage order = orders[orderCounter];
        order.maker = maker;
        order.amount = amount;
        order.price = price;
        order.side = side;
        order.expiration = expiration;
        order.creation = block.timestamp;
        //Map order hash to id
        orderIdByHash[hashOrder(amount, price, side, expiration, maker)] = orderCounter; 
        orderCounter++;
        return orderCounter - 1;
    }

    /**
    * @notice Takes an on chain order via a permissioned contract, in whole or in part. Order is executed at the markets
              defined price.
    * @param orderId the ID of the order to be filled. Emitted in the makeOrder function
    * @param amount the amount of the order to fill
    * @param _taker the address of the taker which this order is associated with
    */
    function _takeOrder(
        uint256 orderId,
        uint256 amount,
        address _taker
    )
        internal
        returns (
            Types.Order memory,
            uint256,
            uint256,
            address
        )
    {
        //Fill or partially fill order
        Types.Order storage order = orders[orderId];
        require(order.amount.sub(order.filled) > 0, "SDX: Order filled");
        /* solium-disable-next-line */
        require(block.timestamp < order.expiration, "SDX: Order expired");

        //Calculate the amount to fill
        uint256 fillAmount = (amount > order.amount.sub(order.filled)) ? order.amount.sub(order.filled) : amount;

        //Update order
        order.filled = order.filled.add(fillAmount);
        order.takers[_taker] = order.takers[_taker].add(fillAmount);

        uint256 amountOutstanding = order.amount.sub(order.filled);
        return (order, fillAmount, amountOutstanding, order.maker);
    }

    /**
    * @notice Matches two orders that have already both been made. Has the same
    *         validation as takeOrder 
    */
    function _matchOrder(
        uint256 order1Id,
        uint256 order2Id
    ) internal returns (uint256) {

        // Fill or partially fill order
        Types.Order storage order1 = orders[order1Id];
        Types.Order storage order2 = orders[order2Id];

        // Ensure orders can be cancelled against each other
        require(order1.price == order2.price, "SDX: Price mismatch");

        // Ensure orders are for opposite sides
        require(order1.side != order2.side, "SDX: Same side");
        
        /* solium-disable-next-line */
        require(block.timestamp < order1.expiration &&
            block.timestamp < order2.expiration, "SDX: Order expired");

        // Calculate the amount to fill
        uint256 order1Remaining = order1.amount.sub(order1.filled);
        uint256 order2Remaining = order2.amount.sub(order2.filled);

        // fill amount is the minimum of order 1 and order 2
        uint256 fillAmount = order1Remaining > order2Remaining ? order2Remaining : order1Remaining;

        //Update orders
        order1.filled = order1.filled.add(fillAmount);
        order2.filled = order2.filled.add(fillAmount);
        order1.takers[order2.maker] = order1.takers[order2.maker].add(fillAmount);
        order2.takers[order1.maker] = order2.takers[order1.maker].add(fillAmount);
        return (fillAmount);
    }

    /**
     * @notice hashes a limit order type in order to lookup via hash
     * @return an simple hash of order data
     */
    function hashOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration,
        address user
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(amount, price, side, user, expiration)
            );
    }
}