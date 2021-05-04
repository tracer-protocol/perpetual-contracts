//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
import "./Types.sol";

interface ILiquidation {
    function submitLiquidation(
        address market,
        address liquidator,
        address liquidatee,
        int256 price,
        uint256 escrowedAmount,
        int256 amountLiquidated,
        bool liquidationSide
    ) external;

    function claimEscrow(uint256 id, address trader) external returns (int256);

    function claimReceipts(
        uint256 escrowId,
        Types.Order[] memory orders,
        uint256 priceMultiplier,
        address market,
        address traderContract,
        address liquidator
    ) external returns (uint256);

    function getLiquidationReceipt(uint256 id)
        external
        view
        returns (
            address,
            address,
            address,
            int256,
            uint256,
            uint256,
            uint256,
            int256,
            bool,
            bool,
            bool
        );

    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external;

    function claimReceipts(
        uint256 receiptID,
        uint256[] memory orderIds,
        address market
    ) external;

    function claimEscrow(uint256 receiptId) external;

    function currentLiquidationId() external view returns(uint256);

    function maxSlippage() external view returns(int256);

    function setMaxSlippage(int256 _maxSlippage) external;
}
