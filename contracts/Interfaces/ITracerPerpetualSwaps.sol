//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "../lib/LibPerpetuals.sol";
import "../lib/LibBalances.sol";

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

    function updateAccountsOnClaim(
        address claimant,
        int256 amountToGiveToClaimant,
        address liquidatee,
        int256 amountToGiveToLiquidatee,
        int256 amountToTakeFromInsurance
    ) external;

    function settle(address account) external;

    function tracerBaseToken() external view returns (address);

    function baseTokenDecimals() external view returns (uint256);

    function liquidationContract() external view returns (address);

    function tradingWhitelist(address trader) external returns (bool);

    function marketId() external view returns (bytes32);

    function leveragedNotionalValue() external view returns (uint256);

    function gasPriceOracle() external view returns (address);

    function feeRate() external view returns (uint256);

    function maxLeverage() external view returns (uint256);

    function LIQUIDATION_GAS_COST() external view returns (uint256);

    function fundingRateSensitivity() external view returns (uint256);

    function getBalance(address account)
        external
        view
        returns (Balances.Account memory);

    function setInsuranceContract(address insurance) external;

    function setPricingContract(address pricing) external;

    function setGasOracle(address _gasOracle) external;

    function setFeeRate(uint256 _feeRate) external;

    function setMaxLeverage(uint256 _maxLeverage) external;

    function setFundingRateSensitivity(uint256 _fundingRateSensitivity)
        external;

    function transferOwnership(address newOwner) external;

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function matchOrders(
        Perpetuals.Order memory order1,
        Perpetuals.Order memory order2,
        uint256 fillAmount
    ) external;
}
