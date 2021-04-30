// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import './lib/SafetyWithdraw.sol';
import './lib/LibMath.sol';
import {Balances} from './lib/LibBalances.sol';
import {Types} from './Interfaces/Types.sol';
import './Interfaces/IOracle.sol';
import './Interfaces/IInsurance.sol';
import './Interfaces/IAccount.sol';
import './Interfaces/ITracerPerpetualSwaps.sol';
import './Interfaces/IPricing.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract TracerPerpetualSwaps is ITracerPerpetualSwaps, Ownable, SafetyWithdraw {
    using LibMath for uint256;
    using LibMath for int256;

    uint256 public override FUNDING_RATE_SENSITIVITY;
    uint256 public constant override LIQUIDATION_GAS_COST = 63516;
    uint256 public immutable override priceMultiplier;
    address public immutable override tracerBaseToken;
    bytes32 public immutable override marketId;
    IAccount public accountContract;
    IPricing public pricingContract;
    IInsurance public insuranceContract;
    address public liquidationContract;
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

    // Account1 => account2 => whether account2 can trade on behalf of account1
    mapping(address => mapping(address => bool)) public tradePermissions;

    // Account State Variables
    mapping(address => Types.AccountBalance) public balances;
    uint256 public tvl;
    int256 public override leveragedNotionalValue;

    event FeeReceiverUpdated(address receiver);
    event HourlyPriceUpdated(int256 price, uint256 currentHour);
    event FundingRateUpdated(int256 fundingRate, int256 fundingRateValue);
    event InsuranceFundingRateUpdated(int256 insuranceFundingRate, int256 insuranceFundingRateValue);
    event OrderMade(
        uint256 indexed orderId,
        uint256 amount,
        int256 price,
        address indexed maker,
        bool isLong,
        bytes32 indexed marketId
    );
    event OrderFilled(
        uint256 indexed orderId,
        uint256 amount,
        uint256 amountOutstanding,
        address indexed taker,
        address maker,
        bytes32 indexed marketId
    );
    event Deposit(address indexed user, uint256 indexed amount);
    event Withdraw(address indexed user, uint256 indexed amount);
    event Settled(address indexed account, int256 margin);

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
        address _liquidationContract,
        int256 _maxLeverage,
        uint256 fundingRateSensitivity
    ) public Ownable() {
        accountContract = IAccount(_accountContract);
        pricingContract = IPricing(_pricingContract);
        liquidationContract = _liquidationContract;
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
     * @notice Allows a user to deposit into their margin account
     * @dev this contract must be an approvexd spender of the markets base token on behalf of the depositer.
     * @param amount The amount of base tokens to be deposited into the Tracer Market account
     */
    function deposit(uint256 amount) public {
        require(amount > 0, 'ACT: Deposit Amount <= 0');
        Types.AccountBalance storage userBalance = balances[msg.sender];
        IERC20(tracerBaseToken).transferFrom(msg.sender, address(this), amount);
        userBalance.base = userBalance.base + amount.toInt256();
        int256 originalLeverage = userBalance.totalLeveragedValue;

        _updateAccountLeverage(
            userBalance.quote,
            pricingContract.fairPrices(address(this)),
            userBalance.base,
            msg.sender,
            originalLeverage
        );
        tvl = tvl + amount;
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Allows a user to withdraw from their margin account
     * @dev Ensures that the users margin percent is valid after withdraw
     * @param amount The amount of margin tokens to be withdrawn from the tracer market account
     */
    function withdraw(uint256 amount) external {
        Types.AccountBalance storage userBalance = balances[msg.sender];
        require(
            marginIsValid(
                userBalance.base - amount.toInt256(), //todo unsafe cast
                userBalance.quote,
                pricingContract.fairPrices(address(this)),
                userBalance.lastUpdatedGasPrice,
                address(this)
            ),
            'ACT: Withdraw below valid Margin'
        );

        IERC20(tracerBaseToken).transfer(msg.sender, amount);
        userBalance.base = userBalance.base - amount.toInt256();
        int256 originalLeverage = userBalance.totalLeveragedValue;
        _updateAccountLeverage(
            userBalance.quote,
            pricingContract.fairPrices(address(this)),
            userBalance.base,
            msg.sender,
            originalLeverage
        );

        // Safemath will throw if tvl[market] < amount
        tvl = tvl - amount;
        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice Sets the pricing constants initiallly in the pricing contract
     */
    function initializePricing() public override onlyOwner {
        require(!pricingInitialized, 'TCR: Pricing already set');
        // Set first funding rates to 0 and current time
        int256 oracleLatestPrice = IOracle(oracle).latestAnswer();
        pricingContract.setFundingRate(address(this), oracleLatestPrice, 0, 0);
        pricingContract.setInsuranceFundingRate(address(this), oracleLatestPrice, 0, 0);

        pricingContract.incrementFundingIndex(address(this));
        pricingInitialized = true;
    }

    // TODO: Once whitelisting of trading interfaces is implemented this should
    // only be called by a whitelisted interface
    /**
     * @notice Match two orders that exist on chain against each other
     * @param order1 the first order
     * @param order2 the second order
     * @param fillAmount the amount to be filled as sent by the trader
     */
    function matchOrders(
        Types.Order memory order1,
        Types.Order memory order2,
        uint256 fillAmount
    ) public override {
        // perform compatibility checks
        require(order1.price == order2.price, 'TCR: Price mismatch');
        int256 orderPrice = order1.price;

        // Ensure orders are for opposite sides
        require(order1.side != order2.side, 'TCR: Same side');

        /* solium-disable-next-line */
        require(block.timestamp < order1.expiration && block.timestamp < order2.expiration, 'TCR: Order expired');

        require(order1.filled < order1.amount && order2.filled < order2.amount, 'TCR: Order already filled');

        address order1User = order1.maker;
        address order2User = order2.maker;
        bool order1Side = order1.side;
        int256 baseChange = (fillAmount.toInt256() * orderPrice) / priceMultiplier.toInt256();

        //Update account states
        updateAccounts(baseChange, fillAmount, order1Side, order1User, order2User);

        // Update leverage
        accountContract.updateAccountLeverage(order1User, address(this));
        accountContract.updateAccountLeverage(order2User, address(this));

        // Settle accounts
        settle(order1User);
        settle(order2User);

        // Update internal trade state
        updateInternalRecords(orderPrice);

        // Ensures that you are in a position to take the trade
        require(
            accountContract.userMarginIsValid(order1User, address(this)) &&
                accountContract.userMarginIsValid(order2User, address(this)),
            'TCR: Margin Invalid post trade'
        );
    }

    /**
     * @notice Updates account states of two accounts given a change in base, an amount of positions filled and
     *         the side of the first account listed.
     * @dev relies on the account contarct to perform actual state update for a trade.
     */
    function updateAccounts(
        int256 baseChange,
        uint256 fillAmount,
        bool user1Side,
        address user1,
        address user2
    ) internal {
        //Update account states
        int256 neg1 = -1;

        if (user1Side) {
            // User 1 long, user 2 short
            // short - base increased, quote decreased
            updateAccountOnTrade(baseChange, neg1 * fillAmount.toInt256(), user2);
            // long - base decreased, quote increased
            updateAccountOnTrade(neg1 * baseChange, fillAmount.toInt256(), user1);
        } else {
            // User 2 long, user 1 short
            // long - base decreased, quote increased
            updateAccountOnTrade(neg1 * baseChange, fillAmount.toInt256(), user2);
            // short - base increased, quote decreased
            updateAccountOnTrade(baseChange, neg1 * fillAmount.toInt256(), user1);
        }
    }

    /**
     * @notice Updates the account state of a user given a specific tracer, in a trade event. Adds the
     *         passed in margin and position changes to the current margin and position.
     * @dev Related to permissionedTakeOrder() in TracerPerpetualSwaps.sol
     * @param baseChange Is equal to: FillAmount * uint256(order.price))) / priceMultiplier).toInt256()
     * @param quoteChange The amount of the order filled changed to be negative (e.g. if 100$ of the order is filled this would be -$100  )
     * @param account The address of the account to be updated
     */
    function updateAccountOnTrade(
        int256 baseChange,
        int256 quoteChange,
        address account
    ) internal {
        Types.AccountBalance storage userBalance = balances[account];
        userBalance.base = userBalance.base + baseChange;
        userBalance.quote = userBalance.quote + quoteChange;
        userBalance.lastUpdatedGasPrice = IOracle(gasPriceOracle).latestAnswer();
    }

    /**
     * @notice internal function for updating leverage. Called within the Account contract. Also
     *         updates the total leveraged notional value for the tracer market itself.
     */
    function _updateAccountLeverage(
        int256 quote,
        int256 price,
        int256 base,
        address account,
        int256 originalLeverage
    ) internal {
        int256 newLeverage = Balances.newCalcLeveragedNotionalValue(quote, price, base, priceMultiplier);
        balances[account].totalLeveragedValue = newLeverage;

        // Update market leveraged notional value
        updateTracerLeverage(newLeverage, originalLeverage);
    }

    // todo this can probably be a library function?
    /**
     * @notice Updates the global leverage value given an accounts new leveraged value and old leveraged value
     * @param accountNewLeveragedNotional The future notional value of the account
     * @param accountOldLeveragedNotional The stored notional value of the account
     */
    function updateTracerLeverage(int256 accountNewLeveragedNotional, int256 accountOldLeveragedNotional) internal {
        /*
        Update notional value
        Method:
        For both maker and taker, calculate the new leveraged notional value, as well as their change
        in leverage. In 3 cases, this should update the global leverage. There are only 3 cases since we don"t
        want the contract to store negative leverage (over collateralized accounts should not zero out leveraged accounts)
        
        Cases are:
        a. New leverage is positive and the accounts previous leveraged was positive (leverage increase)
        total contract leverage has increased by the difference between these two (delta)
        b. new leveraged is positive, and old leverage was negative (leverage increase)
        total contract leverage has increased by the difference between zero and the new leverage
        c. new leverage is negative, the change in leverage is negative, but the old leverage was positive (leverage decrease)
        total contract leverage has decreased by the difference between the old leverage and zero
        (which is the old leveraged value)
        */
        int256 accountDelta = accountNewLeveragedNotional - accountOldLeveragedNotional;
        if (accountNewLeveragedNotional > 0 && accountOldLeveragedNotional >= 0) {
            leveragedNotionalValue = leveragedNotionalValue + accountDelta;
        } else if (accountNewLeveragedNotional > 0 && accountOldLeveragedNotional < 0) {
            leveragedNotionalValue = leveragedNotionalValue + accountNewLeveragedNotional;
        } else if (accountNewLeveragedNotional <= 0 && accountDelta < 0 && accountOldLeveragedNotional > 0) {
            leveragedNotionalValue = leveragedNotionalValue - accountOldLeveragedNotional;
        }
    }

    function updateAccountsOnLiquidation(
        address liquidator,
        address liquidatee,
        int256 liquidatorBaseChange,
        int256 liquidatorQuoteChange,
        int256 liquidateeBaseChange,
        int256 liquidateeQuoteChange,
        uint256 amountToEscrow
    ) external onlyLiquidation {
        // Limits the gas use when liquidating
        /* TODO Add back functionality when account balance is stored in here
        int256 gasPrice = IOracle(gasPriceOracle()).latestAnswer();
        require(tx.gasprice <= uint256(gasPrice.abs()), "LIQ: GasPrice > FGasPrice");
        // Update liquidators last updated gas price
        Types.AccountBalance storage liquidatorBalance = balances[liquidator];
        liquidatorBalance.lastUpdatedGasPrice = gasPrice;
        liquidatorBalance.base = liquidatorBalance.base.add(liquidatorBaseChange).sub(amountToEscrow.toInt256());
        liquidatorBalance.quote = liquidatorBalance.quote.add(liquidatorQuoteChange);

        Types.AccountBalance storage liquidateeBalance = balances[liquidatee];
        liquidateeBalance.base = liquidateeBalance.base.add(liquidateeBaseChange);
        liquidateeBalance.quote = liquidateeBalance.quote.add(liquidateeQuoteChange);

        // Checks if the liquidator is in a valid position to process the liquidation 
        require(
            userMarginIsValid(
                liquidator,
                market
            ),
            "TCR: Taker undermargin"
        );
        */
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
        uint256 accountLastUpdatedIndex = balances[account].lastUpdatedIndex;
        uint256 currentGlobalFundingIndex = pricingContract.currentFundingIndex(address(this));

        // Only settle account if its last updated index was before the current global index
        if (accountLastUpdatedIndex < currentGlobalFundingIndex) {
            /*
             Get current and global funding statuses
             Note: global rates reference the last fully established rate (hence the -1), and not
             the current global rate. User rates reference the last saved user rate
            */
            (, , , int256 currentGlobalRate) =
                pricingContract.getFundingRate(address(this), pricingContract.currentFundingIndex(address(this)) - 1);
            (, , , int256 currentUserRate) = pricingContract.getFundingRate(address(this), accountLastUpdatedIndex);
            (, , , int256 currentInsuranceGlobalRate) =
                pricingContract.getInsuranceFundingRate(
                    address(this),
                    pricingContract.currentFundingIndex(address(this)) - 1
                );
            (, , , int256 currentInsuranceUserRate) =
                pricingContract.getInsuranceFundingRate(address(this), accountLastUpdatedIndex);

            // settle the account
            Types.AccountBalance storage accountBalance = balances[account];
            Types.AccountBalance storage insuranceBalance = balances[address(insuranceContract)];

            // Calc the difference in funding rates, remove price multiply factor
            int256 fundingDiff = currentGlobalRate - currentUserRate;

            // Update account, divide by 2x price multiplier to factor out price and funding rate scalar value
            // base - (fundingDiff * quote / (priceMultiplier * priceMultiplier))
            accountBalance.base = (accountBalance.base -
                (fundingDiff * accountBalance.quote) /
                ((priceMultiplier * priceMultiplier).toInt256()));
            // Update account gas price
            accountBalance.lastUpdatedGasPrice = IOracle(gasPriceOracle).latestAnswer();

            if (accountBalance.totalLeveragedValue > 0) {
                // calc and pay insurance funding rate
                int256 changeInInsuranceBalance =
                    ((currentInsuranceGlobalRate - currentInsuranceUserRate) * accountBalance.totalLeveragedValue) /
                        insuranceContract.INSURANCE_MUL_FACTOR();

                if (changeInInsuranceBalance > 0) {
                    // Only pay insurance fund if required
                    accountBalance.base = accountBalance.base - changeInInsuranceBalance;
                    insuranceBalance.base = insuranceBalance.base + changeInInsuranceBalance;
                    // uint is safe since changeInInsuranceBalance > 0
                }
            }

            // Update account index
            accountBalance.lastUpdatedIndex = pricingContract.currentFundingIndex(address(this));
            require(userMarginIsValid(account, msg.sender), 'ACT: Target under-margined');
            emit Settled(account, accountBalance.base);
        }
    }

    /**
     * @notice Updates the internal records for pricing, funding rate and interest
     * @param price The price to be used to update the internal records, this is the price that a trade occurred at
     *              (i.e. The price and order has been filled at)
     */
    function updateInternalRecords(int256 price) internal {
        IOracle ioracle = IOracle(oracle);
        if (startLastHour <= block.timestamp - 1 hours) {
            // emit the old hourly average
            int256 hourlyTracerPrice = pricingContract.getHourlyAvgTracerPrice(currentHour, address(this));
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
            int256 poolFundingRate = insuranceContract.getPoolFundingRate(address(this)).toInt256();

            pricingContract.updateFundingRate(address(this), ioracle.latestAnswer(), poolFundingRate);

            // Gather variables and emit events
            uint256 currentFundingIndex = pricingContract.currentFundingIndex(address(this));
            (, , int256 fundingRate, int256 fundingRateValue) =
                pricingContract.getFundingRate(address(this), currentFundingIndex);
            (, , int256 insuranceFundingRate, int256 insuranceFundingRateValue) =
                pricingContract.getInsuranceFundingRate(address(this), currentFundingIndex);
            emit FundingRateUpdated(fundingRate, fundingRateValue);
            emit InsuranceFundingRateUpdated(insuranceFundingRate, insuranceFundingRateValue);

            if (startLast24Hours <= block.timestamp - 24 hours) {
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
     * @notice Checks the validity of a potential margin given the necessary parameters
     * @param base The base value to be assessed (positive or negative)
     * @param quote The accounts quote units
     * @param price The market price of the quote asset
     * @param gasPrice The gas price
     * @param market The relevant tracer market
     * @return a bool representing the validity of a margin
     */
    function marginIsValid(
        int256 base,
        int256 quote,
        int256 price,
        int256 gasPrice,
        address market
    ) public view returns (bool) {
        int256 gasCost = gasPrice * LIQUIDATION_GAS_COST.toInt256();
        int256 minMargin = Balances.calcMinMargin(quote, price, base, gasCost, maxLeverage, priceMultiplier);
        int256 margin = Balances.calcMargin(quote, price, base, priceMultiplier);

        if (margin < 0) {
            /* Margin being less than 0 is always invalid, even if position is 0.
               This could happen if user attempts to over-withdraw */
            return false;
        }
        if (minMargin == 0) {
            return true;
        }

        return margin > minMargin;
    }

    /**
     * @notice Checks if a given accounts margin is valid
     * @param account The address of the account whose margin is to be checked
     * @param market The address of the tracer market of whose margin is to be checked
     * @return true if the margin is valid or false otherwise
     */
    function userMarginIsValid(address account, address market) public view returns (bool) {
        Types.AccountBalance memory accountBalance = balances[account];
        return
            marginIsValid(
                accountBalance.base,
                accountBalance.quote,
                pricingContract.fairPrices(market),
                accountBalance.lastUpdatedGasPrice,
                market
            );
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
        insuranceContract = IInsurance(insurance);
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

    function transferOwnership(address newOwner) public override(Ownable, ITracerPerpetualSwaps) onlyOwner {
        super.transferOwnership(newOwner);
    }

    modifier isPermissioned(address account) {
        require(msg.sender == account || tradePermissions[account][msg.sender], 'TCR: No trade permission');
        _;
    }

    modifier onlyLiquidation() {
        require(msg.sender == liquidationContract, 'TCR: Sender not liquidation contract');
        _;
    }
}
