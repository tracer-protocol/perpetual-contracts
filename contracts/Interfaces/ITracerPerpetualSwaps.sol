//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "./Types.sol";

interface ITracerPerpetualSwaps {

    function updateAccountsOnLiquidation(
        address liquidator,
        address liquidatee,
        int256 liquidatorBaseChange,
        int256 liquidatorQuoteChange,
        int256 liquidateeBaseChange,
        int256 liquidateeQuoteChange,
        uint256 amountToEscrow
    ) external;

    function settle(address account) external;

    function tracerBaseToken() external view returns (address);

    function marketId() external view returns(bytes32);

    function leveragedNotionalValue() external view returns(int256);

    function oracle() external view returns(address);

    function gasPriceOracle() external view returns(address);

    function priceMultiplier() external view returns(uint256);

    function feeRate() external view returns(uint256);

    function maxLeverage() external view returns(int256);

    function LIQUIDATION_GAS_COST() external view returns(uint256);

    function fundingRateSensitivity() external view returns(uint256);

    function getBalance(address account) external view returns (Types.AccountBalance memory);

    function setInsuranceContract(address insurance) external;

    function setPricingContract(address pricing) external;

    function setOracle(address _oracle) external;

    function setGasOracle(address _gasOracle) external;

    function setFeeRate(uint256 _feeRate) external;

    function setMaxLeverage(int256 _maxLeverage) external;

    function setFundingRateSensitivity(uint256 _fundingRateSensitivity) external;

    function transferOwnership(address newOwner) external;

    function matchOrders(Types.Order memory order1, Types.Order memory order2, uint256 fillAmount) external;
}
