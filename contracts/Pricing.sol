// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;

import {Types} from "./Interfaces/Types.sol";
import "./lib/LibMath.sol";
import "./Interfaces/IPricing.sol";
import "./Interfaces/ITracer.sol";
import "./Interfaces/ITracerFactory.sol";
import "./Interfaces/IOracle.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";

contract Pricing is IPricing {
    uint256 private constant DIVIDE_PRECISION = 100000000; // 10^7
    uint256 private constant PERCENT_FACTOR = 10000; // 10^5; supports 5 decimal places for funding rate sensitivity
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;

    ITracerFactory public factory;

    // Tracer market => pricing metrics
    mapping(address => Types.PricingMetrics) internal prices;

    // Tracer market => funding index => funding rate
    mapping(address => mapping(uint256 => Types.FundingRate)) public fundingRates;

    // Tracer market => funding index => insurance funding rate
    mapping(address => mapping(uint256 => Types.FundingRate)) public insuranceFundingRates;

    // Tracer market => market's time value
    mapping(address => int256) public override timeValues;

    // Tracer market => funding index
    mapping(address => uint256) public override currentFundingIndex;

    /**
     * @dev Set tracer factory
     * @param _factory The address of the tracer factory
     */
    constructor(address _factory) public {
        factory = ITracerFactory(_factory);
    }

    /**
     * @notice Updates both the latest market price and the latest underlying asset price (from an oracle) for a given tracer market given a tracer price
     *         and an oracle price.
     * @param marketPrice The price that a tracer was bought at, returned by the Tracer.sol contract when an order is filled
     * @param oraclePrice The price of the underlying asset that the Tracer is based upon as returned by a Chainlink Oracle
     * @param newRecord Bool that decides if a new hourly record should be started (true) or if a current hour should be updated (false)
     * @param market The address of the Tracer being updated
     */
    function updatePrice(
        int256 marketPrice,
        int256 oraclePrice,
        bool newRecord,
        address market
    ) public override onlyTracer(market) {
        uint256 currentHour = ITracer(market).currentHour();
        // Price records entries updated every hour
        Types.PricingMetrics storage pricing = prices[market];
        if (newRecord) {
            // Make new hourly record, total = marketprice, numtrades set to 1;
            Types.HourlyPrices memory newHourly = Types.HourlyPrices(marketPrice, 1);
            pricing.hourlyTracerPrices[currentHour] = newHourly;
            // As above but with Oracle price
            Types.HourlyPrices memory oracleHour = Types.HourlyPrices(oraclePrice, 1);
            pricing.hourlyOraclePrices[currentHour] = oracleHour;
        } else {
            // If an update is needed, add the market price to a running total and increment number of trades
            pricing.hourlyTracerPrices[currentHour].totalPrice = pricing.hourlyTracerPrices[currentHour].totalPrice.add(
                marketPrice
            );
            pricing.hourlyTracerPrices[currentHour].numTrades = pricing.hourlyTracerPrices[currentHour].numTrades + 1;
            // As above but with oracle price
            pricing.hourlyOraclePrices[currentHour].totalPrice = pricing.hourlyOraclePrices[currentHour].totalPrice.add(
                oraclePrice
            );
            pricing.hourlyOraclePrices[currentHour].numTrades = pricing.hourlyOraclePrices[currentHour].numTrades + 1;
        }
    }

    /**
     * @notice Updates the funding rate and the insurance funding rate
     * @param oraclePrice The price of the underlying asset that the Tracer is based upon as returned by a Chainlink Oracle
     * @param IPoolFundingRate The 8 hour funding rate for the insurance pool, returned by a tracer's insurance contract
     * @param market The address of the Tracer being updated
     */
    function updateFundingRate(
        address market,
        int256 oraclePrice,
        int256 IPoolFundingRate
    ) public override onlyTracer(market) {
        // Get 8 hour time-weighted-average price (TWAP) and calculate the new funding rate and store it a new variable
        ITracer _tracer = ITracer(market);
        int256 timeValue = timeValues[market];
        (int256 underlyingTWAP, int256 deriativeTWAP) = getTWAPs(market, _tracer.currentHour());
        int256 newFundingRate = (((deriativeTWAP).sub(underlyingTWAP).sub(timeValue)).mul(
            _tracer.FUNDING_RATE_SENSITIVITY().toInt256()
        )).div(PERCENT_FACTOR.toInt256());
        // set the index to the last funding Rate confirmed funding rate (-1)
        uint256 fundingIndex = currentFundingIndex[market] - 1;

        // Create variable with value of new funding rate value
        int256 currentFundingRateValue = getOnlyFundingRateValue(market, fundingIndex);
        int256 fundingRateValue = currentFundingRateValue.add((newFundingRate.mul(oraclePrice)));

        // as above but with insurance funding rate value
        int256 currentInsuranceFundingRateValue = getOnlyInsuranceFundingRateValue(market, fundingIndex);
        int256 IPoolFundingRateValue = currentInsuranceFundingRateValue.add(IPoolFundingRate);

        // Call setter functions on calculated variables
        setFundingRate(market, oraclePrice, newFundingRate, fundingRateValue);
        setInsuranceFundingRate(market, oraclePrice, IPoolFundingRate, IPoolFundingRateValue);
        incrementFundingIndex(market);
    }

    /**
     * @notice Given the address of a tracer market this function will get the current fair price for that market
     * @param market The address of the tracer market where you want the fair price
     */
    function fairPrices(address market) public override view validTracer(market) returns(int256) {
        // grab all necessary variable from helper functions
        ITracer tracer = ITracer(market);

        int256 oraclePrice = IOracle(tracer.oracle()).latestAnswer();
        int256 timeValue = timeValues[market];

        // calculates fairPrice
        return oraclePrice.sub(timeValue);
    }

    ////////////////////////////
    ///  SETTER FUNCTIONS   ///
    //////////////////////////

    /**
     * @notice Calculates and then updates the time Value for a tracer market
     * @param market The address of the Tracer market that is to be updated
     */
    function updateTimeValue(address market) public override onlyTracer(market) {
        (uint256 avgPrice, uint256 oracleAvgPrice) = get24HourPrices(market);
        timeValues[market] = timeValues[market].add(avgPrice.toInt256().sub(oracleAvgPrice.toInt256()).div(90));
    }

    /**
     * @notice Sets the values of the fundingRate struct for a particular Tracer Marker
     * @param market The address of the Tracer market that"s fundingRate is to be updated
     * @param marketPrice The market price of the tracer, given by the Tracer contract when an order has been filled
     * @param fundingRate The funding Rate of the Tracer, calculated by updateFundingRate
     * @param fundingRateValue The fundingRateValue, incremented each time the funding rate is updated
     */
    function setFundingRate(
        address market,
        int256 marketPrice,
        int256 fundingRate,
        int256 fundingRateValue
    ) public override onlyTracer(market) {
        fundingRates[market][currentFundingIndex[market]] = Types.FundingRate(
            block.timestamp,
            marketPrice,
            fundingRate,
            fundingRateValue
        );
    }

    /**
     * @notice Sets the values of the fundingRate struct for a particular Tracer Marker
     * @param market The address of the Tracer market that"s fundingRate is to be updated
     * @param marketPrice The market price of the tracer, given by the Tracer contract when an order has been filled
     * @param fundingRate The insurance funding Rate of the Tracer, calculated by updateFundingRate
     * @param fundingRateValue The fundingRateValue, incremented each time the funding rate is updated
     */
    function setInsuranceFundingRate(
        address market,
        int256 marketPrice,
        int256 fundingRate,
        int256 fundingRateValue
    ) public override onlyTracer(market) {
        insuranceFundingRates[market][currentFundingIndex[market]] = Types.FundingRate(
            block.timestamp,
            marketPrice,
            fundingRate,
            fundingRateValue
        );
    }

    /**
     * @notice Increments the funding index of a particular tracer by 1
     * @param market The address of the Tracer market that"s fundingindex is to be updated
     */
    function incrementFundingIndex(address market) public override onlyTracer(market) {
        currentFundingIndex[market] = currentFundingIndex[market] + 1;
    }

    //////////////////////
    ///GETTER FUNCTIONS///
    //////////////////////

    /**
     * @return each variable of the fundingRate struct of a particular tracer at a particular funding rate index
     */
    function getFundingRate(address market, uint256 index)
        public
        override
        view
        returns (
            uint256,
            int256,
            int256,
            int256
        )
    {
        Types.FundingRate memory fundingRate = fundingRates[market][index];
        return (fundingRate.recordTime, fundingRate.recordPrice, fundingRate.fundingRate, fundingRate.fundingRateValue);
    }

    /**
     * @return only the funding rate from a fundingRate struct
     */
    function getOnlyFundingRate(address market, uint index) public override view returns (int256) {
        return fundingRates[market][index].fundingRate;
    }

    /**
     * @return only the funding rate Value from a fundingRate struct
     */
     function getOnlyFundingRateValue(address market, uint index) public override view returns (int256) {
        return fundingRates[market][index].fundingRateValue;
    }

    /**
     * @return all of the vairbales in the funding rate struct (insurance rate) from a particular tracer market
     */
    function getInsuranceFundingRate(address market, uint256 index)
        public
        override
        view
        returns (
            uint256,
            int256,
            int256,
            int256
        )
    {
        Types.FundingRate memory fundingRate = insuranceFundingRates[market][index];
        return (fundingRate.recordTime, fundingRate.recordPrice, fundingRate.fundingRate, fundingRate.fundingRateValue);
    }

    /**
     * @return only the funding rate value from a fundingRate struct
     */
    function getOnlyInsuranceFundingRateValue(address market, uint index) public override view returns(int256) {
        return insuranceFundingRates[market][index].fundingRateValue;
    }

    /**
     * @notice Gets an 8 hour time weighted avg price for a given tracer, at a particular hour. More recent prices are weighted more heavily.
     * @param market The address of a tracer market
     * @param currentHour An integer representing what hour we are in in the day (0-24)
     * @return the time weighted average price for both the oraclePrice (derivative price) and the Tracer Price
     */
    function getTWAPs(address market, uint256 currentHour) public override view returns (int256, int256) {
        int256 underlyingSum = 0;
        int256 derivativeSum = 0;
        uint256 derivativeInstances = 0;
        uint256 underlyingInstances = 0;
        for (uint8 i = 0; i < 8; i++) {
            int256 timeWeight = 8 - i;
            int256 j = int256(currentHour) - int256(i); // keep moving towards 0
            // loop back around list if required
            if (j < 0) {
                j = 23;
            }
            int256 derivativePrice = getHourlyAvgTracerPrice(uint256(j), market);
            int256 underlyingPrice = getHourlyAvgOraclePrice(uint256(j), market);
            if (derivativePrice != 0) {
                derivativeInstances = derivativeInstances.add(uint256(timeWeight));
                derivativeSum = derivativeSum.add((timeWeight).mul(derivativePrice));
            }
            if (underlyingPrice != 0) {
                underlyingInstances = underlyingInstances.add(uint256(timeWeight));
                underlyingSum = underlyingSum.add((timeWeight).mul(underlyingPrice));
            }
        }
        if (derivativeInstances == 0) {
            // Not enough market data yet
            return (0, 0);
        }
        return (underlyingSum.div(underlyingInstances.toInt256()), derivativeSum.div(derivativeInstances.toInt256()));
    }

    /**
     * @notice Gets a 24 hour tracer and oracle price for a given tracer market
     * @param market The address of the Tracer market that is to be averaged
     * @return the average price over a 24 hour period for oracle and Tracer price
     */
    function get24HourPrices(address market) public override view returns (uint256, uint256) {
        Types.PricingMetrics memory pricing = prices[market];
        uint256 runningTotal = 0;
        uint256 oracleRunningTotal = 0;
        uint8 numberOfHoursPresent = 0;
        uint8 numberOfOracleHoursPresent = 0;
        for (uint8 i = 0; i < 23; i++) {
            Types.HourlyPrices memory hourlyPrice = pricing.hourlyTracerPrices[i];
            Types.HourlyPrices memory oracleHourlyPrice = pricing.hourlyOraclePrices[i];
            if (hourlyPrice.numTrades != 0) {
                runningTotal = runningTotal.add((uint256(hourlyPrice.totalPrice.abs())).div(hourlyPrice.numTrades));
                numberOfHoursPresent = numberOfHoursPresent + 1;
            }
            if (oracleHourlyPrice.numTrades != 0) {
                oracleRunningTotal = oracleRunningTotal.add(
                    (uint256(oracleHourlyPrice.totalPrice.abs())).div(oracleHourlyPrice.numTrades)
                );
                numberOfOracleHoursPresent = numberOfOracleHoursPresent + 1;
            }
        }
        return (runningTotal.div(numberOfHoursPresent), oracleRunningTotal.div(numberOfOracleHoursPresent));
    }

    /**
     * @notice Gets the average tracer price for a given market during a certain hour
     * @param hour The hour of which you want the hourly average Price
     * @param market The address of the Tracer whose price data is wanted
     * @return the average price of the tracer for a particular hour
     */
    function getHourlyAvgTracerPrice(uint256 hour, address market) public override view returns (int256) {
        Types.PricingMetrics memory pricing = prices[market];
        Types.HourlyPrices memory hourly;

        /* bounds check the provided hour (note that the cast is safe due to
         * short-circuit evaluation of this conditional) */
        if (hour < 0 || uint256(hour) >= pricing.hourlyOraclePrices.length) {
            return 0;
        }

        /* note that this cast is safe due to our above bounds check */
        hourly = pricing.hourlyTracerPrices[uint256(hour)];

        if (hourly.numTrades == 0) {
            return 0;
        } else {
            return hourly.totalPrice.div(hourly.numTrades.toInt256());
        }
    }

    /**
     * @notice Gets the average oracle price for a given market during a certain hour
     * @param hour The hour of which you want the hourly average Price
     * @param market Which tracer market's data to query
     */
    function getHourlyAvgOraclePrice(uint256 hour, address market) public override view returns (int256) {
        Types.PricingMetrics memory pricing = prices[market];
        Types.HourlyPrices memory hourly;

        /* bounds check the provided hour (note that the cast is safe due to
         * short-circuit evaluation of this conditional) */
        if (hour < 0 || uint256(hour) >= pricing.hourlyOraclePrices.length) {
            return 0;
        }

        /* note that this cast is safe due to our above bounds check */
        hourly = pricing.hourlyOraclePrices[uint256(hour)];

        if (hourly.numTrades == 0) {
            return 0;
        } else {
            /* On each trade, the oracle price is added to, so the average is
               (total / number of trades) */
            return hourly.totalPrice.div(hourly.numTrades.toInt256());
        }
    }

    /**
     * @dev Used when only valid tracers are allowed
     */
    modifier onlyTracer(address market) {
        require(msg.sender == market && factory.validTracers(market), "PRC: Only Tracer");
        _;
    }

    /**
     * @dev Used when only valid tracers are allowed
     */
    modifier validTracer(address market) {
        require(factory.validTracers(market), "PRC: Only Tracer");
        _;
    }
}
