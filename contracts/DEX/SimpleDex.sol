//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "../lib/LibMath.sol";
import "../Interfaces/Types.sol";

/**
 * SimpleDex Contract: Implements the Tracer make/take without underlying
 * management checks.
 */
contract SimpleDex {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;

    //State variables
    uint256 public orderCounter = 0;
    mapping(uint256 => Types.Order) public orders;


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
        orders[orderCounter] = Types.Order(maker, amount, price, 0, side, expiration, block.timestamp);
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
    ) internal returns (Types.Order memory, uint256, uint256, address) {
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
}
