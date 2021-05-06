//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "./Types.sol";
import "../lib/LibLiquidation.sol";

interface ILiquidation {

    function claimEscrow(uint256 id, address trader) external returns (int256);

    function calcAmountToReturn(
        uint256 escrowId,
        Types.Order[] memory orders,
        uint256 priceMultiplier,
        address traderContract,
        address liquidator
    ) external returns (uint256);

    function calcUnitsSold(
        Types.Order[] memory orders,
        address traderContract,
        uint256 receiptId
    ) external returns (uint256, uint256);

    function getLiquidationReceipt(uint256 id)
        external
        view
        returns (LibLiquidation.LiquidationReceipt memory);

    function liquidate(
        int256 amount, 
        address account
    ) external;

    function claimReceipts(
        uint256 receiptId,
        Types.Order[] memory orders,
        address traderContract
    ) external;

    function claimEscrow(uint256 receiptId) external;

    function currentLiquidationId() external view returns(uint256);

    function maxSlippage() external view returns(uint256);

    function setMaxSlippage(uint256 _maxSlippage) external;
}
