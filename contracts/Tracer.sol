// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/LibMath.sol";
import {Balances} from "./lib/LibBalances.sol";
import {Types} from "./Interfaces/Types.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./Interfaces/IOracle.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/IAccount.sol";
import "./Interfaces/ITracer.sol";
import "./Interfaces/IPricing.sol";
import "./DEX/SimpleDex.sol";

contract Tracer is ITracer, SimpleDex, Ownable {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;
    using SafeERC20 for IERC20;

    uint256 public override FUNDING_RATE_SENSITIVITY;
    uint256 public constant override LIQUIDATION_GAS_COST = 63516;
    uint256 public immutable override priceMultiplier;
    address public immutable override tracerBaseToken;
    bytes32 public immutable override marketId;
    IAccount public accountContract;
    IPricing public pricingContract;
    uint256 public override feeRate;

    // Config variables
    address public override oracle;
    address public override gasPriceOracle;
    bool private pricingInitialized;
    int256 public override maxLeverage; // The maximum ratio of notionalValue to margin

    // Funding rate variables
    uint256 internal startLastHour;
    uint256 internal startLast24Hours;
    uint8 public override currentHour;
    address public insuranceContract;

    // Account1 => account2 => whether account2 can trade on behalf of account1
    mapping(address => mapping(address => bool)) public tradePermissions;

    event FeeReceiverUpdated(address receiver);
    event HourlyPriceUpdated(int256 price, uint256 currentHour);
    event FundingRateUpdated(int256 fundingRate, int256 fundingRateValue);
    event InsuranceFundingRateUpdated(int256 insuranceFundingRate, int256 insuranceFundingRateValue);
    event OrderMade(uint256 indexed orderId, uint256 amount, int256 price, address indexed maker, bool isLong, bytes32 indexed marketId);
    event OrderFilled(uint256 indexed orderId, uint256 amount, uint256 amountOutstanding, address indexed taker, address maker, bytes32 indexed marketId);


    /**
     * @notice Creates a new tracer market and sets the initial funding rate of the market. Anyone
     *         will be able to purchase and trade tracers after this deployment.
     * @param _marketId the id of the market, given as BASE/QUOTE
     * @param _tracerBaseToken the address of the token used for margin accounts (i.e. The margin token)
     * @param _oracle the address of the contract implementing the tracer oracle interface
     * @param _gasPriceOracle the address of the contract implementing gas price oracle
     * @param _accountContract the address of the contract implementing the IAccount.sol interface
     * @param _pricingContract the address of the contract implementing the IPricing.sol interface
     */
    constructor(
        bytes32 _marketId,
        address _tracerBaseToken,
        address _oracle,
        address _gasPriceOracle,
        address _accountContract,
        address _pricingContract,
        int256 _maxLeverage,
        uint256 fundingRateSensitivity
    ) public Ownable() {
        accountContract = IAccount(_accountContract);
        pricingContract = IPricing(_pricingContract);
        tracerBaseToken = _tracerBaseToken;
        oracle = _oracle;
        gasPriceOracle = _gasPriceOracle;
        marketId = _marketId;
        IOracle ioracle = IOracle(oracle);
        priceMultiplier = 10**uint256(ioracle.decimals());
        feeRate = 0;
        maxLeverage = _maxLeverage;
        FUNDING_RATE_SENSITIVITY = fundingRateSensitivity;

        // Start average prices from deployment
        startLastHour = block.timestamp;
        startLast24Hours = block.timestamp;
    }

    /**
     * @notice Sets the pricing constants initiallly in the pricing contract
     */
    function initializePricing() public override onlyOwner {
        require(!pricingInitialized, "TCR: Pricing already set");
        // Set first funding rates to 0 and current time
        int256 oracleLatestPrice = IOracle(oracle).latestAnswer();
        pricingContract.setFundingRate(address(this), oracleLatestPrice, 0, 0);
        pricingContract.setInsuranceFundingRate(address(this), oracleLatestPrice, 0, 0);

        pricingContract.incrementFundingIndex(address(this));
        pricingInitialized = true;
    }

    /**
     * @notice Places an on chain order, fillable by any part on chain
     * @dev passes data to permissionedMakeOrder.
     * @param amount the amount of Tracers to buy
     * @param price the price at which someone can purchase (or "fill") 1 tracer of this order
     * @param side the side of the order. True for long, false for short.
     * @param expiration the expiry time for this order
     * @return (orderCounter - 1)
     */
    function makeOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration
    ) public override returns (uint256) {
        return permissionedMakeOrder(amount, price, side, expiration, msg.sender);
    }

    /**
     * @notice Places an on chain order via a permissioned contract, fillable by any part on chain.
     * @param amount the amount of Tracers to buy
     * @param price the price in dollars to buy the tracer at
     * @param side the side of the order. True for long, false for short.
     * @param expiration the expiry time for this order
     * @param maker the makers address for this order to be associated with
     */
    function permissionedMakeOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration,
        address maker
    ) public override isPermissioned(maker) returns (uint256) {
        {
            // Validate in its own context to help stack
            (int256 base, int256 quote, , , , ) = accountContract.getBalance(maker, address(this));

            // Check base will hold up after trade
            (int256 baseAfterTrade, int256 quoteAfterTrade) = Balances.safeCalcTradeMargin(
                base,
                quote,
                amount,
                price,
                side,
                priceMultiplier,
                feeRate
            );
            uint256 gasCost = uint256(IOracle(gasPriceOracle).latestAnswer()); // We multiply by LIQUIDATION_GAS_COST in Account.marginIsValid
            // Validates margin, will throw if margin is invalid
            require(
                accountContract.marginIsValid(baseAfterTrade, quoteAfterTrade, price, gasCost.toInt256(), address(this)),
                "TCR: Invalid margin"
            );
        }

        // This make order function happens in the DEX (decentralized exchange)
        uint256 orderCounter = _makeOrder(amount, price, side, expiration, maker);
        emit OrderMade(orderCounter, amount, price, maker, side, marketId);
        return orderCounter;
    }

    /**
     * @notice Takes an on chain order, you can specify the amount of the order you wish to will.
     * @param orderId the ID of the order to be filled. Emitted in the makeOrder function
     * @param amount the amount of tokens you wish to fill
     */
    function takeOrder(uint256 orderId, uint256 amount) public override {
        return permissionedTakeOrder(orderId, amount, msg.sender);
    }

    /**
     * @notice Takes an on chain order via a permissioned contract, in whole or in part. Order is executed at the makers
     *         defined price.
     * @param orderId the ID of the order to be filled. Emitted in the makeOrder function
     * @param amount the amount of the order to fill.
     * @param _taker the address of the taker which this order is associated with
     */
    function permissionedTakeOrder(
        uint256 orderId,
        uint256 amount,
        address _taker
    ) public override isPermissioned(_taker) {

        // Calculate the amount to fill
        // _takeOrder is a function in the Decentralized Exchange (DEX) contract
        // fillAmount is how much of the order will be filled (its not necessarily amount);
        (Types.Order memory order, uint256 fillAmount, uint256 amountOutstanding, address maker) = _takeOrder(orderId, amount, _taker);
        emit OrderFilled(orderId, amount, amountOutstanding, _taker, maker, marketId);

        int256 baseChange = (fillAmount.mul(uint256(order.price))).div(priceMultiplier).toInt256();
        require(baseChange > 0, "TCR: Margin change <= 0");

        int256 neg1 = -1;

        if (order.side) {
            // Maker long, taker short
            // sub taker position, add taker margin, add maker position, sub taker margin
            accountContract.updateAccountOnTrade(
                baseChange,
                neg1.mul(fillAmount.toInt256()),
                _taker,
                address(this)
            );
            accountContract.updateAccountOnTrade(
                neg1.mul(baseChange),
                fillAmount.toInt256(),
                order.maker,
                address(this)
            );
        } else {
            // Taker long, maker short
            // add taker position, sub taker margin, sub maker position, add maker margin
            accountContract.updateAccountOnTrade(
                neg1.mul(baseChange),
                fillAmount.toInt256(),
                _taker,
                address(this)
            );
            accountContract.updateAccountOnTrade(
                baseChange,
                neg1.mul(fillAmount.toInt256()),
                order.maker,
                address(this)
            );
        }
        
        // Update leverage
        accountContract.updateAccountLeverage(_taker, address(this));
        accountContract.updateAccountLeverage(order.maker, address(this));
        
        // Settle accounts
        settle(_taker);
        settle(order.maker);

        // Update internal trade state
        updateInternalRecords(order.price);

        // Ensures that you are in a position to take the trade
        require(
            accountContract.userMarginIsValid(_taker, address(this)) &&
                accountContract.userMarginIsValid(order.maker, address(this)),
            "TCR: Margin Invalid post trade"
        );
    }

    /**
     * @notice settles an account. Compares current global rate with the users last updated rate
     *         Updates the accounts margin balance accordingly.
     * @dev Ensures the account remains in a valid margin position. Will throw if account is under margin
     *      and the account must then be liquidated.
     * @param account the address to settle.
     * @dev This function aggregates data to feed into account.sol"s settle function which sets
     */
    function settle(address account) public override {
        // Get account and global last updated indexes
        (, , , , , uint256 accountLastUpdatedIndex) = accountContract.getBalance(account, address(this));
        uint256 currentGlobalFundingIndex = pricingContract.currentFundingIndex(address(this));

        // Only settle account if its last updated index was before the current global index
        if (accountLastUpdatedIndex < currentGlobalFundingIndex) {
            
            /*
             Get current and global funding statuses
             Note: global rates reference the last fully established rate (hence the -1), and not
             the current global rate. User rates reference the last saved user rate
            */
            (, , , int256 currentGlobalRate) = pricingContract.getFundingRate(
                address(this),
                pricingContract.currentFundingIndex(address(this)) - 1
            );
            (, , , int256 currentUserRate) = pricingContract.getFundingRate(address(this), accountLastUpdatedIndex);
            (, , , int256 currentInsuranceGlobalRate) = pricingContract.getInsuranceFundingRate(
                address(this),
                pricingContract.currentFundingIndex(address(this)) - 1
            );
            (, , , int256 currentInsuranceUserRate) = pricingContract.getInsuranceFundingRate(
                address(this),
                accountLastUpdatedIndex
            );

            accountContract.settle(
                account,
                IInsurance(insuranceContract).INSURANCE_MUL_FACTOR(),
                currentGlobalRate,
                currentUserRate,
                currentInsuranceGlobalRate,
                currentInsuranceUserRate,
                IOracle(gasPriceOracle).latestAnswer(),
                priceMultiplier,
                pricingContract.currentFundingIndex(address(this))
            );
        }
    }

    /**
     * @notice Updates the internal records for pricing, funding rate and interest
     * @param price The price to be used to update the internal records, this is the price that a trade occurred at
     *              (i.e. The price and order has been filled at)
     */
    function updateInternalRecords(int256 price) internal {
        IOracle ioracle = IOracle(oracle);
        if (startLastHour <= block.timestamp.sub(1 hours)) {
            // emit the old hourly average
            int256 hourlyTracerPrice =
                    pricingContract.getHourlyAvgTracerPrice(currentHour, address(this));
            emit HourlyPriceUpdated(hourlyTracerPrice, currentHour);

            // Update the price to a new entry and funding rate every hour
            // Check current hour and loop around if need be
            if (currentHour == 23) {
                currentHour = 0;
            } else {
                currentHour = currentHour + 1;
            }
            // Update pricing and funding rate states
            pricingContract.updatePrice(price, ioracle.latestAnswer(), true, address(this));
            int256 poolFundingRate = (IInsurance(insuranceContract).getPoolFundingRate(address(this))).toInt256();

            pricingContract.updateFundingRate(address(this), ioracle.latestAnswer(), poolFundingRate); 

            // Gather variables and emit events
            uint256 currentFundingIndex = pricingContract.currentFundingIndex(address(this));
            (,,int256 fundingRate, int256 fundingRateValue) =
                    pricingContract.getFundingRate(address(this), currentFundingIndex);
            (,,int256 insuranceFundingRate, int256 insuranceFundingRateValue) =
                    pricingContract.getInsuranceFundingRate(address(this), currentFundingIndex);
            emit FundingRateUpdated(fundingRate, fundingRateValue);
            emit InsuranceFundingRateUpdated(insuranceFundingRate, insuranceFundingRateValue);

            if (startLast24Hours <= block.timestamp.sub(24 hours)) {
                // Update the interest rate every 24 hours
                pricingContract.updateTimeValue(address(this));
                startLast24Hours = block.timestamp;
            }

            startLastHour = block.timestamp;
        } else {
            // Update old pricing entry
            pricingContract.updatePrice(price, ioracle.latestAnswer(), false, address(this));
        }
    }

    /**
     * @notice gets a order placed on chain
     * @return the order amount, amount filled, price and the side of an order
     * @param orderId The ID number of a placed order
     */
    function getOrder(uint256 orderId)
        external
        override
        view
        returns (
            uint256,
            uint256,
            int256,
            bool,
            address,
            uint256
        )
    {
        Types.Order memory order = orders[orderId];
        return (order.amount, order.filled, order.price, order.side, order.maker, order.creation);
    }

    /**
     * @notice gets the amount taken by a taker against an order
     * @param orderId The ID number of the order
     * @param taker The address of the taker account
     */
    function getOrderTakerAmount(uint256 orderId, address taker) external override view returns (uint256) {
        Types.Order storage order = orders[orderId];
        return (order.takers[taker]);
    }

    /**
     * @notice Gets the different balance variables of an account in this Tracer.
     * @dev Does so by calling the Account contract's getBalance
     * @param account The account whose balances will be returned
     */
    function tracerGetBalance(address account) external view override returns (
        int256 margin,
        int256 position,
        int256 totalLeveragedValue,
        uint256 deposited,
        int256 lastUpdatedGasPrice,
        uint256 lastUpdatedIndex
    ) {
        return accountContract.getBalance(account, address(this));
    }

    /**
     * @notice Gets the total leveraged notional value for this tracer from
              the account contract.
     * @return the total leveraged notional value of this tracer market
     */
    function leveragedNotionalValue() public override view returns(int256) {
        return accountContract.tracerLeveragedNotionalValue(address(this));
    }

    /**
     * @notice Sets the execution permissions for a specific address. This gives this address permission to
     *         open and close orders on behalf of the users account.
     * @dev No limit is enforced on amount spendable by permissioned users.
     * @param account the address of the account to have execution permissions set.
     * @param permission the permissions for this account to be set, true for giving permission, false to remove
     */
    function setUserPermissions(address account, bool permission) public override {
        tradePermissions[msg.sender][account] = permission;
    }

    // --------------------- //
    //  GOVERNANCE FUNCTIONS //
    // --------------------- //

    function setInsuranceContract(address insurance) public override onlyOwner {
        insuranceContract = insurance;
    }

    function setAccountContract(address account) public override onlyOwner {
        accountContract = IAccount(account);
    }

    function setPricingContract(address pricing) public override onlyOwner {
        pricingContract = IPricing(pricing);
    }

    function setOracle(address _oracle) public override onlyOwner {
        oracle = _oracle;
    }

    function setGasOracle(address _gasOracle) public override onlyOwner {
        gasPriceOracle = _gasOracle;
    }

    function setFeeRate(uint256 _feeRate) public override onlyOwner {
        feeRate = _feeRate;
    }

    function setMaxLeverage(int256 _maxLeverage) public override onlyOwner {
        maxLeverage = _maxLeverage;
    }

    function setFundingRateSensitivity(uint256 _fundingRateSensitivity) public override onlyOwner {
        FUNDING_RATE_SENSITIVITY = _fundingRateSensitivity;
    }

    function transferOwnership(address newOwner) public override(Ownable, ITracer) onlyOwner {
        super.transferOwnership(newOwner);
    }

    modifier isPermissioned(address account) {
        require(msg.sender == account || tradePermissions[account][msg.sender], "TCR: No trade permission");
        _;
    }
}
