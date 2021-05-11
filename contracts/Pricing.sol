// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./lib/LibMath.sol";
import "./lib/LibPrices.sol";
import "./Interfaces/IPricing.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/IOracle.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

contract Pricing is IPricing {
    using LibMath for uint256;
    using LibMath for int256;
    using PRBMathUD60x18 for uint256;

    address public tracer;
    IInsurance public insurance;
    IOracle public oracle;

    // pricing metrics
    Types.PricingMetrics internal price;

    // funding index => funding rate
    mapping(uint256 => Prices.FundingRateInstant) public fundingRates;

    // funding index => insurance funding rate
    mapping(uint256 => Prices.FundingRateInstant) public insuranceFundingRates;

    // market's time value
    int256 public override timeValue;

    // funding index
    uint256 public override currentFundingIndex;

    // timing variables
    uint256 internal startLastHour;
    uint256 internal startLast24Hours;
    uint8 public currentHour;

    event HourlyPriceUpdated(uint256 price, uint256 currentHour);
    event FundingRateUpdated(int256 fundingRate, int256 cumulativeFundingRate);
    event InsuranceFundingRateUpdated(
        int256 insuranceFundingRate,
        int256 insuranceFundingRateValue
    );

    /**
     * @dev Set tracer perps factory
     * @dev ensure that oracle contract is returning WAD values. This may be done
     *      by wrapping the raw oracle in an adapter (see contracts/oracle)
     * @param _tracer The address of the tracer this pricing contract links too
     */
    constructor(
        address _tracer,
        address _insurance,
        address _oracle
    ) {
        tracer = _tracer;
        insurance = IInsurance(_insurance);
        oracle = IOracle(_oracle);

        // initialise funding rate, similar to what was done in trace perp
        uint256 oracleLatestPrice = oracle.latestAnswer();
        setFundingRate(0, 0);
        setInsuranceFundingRate(0, 0);
        // increment funding index
        currentFundingIndex = currentFundingIndex + 1;
    }

    /**
     * @notice Updates pricing information given a trade of a certain volume at
     *         a set price
     * @param tradePrice the price the trade executed at
     * @param tradeVolume the volume of the order
     */
    function recordTrade(uint256 tradePrice, uint256 tradeVolume)
        external
        override
        onlyTracer
    {
        uint256 currentOraclePrice = oracle.latestAnswer();
        if (startLastHour <= block.timestamp - 1 hours) {
            // emit the old hourly average
            uint256 hourlyTracerPrice = getHourlyAvgTracerPrice(currentHour);
            emit HourlyPriceUpdated(hourlyTracerPrice, currentHour);

            // Update the price to a new entry and funding rate every hour
            // Check current hour and loop around if need be
            if (currentHour == 23) {
                currentHour = 0;
            } else {
                currentHour = currentHour + 1;
            }
            // Update pricing and funding rate states
            updatePrice(tradePrice, currentOraclePrice, true);

            // todo contract needs to take in the insurance pool
            int256 poolFundingRate = insurance.getPoolFundingRate().toInt256();

            updateFundingRate(currentOraclePrice, poolFundingRate);

            if (startLast24Hours <= block.timestamp - 24 hours) {
                // Update the interest rate every 24 hours
                updateTimeValue();
                startLast24Hours = block.timestamp;
            }

            startLastHour = block.timestamp;
        } else {
            // Update old pricing entry
            updatePrice(tradePrice, currentOraclePrice, false);
        }
    }

    /**
     * @notice Updates both the latest market price and the latest underlying asset price (from an oracle) for a given tracer market given a tracer price
     *         and an oracle price.
     * @param marketPrice The price that a tracer was bought at, returned by the TracerPerpetualSwaps.sol contract when an order is filled
     * @param oraclePrice The price of the underlying asset that the Tracer is based upon as returned by a Chainlink Oracle
     * @param newRecord Bool that decides if a new hourly record should be started (true) or if a current hour should be updated (false)
     */
    function updatePrice(
        uint256 marketPrice,
        uint256 oraclePrice,
        bool newRecord
    ) internal {
        // Price records entries updated every hour
        if (newRecord) {
            // Make new hourly record, total = marketprice, numtrades set to 1;
            Types.HourlyPrices memory newHourly =
                Types.HourlyPrices(marketPrice, 1);
            price.hourlyTracerPrices[currentHour] = newHourly;
            // As above but with Oracle price
            Types.HourlyPrices memory oracleHour =
                Types.HourlyPrices(oraclePrice, 1);
            price.hourlyOraclePrices[currentHour] = oracleHour;
        } else {
            // If an update is needed, add the market price to a running total and increment number of trades
            price.hourlyTracerPrices[currentHour].totalPrice =
                price.hourlyTracerPrices[currentHour].totalPrice +
                marketPrice;
            price.hourlyTracerPrices[currentHour].numTrades =
                price.hourlyTracerPrices[currentHour].numTrades +
                1;
            // As above but with oracle price
            price.hourlyOraclePrices[currentHour].totalPrice =
                price.hourlyOraclePrices[currentHour].totalPrice +
                oraclePrice;
            price.hourlyOraclePrices[currentHour].numTrades =
                price.hourlyOraclePrices[currentHour].numTrades +
                1;
        }
    }

    /**
     * @notice Updates the funding rate and the insurance funding rate
     * @param oraclePrice The price of the underlying asset that the Tracer is based upon as returned by a Chainlink Oracle
     * @param iPoolFundingRate The 8 hour funding rate for the insurance pool, returned by a tracer's insurance contract
     */
    function updateFundingRate(uint256 oraclePrice, int256 iPoolFundingRate)
        internal
    {
        // Get 8 hour time-weighted-average price (TWAP) and calculate the new funding rate and store it a new variable
        ITracerPerpetualSwaps _tracer = ITracerPerpetualSwaps(tracer);
        (uint256 underlyingTWAP, uint256 deriativeTWAP) = getTWAPs(currentHour);
        int256 newFundingRate =
            (deriativeTWAP.toInt256() - underlyingTWAP.toInt256() - timeValue) *
                (_tracer.fundingRateSensitivity().toInt256());
        // set the index to the last funding Rate confirmed funding rate (-1)
        uint256 fundingIndex = currentFundingIndex - 1;

        // Create variable with value of new funding rate value
        int256 currentFundingRateValue =
            fundingRates[fundingIndex].cumulativeFundingRate;
        int256 cumulativeFundingRate =
            currentFundingRateValue + (newFundingRate * oraclePrice.toInt256());

        // as above but with insurance funding rate value
        int256 currentInsuranceFundingRateValue =
            insuranceFundingRates[fundingIndex].cumulativeFundingRate;
        int256 iPoolFundingRateValue =
            currentInsuranceFundingRateValue + iPoolFundingRate;

        // Call setter functions on calculated variables
        setFundingRate(newFundingRate, cumulativeFundingRate);
        emit FundingRateUpdated(newFundingRate, cumulativeFundingRate);
        setInsuranceFundingRate(iPoolFundingRate, iPoolFundingRateValue);
        emit InsuranceFundingRateUpdated(
            iPoolFundingRate,
            iPoolFundingRateValue
        );
        // increment funding index
        currentFundingIndex = currentFundingIndex + 1;
    }

    /**
     * @notice Given the address of a tracer market this function will get the current fair price for that market
     */
    function fairPrice() public view override returns (uint256) {
        uint256 oraclePrice = oracle.latestAnswer();
        // calculates fairPrice
        // todo this can probably be optimised
        return uint256((oraclePrice.toInt256() - timeValue).abs());
    }

    ////////////////////////////
    ///  SETTER FUNCTIONS   ///
    //////////////////////////

    /**
     * @notice Calculates and then updates the time Value for a tracer market
     */
    function updateTimeValue() internal {
        (uint256 avgPrice, uint256 oracleAvgPrice) = get24HourPrices();
        timeValue =
            timeValue +
            ((avgPrice.toInt256() - oracleAvgPrice.toInt256()) / 90);
    }

    /**
     * @notice Sets the values of the fundingRate struct
     * @param fundingRate The funding Rate of the Tracer, calculated by updateFundingRate
     * @param cumulativeFundingRate The cumulativeFundingRate, incremented each time the funding rate is updated
     */
    function setFundingRate(int256 fundingRate, int256 cumulativeFundingRate)
        internal
    {
        fundingRates[currentFundingIndex] = Prices.FundingRateInstant(
            block.timestamp,
            fundingRate,
            cumulativeFundingRate
        );
    }

    /**
     * @notice Sets the values of the fundingRate struct for a particular Tracer Marker
     * @param fundingRate The insurance funding Rate of the Tracer, calculated by updateFundingRate
     * @param cumulativeFundingRate The cumulativeFundingRate, incremented each time the funding rate is updated
     */
    function setInsuranceFundingRate(
        int256 fundingRate,
        int256 cumulativeFundingRate
    ) internal {
        insuranceFundingRates[currentFundingIndex] = Prices.FundingRateInstant(
            block.timestamp,
            fundingRate,
            cumulativeFundingRate
        );
    }

    // todo by using public variables lots of these can be removed
    /**
     * @return each variable of the fundingRate struct of a particular tracer at a particular funding rate index
     */
    function getFundingRate(uint256 index)
        public
        view
        override
        returns (Prices.FundingRateInstant memory)
    {
        Prices.FundingRateInstant memory fundingRate = fundingRates[index];
        return
            Prices.FundingRateInstant(
                fundingRate.timestamp,
                fundingRate.fundingRate,
                fundingRate.cumulativeFundingRate
            );
    }

    /**
     * @return all of the variables in the funding rate struct (insurance rate) from a particular tracer market
     */
    function getInsuranceFundingRate(uint256 index)
        public
        view
        override
        returns (Prices.FundingRateInstant memory)
    {
        Prices.FundingRateInstant memory fundingRate =
            insuranceFundingRates[index];
        return
            Prices.FundingRateInstant(
                fundingRate.timestamp,
                fundingRate.fundingRate,
                fundingRate.cumulativeFundingRate
            );
    }

    /**
     * @notice Gets an 8 hour time weighted avg price for a given tracer, at a particular hour. More recent prices are weighted more heavily.
     * @param hour An integer representing what hour of the day to collect from (0-24)
     * @return the time weighted average price for both the oraclePrice (derivative price) and the Tracer Price
     */
    function getTWAPs(uint256 hour)
        public
        view
        override
        returns (uint256, uint256)
    {
        uint256 underlyingSum = 0;
        uint256 derivativeSum = 0;
        uint256 derivativeInstances = 0;
        uint256 underlyingInstances = 0;
        for (uint256 i = 0; i < 8; i++) {
            uint256 timeWeight = 8 - i;
            uint256 j = hour - i; // keep moving towards 0
            // loop back around list if required
            if (j < 0) {
                j = 23;
            }
            uint256 derivativePrice = getHourlyAvgTracerPrice(uint256(j));
            uint256 underlyingPrice = getHourlyAvgOraclePrice(uint256(j));
            if (derivativePrice != 0) {
                derivativeInstances = derivativeInstances + uint256(timeWeight);
                derivativeSum = derivativeSum + (timeWeight * derivativePrice);
            }
            if (underlyingPrice != 0) {
                underlyingInstances = underlyingInstances + uint256(timeWeight);
                underlyingSum = underlyingSum + (timeWeight * underlyingPrice);
            }
        }
        if (derivativeInstances == 0) {
            // Not enough market data yet
            return (0, 0);
        }
        return (
            underlyingSum / underlyingInstances,
            derivativeSum / derivativeInstances
        );
    }

    /**
     * @notice Gets a 24 hour tracer and oracle price for a given tracer market
     * @return the average price over a 24 hour period for oracle and Tracer price
     */
    function get24HourPrices() public view override returns (uint256, uint256) {
        Types.PricingMetrics memory pricing = price;
        uint256 runningTotal = 0;
        uint256 oracleRunningTotal = 0;
        uint8 numberOfHoursPresent = 0;
        uint8 numberOfOracleHoursPresent = 0;
        for (uint8 i = 0; i < 23; i++) {
            Types.HourlyPrices memory hourlyPrice =
                pricing.hourlyTracerPrices[i];
            Types.HourlyPrices memory oracleHourlyPrice =
                pricing.hourlyOraclePrices[i];
            if (hourlyPrice.numTrades != 0) {
                runningTotal =
                    runningTotal +
                    (uint256(hourlyPrice.totalPrice) / hourlyPrice.numTrades);
                numberOfHoursPresent = numberOfHoursPresent + 1;
            }
            if (oracleHourlyPrice.numTrades != 0) {
                oracleRunningTotal =
                    oracleRunningTotal +
                    (uint256(oracleHourlyPrice.totalPrice) /
                        oracleHourlyPrice.numTrades);
                numberOfOracleHoursPresent = numberOfOracleHoursPresent + 1;
            }
        }
        return (
            runningTotal / numberOfHoursPresent,
            oracleRunningTotal / numberOfOracleHoursPresent
        );
    }

    /**
     * @notice Gets the average tracer price for a given market during a certain hour
     * @param hour The hour of which you want the hourly average Price
     * @return the average price of the tracer for a particular hour
     */
    function getHourlyAvgTracerPrice(uint256 hour)
        public
        view
        override
        returns (uint256)
    {
        Types.PricingMetrics memory pricing = price;
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
            return hourly.totalPrice / hourly.numTrades;
        }
    }

    /**
     * @notice Gets the average oracle price for a given market during a certain hour
     * @param hour The hour of which you want the hourly average Price
     */
    function getHourlyAvgOraclePrice(uint256 hour)
        public
        view
        override
        returns (uint256)
    {
        Types.PricingMetrics memory pricing = price;
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
            return hourly.totalPrice / hourly.numTrades;
        }
    }

    /**
     * @dev Used when only valid tracers are allowed
     */
    modifier onlyTracer() {
        require(msg.sender == tracer, "PRC: Only Tracer");
        _;
    }
}
