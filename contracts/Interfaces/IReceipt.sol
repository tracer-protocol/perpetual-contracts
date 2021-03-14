//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;
import "./Types.sol";

interface IReceipt {
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
        uint256[] memory orderIds,
        uint256 priceMultiplier,
        address market,
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

    function currentLiquidationId() external view returns(uint256);

    function maxSlippage() external view returns(int256);

    function setMaxSlippage(int256 _maxSlippage) external;
}
