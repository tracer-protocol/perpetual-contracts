// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./LibMath.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "hardhat/console.sol";

library LibLiquidation {
    using LibMath for uint256;
    using LibMath for int256;
    using PRBMathUD60x18 for uint256;
    using PRBMathSD59x18 for int256;

    struct LiquidationReceipt {
        address tracer;
        address liquidator;
        address liquidatee;
        uint256 price;
        uint256 time;
        uint256 escrowedAmount;
        uint256 releaseTime;
        int256 amountLiquidated;
        bool escrowClaimed;
        bool liquidationSide;
        bool liquidatorRefundClaimed;
    }

    function calcEscrowLiquidationAmount(
        uint256 minMargin, //10^18
        int256 currentMargin //10^18
    ) internal pure returns (uint256) {
        int256 amountToEscrow =
            currentMargin - (minMargin.toInt256() - currentMargin);
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
        int256 liquidatedBase, //10^18
        int256 liquidatedQuote, //10^18
        int256 liquidatorQuote, //10^18
        int256 amount //10^18
    )
        public
        pure
        returns (
            int256,
            int256,
            int256,
            int256
        )
    {
        // proportionate amount of base to take
        // base * (amount / abs(quote))
        int256 changeInBase =
            PRBMathSD59x18.mul(
                liquidatedBase,
                PRBMathSD59x18.div(amount, PRBMathSD59x18.abs(liquidatedQuote))
            );

        int256 liquidatorBaseChange;
        int256 liquidatorQuoteChange;
        int256 liquidateeBaseChange;
        int256 liquidateeQuoteChange;
        // base * (amount / abs(quote))
        
        // todo with the below * -1, note ints can overflow as 2^-127 is valid but 2^127 is not.
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
        return (
            liquidatorBaseChange,
            liquidatorQuoteChange,
            liquidateeBaseChange,
            liquidateeQuoteChange
        );
    }

    /**
     * @notice Calculates the amount of slippage experienced compared to value of position in a receipt
     * @param unitsSold Amount of base units sold in the orders
     * @param maxSlippage The upper bound for slippage
     * @param avgPrice The average price of units sold in orders
     * @param receipt The receipt for the state during liquidation
     */
    function calculateSlippage(
        uint256 unitsSold, //10^18
        uint256 maxSlippage, //10^18
        uint256 avgPrice, //10^18
        LiquidationReceipt memory receipt
    ) internal view returns (uint256) {
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
            uint256 amountSoldFor = PRBMathUD60x18.mul(avgPrice, unitsSold);
            uint256 amountExpectedFor =
                PRBMathUD60x18.mul(receipt.price, unitsSold);

            // The difference in how much was expected vs how much liquidator actually got.
            // i.e. The amount lost by liquidator
            // todo this can probably be further simplified
            uint256 amountToReturn = 0;
            uint256 percentSlippage = 0;
            if (avgPrice < receipt.price && receipt.liquidationSide) {
                amountToReturn = amountExpectedFor - amountSoldFor;
            } else if (avgPrice > receipt.price && !receipt.liquidationSide) {
                amountToReturn = amountSoldFor - amountExpectedFor;
            }
            if (amountToReturn <= 0) {
                    return 0;
            }
            // multiply by 100 as we expect this to be a percent as an integer eg 50% = 50
            percentSlippage = PRBMathUD60x18.div(amountToReturn, amountExpectedFor) * 100;
            if (percentSlippage > maxSlippage) {
                amountToReturn = PRBMathUD60x18.mul(maxSlippage, amountExpectedFor) / 100;
            }
            return amountToReturn;
        }
    }
}
