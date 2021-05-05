// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";

library LibLiquidation {
    using LibMath for uint256;
    using LibMath for int256;
    int256 private constant PERCENT_PRECISION = 10000;

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
        int256 currentMargin
    ) internal pure returns (uint256) {
        int256 amountToEscrow = currentMargin - (minMargin - currentMargin);
        if (amountToEscrow < 0) {
            return 0;
        }
        return uint256(amountToEscrow);
    }

    /**
     * @notice Calculates the updated base and quote of the trader and liquidator on a liquidation event.
     * @param liquidatedBase The base of the account being liquidated
     * @param liquidatedQuote The quote of the account being liquidated
     * @param liquidatorQuote The quote of the account liquidating
     * @param amount The amount that is to be liquidated from the position 
     */
    function liquidationBalanceChanges(
        int256 liquidatedBase,
        int256 liquidatedQuote,
        int256 liquidatorQuote,
        int256 amount
    ) internal pure returns (
        int256 _liquidatorBaseChange,
        int256 _liquidatorQuoteChange,
        int256 _liquidateeBaseChange,
        int256 _liquidateeQuoteChange
    ) {
        int256 liquidatorBaseChange;
        int256 liquidatorQuoteChange;
        int256 liquidateeBaseChange;
        int256 liquidateeQuoteChange;
        // base * (amount / quote)
        int256 changeInBase = 
            ((liquidatedBase * ((amount * PERCENT_PRECISION) / liquidatedQuote.abs())) / 
                    PERCENT_PRECISION
            );
        if (liquidatedBase > 0) {
            // Add to the liquidators margin, they are taking on positive margin
            liquidatorBaseChange = changeInBase;

            // Subtract from the liquidatees margin
            liquidateeBaseChange = changeInBase * (-1);
        } else {
            // Subtract from the liquidators margin, they are taking on negative margin
            liquidatorBaseChange = changeInBase * (-1);

            // Add this to the user balances margin
            liquidateeBaseChange = changeInBase;
        }

        if (liquidatorQuote > 0) {
            // Take from liquidatee, give to liquidator
            liquidatorQuoteChange = amount;
            liquidateeQuoteChange = amount * (-1);
        } else {
            // Take from liquidator, give to liquidatee
            liquidatorQuoteChange = amount * (-1);
            liquidateeQuoteChange = amount;
        }
        return(
            liquidatorBaseChange,
            liquidatorQuoteChange,
            liquidateeBaseChange,
            liquidateeQuoteChange
        );
    }

    function calculateSlippage(
        uint256 unitsSold,
        uint256 priceMultiplier,
        int256 maxSlippage,
        int256 avgPrice,
        LibLiquidation.LiquidationReceipt memory receipt
    ) internal pure returns (uint256) {

        // Check price slippage and update account states
        if (
            avgPrice == receipt.price || // No price change
            (avgPrice < receipt.price && !receipt.liquidationSide) || // Price dropped, but position is short
            (avgPrice > receipt.price && receipt.liquidationSide) // Price jumped, but position is long
        ) {
            // No slippage
            return 0;
        } else {
            // Liquidator took a long position, and price dropped
            int256 amountSoldFor = (avgPrice * unitsSold.toInt256()) / priceMultiplier.toInt256();
            int256 amountExpectedFor = (receipt.price * unitsSold.toInt256()) / priceMultiplier.toInt256();

            // The difference in how much was expected vs how much liquidator actually got.
            // i.e. The amount lost by liquidator
            uint256 amountToReturn = 0;
            int256 percentSlippage = 0;
            if (avgPrice < receipt.price && receipt.liquidationSide) {
                amountToReturn = uint256(amountExpectedFor - amountSoldFor);
                if (amountToReturn <= 0) {
                    return 0;
                }
                percentSlippage = (amountToReturn.toInt256() * PERCENT_PRECISION) / amountExpectedFor;
            } else if (avgPrice > receipt.price && !receipt.liquidationSide) {
                amountToReturn = uint256(amountSoldFor - amountExpectedFor);
                if (amountToReturn <= 0) {
                    return 0;
                }
                percentSlippage = (amountToReturn.toInt256() * PERCENT_PRECISION) / amountExpectedFor;
            }
            if (percentSlippage > maxSlippage) {
                amountToReturn = uint256((maxSlippage * amountExpectedFor) / PERCENT_PRECISION);
            }
            return (amountToReturn);
        }
    }
}
