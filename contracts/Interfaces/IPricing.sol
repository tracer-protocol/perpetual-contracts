//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;

interface IPricing {
    function setFundingRate(address market, int256 price, int256 fundingRate, int256 fundingRateValue) external;

    function setInsuranceFundingRate(address market, int256 price, int256 fundingRate, int256 fundingRateValue) external;

    function incrementFundingIndex(address market) external;

    function getFundingRate(address market, uint index) external view returns(uint256, int256, int256, int256);

    function getInsuranceFundingRate(address market, uint index) external view returns(uint256, int256, int256, int256);

    function currentFundingIndex(address market) external view returns(uint256);

    function fairPrices(address market) external view returns (int256);

    function timeValues(address market) external view returns(int256);
    
    function updatePrice(
        int256 price,
        int256 oraclePrice,
        bool newRecord,
        address market
    ) external;

    function updateFundingRate(address market, int256 oraclePrice, int256 poolFundingRate) external;

    function updateTimeValue(address market) external;

    function getTWAPs(address marketAddress, uint currentHour)  external view returns (int256, int256);
        
    function get24HourPrices(address market) external view returns (uint256, uint256);

    function getOnlyFundingRate(address marketAddress, uint index) external view returns (int256);

    function getOnlyFundingRateValue(address marketAddress, uint index) external view returns (int256);

    function getOnlyInsuranceFundingRateValue(address marketAddress, uint index) external view returns(int256);

    function getHourlyAvgTracerPrice(int256 hour, address marketAddress) external view returns (int256);

    function getHourlyAvgOraclePrice(int256 hour, address marketAddress) external view returns (int256);
    
    // function getHourlyAvgPrice(
    //     uint256 index,
    //     bool isOraclePrice,
    //     address market
    // ) external view returns (int256);
}
