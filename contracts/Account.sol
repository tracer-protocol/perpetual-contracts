// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;
import "./Interfaces/ITracer.sol";
import "./Interfaces/IOracle.sol";
import "./Interfaces/IAccount.sol";
import "./Interfaces/IReceipt.sol";
import "./Interfaces/ITracerFactory.sol";
import "./Interfaces/IPricing.sol";
import "./Interfaces/IInsurance.sol";
import {Balances} from "./lib/LibBalances.sol";
import {Types} from "./Interfaces/Types.sol";
import "./lib/LibMath.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Account is IAccount, Ownable {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;
    using SafeERC20 for IERC20;

    
    address public insuranceContract;
    address public gasPriceOracle;
    IReceipt public receipt;
    ITracerFactory public factory;
    IPricing public pricing;
    int256 private constant PERCENT_PRECISION = 10000; // Factor to keep precision in percent calcs
    int256 private constant DIVIDE_PRECISION = 10000000; // 10^7
    uint256 public currentLiquidationId;

    // one account per market per user
    // Tracer market => users address => Account Balance struct
    mapping(address => mapping(address => Types.AccountBalance)) public balances;

    // tracer market => total leverage notional value
    mapping(address => int256) public override tracerLeveragedNotionalValue;

    // tracer market => TVL
    mapping(address => uint256) public override tvl;

    event Deposit(address indexed user, uint256 indexed amount, address indexed market);
    event Withdraw(address indexed user, uint256 indexed amount, address indexed market);
    event AccountSettled(address indexed account, int256 margin);
    event Liquidate(address indexed account, address indexed liquidator, int256 liquidationAmount, bool side, address indexed market, uint liquidationId);
    event ClaimedReceipts(address indexed liquidator, address indexed market, uint256[] ids);
    event ClaimedEscrow(address indexed liquidatee, address indexed market, uint256 id);

    constructor(
        address _insuranceContract,
        address _gasPriceOracle,
        address _factory,
        address _pricing,
        address governance
    ) public {
        insuranceContract = _insuranceContract;
        gasPriceOracle = _gasPriceOracle;
        factory = ITracerFactory(_factory);
        pricing = IPricing(_pricing);
        transferOwnership(governance);
    }

    /**
     * @notice Allows a user to deposit into a margin account of a specific tracer
     * @param amount The amount of margin tokens to be deposited into the Tracer Market account
     * @param market The address of the tracer market that the margin tokens will be deposited into 
     */
    function deposit(uint256 amount, address market) external override onlyTracer(market) {
        require(amount > 0, "ACT: Deposit Amount <= 0"); 
        Types.AccountBalance storage userBalance = balances[market][msg.sender];
        address tracerBaseToken = ITracer(market).tracerBaseToken();
        IERC20(tracerBaseToken).safeTransferFrom(msg.sender, address(this), amount);
        userBalance.base = userBalance.base.add(amount.toInt256());
        userBalance.deposited = userBalance.deposited.add(amount);
        int256 originalLeverage = userBalance.totalLeveragedValue;
        
        _updateAccountLeverage(userBalance.quote,
            pricing.fairPrices(market),
            userBalance.base,
            msg.sender,
            market,
            originalLeverage
        );
        tvl[market] = tvl[market].add(amount);
        emit Deposit(msg.sender, amount, market);
    }

    /**
     * @notice Allows a user to withdraw from a margin account of a specific tracer
     * @dev Ensures that the users margin percent is valid after withdraw
     * @param amount The amount of margin tokens to be withdrawn from the tracer market account
     * @param market The address of the tracer market to be withdrawn from 
     */
    function withdraw(uint256 amount, address market) external override {
        ITracer _tracer = ITracer(market);
        require(amount > 0, "ACT: Withdraw Amount <= 0");
        Types.AccountBalance storage userBalance = balances[market][msg.sender];    
        require(
            marginIsValid(
                userBalance.base.sub(amount.toInt256()), 
                userBalance.quote,
                pricing.fairPrices(market),
                userBalance.lastUpdatedGasPrice,
                market
            ),
            "ACT: Withdraw below valid Margin"
        );
        address tracerBaseToken = _tracer.tracerBaseToken();
        IERC20(tracerBaseToken).safeTransfer(msg.sender, amount);
        userBalance.base = userBalance.base.sub(amount.toInt256());
        userBalance.deposited = userBalance.deposited.sub(amount);
        int256 originalLeverage = userBalance.totalLeveragedValue;
        _updateAccountLeverage(userBalance.quote, pricing.fairPrices(market), userBalance.base, msg.sender, market, originalLeverage);
        
        // Safemath will throw if tvl[market] < amount
        tvl[market] = tvl[market].sub(amount);
        emit Withdraw(msg.sender, amount, market);
    }

    /**
     * @notice Settles a specific account on a specific tracer. 
     * @dev Ensures margin percent is valid after settlement
     * @param account The address of the account that will be settled
     * @param insuranceMultiplyFactor The multiplying factor for the insurance rate
     * @param currentGlobalRate The current global interest rate 
     * @param currentUserRate The users current interest rate 
     * @param currentInsuranceGlobalRate The current general insurance rate 
     * @param currentInsuranceUserRate The users current insurance rate
     * @param gasPrice The gas price as given by the gasOracle
     * @param priceMultiplier  The multiplying factor of the price
     * @param currentFundingIndex Index referencing which funding rate to use in this function 
     */
    function settle(
        address account,
        int256 insuranceMultiplyFactor,
        int256 currentGlobalRate,
        int256 currentUserRate,
        int256 currentInsuranceGlobalRate,
        int256 currentInsuranceUserRate,
        int256 gasPrice,
        uint256 priceMultiplier,
        uint256 currentFundingIndex
    ) external override isValidTracer(msg.sender) { 
        Types.AccountBalance storage accountBalance = balances[msg.sender][account];
        Types.AccountBalance storage insuranceBalance = balances[msg.sender][insuranceContract];

        // Calc the difference in funding rates, remove price multiply factor
        int256 fundingDiff = currentGlobalRate.sub(currentUserRate);

        // Update account, divide by 2x price multiplier to factor out price and funding rate scalar value
        // base - (fundingDiff * quote / (priceMultiplier * priceMultiplier))
        accountBalance.base = accountBalance.base.sub(
            fundingDiff.mul(accountBalance.quote).div((priceMultiplier.mul(priceMultiplier)).toInt256())
        );

        // Update account gas price
        accountBalance.lastUpdatedGasPrice = gasPrice;

        if (accountBalance.totalLeveragedValue > 0) {

            // calc and pay insurance funding rate
            int256 changeInInsuranceBalance = (currentInsuranceGlobalRate.sub(currentInsuranceUserRate)).mul(accountBalance.totalLeveragedValue).div(
                insuranceMultiplyFactor
            );

            if (changeInInsuranceBalance > 0) {
                // Only pay insurance fund if required
                accountBalance.base = accountBalance.base.sub(changeInInsuranceBalance);
                insuranceBalance.base = insuranceBalance.base.add(changeInInsuranceBalance);
                // uint is safe since changeInInsuranceBalance > 0
                insuranceBalance.deposited = insuranceBalance.deposited.add(uint256(changeInInsuranceBalance));
            }
        }

        // Update account index
        accountBalance.lastUpdatedIndex = currentFundingIndex;
        require(userMarginIsValid(account, msg.sender), "ACT: Target under-margined");
        emit AccountSettled(account, accountBalance.base);
    }

    /**
     * @notice Liquidates the margin account of a particular user. A deposit is needed from the liquidator. 
     *         Generates a liquidation receipt for the liquidator to use should they need a refund.
     * @param amount The amount of tokens to be liquidated 
     * @param account The account that is to be liquidated. 
     * @param market The Tracer market in which this margin account will be liquidated.
     */
    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external override isValidTracer(market) {

        int256 price = pricing.fairPrices(market);
        int256 margin = getUserMargin(account, market);
        int256 liquidateeQuote = balances[market][account].quote;
        
        require(amount > 0, "ACTL: Liquidation amount <= 0");
        require(
            !userMarginIsValid(account, market),
            "ACTL: Account above margin "
        );

        require(amount <= liquidateeQuote.abs(), "ACTL: Liquidate Amount > Position");

        // calc funds to liquidate and move to Escrow
        uint256 amountToEscrow = calcEscrowLiquidationAmount(
            account,
            margin,
            market
        );

        // Liquidated the account at "account" in the "market" market, function caller is liquidator
        // Updates the state of both accounts as if the liquidation is fully processed
        liquidateAccount(msg.sender, account, amount, market);

        // create a liquidation receipt
        bool side = liquidateeQuote < 0 ? false : true;
        receipt.submitLiquidation(
            market,
            msg.sender,
            account,
            price,
            amountToEscrow,
            amount,
            side
        );

        // Escrow liquidator funds
        Types.AccountBalance memory liqBalance = balances[market][msg.sender];
        balances[market][msg.sender].base = liqBalance.base.sub(amountToEscrow.toInt256());

        
        // Limits the gas use when liquidating 
        int256 gasPrice = IOracle(ITracer(market).gasPriceOracle()).latestAnswer();
        require(tx.gasprice <= uint256(gasPrice.abs()), "ACTL: GasPrice > FGasPrice");

        // Checks if the liquidator is in a valid position to process the liquidation 
        require(
            marginIsValid(
                liqBalance.base,
                liqBalance.quote,
                price,
                gasPrice,
                market
            ),
            "ACTL: Taker undermargin"
        );

        // Update liquidators last updated gas price
        balances[market][msg.sender].lastUpdatedGasPrice = gasPrice;
        emit Liquidate(account, msg.sender, amount, side, market, receipt.currentLiquidationId() - 1);
    }

    /**
     * @notice Allows a liquidator to submit a single liquidation receipt and multiple order ids. If the
     *         liquidator experienced slippage, will refund them a proportional amount of their deposit.
     * @param receiptID Used to identify the receipt that will be claimed
     * @param orderIds The IDs of the orders contained in the liquidation, these are emitted when an order is made
     * @param market The address of the tracer market where the liquidation and receipt originated
     */
    function claimReceipts(
        uint256 receiptID,
        uint256[] memory orderIds,
        address market
    ) public override {
        // Claim the receipts from the escrow system, get back amount to return
        (, address receiptLiquidator, address receiptLiquidatee, , , uint256 escrowedAmount, , , , ,) = receipt 
            .getLiquidationReceipt(receiptID);
        int256 liquidatorMargin = balances[market][receiptLiquidator].base;
        int256 liquidateeMargin = balances[market][receiptLiquidatee].base;
        ITracer tracer = ITracer(market);
        uint256 amountToReturn = receipt.claimReceipts(receiptID, orderIds, tracer.priceMultiplier(), market, msg.sender);

        /* 
         * If there was not enough escrowed, we want to call the insurance pool to help out.
         * First, check the margin of the insurance Account. If this is enough, just drain from there.
         * If this is not enough, call Insurance.drainPool to get some tokens from the insurance pool.
         * If drainPool is able to drain enough, drain from the new margin.
         * If the margin still does not have enough after calling drainPool, we are not able to fully
         * claim the receipt, only up to the amount the insurance pool allows for.
         */
        if (amountToReturn > escrowedAmount) { // Need to cover some loses with the insurance contract
            // Amount needed from insurance
            uint256 amountWantedFromInsurance = amountToReturn - escrowedAmount;
            // Keep track of how much was actually taken out of insurance
            uint256 amountTakenFromInsurance = 0;

            Types.AccountBalance storage insuranceBalance = balances[market][insuranceContract];
            if (insuranceBalance.base >= amountWantedFromInsurance.toInt256()) { // We don't need to drain insurance contract
                insuranceBalance.base = insuranceBalance.base - amountWantedFromInsurance.toInt256();
                amountTakenFromInsurance = amountWantedFromInsurance;
            } else { // insuranceBalance.base < amountWantedFromInsurance
                // Todo check if insuranceBalance.base can be <0 and what you should do in this case
                IInsurance(insuranceContract).drainPool(market, amountWantedFromInsurance.sub(uint256(insuranceBalance.base)));
                if (insuranceBalance.base < amountWantedFromInsurance.toInt256()) { // Still not enough
                    amountTakenFromInsurance = uint(insuranceBalance.base);
                    insuranceBalance.base = 0;
                } else { // insuranceBalance.base >= amountWantedFromInsurance
                    insuranceBalance.base = insuranceBalance.base - amountWantedFromInsurance.toInt256();
                    amountTakenFromInsurance = amountWantedFromInsurance;
                }
            }

            balances[market][receiptLiquidator].base =
                    liquidatorMargin.add((escrowedAmount.add(amountTakenFromInsurance).toInt256()));
            // Don't add any to liquidatee
        } else {
            balances[market][receiptLiquidator].base = liquidatorMargin.add(amountToReturn.toInt256());
            balances[market][receiptLiquidatee].base = liquidateeMargin.add(escrowedAmount.toInt256().sub(amountToReturn.toInt256()));
        }
        emit ClaimedReceipts(msg.sender, market, orderIds);
    }

    /**
     * @notice Allows a trader to claim escrowed funds after the escrow period has expired
     * @param receiptId The ID number of the insurance receipt from which funds are being claimed from
     */
    function claimEscrow(uint256 receiptId) public override {
        // Get receipt
        (address receiptTracer, , address liquidatee , , , , uint256 releaseTime, ,bool escrowClaimed , ,) = receipt.getLiquidationReceipt(receiptId);
        require(liquidatee == msg.sender, "ACTL: Not Entitled");
        require(!escrowClaimed, "ACTL: Already claimed");
        require(block.timestamp > releaseTime, "ACTL: Not yet released");
        
        // Update balance and mark as claimed
        int256 accountMargin = balances[receiptTracer][msg.sender].base;
        int256 amountToReturn = receipt.claimEscrow(receiptId, liquidatee);
        balances[receiptTracer][msg.sender].base = accountMargin.add(amountToReturn);
        emit ClaimedEscrow(msg.sender, receiptTracer, receiptId);
    }

    /**
     * @notice Calculate the amount of funds a liquidator must escrow to claim the liquidation.
     * @param liquidatee The address of the liquadatees account 
     * @param currentUserMargin The users current margin 
     * @param market The address of the Tracer market thats being targeted for this calculation 
     *               (e.g. USD tracer would calculate Escrow amount for the USD tracer market)
     * @return either the amount to escrow (uint) or zero if the userMargin is less than 0 
     */
    function calcEscrowLiquidationAmount(
        address liquidatee,
        int256 currentUserMargin,
        address market
    ) internal view returns (uint256) {
        int256 minMargin = getUserMinMargin(liquidatee, market);
        int256 amountToEscrow = currentUserMargin.sub(minMargin.sub(currentUserMargin));
        if (amountToEscrow < 0) {
            return 0;
        }
        return uint256(amountToEscrow);
    }

    /**
     * @notice Updates both the trader and liquidators account on a liquidation event.
     * @param liquidator The address of the account that is the liquidator 
     * @param liquidatee The address of the account to be liquidated 
     * @param amount The amount that is to be liquidated from the position 
     * @param market The address of the relevant Tracer market for this liquidation 
     */
     function liquidateAccount(
        address liquidator,
        address liquidatee,
        int256 amount,
        address market
    ) internal {
        Types.AccountBalance storage userBalance = balances[market][liquidatee]; 
        Types.AccountBalance storage liqBalance = balances[market][liquidator];
        if (userBalance.base > 0) {
            // Add to the liquidators margin, they are taking on positive margin
            liqBalance.base = liqBalance.base.add(
                (userBalance.base.mul(amount.mul(PERCENT_PRECISION).div(userBalance.quote.abs()))).div(
                    PERCENT_PRECISION
                )
            );

            // Subtract from the liquidatees margin
            userBalance.base = userBalance.base.sub(
                userBalance.base.mul(amount.mul(PERCENT_PRECISION).div(userBalance.quote.abs())).div(
                    PERCENT_PRECISION
                )
            );
        } else {
            // Subtract from the liquidators margin, they are taking on negative margin
            liqBalance.base = liqBalance.base.sub(
                (userBalance.base.mul(amount.mul(PERCENT_PRECISION).div(userBalance.quote.abs()))).div(
                    PERCENT_PRECISION
                )
            );

            // Add this to the user balances margin
            userBalance.base = userBalance.base.add(
                userBalance.base.mul(amount.mul(PERCENT_PRECISION).div(userBalance.quote.abs())).div(
                    PERCENT_PRECISION
                )
            );
        }

        if (userBalance.quote > 0) {
            // Take from liquidatee, give to liquidator
            liqBalance.quote = liqBalance.quote.add(amount);
            userBalance.quote = userBalance.quote.sub(amount);
        } else {
            // Take from liquidator, give to liquidatee
            liqBalance.quote = liqBalance.quote.sub(amount);
            userBalance.quote = userBalance.quote.add(amount);
        }
    }

    /**
     * @notice Used by a Tracer to update the account details (values) of a accounts position in a particular tracer market 
     * @param base The base the account will be set to
     * @param quote The position the account is to be set to
     * @param leverage The leverage the account is to be set to 
     * @param deposited The amount deposited into the tracer account, this will be the new deposited value
     * @param account The address of the account to be updated 
     * @param market The address of the tracer market of which the details being updated are relevant to 
     */
    function updateAccount(
        int256 base,
        int256 quote,
        int256 leverage,
        uint256 deposited,
        address account,
        address market
    ) external override onlyTracer(market) {
        Types.AccountBalance storage userBalance = balances[market][account];
        ITracer _tracer = ITracer(market);
        userBalance.base = base;
        userBalance.quote = quote;
        userBalance.totalLeveragedValue = leverage;
        userBalance.deposited = deposited;
        userBalance.lastUpdatedGasPrice = IOracle(_tracer.gasPriceOracle()).latestAnswer();
    }

    /**
     * @notice Updates the account state of a user given a specific tracer, in a trade event. Adds the 
     *         passed in margin and position changes to the current margin and position.
     * @dev Related to permissionedTakeOrder() in tracer.sol 
     * @param baseChange Is equal to: FillAmount.mul(uint256(order.price))).div(priceMultiplier).toInt256()
     * @param quoteChange The amount of the order filled changed to be negative (e.g. if 100$ of the order is filled this would be -$100  )
     * @param accountAddress The address of the account to be updated 
     * @param market The address of the tracer market, used to target the tracer market where the update is relevant 
     */
    function updateAccountOnTrade(
        int256 baseChange,
        int256 quoteChange,
        address accountAddress,
        address market
    ) external override onlyTracer(market) {
        Types.AccountBalance storage userBalance = balances[market][accountAddress];
        ITracer _tracer = ITracer(market);
        userBalance.base = userBalance.base.add(baseChange);
        userBalance.quote = userBalance.quote.add(quoteChange);
        userBalance.lastUpdatedGasPrice = IOracle(_tracer.gasPriceOracle()).latestAnswer();
    }

    /**
     * @notice Updates an accounts total leveraged value. Can only be called by a valid
     *         tracer market.
     * @param account the account to update.
     * @param market the tracer market for which the leverage is being updated
     */
    function updateAccountLeverage(
        address account,
        address market
    ) public override onlyTracer(msg.sender) {
        Types.AccountBalance memory userBalance = balances[market][account];
        int256 originalLeverage = userBalance.totalLeveragedValue;
        _updateAccountLeverage(
            userBalance.quote,
            pricing.fairPrices(market),
            userBalance.base,
            account,
            market,
            originalLeverage
        );
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
        address market,
        int256 originalLeverage
    ) internal {
        int256 newLeverage = Balances.newCalcLeveragedNotionalValue(
            quote,
            price,
            base,
            ITracer(market).priceMultiplier()
        );
        balances[market][account].totalLeveragedValue = newLeverage;

        // Update market leveraged notional value
        updateTracerLeverage(newLeverage, originalLeverage, market);
    }

    /**
     * @notice Updates the global leverage value given an accounts new leveraged value and old leveraged value
     * @param accountNewLeveragedNotional The future notional value of the account
     * @param accountOldLeveragedNotional The stored notional value of the account
     */
    function updateTracerLeverage(int256 accountNewLeveragedNotional, int256 accountOldLeveragedNotional, address market) internal {
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
        int256 accountDelta = accountNewLeveragedNotional.sub(accountOldLeveragedNotional);
        if (accountNewLeveragedNotional > 0 && accountOldLeveragedNotional >= 0) {
            tracerLeveragedNotionalValue[market] = tracerLeveragedNotionalValue[market].add(accountDelta);
        } else if (accountNewLeveragedNotional > 0 && accountOldLeveragedNotional < 0) {
            tracerLeveragedNotionalValue[market] = tracerLeveragedNotionalValue[market].add(accountNewLeveragedNotional);
        } else if (accountNewLeveragedNotional <= 0 && accountDelta < 0 && accountOldLeveragedNotional > 0) {
            tracerLeveragedNotionalValue[market] = tracerLeveragedNotionalValue[market].sub(accountOldLeveragedNotional);
        }
    }
   
    /** 
     * @notice Returns the values of the balance struct of a particular account in a market
     * @param account Address of account to check balance of 
     * @param market Address of the relevant Tracer market 
     */
    function getBalance(address account, address market)
        external
        override
        view
        returns (
            int256 base,
            int256 quote,
            int256 totalLeveragedValue,
            uint256 deposited,
            int256 lastUpdatedGasPrice,
            uint256 lastUpdatedIndex
        )
    {
        Types.AccountBalance memory userBalance = balances[market][account];
        return (
            userBalance.base,
            userBalance.quote,
            userBalance.totalLeveragedValue,
            userBalance.deposited,
            userBalance.lastUpdatedGasPrice,
            userBalance.lastUpdatedIndex
        );
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
    ) public override view returns (bool) {
        ITracer _tracer = ITracer(market);
        int256 gasCost = gasPrice.mul(_tracer.LIQUIDATION_GAS_COST().toInt256());
        int256 minMargin = Balances.calcMinMargin(quote, price, base, gasCost, _tracer.maxLeverage(), _tracer.priceMultiplier());
        int256 margin = Balances.calcMargin(quote, price, base, _tracer.priceMultiplier());

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
    function userMarginIsValid(address account, address market) public override view returns (bool) {
        Types.AccountBalance memory accountBalance = balances[market][account];
        return
            marginIsValid(
                accountBalance.base,
                accountBalance.quote,
                pricing.fairPrices(market),
                accountBalance.lastUpdatedGasPrice,
                market
            );
    }

    /**
     * @notice Get the current margin of a user
     * @param account The address whose account is queried
     * @param market The address of the relevant Tracer market
     * @return the margin of the account
     */
    function getUserMargin(address account, address market) public override view returns (int256) {
        ITracer _tracer = ITracer(market);
        Types.AccountBalance memory accountBalance = balances[market][account];
        return Balances.calcMargin(
            accountBalance.quote, pricing.fairPrices(market), accountBalance.base, _tracer.priceMultiplier());
    }

    /**
     * @notice Get the current notional value of a user
     * @param account The address whose account is queried
     * @param market The address of the relevant Tracer market
     * @return the margin of the account in power of 10^18
     */
    function getUserNotionalValue(address account, address market) public override view returns (int256) {
        ITracer _tracer = ITracer(market);
        Types.AccountBalance memory accountBalance = balances[market][account];
        return Balances.calcNotionalValue(accountBalance.quote, pricing.fairPrices(market)).div(_tracer.priceMultiplier().toInt256());
    }

    /**
     * @notice Get the current minimum margin of a user
     * @dev This value, at the current price, is what the user's margin must remain over
            lest they become at risk of liquidation
     * @param account The address whose account is queried
     * @param market The address of the relevant Tracer market
     * @return the margin of the account
     */
    function getUserMinMargin(address account, address market) public override view returns (int256) {
        ITracer _tracer = ITracer(market);
        Types.AccountBalance memory accountBalance = balances[market][account];
        return Balances.calcMinMargin(
            accountBalance.quote,
            pricing.fairPrices(market),
            accountBalance.base,
            accountBalance.lastUpdatedGasPrice.mul(_tracer.LIQUIDATION_GAS_COST().toInt256()),
            _tracer.maxLeverage(),
            _tracer.priceMultiplier()
        );
    }

    /**
     * @notice Returns a users margin in a particular Tracer Market
     * @dev Will not throw if margin is negative
     * @param account The address whose account is queried
     * @param market The address of the relevant Tracer market
     * @return the margin of the account (positive or negative)
     */
    function unsafeGetUserMargin(address account, address market) public override view returns (int256) {
        Types.AccountBalance memory accountBalance = balances[market][account];
        ITracer _tracer = ITracer(market);
        return
            Balances.calcMarginPercent(
                accountBalance.base,
                accountBalance.quote,
                pricing.fairPrices(market),
                uint256(accountBalance.lastUpdatedGasPrice).mul(_tracer.LIQUIDATION_GAS_COST()),
                _tracer.priceMultiplier()
            );
    }

    /**
     * @param newReceiptContract The new instance of Receipt.sol
     */
    function setReceiptContract(address newReceiptContract) public override onlyOwner() {
        receipt = IReceipt(newReceiptContract);
    }

    /**
     * @param newInsuranceContract The new instance of Insurance.sol
     */
    function setInsuranceContract(address newInsuranceContract) public override onlyOwner() {
        insuranceContract = newInsuranceContract;
    }

    /**
     * @param newGasPriceOracle The new instance of GasOracle.sol
     */
    function setGasPriceOracle(address newGasPriceOracle) public override onlyOwner() {
        gasPriceOracle = newGasPriceOracle;
    }

    /**
     * @param newFactory The new instance of Factory.sol
     */
    function setFactoryContract(address newFactory) public override onlyOwner() {
        factory = ITracerFactory(newFactory);
    }

    /**
     * @param newPricing The new instance of Pricing.sol
     */
    function setPricingContract(address newPricing) public override onlyOwner() {
        pricing = IPricing(newPricing);
    }

    /**
     * @dev Ensures that only a valid Tracer contract can call this function
     * @param market The address to verify
     */
    modifier onlyTracer(address market) {
        require(
            msg.sender == market && factory.validTracers(market),
            "ACT: Tracer only function "
        );
        _;
    }


    /**
     * @dev Checks if that passed address is a valid tracer address (i.e. is part of a tracerfactory)
     * @param market The Tracer market to check
     */
    modifier isValidTracer(address market) {
        require(factory.validTracers(market), "ACT: Target not valid tracer");
        _;
    }
}
