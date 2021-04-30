// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./lib/SafetyWithdraw.sol";
import "./lib/LibMath.sol";
import { Balances } from "./lib/LibBalances.sol";
import { Types } from "./Interfaces/Types.sol";
import "./Interfaces/IOracle.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/IAccount.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/IPricing.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TracerPerpetualSwaps is
	ITracerPerpetualSwaps,
	Ownable,
	SafetyWithdraw
{
	using LibMath for uint256;
	using LibMath for int256;

	uint256 public override fundingRateSensitivity;
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

	// Account State Variables
	mapping(address => Types.AccountBalance) public balances;
	uint256 public tvl;
	int256 public override leveragedNotionalValue;

	event FeeReceiverUpdated(address receiver);
	event HourlyPriceUpdated(int256 price, uint256 currentHour);
	event FundingRateUpdated(int256 fundingRate, int256 fundingRateValue);
	event InsuranceFundingRateUpdated(
		int256 insuranceFundingRate,
		int256 insuranceFundingRateValue
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
	 * @param _pricingContract the address of the contract implementing the IPricing.sol interface
	 */
	constructor(
		bytes32 _marketId,
		address _tracerBaseToken,
		address _oracle,
		address _gasPriceOracle,
		address _pricingContract,
		address _liquidationContract,
		int256 _maxLeverage,
		uint256 fundingRateSensitivity,
		uint256 _feeRate
	) public Ownable() {
		pricingContract = IPricing(_pricingContract);
		liquidationContract = _liquidationContract;
		tracerBaseToken = _tracerBaseToken;
		oracle = _oracle;
		gasPriceOracle = _gasPriceOracle;
		marketId = _marketId;
		IOracle ioracle = IOracle(oracle);
		priceMultiplier = 10**uint256(ioracle.decimals());
		feeRate = _feeRate;
		maxLeverage = _maxLeverage;
		fundingRateSensitivity = fundingRateSensitivity;

		// Start average prices from deployment
		startLastHour = block.timestamp;
		startLast24Hours = block.timestamp;
	}

	/**
	 * @notice Allows a user to deposit into their margin account
	 * @dev this contract must be an approvexd spender of the markets base token on behalf of the depositer.
	 * @param amount The amount of base tokens to be deposited into the Tracer Market account
	 */
	function deposit(uint256 amount) external {
		Types.AccountBalance storage userBalance = balances[msg.sender];
		IERC20(tracerBaseToken).transferFrom(msg.sender, address(this), amount);

		// update user state
		userBalance.base = userBalance.base + amount.toInt256();
		_updateAccountLeverage(msg.sender);

		// update market TVL
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
		int256 newBase = userBalance.base - amount.toInt256();
		require(
			marginIsValid(
				newBase,
				userBalance.quote,
				pricingContract.fairPrices(address(this)),
				userBalance.lastUpdatedGasPrice
			),
			"TCR: Withdraw below valid Margin "
		);

		// update user state
		userBalance.base = newBase;
		_updateAccountLeverage(msg.sender);

		// Safemath will throw if tvl[market] < amount
		tvl = tvl - amount;

		// perform transfer
		IERC20(tracerBaseToken).transfer(msg.sender, amount);
		emit Withdraw(msg.sender, amount);
	}

	/**
	 * @notice Sets the pricing constants initiallly in the pricing contract
	 */
	function initializePricing() public override onlyOwner {
		require(!pricingInitialized, "TCR: Pricing already set ");
		// Set first funding rates to 0 and current time
		int256 oracleLatestPrice = IOracle(oracle).latestAnswer();
		pricingContract.setFundingRate(address(this), oracleLatestPrice, 0, 0);
		pricingContract.setInsuranceFundingRate(
			address(this),
			oracleLatestPrice,
			0,
			0
		);

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
		// todo order validation can be in the Tracer Lib
		require(order1.price == order2.price, "TCR: Price mismatch ");

		// Ensure orders are for opposite sides
		require(order1.side != order2.side, "TCR: Same side ");

		/* solium-disable-next-line */
		require(
			block.timestamp < order1.expiration &&
				block.timestamp < order2.expiration,
			"TCR: Order expired "
		);

		require(
			order1.filled < order1.amount && order2.filled < order2.amount,
			"TCR: Order already filled "
		);

		// update account states
		executeTrade(order1, order2, fillAmount);

		// update leverage
		_updateAccountLeverage(order1.maker);
		_updateAccountLeverage(order2.maker);

		// settle accounts
		settle(order1.maker);
		settle(order2.maker);

		// Update internal trade state
		// note: price has already been validated here, so order 1 price can be used
		updateInternalRecords(order1.price);

		// Ensures that you are in a position to take the trade
		require(
			userMarginIsValid(order1.maker) &&
				userMarginIsValid(order2.maker),
			"TCR: Margin Invalid post trade "
		);
	}

	/**
	 * @notice Updates account states of two accounts given two orders that are being executed
	 */
	function executeTrade(
		Types.Order memory order1,
		Types.Order memory order2,
		uint256 fillAmount
	) internal {
		int256 _fillAmount = fillAmount.toInt256();
		int256 baseChange =
			(_fillAmount * order1.price) / priceMultiplier.toInt256();

		//Update account states
		Types.AccountBalance storage account1 = balances[order1.maker];
		Types.AccountBalance storage account2 = balances[order2.maker];

		if (order1.side) {
			// user 1 is long. Increase quote, decrease base
			account1.base = account1.base - baseChange;
			account1.quote = account1.quote + _fillAmount;

			// user 2 is short. Increase base, decrease quote
			account2.base = account2.base + baseChange;
			account2.quote = account2.quote - _fillAmount;
		} else {
			// user 1 is short. Increase base, decrease quote
			account1.base = account1.base + baseChange;
			account1.quote = account1.quote - _fillAmount;

			// user 2 is long. Increase quote, decrease base
			account2.base = account2.base - baseChange;
			account2.quote = account2.quote + _fillAmount;
		}
	}

	/**
	 * @notice internal function for updating leverage. Called within the Account contract. Also
	 *         updates the total leveraged notional value for the tracer market itself.
	 */
	function _updateAccountLeverage(address account) internal {
		Types.AccountBalance memory userBalance = balances[account];
		int256 originalLeverage = userBalance.totalLeveragedValue;
		int256 newLeverage =
			Balances.newCalcLeveragedNotionalValue(
				userBalance.quote,
				pricingContract.fairPrices(address(this)),
				userBalance.base,
				priceMultiplier
			);
		balances[account].totalLeveragedValue = newLeverage;

		// Update market leveraged notional value
		_updateTracerLeverage(newLeverage, originalLeverage);
	}

	// todo these calcs can be in a library function
	/**
	 * @notice Updates the global leverage value given an accounts new leveraged value and old leveraged value
	 * @param accountNewLeveragedNotional The future notional value of the account
	 * @param accountOldLeveragedNotional The stored notional value of the account
	 */
	function _updateTracerLeverage(
		int256 accountNewLeveragedNotional,
		int256 accountOldLeveragedNotional
	) internal {
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
		int256 accountDelta =
			accountNewLeveragedNotional - accountOldLeveragedNotional;
		if (
			accountNewLeveragedNotional > 0 && accountOldLeveragedNotional >= 0
		) {
			leveragedNotionalValue = leveragedNotionalValue + accountDelta;
		} else if (
			accountNewLeveragedNotional > 0 && accountOldLeveragedNotional < 0
		) {
			leveragedNotionalValue =
				leveragedNotionalValue +
				accountNewLeveragedNotional;
		} else if (
			accountNewLeveragedNotional <= 0 &&
			accountDelta < 0 &&
			accountOldLeveragedNotional > 0
		) {
			leveragedNotionalValue =
				leveragedNotionalValue -
				accountOldLeveragedNotional;
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
		int256 gasPrice = IOracle(gasPriceOracle).latestAnswer();
		require(
			tx.gasprice <= uint256(gasPrice.abs()),
			"TCR: GasPrice > FGasPrice"
		);
		// Update liquidators last updated gas price
		Types.AccountBalance storage liquidatorBalance = balances[liquidator];
		Types.AccountBalance storage liquidateeBalance = balances[liquidatee];

        // update liquidators balance
        liquidatorBalance.lastUpdatedGasPrice = gasPrice;
		liquidatorBalance.base =
			liquidatorBalance.base +
			liquidatorBaseChange -
			amountToEscrow.toInt256();
		liquidatorBalance.quote =
			liquidatorBalance.quote +
			liquidatorQuoteChange;

        // update liquidatee balance
		liquidateeBalance.base = liquidateeBalance.base + liquidateeBaseChange;
		liquidateeBalance.quote =
			liquidateeBalance.quote +
			liquidateeQuoteChange;

		// Checks if the liquidator is in a valid position to process the liquidation
		require(
			userMarginIsValid(liquidator),
			"TCR: Taker undermargin"
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
		uint256 accountLastUpdatedIndex = balances[account].lastUpdatedIndex;
		uint256 currentGlobalFundingIndex =
			pricingContract.currentFundingIndex(address(this));

		// Only settle account if its last updated index was before the current global index
		if (accountLastUpdatedIndex < currentGlobalFundingIndex) {
			/*
             Get current and global funding statuses
             Note: global rates reference the last fully established rate (hence the -1), and not
             the current global rate. User rates reference the last saved user rate
            */
			(, , , int256 currentGlobalRate) =
				pricingContract.getFundingRate(
					address(this),
					pricingContract.currentFundingIndex(address(this)) - 1
				);
			(, , , int256 currentUserRate) =
				pricingContract.getFundingRate(
					address(this),
					accountLastUpdatedIndex
				);
			(, , , int256 currentInsuranceGlobalRate) =
				pricingContract.getInsuranceFundingRate(
					address(this),
					pricingContract.currentFundingIndex(address(this)) - 1
				);
			(, , , int256 currentInsuranceUserRate) =
				pricingContract.getInsuranceFundingRate(
					address(this),
					accountLastUpdatedIndex
				);

			// settle the account
			Types.AccountBalance storage accountBalance = balances[account];
			Types.AccountBalance storage insuranceBalance =
				balances[address(insuranceContract)];

            // todo pretty much all of the below should be in a library

			// Calc the difference in funding rates, remove price multiply factor
			int256 fundingDiff = currentGlobalRate - currentUserRate;
            
			// Update account, divide by 2x price multiplier to factor out price and funding rate scalar value
			// base - (fundingDiff * quote / (priceMultiplier * priceMultiplier))
			accountBalance.base = (accountBalance.base -
				(fundingDiff * accountBalance.quote) /
				((priceMultiplier * priceMultiplier).toInt256()));
			// Update account gas price
			accountBalance.lastUpdatedGasPrice = IOracle(gasPriceOracle)
				.latestAnswer();

			if (accountBalance.totalLeveragedValue > 0) {
				// calc and pay insurance funding rate
				int256 changeInInsuranceBalance =
					((currentInsuranceGlobalRate - currentInsuranceUserRate) *
						accountBalance.totalLeveragedValue) /
						insuranceContract.INSURANCE_MUL_FACTOR();

				if (changeInInsuranceBalance > 0) {
					// Only pay insurance fund if required
					accountBalance.base =
						accountBalance.base -
						changeInInsuranceBalance;
					insuranceBalance.base =
						insuranceBalance.base +
						changeInInsuranceBalance;
					// uint is safe since changeInInsuranceBalance > 0
				}
			}

			// Update account index
			accountBalance.lastUpdatedIndex = pricingContract
				.currentFundingIndex(address(this));
			require(
				userMarginIsValid(account),
				"TCR: Target under-margined "
			);
			emit Settled(account, accountBalance.base);
		}
	}

    // todo most of this logic should be in pricing. Tracer should simply
    // call pricing and let it handle if state needs to be updated
	/**
	 * @notice Updates the internal records for pricing, funding rate and interest
	 * @param price The price to be used to update the internal records, this is the price that a trade occurred at
	 *              (i.e. The price and order has been filled at)
	 */
	function updateInternalRecords(int256 price) internal {
		IOracle ioracle = IOracle(oracle);
		if (startLastHour <= block.timestamp - 1 hours) {
			// emit the old hourly average
			int256 hourlyTracerPrice =
				pricingContract.getHourlyAvgTracerPrice(
					currentHour,
					address(this)
				);
			emit HourlyPriceUpdated(hourlyTracerPrice, currentHour);

			// Update the price to a new entry and funding rate every hour
			// Check current hour and loop around if need be
			if (currentHour == 23) {
				currentHour = 0;
			} else {
				currentHour = currentHour + 1;
			}
			// Update pricing and funding rate states
			pricingContract.updatePrice(
				price,
				ioracle.latestAnswer(),
				true,
				address(this)
			);
			int256 poolFundingRate =
				insuranceContract.getPoolFundingRate(address(this)).toInt256();

			pricingContract.updateFundingRate(
				address(this),
				ioracle.latestAnswer(),
				poolFundingRate
			);

			// Gather variables and emit events
			uint256 currentFundingIndex =
				pricingContract.currentFundingIndex(address(this));
			(, , int256 fundingRate, int256 fundingRateValue) =
				pricingContract.getFundingRate(
					address(this),
					currentFundingIndex
				);
			(
				,
				,
				int256 insuranceFundingRate,
				int256 insuranceFundingRateValue
			) =
				pricingContract.getInsuranceFundingRate(
					address(this),
					currentFundingIndex
				);
			emit FundingRateUpdated(fundingRate, fundingRateValue);
			emit InsuranceFundingRateUpdated(
				insuranceFundingRate,
				insuranceFundingRateValue
			);

			if (startLast24Hours <= block.timestamp - 24 hours) {
				// Update the interest rate every 24 hours
				pricingContract.updateTimeValue(address(this));
				startLast24Hours = block.timestamp;
			}

			startLastHour = block.timestamp;
		} else {
			// Update old pricing entry
			pricingContract.updatePrice(
				price,
				ioracle.latestAnswer(),
				false,
				address(this)
			);
		}
	}

    // todo this function should be in a lib
	/**
	 * @notice Checks the validity of a potential margin given the necessary parameters
	 * @param base The base value to be assessed (positive or negative)
	 * @param quote The accounts quote units
	 * @param price The market price of the quote asset
	 * @param gasPrice The gas price
	 * @return a bool representing the validity of a margin
	 */
	function marginIsValid(
		int256 base,
		int256 quote,
		int256 gasPrice
	) public view returns (bool) {
        int256 price = pricingContract.fairPrices(address(this));
		int256 gasCost = gasPrice * LIQUIDATION_GAS_COST.toInt256();
		int256 minMargin =
			Balances.calcMinMargin(
				quote,
				price,
				base,
				gasCost,
				maxLeverage,
				priceMultiplier
			);
		int256 margin =
			Balances.calcMargin(quote, price, base, priceMultiplier);

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
	 * @return true if the margin is valid or false otherwise
	 */
	function userMarginIsValid(address account)
		public
		view
		returns (bool)
	{
		Types.AccountBalance memory accountBalance = balances[account];
		return
			marginIsValid(
				accountBalance.base,
				accountBalance.quote,
				accountBalance.lastUpdatedGasPrice
			);
	}

	// --------------------- //
	//  GOVERNANCE FUNCTIONS //
	// --------------------- //

	function setInsuranceContract(address insurance) public override onlyOwner {
		insuranceContract = IInsurance(insurance);
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

	function setFundingRateSensitivity(uint256 _fundingRateSensitivity)
		public
		override
		onlyOwner
	{
		fundingRateSensitivity = _fundingRateSensitivity;
	}

	function transferOwnership(address newOwner)
		public
		override(Ownable, ITracerPerpetualSwaps)
		onlyOwner
	{
		super.transferOwnership(newOwner);
	}

	modifier onlyLiquidation() {
		require(
			msg.sender == liquidationContract,
			"TCR: Sender not liquidation contract "
		);
		_;
	}
}
