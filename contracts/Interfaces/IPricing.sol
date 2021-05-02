//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IPricing {
    function setFundingRate(int256 price, int256 fundingRate, int256 fundingRateValue) external;

    function setInsuranceFundingRate(int256 price, int256 fundingRate, int256 fundingRateValue) external;

    function incrementFundingIndex() external;

    function getFundingRate(uint index) external view returns(uint256, int256, int256, int256);

    function getInsuranceFundingRate( uint index) external view returns(uint256, int256, int256, int256);

    function currentFundingIndex() external view returns(uint256);

    function fairPrice() external view returns (int256);

    function timeValue() external view returns(int256);
    
    function updatePrice(
        int256 price,
        int256 oraclePrice,
        bool newRecord
    ) external;

    function updateFundingRate(int256 oraclePrice, int256 poolFundingRate) external;

    function updateTimeValue() external;

    function getTWAPs(uint currentHour)  external view returns (int256, int256);
        
    function get24HourPrices() external view returns (uint256, uint256);

    function getOnlyFundingRate(uint index) external view returns (int256);

    function getOnlyFundingRateValue(uint index) external view returns (int256);

    function getOnlyInsuranceFundingRateValue(uint index) external view returns(int256);

    function getHourlyAvgTracerPrice(uint256 hour) external view returns (int256);

    function getHourlyAvgOraclePrice(uint256 hour) external view returns (int256);
}
