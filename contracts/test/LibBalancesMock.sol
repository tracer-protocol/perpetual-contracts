//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "../../contracts/lib/LibBalances.sol";

contract LibBalancesMock {
    function netValue(Balances.Position calldata position, uint256 price) external pure returns (uint256) {
        return Balances.netValue(position, price);
    }

    function margin(Balances.Position calldata position, uint256 price) external pure returns (int256) {
        return Balances.margin(position, price);
    }

    function leveragedNotionalValue(Balances.Position calldata position, uint256 price) external pure returns (uint256) {
        return Balances.leveragedNotionalValue(position, price);
    }

    function minimumMargin(Balances.Position calldata position, uint256 price, uint256 liquidationCost, uint256 maximumLeverage) external pure returns (uint256) {
        return Balances.minimumMargin(position, price, liquidationCost, maximumLeverage);
    }

    function applyTrade(Balances.Position calldata position, Balances.Trade calldata trade, uint256 feeRate) external pure returns (Balances.Position memory) {
        return Balances.applyTrade(position, trade, feeRate);
    }

}

