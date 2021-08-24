//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.4;

import "../lib/LibPrices.sol";

contract LibPricesMock {
    function fairPrice(uint256 oraclePrice, int256 _timeValue) external pure returns (uint256) {
        return Prices.fairPrice(oraclePrice, _timeValue);
    }

    function timeValue(uint256 averageTracerPrice, uint256 averageOraclePrice) external pure returns (int256) {
        return Prices.timeValue(averageTracerPrice, averageOraclePrice);
    }

    function averagePrice(Prices.PriceInstant memory price) external pure returns (uint256) {
        return Prices.averagePrice(price);
    }

    function averagePriceForPeriod(Prices.PriceInstant[24] memory prices) external pure returns (uint256) {
        return Prices.averagePriceForPeriod(prices);
    }

    function globalLeverage(
        uint256 _globalLeverage,
        uint256 oldLeverage,
        uint256 newLeverage
    ) external pure returns (uint256) {
        return Prices.globalLeverage(_globalLeverage, oldLeverage, newLeverage);
    }

    function calculateTWAP(
        uint256 hour,
        Prices.PriceInstant[24] memory tracerPrices,
        Prices.PriceInstant[24] memory oraclePrices
    ) external pure returns (Prices.TWAP memory) {
        return Prices.calculateTWAP(hour, tracerPrices, oraclePrices);
    }

    function applyFunding(
        Balances.Position memory position,
        Prices.FundingRateInstant memory globalRate,
        Prices.FundingRateInstant memory userRate
    ) public pure returns (Balances.Position memory) {
        return Prices.applyFunding(position, globalRate, userRate);
    }

    function applyInsurance(
        Balances.Position memory userPosition,
        Balances.Position memory insurancePosition,
        Prices.FundingRateInstant memory insuranceGlobalRate,
        Prices.FundingRateInstant memory insuranceUserRate,
        uint256 totalLeveragedValue
    ) public pure returns (Balances.Position memory newUserPos, Balances.Position memory newInsurancePos) {
        return
            Prices.applyInsurance(
                userPosition,
                insurancePosition,
                insuranceGlobalRate,
                insuranceUserRate,
                totalLeveragedValue
            );
    }
}
