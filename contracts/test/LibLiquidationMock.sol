// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../lib/LibLiquidation.sol";

library LibLiquidationMock {
    function calcEscrowLiquidationAmount(
        uint256 minMargin,
        int256 currentMargin
    ) external pure returns (uint256 result) {
        result = LibLiquidation.calcEscrowLiquidationAmount(
            minMargin,
            currentMargin
        );
    }

    function liquidationBalanceChanges(
        int256 liquidatedBase,
        int256 liquidatedQuote,
        int256 amount
    )
        external
        pure
        returns (
            int256 _liquidatorQuoteChange,
            int256 _liquidatorBaseChange,
            int256 _liquidateeQuoteChange,
            int256 _liquidateeBaseChange
        )
    {
        (
            _liquidatorQuoteChange,
            _liquidatorBaseChange,
            _liquidateeQuoteChange,
            _liquidateeBaseChange
        ) = LibLiquidation.liquidationBalanceChanges(
            liquidatedBase,
            liquidatedQuote,
            amount
        );
    }

    function calculateSlippage(
        uint256 unitsSold,
        uint256 maxSlippage,
        uint256 avgPrice,
        uint256 receiptPrice,
        bool receiptSide
    ) external pure returns (uint256 result) {
        /* Create a struct LibLiquidation with only price and liquidationSide set,
           as they are the only ones used in calculateSlippage */
        LibLiquidation.LiquidationReceipt memory minimalReceipt =
            LibLiquidation.LiquidationReceipt(
                address(0),
                address(0),
                address(0), // Not used
                receiptPrice,
                0,
                0,
                0,
                0,
                false, // Not used
                receiptSide,
                false // Not used
            );

        result = LibLiquidation.calculateSlippage(
            unitsSold,
            maxSlippage,
            avgPrice,
            minimalReceipt
        );
    }
}
