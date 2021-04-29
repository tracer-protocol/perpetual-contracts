
library LibLiquidation {

    struct LiquidationReceipt {
        address tracer;
        address liquidator;
        address liquidatee;
        int256 price;
        uint256 time;
        uint256 escrowedAmount;
        uint256 releaseTime;
        int256 amountLiquidated;
        bool escrowClaimed;
        bool liquidationSide;
        bool liquidatorRefundClaimed;
    }

    function calcEscrowLiquidationAmount(
        int256 minMargin,
        int256 currentMargin,
    ) internal pure returns (int256) {
        int256 amountToEscrow = currentMargin.sub(minMargin.sub(currentMargin));
        if (amountToEscrow < 0) {
            return 0;
        }
        return uint256(amountToEscrow);
    }
}