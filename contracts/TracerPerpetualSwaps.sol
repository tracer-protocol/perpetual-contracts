// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./lib/SafetyWithdraw.sol";
import "./lib/LibMath.sol";
import {Balances} from "./lib/LibBalances.sol";
import {Types} from "./Interfaces/Types.sol";
import "./lib/LibPerpetuals.sol";
import "./Interfaces/IOracle.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/IPricing.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

contract TracerPerpetualSwaps is
    ITracerPerpetualSwaps,
    Ownable,
    SafetyWithdraw
{
    using LibMath for uint256;
    using LibMath for int256;
    using PRBMathSD59x18 for int256;
    using PRBMathUD60x18 for uint256;

    uint256 public override fundingRateSensitivity;
    uint256 public constant override LIQUIDATION_GAS_COST = 63516;
    // todo ensure these are fine being immutable
    address public immutable override tracerQuoteToken;
    uint256 public immutable override quoteTokenDecimals;
    bytes32 public immutable override marketId;
    IPricing public pricingContract;
    IInsurance public insuranceContract;
    address public override liquidationContract;
    uint256 public override feeRate;

    // Config variables
    address public override gasPriceOracle;
    uint256 public override maxLeverage; // The maximum ratio of notionalValue to margin

    // Account State Variables
    mapping(address => Balances.Account) public balances;
    uint256 public tvl;
    int256 public override leveragedNotionalValue;

    // Order state
    mapping(bytes32 => uint256) filled;

    // Trading interfaces whitelist
    mapping(address => bool) public override tradingWhitelist;

    event FeeReceiverUpdated(address receiver);
    event Deposit(address indexed user, uint256 indexed amount);
    event Withdraw(address indexed user, uint256 indexed amount);
    event Settled(address indexed account, int256 margin);

    /**
     * @notice Creates a new tracer market and sets the initial funding rate of the market. Anyone
     *         will be able to purchase and trade tracers after this deployment.
     * @param _marketId the id of the market, given as BASE/QUOTE
     * @param _tracerQuoteToken the address of the token used for margin accounts (i.e. The margin token)
     * @param _gasPriceOracle the address of the contract implementing gas price oracle
     * @param _liquidationContract the contract that manages liquidations for this market
     * @param _maxLeverage the max leverage of the market. Min margin is derived from this
     * @param _fundingRateSensitivity the affect funding rate changes have on funding paid.
     * @param _feeRate the fee to be taken on trades in this market
     */
    constructor(
        bytes32 _marketId,
        address _tracerQuoteToken,
        uint256 _tokenDecimals,
        address _gasPriceOracle,
        address _liquidationContract,
        uint256 _maxLeverage,
        uint256 _fundingRateSensitivity,
        uint256 _feeRate
    ) Ownable() {
        // don't convert to interface as we don't need to interact with the contract
        liquidationContract = _liquidationContract;
        tracerQuoteToken = _tracerQuoteToken;
        quoteTokenDecimals = _tokenDecimals;
        gasPriceOracle = _gasPriceOracle;
        marketId = _marketId;
        feeRate = _feeRate;
        maxLeverage = _maxLeverage;
        fundingRateSensitivity = _fundingRateSensitivity;
    }

    /**
     * @notice Allows a user to deposit into their margin account
     * @dev this contract must be an approvexd spender of the markets quote token on behalf of the depositer.
     * @param amount The amount of quote tokens to be deposited into the Tracer Market account. This amount
     * should be given with the correct decimal units of the token
     */
    function deposit(uint256 amount) external override {
        Balances.Account storage userBalance = balances[msg.sender];
        IERC20(tracerQuoteToken).transferFrom(
            msg.sender,
            address(this),
            amount
        );

        // update user state
        int256 amountToUpdate = Balances.tokenToWad(quoteTokenDecimals, amount);
        userBalance.position.quote =
            userBalance.position.quote +
            amountToUpdate;
        _updateAccountLeverage(msg.sender);

        // update market TVL
        // this cast is safe since amount > 0 on deposit and tokenToWad simply
        // multiplies the amount up to a WAD value
        tvl = tvl + uint256(amountToUpdate);
        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Allows a user to withdraw from their margin account
     * @dev Ensures that the users margin percent is valid after withdraw
     * @param amount The amount of margin tokens to be withdrawn from the tracer market account. This amount
     * should be given in WAD format
     */
    function withdraw(uint256 amount) external override {
        Balances.Account storage userBalance = balances[msg.sender];
        int256 newQuote = userBalance.position.quote - amount.toInt256();
        require(
            marginIsValid(
                newQuote,
                userBalance.position.base,
                userBalance.lastUpdatedGasPrice
            ),
            "TCR: Withdraw below valid Margin "
        );

        // update user state
        userBalance.position.quote = newQuote;
        _updateAccountLeverage(msg.sender);

        // Safemath will throw if tvl[market] < amount
        tvl = tvl - amount;

        // perform transfer
        uint256 transferAmount =
            Balances.wadToToken(quoteTokenDecimals, amount);
        IERC20(tracerQuoteToken).transfer(msg.sender, transferAmount);
        emit Withdraw(msg.sender, amount);
    }

    /**
     * @notice Match two orders that exist on chain against each other
     * @param order1 the first order
     * @param order2 the second order
     * @param fillAmount the amount to be filled as sent by the trader
     */
    function matchOrders(
        Perpetuals.Order memory order1,
        Perpetuals.Order memory order2,
        uint256 fillAmount
    ) public override onlyWhitelisted {
        uint256 filled1 = filled[Perpetuals.orderId(order1)];
        uint256 filled2 = filled[Perpetuals.orderId(order2)];

        // guard
        require(
            Perpetuals.canMatch(order1, filled1, order2, filled2),
            "TCR: Orders cannot be matched"
        );

        // settle accounts
        settle(order1.maker);
        settle(order2.maker);

        // update account states
        executeTrade(order1, order2, fillAmount);

        // update leverage
        _updateAccountLeverage(order1.maker);
        _updateAccountLeverage(order2.maker);

        // Update internal trade state
        // note: price has already been validated here, so order 1 price can be used
        pricingContract.recordTrade(order1.price, fillAmount);

        // Ensures that you are in a position to take the trade
        require(
            userMarginIsValid(order1.maker) && userMarginIsValid(order2.maker),
            "TCR: Margin Invalid post trade "
        );
    }

    /**
     * @notice Updates account states of two accounts given two orders that are being executed
     */
    function executeTrade(
        Perpetuals.Order memory order1,
        Perpetuals.Order memory order2,
        uint256 fillAmount
    ) internal {
        // fill amount > 0. Overflow occurs when fillAmount > 2^256 - 1
        int256 _fillAmount = fillAmount.toInt256();
        int256 quoteChange =
            PRBMathUD60x18.mul(fillAmount, order1.price).toInt256();

        // Update account states
        Balances.Account storage account1 = balances[order1.maker];
        Balances.Account storage account2 = balances[order2.maker];

        /* TODO: handle every enum arm! */
        if (order1.side == Perpetuals.Side.Long) {
            // user 1 is long. Increase base, decrease quote
            account1.position.quote = account1.position.quote - quoteChange;
            account1.position.base = account1.position.base + _fillAmount;

            // user 2 is short. Increase quote, decrease base
            account2.position.quote = account2.position.quote + quoteChange;
            account2.position.base = account2.position.base - _fillAmount;
        } else {
            // user 1 is short. Increase quote, decrease base
            account1.position.quote = account1.position.quote + quoteChange;
            account1.position.base = account1.position.base - _fillAmount;

            // user 2 is long. Increase base, decrease quote
            account2.position.quote = account2.position.quote - quoteChange;
            account2.position.base = account2.position.base + _fillAmount;
        }
    }

    /**
     * @notice internal function for updating leverage. Called within the Account contract. Also
     *         updates the total leveraged notional value for the tracer market itself.
     */
    function _updateAccountLeverage(address account) internal {
        Balances.Account memory userBalance = balances[account];
        uint256 originalLeverage = userBalance.totalLeveragedValue;
        Balances.Position memory pos =
            Balances.Position(
                userBalance.position.quote,
                userBalance.position.base
            );
        uint256 newLeverage =
            Balances.leveragedNotionalValue(pos, pricingContract.fairPrice());
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
        uint256 accountNewLeveragedNotional,
        uint256 accountOldLeveragedNotional
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

        // todo CASTING CHECK
        int256 _newLeverage = accountNewLeveragedNotional.toInt256();
        int256 _oldLeverage = accountOldLeveragedNotional.toInt256();
        int256 accountDelta = _newLeverage - _oldLeverage;
        if (_newLeverage > 0 && _oldLeverage >= 0) {
            leveragedNotionalValue = leveragedNotionalValue + accountDelta;
        } else if (_newLeverage > 0 && _oldLeverage < 0) {
            leveragedNotionalValue = leveragedNotionalValue + _newLeverage;
        } else if (_newLeverage <= 0 && accountDelta < 0 && _oldLeverage > 0) {
            leveragedNotionalValue = leveragedNotionalValue - _oldLeverage;
        }
    }

    function updateAccountsOnLiquidation(
        address liquidator,
        address liquidatee,
        int256 liquidatorQuoteChange,
        int256 liquidatorBaseChange,
        int256 liquidateeQuoteChange,
        int256 liquidateeBaseChange,
        uint256 amountToEscrow
    ) external override onlyLiquidation {
        // Limits the gas use when liquidating
        uint256 gasPrice = IOracle(gasPriceOracle).latestAnswer();
        require(tx.gasprice <= gasPrice, "TCR: GasPrice > FGasPrice");
        // Update liquidators last updated gas price
        Balances.Account storage liquidatorBalance = balances[liquidator];
        Balances.Account storage liquidateeBalance = balances[liquidatee];

        // update liquidators balance
        liquidatorBalance.lastUpdatedGasPrice = gasPrice;
        liquidatorBalance.position.quote =
            liquidatorBalance.position.quote +
            liquidatorQuoteChange -
            amountToEscrow.toInt256();
        liquidatorBalance.position.base =
            liquidatorBalance.position.base +
            liquidatorBaseChange;

        // update liquidatee balance
        liquidateeBalance.position.quote =
            liquidateeBalance.position.quote +
            liquidateeQuoteChange;
        liquidateeBalance.position.base =
            liquidateeBalance.position.base +
            liquidateeBaseChange;

        // Checks if the liquidator is in a valid position to process the liquidation
        require(userMarginIsValid(liquidator), "TCR: Taker undermargin");
    }

    function updateAccountsOnClaim(
        address claimant,
        int256 amountToGiveToClaimant,
        address liquidatee,
        int256 amountToGiveToLiquidatee,
        int256 amountToTakeFromInsurance
    ) external override onlyLiquidation {
        address insuranceAddr = address(insuranceContract);
        balances[insuranceAddr].position.quote =
            balances[insuranceAddr].position.quote -
            amountToTakeFromInsurance;
        balances[claimant].position.quote =
            balances[claimant].position.quote +
            amountToGiveToClaimant;
        balances[liquidatee].position.quote =
            balances[liquidatee].position.quote +
            amountToGiveToLiquidatee;
        require(
            balances[insuranceAddr].position.quote > 0,
            "TCR: Insurance not adequately funded"
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
            pricingContract.currentFundingIndex();

        // Only settle account if its last updated index was before the current global index
        if (accountLastUpdatedIndex < currentGlobalFundingIndex) {
            /*
             Get current and global funding statuses
             Note: global rates reference the last fully established rate (hence the -1), and not
             the current global rate. User rates reference the last saved user rate
            */
            (, , , int256 currentGlobalRate) =
                pricingContract.getFundingRate(
                    pricingContract.currentFundingIndex() - 1
                );
            (, , , int256 currentUserRate) =
                pricingContract.getFundingRate(accountLastUpdatedIndex);
            (, , , int256 currentInsuranceGlobalRate) =
                pricingContract.getInsuranceFundingRate(
                    pricingContract.currentFundingIndex() - 1
                );
            (, , , int256 currentInsuranceUserRate) =
                pricingContract.getInsuranceFundingRate(
                    accountLastUpdatedIndex
                );

            // settle the account
            Balances.Account storage accountBalance = balances[account];
            Balances.Account storage insuranceBalance =
                balances[address(insuranceContract)];

            // todo pretty much all of the below should be in a library

            // Calc the difference in funding rates, remove price multiply factor
            int256 fundingDiff = currentGlobalRate - currentUserRate;

            // quote - (fundingDiff * base
            accountBalance.position.quote =
                accountBalance.position.quote -
                PRBMathSD59x18.mul(fundingDiff, accountBalance.position.base);
            // Update account gas price
            accountBalance.lastUpdatedGasPrice = IOracle(gasPriceOracle)
                .latestAnswer();

            if (accountBalance.totalLeveragedValue > 0) {
                // calc and pay insurance funding rate
                // todo CASTING CHECK
                int256 changeInInsuranceBalance =
                    ((currentInsuranceGlobalRate - currentInsuranceUserRate) *
                        accountBalance.totalLeveragedValue.toInt256()) /
                        insuranceContract.INSURANCE_MUL_FACTOR();

                if (changeInInsuranceBalance > 0) {
                    // Only pay insurance fund if required
                    accountBalance.position.quote =
                        accountBalance.position.quote -
                        changeInInsuranceBalance;
                    insuranceBalance.position.quote =
                        insuranceBalance.position.quote +
                        changeInInsuranceBalance;
                    // uint is safe since changeInInsuranceBalance > 0
                }
            }

            // Update account index
            accountBalance.lastUpdatedIndex = pricingContract
                .currentFundingIndex();
            require(userMarginIsValid(account), "TCR: Target under-margined ");
            emit Settled(account, accountBalance.position.quote);
        }
    }

    // todo this function should be in a lib
    /**
     * @notice Checks the validity of a potential margin given the necessary parameters
     * @param quote The quote value to be assessed (positive or negative)
     * @param base The accounts base units
     * @param gasPrice The gas price
     * @return a bool representing the validity of a margin
     */
    function marginIsValid(
        int256 quote,
        int256 base,
        uint256 gasPrice
    ) public view returns (bool) {
        uint256 price = pricingContract.fairPrice();
        uint256 gasCost = gasPrice * LIQUIDATION_GAS_COST;
        Balances.Position memory pos = Balances.Position(quote, base);
        uint256 minMargin =
            Balances.minimumMargin(pos, price, gasCost, maxLeverage);
        int256 margin = Balances.margin(pos, price);

        if (margin < 0) {
            /* Margin being less than 0 is always invalid, even if position is 0.
               This could happen if user attempts to over-withdraw */
            return false;
        }
        if (minMargin == 0) {
            return true;
        }

        // todo CASTING CHECK
        return margin > minMargin.toInt256();
    }

    /**
     * @notice Checks if a given accounts margin is valid
     * @param account The address of the account whose margin is to be checked
     * @return true if the margin is valid or false otherwise
     */
    function userMarginIsValid(address account) public view returns (bool) {
        Balances.Account memory accountBalance = balances[account];
        return
            marginIsValid(
                accountBalance.position.quote,
                accountBalance.position.base,
                accountBalance.lastUpdatedGasPrice
            );
    }

    function getBalance(address account)
        public
        view
        override
        returns (Balances.Account memory)
    {
        return balances[account];
    }

    function setInsuranceContract(address insurance) public override onlyOwner {
        insuranceContract = IInsurance(insurance);
    }

    function setPricingContract(address pricing) public override onlyOwner {
        pricingContract = IPricing(pricing);
    }

    function setGasOracle(address _gasOracle) public override onlyOwner {
        gasPriceOracle = _gasOracle;
    }

    function setFeeRate(uint256 _feeRate) public override onlyOwner {
        feeRate = _feeRate;
    }

    function setMaxLeverage(uint256 _maxLeverage) public override onlyOwner {
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

    /**
     * @notice allows the owner of a market to set the whitelisting of a trading interface address
     * @dev a permissioned interface may call the matchOrders function.
     * @param tradingContract the contract to have its whitelisting permissions set
     * @param whitelisted the permission of the contract. If true this contract make call makeOrder
     */
    function setWhitelist(address tradingContract, bool whitelisted)
        external
        onlyOwner
    {
        tradingWhitelist[tradingContract] = whitelisted;
    }

    modifier onlyLiquidation() {
        require(
            msg.sender == liquidationContract,
            "TCR: Sender not liquidation contract "
        );
        _;
    }

    modifier onlyWhitelisted() {
        require(tradingWhitelist[msg.sender], "TCR: Contract not whitelisted");
        _;
    }
}
