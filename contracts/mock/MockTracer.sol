//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;


/**
* This contract is a mock ONLY.
* it may be used in testing of other components that rely on certain
* getter functions implemented by the Tracer contract
*/
contract MockTracer {

    uint256 _amount;
    uint256 _filled;
    int256 _price;
    bool _side;
    address _maker;
    uint256 _takerAmount;
    uint256 _priceMultiplier;

    constructor(
        uint256 amount,
        uint256 filled,
        int256 price,
        bool side,
        address maker,
        uint256 takerAmount,
        uint256 priceMul
    ) public {
        _amount = amount;
        _filled = filled;
        _price = price;
        _side = side;
        _maker = maker;
        _takerAmount = takerAmount;
        _priceMultiplier = priceMul;
    }

    /**
     * @notice gets a order placed on chain
     * @return the order amount, amount filled, price and the side of an order
     */
    function getOrder(uint256 orderId)
        external
        view
        returns (
            uint256,
            uint256,
            int256,
            bool,
            address
        )
    {
        return (_amount, _filled, _price, _side, _maker);
    }

    /**
     * @notice gets the amount taken by a taker against an order
     * @return the amount taken by a set taker
     */
    function getOrderTakerAmount(uint256 orderId, address taker) external view returns (uint256) {
        return(_takerAmount);
    }

    function priceMultiplier() external view returns (uint256) {
        return _priceMultiplier;
    }

}
