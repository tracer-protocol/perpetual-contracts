// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./lib/SafetyWithdraw.sol";
import "./lib/LibMath.sol";
import {Balances} from "./lib/LibBalances.sol";
import {Types} from "./Interfaces/Types.sol";
import "./lib/LibPrices.sol";
import "./lib/LibPerpetuals.sol";
import "./Interfaces/IOracle.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/IPricing.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

import "hardhat/console.sol";

contract TracerPerpetualSwaps is
    ITracerPerpetualSwaps,
    Ownable,
    SafetyWithdraw
{
    using LibMath for uint256;
    using LibMath for int256;
    using PRBMathSD59x18 for int256;
    using PRBMathUD60x18 for uint256;

    uint256 public override fundingRateSensitivity; //WAD value. sensitivity of 1 = 1*10^18
    uint256 public constant override LIQUIDATION_GAS_COST = 63516;
    // todo ensure these are fine being immutable
    address public immutable override tracerQuoteToken;
    uint256 public immutable override quoteTokenDecimals;
    bytes32 public immutable override marketId;
    IPricing public pricingContract;
    IInsurance public insuranceContract;
    address public override liquidationContract;
    uint256 public override feeRate;
    uint256 public fees;
    address public feeReceiver;

    // Config variables
    address public override gasPriceOracle;
    uint256 public override maxLeverage; // The maximum ratio of notionalValue to margin

    // Account State Variables
    mapping(address => Balances.Account) public balances;
    uint256 public tvl;
    uint256 public override leveragedNotionalValue;

    // Order state
    mapping(bytes32 => uint256) filled;

    // Trading interfaces whitelist
    mapping(address => bool) public override tradingWhitelist;

    event FeeReceiverUpdated(address receiver);
    event FeeWithdrawn(address receiver, uint256 feeAmount);
    event Deposit(address indexed user, uint256 indexed amount);
    event Withdraw(address indexed user, uint256 indexed amount);
    event Settled(address indexed account, int256 margin);
    event MatchedOrders(
        address indexed long,
        address indexed short,
        uint256 amount,
        uint256 price
    );

    /**
     * @notice Creates a new tracer market and sets the initial funding rate of the market. Anyone
     *         will be able to purchase and trade tracers after this deployment.
     * @param _marketId the id of the market, given as BASE/QUOTE
     * @param _tracerQuoteToken the address of the token used for margin accounts (i.e. The margin token)
     * @param _gasPriceOracle the address of the contract implementing gas price oracle
     * @param _maxLeverage the max leverage of the market. Min margin is derived from this
     * @param _fundingRateSensitivity the affect funding rate changes have on funding paid.
     * @param _feeRate the fee taken on trades; u60.18-decimal fixed-point number. e.g. 2% fee = 0.02 * 10^18 = 2 * 10^16
     */
    constructor(
        bytes32 _marketId,
        address _tracerQuoteToken,
        uint256 _tokenDecimals,
        address _gasPriceOracle,
        uint256 _maxLeverage,
        uint256 _fundingRateSensitivity,
        uint256 _feeRate,
        address _feeReceiver
    ) Ownable() {
        // don't convert to interface as we don't need to interact with the contract
        tracerQuoteToken = _tracerQuoteToken;
        quoteTokenDecimals = _tokenDecimals;
        gasPriceOracle = _gasPriceOracle;
        marketId = _marketId;
        feeRate = _feeRate;
        maxLeverage = _maxLeverage;
        fundingRateSensitivity = _fundingRateSensitivity;
        feeReceiver = _feeReceiver;
    }

    /**
     * @notice Allows a user to deposit into their margin account
     * @dev this contract must be an approved spender of the markets quote token on behalf of the depositer.
     * @param amount The amount of quote tokens to be deposited into the Tracer Market account. This amount
     * should be given in WAD format.
     */
    function deposit(uint256 amount) external override {
        Balances.Account storage userBalance = balances[msg.sender];

        // convert the WAD amount to the correct token amount to transfer
        // cast is safe since amount is a uint, and wadToToken can only
        // scale down the value
        uint256 rawTokenAmount =
            uint256(Balances.wadToToken(quoteTokenDecimals, amount).toInt256());
        IERC20(tracerQuoteToken).transferFrom(
            msg.sender,
            address(this),
            rawTokenAmount
        );

        // this prevents dust from being added to the user account
        // eg 10^18 -> 10^8 -> 10^18 will remove lower order bits
        int256 convertedWadAmount =
            Balances.tokenToWad(quoteTokenDecimals, rawTokenAmount);

        // update user state
        userBalance.position.quote =
            userBalance.position.quote +
            convertedWadAmount;
        _updateAccountLeverage(msg.sender);

        // update market TVL
        tvl = tvl + uint256(convertedWadAmount);
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
        Balances.Position memory newPosition =
            Balances.Position(newQuote, userBalance.position.base);
        require(
            marginIsValid(newPosition, userBalance.lastUpdatedGasPrice),
            "TCR: Withdraw below valid Margin"
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
     */
    function matchOrders(
        Perpetuals.Order memory order1,
        Perpetuals.Order memory order2
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
        executeTrade(order1, order2);

        // update leverage
        _updateAccountLeverage(order1.maker);
        _updateAccountLeverage(order2.maker);

        // Update internal trade state
        // note: price has already been validated here, so order 1 price can be used
        pricingContract.recordTrade(
            order1.price,
            LibMath.min(order1.amount, order2.amount)
        );

        // Ensures that you are in a position to take the trade
        require(
            userMarginIsValid(order1.maker) && userMarginIsValid(order2.maker),
            "TCR: Margin Invalid post trade "
        );

        if (order1.side == Perpetuals.Side.Long) {
            emit MatchedOrders(
                order1.maker,
                order2.maker,
                order1.amount,
                order1.price
            );
        } else {
            emit MatchedOrders(
                order2.maker,
                order1.maker,
                order1.amount,
                order1.price
            );
        }
    }

    /**
     * @notice Updates account states of two accounts given two orders that are being executed
     */
    function executeTrade(
        Perpetuals.Order memory order1,
        Perpetuals.Order memory order2
    ) internal {
        // Retrieve account state
        Balances.Account storage account1 = balances[order1.maker];
        Balances.Account storage account2 = balances[order2.maker];

        // Construct `Trade` types suitable for use with LibBalances
        (Balances.Trade memory trade1, Balances.Trade memory trade2) =
            (
                Balances.Trade(order1.price, order1.amount, order1.side),
                Balances.Trade(order2.price, order2.amount, order2.side)
            );

        bytes32 orderId1 = Perpetuals.orderId(order1);
        bytes32 orderId2 = Perpetuals.orderId(order2);

        uint256 fillAmount =
            Balances.fillAmount(
                trade1,
                filled[orderId1],
                trade2,
                filled[orderId2]
            );

        // Calculate new account state
        (Balances.Position memory newPos1, Balances.Position memory newPos2) =
            (
                Balances.applyTrade(
                    account1.position,
                    trade1,
                    fillAmount,
                    feeRate
                ),
                Balances.applyTrade(
                    account2.position,
                    trade2,
                    fillAmount,
                    feeRate
                )
            );

        // Update account state with results of above calculation
        account1.position = newPos1;
        account2.position = newPos2;

        // Add fee into cumulative fees
        int256 quoteChange =
            PRBMathUD60x18.mul(fillAmount, order1.price).toInt256();
        int256 fee =
            PRBMathUD60x18
                .mul(uint256(quoteChange), uint256(feeRate))
                .toInt256();
        fees = fees + uint256(fee * 2);
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

    /**
     * @notice Updates the global leverage value given an accounts new leveraged value and old leveraged value
     * @param accountNewLeveragedNotional The future notional value of the account
     * @param accountOldLeveragedNotional The stored notional value of the account
     */
    function _updateTracerLeverage(
        uint256 accountNewLeveragedNotional,
        uint256 accountOldLeveragedNotional
    ) internal {
        leveragedNotionalValue = Prices.globalLeverage(
            leveragedNotionalValue,
            accountOldLeveragedNotional,
            accountNewLeveragedNotional
        );
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

        uint256 gasCost =
            liquidatorBalance.lastUpdatedGasPrice * LIQUIDATION_GAS_COST;
        uint256 price = pricingContract.fairPrice();

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
     * @dev This function aggregates data to feed into account.sols settle function which sets
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
            Prices.FundingRateInstant memory currGlobalRate =
                pricingContract.getFundingRate(
                    pricingContract.currentFundingIndex() - 1
                );
            Prices.FundingRateInstant memory currUserRate =
                pricingContract.getFundingRate(accountLastUpdatedIndex);
            Prices.FundingRateInstant memory currInsuranceGlobalRate =
                pricingContract.getInsuranceFundingRate(
                    pricingContract.currentFundingIndex() - 1
                );
            Prices.FundingRateInstant memory currInsuranceUserRate =
                pricingContract.getInsuranceFundingRate(
                    accountLastUpdatedIndex
                );

            // settle the account
            Balances.Account storage accountBalance = balances[account];
            Balances.Account storage insuranceBalance =
                balances[address(insuranceContract)];

            accountBalance.position = Prices.applyFunding(
                accountBalance.position,
                currGlobalRate,
                currUserRate
            );

            // Update account gas price
            accountBalance.lastUpdatedGasPrice = IOracle(gasPriceOracle)
                .latestAnswer();

            if (accountBalance.totalLeveragedValue > 0) {
                (
                    Balances.Position memory newUserPos,
                    Balances.Position memory newInsurancePos
                ) =
                    Prices.applyInsurance(
                        accountBalance.position,
                        insuranceBalance.position,
                        currGlobalRate,
                        currUserRate,
                        accountBalance.totalLeveragedValue
                    );

                balances[account].position = newUserPos;
                balances[(address(insuranceContract))]
                    .position = newInsurancePos;
            }

            // Update account index
            accountBalance.lastUpdatedIndex = pricingContract
                .currentFundingIndex();
            require(userMarginIsValid(account), "TCR: Target under-margined");
            emit Settled(account, accountBalance.position.quote);
        }
    }

    // todo this function should be in a lib
    /**
     * @notice Checks the validity of a potential margin given the necessary parameters
     * @param position The position
     * @param gasPrice The gas price
     * @return a bool representing the validity of a margin
     */
    function marginIsValid(Balances.Position memory position, uint256 gasPrice)
        public
        view
        returns (bool)
    {
        uint256 price = pricingContract.fairPrice();
        uint256 gasCost = gasPrice * LIQUIDATION_GAS_COST;

        Balances.Position memory pos =
            Balances.Position(position.quote, position.base);
        uint256 minMargin =
            Balances.minimumMargin(pos, price, gasCost, maxLeverage);
        int256 margin = Balances.margin(pos, price);

        if (margin < 0) {
            /* Margin being less than 0 is always invalid, even if position is 0.
               This could happen if user attempts to over-withdraw */
            return false;
        }

        if (minMargin == 0) {
            // minMargin = 0 only occurs when user has no base (positions)
            // if they have no base, their quote must be > 0.
            return position.quote >= 0;
        }

        return Balances.marginValid(position, price, gasCost, maxLeverage);
    }

    /**
     * @notice Checks if a given accounts margin is valid
     * @param account The address of the account whose margin is to be checked
     * @return true if the margin is valid or false otherwise
     */
    function userMarginIsValid(address account) public returns (bool) {
        Balances.Account memory accountBalance = balances[account];
        return
            marginIsValid(
                accountBalance.position,
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

    function setLiquidationContract(address liquidation)
        public
        override
        onlyOwner
    {
        liquidationContract = liquidation;
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

    function setFeeReceiver(address receiver) public override onlyOwner {
        feeReceiver = receiver;
        emit FeeReceiverUpdated(receiver);
    }

    function withdrawFee() public override {
        require(
            feeReceiver == msg.sender,
            "Only feeReceiver can withdraw fees"
        );

        uint256 tempFees = fees;
        fees = 0;

        // Withdraw from the account
        IERC20(tracerQuoteToken).transfer(feeReceiver, tempFees);
        emit FeeWithdrawn(feeReceiver, tempFees);
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
