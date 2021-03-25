//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;
import "./Types.sol";

interface IAccount {
    function deposit(uint256 amount, address market) external;

    function depositTo(uint256 amount, address market, address user) external;

    function withdraw(uint256 amount, address market) external;

    function settle(
        address account,
        int256 insuranceMultiplyFactor,
        int256 currentGlobalRate,
        int256 currentUserRate,
        int256 currentInsuranceGlobalRate,
        int256 currentInsuranceUserRate,
        int256 gasPrice,
        uint256 priceMultiplier,
        uint256 currentFundingIndex
    ) external;

    function liquidate(
        int256 amount,
        address account,
        address market
    ) external;

    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        address market
    ) external;

    function claimEscrow(uint256 id) external;
    
    function getBalance(address account, address market)
        external
        view
        returns (
            int256 margin,
            int256 position,
            int256 totalLeveragedValue,
            int256 lastUpdatedGasPrice,
            uint256 lastUpdatedIndex
        );

    function updateAccount(
        int256 margin,
        int256 position,
        int256 leverage,
        uint256 deposited,
        address account,
        address market
    ) external;

    function updateAccountOnTrade(
        int256 marginChange,
        int256 positionChange,
        address account,
        address market
    ) external;

    function updateAccountLeverage(
        address account,
        address market
    ) external;

    function marginIsValid(
        int256 base,
        int256 quote,
        int256 price,
        int256 gasPrice,
        address market
    ) external view returns (bool);

    function userMarginIsValid(address account, address market) external view returns (bool);

    function getUserMargin(address account, address market) external view returns (int256);

    function getUserNotionalValue(address account, address market) external view returns (int256);

    function getUserMinMargin(address account, address market) external view returns (int256);

    function tracerLeveragedNotionalValue(address market) external view returns(int256);

    function tvl(address market) external view returns(uint256);

    function setReceiptContract(address newReceiptContract) external;

    function setInsuranceContract(address newInsuranceContract) external;

    function setGasPriceOracle(address newGasPriceOracle) external;

    function setFactoryContract(address newFactory) external;

    function setPricingContract(address newPricing) external;
}
