// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {Types} from "./Interfaces/Types.sol";
import "./lib/LibMath.sol";
import "./lib/LibLiquidation.sol";
import "./Interfaces/ILiquidation.sol";
import "./Interfaces/IAccount.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/ITracerPerpetualsFactory.sol";

/**
* Each call enforces that the contract calling the account is only updating the balance
* of the account for that contract.
*/
contract Liquidation is ILiquidation, Ownable {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;

    uint256 public override currentLiquidationId;
    int256 public override maxSlippage;
    uint256 releaseTime = 15 minutes;
    IAccount public accounts;
    ITracerPerpetualsFactory public perpsFactory;
    ITracerPerpetualSwaps public tracer;

    // Receipt ID => LiquidationReceipt
    mapping(uint256 => Types.LiquidationReceipt) internal liquidationReceipts;
    // Factor to keep precision in percent calculations
    int256 private constant PERCENT_PRECISION = 10000;

    // On contract deployment set the account contract. 
    constructor(address _tracer, address accountContract, address _perpsFactory, int256 _maxSlippage, address gov) public {
        accounts = IAccount(accountContract);
        perpsFactory = ITracerPerpetualsFactory(_perpsFactory);
        tracer = ITracerPerpetualSwaps(_tracer);
        maxSlippage = _maxSlippage;
        transferOwnership(gov);
    }

    /**
     * @notice Creates a liquidation receipt for a given trader
     * @param market the Tracer that this receipt belongs too
     * @param liquidator the account executing the liquidation
     * @param liquidatee the account being liquidated
     * @param price the price at which this liquidation event occurred 
     * @param escrowedAmount the amount of funds required to be locked into escrow 
     *                       by the liquidator
     * @param amountLiquidated the amount of positions that were liquidated
     * @param liquidationSide the side of the positions being liquidated. true for long
     *                        false for short.
     */
    function submitLiquidation(
        address market,
        address liquidator,
        address liquidatee,
        int256 price,
        uint256 escrowedAmount,
        int256 amountLiquidated,
        bool liquidationSide
    ) external override onlyAccount {
        liquidationReceipts[currentLiquidationId] = Types.LiquidationReceipt(
            market,
            liquidator,
            liquidatee,
            price,
            block.timestamp,
            escrowedAmount,
            block.timestamp.add(releaseTime),
            amountLiquidated,
            false,
            liquidationSide,
            false
        );
        currentLiquidationId += 1;
    }

    /**
     * @notice Marks receipts as claimed and returns the refund amount
     * @param escrowId the id of the receipt created during the liquidation event
     * @param orderIds the ids of the orders selling the liquidated positions
     * @param market the address of the tracer contract the liquidation occurred on.
     * @param liquidator the account who executed the liquidation.
     */
    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        uint256 priceMultiplier,
        address market,
        address liquidator
    ) external override onlyAccount returns (uint256) {
        Types.LiquidationReceipt memory receipt = liquidationReceipts[escrowId];
        require(receipt.liquidator == liquidator, "LIQ: Liquidator mismatch");
        require(block.timestamp < receipt.releaseTime, "LIQ: claim time passed");
        require(!receipt.liquidatorRefundClaimed, "LIQ: Already claimed");
        // Validate the escrowed order was fully sold
        (uint256 unitsSold, int256 avgPrice) = calcUnitsSold(orderIds, escrowId, market);
        require(
            unitsSold == uint256(receipt.amountLiquidated.abs()),
            "LIQ: Unit mismatch"
        );

        // Mark refund as claimed
        liquidationReceipts[escrowId].liquidatorRefundClaimed = true;

        // Check price slippage and update account states
        if (
            avgPrice == receipt.price || // No price change
            (avgPrice < receipt.price && !receipt.liquidationSide) || // Price dropped, but position is short
            (avgPrice > receipt.price && receipt.liquidationSide) // Price jumped, but position is long
        ) {
            // No slippage
            return 0;
        } else {
            // Liquidator took a long position, and price dropped
            int256 amountSoldFor = avgPrice.mul(unitsSold.toInt256()).div(priceMultiplier.toInt256());
            int256 amountExpectedFor = (receipt.price).mul(unitsSold.toInt256()).div(priceMultiplier.toInt256());

            // The difference in how much was expected vs how much liquidator actually got.
            // i.e. The amount lost by liquidator
            uint256 amountToReturn = 0;
            int256 percentSlippage = 0;
            if (avgPrice < receipt.price && receipt.liquidationSide) {
                amountToReturn = uint256(amountExpectedFor.sub(amountSoldFor));
                if (amountToReturn <= 0) {
                    return 0;
                }
                percentSlippage = amountToReturn.toInt256().mul(PERCENT_PRECISION).div(amountExpectedFor);
            } else if (avgPrice > receipt.price && !receipt.liquidationSide) {
                amountToReturn = uint256(amountSoldFor.sub(amountExpectedFor));
                if (amountToReturn <= 0) {
                    return 0;
                }
                percentSlippage = amountToReturn.toInt256().mul(PERCENT_PRECISION).div(amountExpectedFor);
            }
            if (percentSlippage > maxSlippage) {
                amountToReturn = uint256(maxSlippage.mul(amountExpectedFor).div(PERCENT_PRECISION));
            }
            if (amountToReturn > receipt.escrowedAmount) {
                liquidationReceipts[escrowId].escrowedAmount = 0;
            } else {
                liquidationReceipts[escrowId].escrowedAmount = receipt.escrowedAmount.sub(amountToReturn);
            }
            return (amountToReturn);
        }
    }

    /**
     * @notice Used to claim funds owed to you through your receipt. 
     * @dev Marks escrowed funds as claimed and returns amount to return
     * @param receiptID the id of the receipt from which escrow is being claimed from
     * @param liquidatee The address of the account that is getting liquidated (the liquidatee)
     */
    function claimEscrow(uint256 receiptID, address liquidatee) public override onlyAccount returns (int256) {
        Types.LiquidationReceipt memory receipt = liquidationReceipts[receiptID];
        require(receipt.liquidatee == liquidatee, "LIQ: Liquidatee mismatch");
        require(!receipt.escrowClaimed, "LIQ: Escrow claimed");
        require(block.timestamp > receipt.releaseTime, "LIQ: Not released");
        liquidationReceipts[receiptID].escrowClaimed = true;
        return (receipt.escrowedAmount.toInt256());
    }
    

    /**
     * @notice Calculates the number of units sold and the average price of those units by a trader
     *         given multiple order
     * @param orderIds a list of order ids for which the units sold is being calculated from
     * @param receiptId the id of the liquidation receipt the orders are being claimed against
     * @param market the address of the tracer that the orders and receipt belongs too.
    */
    function calcUnitsSold(
        uint256[] memory orderIds,
        uint256 receiptId,
        address market
    ) public view returns (uint256, int256) {
        Types.LiquidationReceipt memory receipt = liquidationReceipts[receiptId];
        uint256 unitsSold;
        int256 avgPrice;
        ITracerPerpetualSwaps _tracer = ITracerPerpetualSwaps(market);
        for (uint256 i; i < orderIds.length; i++) {
            uint256 orderId = orderIds[i];
            (,
                uint256 orderFilled,
                int256 orderPrice,
                bool orderSide,
                address orderMaker,
                uint256 creation
            ) = _tracer.getOrder(orderId);
            require(creation >= receipt.time, "LIQ: Order creation before liquidation");
            if (orderMaker == receipt.liquidator) {
                // Order was made by liquidator
                if (orderSide != receipt.liquidationSide) {
                    unitsSold = unitsSold.add(orderFilled);
                    avgPrice = avgPrice.add(orderPrice.mul(orderFilled.toInt256()));
                }
            } else if (orderSide == receipt.liquidationSide) {
                // Check if a taker was the liquidator and if they were taking the opposite side to what they received
                uint256 takerAmount = _tracer.getOrderTakerAmount(orderId, receipt.liquidator);
                unitsSold = unitsSold.add(takerAmount);
                avgPrice = avgPrice.add(orderPrice.mul(takerAmount.toInt256()));
            }
        }

        // Avoid divide by 0 if no orders sold
        if (unitsSold == 0) {
            return (0, 0);
        }
        return (unitsSold, avgPrice.div(unitsSold.toInt256()));
    }

    /**
     * @notice Returns liquidation receipt data for a given receipt id.
     * @param id the receipt id to get data for
    */
    function getLiquidationReceipt(uint256 id)
        external
        override
        view
        returns (
            address,
            address,
            address,
            int256,
            uint256,
            uint256,
            uint256,
            int256,
            bool,
            bool,
            bool
        )
    {
        Types.LiquidationReceipt memory _receipt = liquidationReceipts[id];
        return (
            _receipt.tracer,
            _receipt.liquidator,
            _receipt.liquidatee,
            _receipt.price,
            _receipt.time,
            _receipt.escrowedAmount,
            _receipt.releaseTime,
            _receipt.amountLiquidated,
            _receipt.escrowClaimed,
            _receipt.liquidationSide,
            _receipt.liquidatorRefundClaimed
        );
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
        require(amount > 0, "LIQ: Liquidation amount <= 0");

        int256 price = pricing.fairPrices(market);
        (
            int256 base1,
            int256 quote1,
            int256 totalLeveragedValue,
            int256 lastUpdatedGasPrice,

        ) = accounts.getBalance(account, market);
        uint256 priceMultiplier = tracer.priceMultiplier();
        int256 margin = LibBalances.calcMargin(quote1, price, base1, priceMultiplier);
        int256 gasCost = lastUpdatedGasPrice.mul(tracer.LIQUIDATION_GAS_COST().toInt256());
        int256 minMargin =
           LibBalances.calcMinMargin(quote1, price, base1, gasCost, tracer.maxLeverage(), priceMultiplier);

        require(
            margin < minMargin
            "LIQ: Account above margin "
        );
        require(amount <= quote1.abs(), "LIQ: Liquidate Amount > Position");

        // calc funds to liquidate and move to Escrow
        uint256 amountToEscrow = LibLiquidation.calcEscrowLiquidationAmount(
            minMargin,
            currentMargin
        );


        // Calculates what the updated state of both accounts will be if the liquidation is fully processed
        (
            int256 liquidatorBaseChange,
            int256 liquidatorQuoteChange,
            int256 liquidateeBaseChange,
            int256 liquidateeQuoteChange
        ) = liquidationBalanceChanges(msg.sender, account, amount, market);

        // create a liquidation receipt
        bool side = quote1 < 0 ? false : true;
        submitLiquidation(
            market,
            msg.sender,
            account,
            price,
            amountToEscrow,
            amount,
            side
        );
        
        // Limits the gas use when liquidating 
        int256 gasPrice = IOracle(ITracerPerpetualSwaps(market).gasPriceOracle()).latestAnswer();
        require(tx.gasprice <= uint256(gasPrice.abs()), "LIQ: GasPrice > FGasPrice");

        // Checks if the liquidator is in a valid position to process the liquidation 
        require(
            marginIsValid(
                liqBalance.base,
                liqBalance.quote,
                price,
                gasPrice,
                market
            ),
            "LIQ: Taker undermargin"
        );

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
        ITracerPerpetualSwaps tracer = ITracerPerpetualSwaps(market);
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
                if (insuranceBalance.base <= 0) {
                    // attempt to drain entire balance that is needed from the pool
                    IInsurance(insuranceContract).drainPool(market, amountWantedFromInsurance);
                } else {
                    // attempt to drain the required balance taking into account the insurance balance in the account contract
                    IInsurance(insuranceContract).drainPool(market, amountWantedFromInsurance.sub(uint256(insuranceBalance.base)));
                }
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
        require(liquidatee == msg.sender, "LIQ: Not Entitled");
        require(!escrowClaimed, "LIQ: Already claimed");
        require(block.timestamp > releaseTime, "LIQ: Not yet released");
        
        // Update balance and mark as claimed
        int256 accountMargin = balances[receiptTracer][msg.sender].base;
        int256 amountToReturn = receipt.claimEscrow(receiptId, liquidatee);
        balances[receiptTracer][msg.sender].base = accountMargin.add(amountToReturn);
        emit ClaimedEscrow(msg.sender, receiptTracer, receiptId);
    }

    /**
     * @notice Updates both the trader and liquidators account on a liquidation event.
     * @param liquidateeBalance The balance of the account being liquidated
     * @param liquidatorBalance The balance of the account calling liquidate
     * @param liquidatee The address of the account to be liquidated 
     * @param amount The amount that is to be liquidated from the position 
     * @param market The address of the relevant Tracer market for this liquidation 
     */
    function liquidationBalanceChanges(
        Types.AccountBalance memory liquidateeBalance,
        Types.AccountBalance memory liquidatorBalance,
        int256 amount,
        address market
    ) internal returns (
        int256 liquidatorBaseChange,
        int256 liquidatorQuoteChange,
        int256 liquidateeBaseChange,
        int256 liquidateeQuoteChange,
    ) {
        int256 liquidatorBaseChange;
        int256 liquidatorQuoteChange;
        int256 liquidateeBaseChange;
        int256 liquidateeQuoteChange;

        if (liquidateeBalance.base > 0) {
            // Add to the liquidators margin, they are taking on positive margin
            liquidatorBaseChange = 
                liqudiatorBalance.base.mul(amount.mul(PERCENT_PRECISION).div(liqudiatorBalance.quote.abs())).div(
                    PERCENT_PRECISION
                );

            // Subtract from the liquidatees margin
            liquidateeBaseChange = 
                liqudiatorBalance.base.mul(amount.mul(PERCENT_PRECISION).div(liqudiatorBalance.quote.abs())).div(
                    PERCENT_PRECISION
                ).mul(-1);
        } else {
            // Subtract from the liquidators margin, they are taking on negative margin
            liquidatorBaseChange = 
                liqudiatorBalance.base.mul(amount.mul(PERCENT_PRECISION).div(liqudiatorBalance.quote.abs())).div(
                    PERCENT_PRECISION
                ).mul(-1);

            // Add this to the user balances margin
            liquidateeBaseChange = 
                liqudiatorBalance.base.mul(amount.mul(PERCENT_PRECISION).div(liqudiatorBalance.quote.abs())).div(
                    PERCENT_PRECISION
                );
        }

        if (liqudiatorBalance.quote > 0) {
            // Take from liquidatee, give to liquidator
            liquidatorQuoteChange = amount;
            liquidateeQuoteChange = amount.mul(-1);
        } else {
            // Take from liquidator, give to liquidatee
            liquidatorQuoteChange = amount.mul(-1);
            liquidateeQuoteChange = amount;
        }
        return(
            liquidatorBaseChange,
            liquidatorQuoteChange,
            liquidateeBaseChange,
            liquidateeQuoteChange
        );
    }

    /**
     * @notice Modifies the release time
     * @param _releaseTime new release time
     */
    function setReleaseTime(uint256 _releaseTime) external onlyOwner() {
        releaseTime = _releaseTime;
    }

    function setMaxSlippage(int256 _maxSlippage) public override onlyOwner() {
        maxSlippage = _maxSlippage;
    }

    modifier onlyAccount() {
        require(msg.sender == address(accounts), "LIQ: Only accounts");
        _;
    }

    /**
     * @dev Checks if that passed address is a valid tracer address (i.e. is part of a perpsFactory)
     * @param market The Tracer market to check
     */
    modifier isValidTracer(address market) {
        require(perpsFactory.validTracers(market), "ACT: Target not valid tracer");
        _;
    }
}
