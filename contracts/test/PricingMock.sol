// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.4;

import "../lib/LibMath.sol";
import "../Interfaces/IPricing.sol";
import "../Interfaces/ITracerPerpetualSwaps.sol";
import "../Interfaces/IInsurance.sol";
import "../Interfaces/IOracle.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

contract PricingMock is IPricing {
    using LibMath for uint256;
    using LibMath for int256;
    using PRBMathSD59x18 for int256;

    // mocked variables
    uint256 _fairPrice;
    int256 public override timeValue;
    uint256 public override lastUpdatedFundingIndex;

    // funding index => funding rate
    mapping(uint256 => Prices.FundingRateInstant) public fundingRates;

    // funding index => insurance funding rate
    mapping(uint256 => Prices.FundingRateInstant) public insuranceFundingRates;

    uint8 public override currentHour;

    // The funding rate is supposed to be 8-hourly, but because it's paid hourly
    // in the contracts, we offset the calculated rate by a factor of 8
    int256 private constant FUNDING_RATE_OFFSET = 8;

    event HourlyPriceUpdated(uint256 price, uint256 currentHour);
    event FundingRateUpdated(int256 fundingRate, int256 cumulativeFundingRate);
    event InsuranceFundingRateUpdated(int256 insuranceFundingRate, int256 insuranceFundingRateValue);

    /**
     * @return each variable of the fundingRate struct of a particular tracer at a particular funding rate index
     */
    function getFundingRate(uint256 index) external view override returns (Prices.FundingRateInstant memory) {
        return fundingRates[index];
    }

    /**
     * @return all of the variables in the funding rate struct (insurance rate) from a particular tracer market
     */
    function getInsuranceFundingRate(uint256 index) external view override returns (Prices.FundingRateInstant memory) {
        return insuranceFundingRates[index];
    }

    /**
     * @notice Given the address of a tracer market this function will get the current fair price for that market
     */
    function fairPrice() external view override returns (uint256) {
        return _fairPrice;
    }

    ////////////////////////////
    ///  SETTER FUNCTIONS   ///
    //////////////////////////

    /**
     * @notice Sets the values of the fundingRate struct and updates the lastUpdatedFundingIndex to the specified index
     */
    function setFundingRate(
        uint256 index,
        int256 fundingRate,
        int256 cumulativeFundingRate
    ) external {
        fundingRates[index] = Prices.FundingRateInstant(block.timestamp, fundingRate, cumulativeFundingRate);

        lastUpdatedFundingIndex = index;
    }

    /**
     * @notice Sets the values of the fundingRate mapping and updates the lastUpdatedFundingIndex to the specified index
     */
    function setInsuranceFundingRate(
        uint256 index,
        int256 fundingRate,
        int256 cumulativeFundingRate
    ) external {
        insuranceFundingRates[index] = Prices.FundingRateInstant(block.timestamp, fundingRate, cumulativeFundingRate);

        lastUpdatedFundingIndex = index;
    }

    function setFairPrice(uint256 newFairPrice) external {
        _fairPrice = newFairPrice;
    }

    function setTimeValue(int256 newTimeValue) external {
        timeValue = newTimeValue;
    }

    function setLastUpdatedFundingIndex(uint256 newIndex) external {
        lastUpdatedFundingIndex = newIndex;
    }

    //////////////////////////////////
    ///  UNIMPLEMENTED FUNCTIONS   ///
    //////////////////////////////////

    // The below functions have only been included to conform to the IPricing interface and should not be used.

    function recordTrade(uint256, uint256) external pure override {
        return;
    }

    function getTWAPs(uint256) public pure override returns (Prices.TWAP memory) {
        return Prices.TWAP(1, 1);
    }

    function get24HourPrices() public pure override returns (uint256, uint256) {
        return (1, 1);
    }

    function getHourlyAvgTracerPrice(uint256) public pure override returns (uint256) {
        return 1;
    }

    function getHourlyAvgOraclePrice(uint256) external pure override returns (uint256) {
        return 1;
    }
}
