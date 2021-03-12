// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {Types} from "./Interfaces/Types.sol";
import "./lib/LibMath.sol";
import "./Interfaces/IReceipt.sol";
import "./Interfaces/IAccount.sol";
import "./Interfaces/ITracer.sol";

/**
* Each call enforces that the contract calling the account is only updating the balance
* of the account for that contract.
*/
contract Receipt is IReceipt, Ownable {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using LibMath for uint256;
    using LibMath for int256;

    uint256 public override currentLiquidationId;
    int256 public override maxSlippage;
    uint256 releaseTime = 15 minutes;
    IAccount public accounts;

    // Receipt ID => LiquidationReceipt
    mapping(uint256 => Types.LiquidationReceipt) internal liquidationReceipts;
    // Factor to keep precision in percent calculations
    int256 private constant PERCENT_PRECISION = 10000;

    // On contract deployment set the account contract. 
    constructor(address accountContract, int256 _maxSlippage, address gov) public {
        accounts = IAccount(accountContract);
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
        require(receipt.liquidator == liquidator, "REC: Liquidator mismatch");
        require(block.timestamp < receipt.releaseTime, "REC: claim time passed");
        require(!receipt.liquidatorRefundClaimed, "REC: Already claimed");
        // Validate the escrowed order was fully sold
        (uint256 unitsSold, int256 avgPrice) = calcUnitsSold(orderIds, escrowId, market, receipt.time);
        require(
            unitsSold == uint256(receipt.amountLiquidated.abs()),
            "REC: Unit mismatch"
        );

        // Mark refund as claimed
        liquidationReceipts[escrowId].liquidatorRefundClaimed = true;

        // Check price slippage and update account states
        if (
            avgPrice == receipt.price || // No price change
            (avgPrice < receipt.price && !receipt.liquidationSide) || // Price dropped, but position is short
            (avgPrice > receipt.price && receipt.liquidationSide) // Price jumped, but position is long
        ) {
            /* No slippage */
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
        require(receipt.liquidatee == liquidatee, "REC: Liquidatee mismatch");
        require(!receipt.escrowClaimed, "REC: Escrow claimed");
        require(block.timestamp > receipt.releaseTime, "REC: Not released");
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
        address market,
        uint256 receiptStartTime
    ) public view returns (uint256, int256) {
        Types.LiquidationReceipt memory receipt = liquidationReceipts[receiptId];
        uint256 unitsSold;
        int256 avgPrice;
        ITracer _tracer = ITracer(market);
        for (uint256 i; i < orderIds.length; i++) {
            uint256 orderId = orderIds[i];
            (,
                uint256 orderFilled,
                int256 orderPrice,
                bool orderSide,
                address orderMaker,
                uint256 creation
            ) = _tracer.getOrder(orderId);
            require(creation >= receipt.time, "REC: Order creation before liquidation");
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
     * @notice Modifies the release time
     * @param _releaseTime new release time
     */
    function setReleaseTime(uint256 _releaseTime) external onlyOwner {
        releaseTime = _releaseTime;
    }

    function setMaxSlippage(int256 _maxSlippage) public override onlyOwner() {
        maxSlippage = _maxSlippage;
    }

    modifier onlyAccount() {
        require(msg.sender == address(accounts), "REC: Only accounts");
        _;
    }
}
