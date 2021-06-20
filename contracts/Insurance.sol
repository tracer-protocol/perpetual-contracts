// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/ITracerPerpetualsFactory.sol";
import "./InsurancePoolToken.sol";
import "./lib/LibMath.sol";
import "./lib/SafetyWithdraw.sol";
import {Balances} from "./lib/LibBalances.sol";
import "./lib/LibInsurance.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

contract Insurance is IInsurance, Ownable, SafetyWithdraw {
    using LibMath for uint256;
    using LibMath for int256;
    ITracerPerpetualsFactory public perpsFactory;

    address public collateralAsset; // Address of collateral asset
    uint256 public override publicCollateralAmount; // amount of underlying collateral in public pool, in WAD format
    uint256 public override bufferCollateralAmount; // amount of collateral in buffer pool, in WAD format
    address public token; // token representation of a users holding in the pool
    uint256 public override withdrawalDelay; // The amount of time, in seconds, that a user must wait when doing a delayed withdrawal

    // Multiply a percentage by 10^16 to get it in decimal wad format.
    // e.g. 50*10^16 == 0.5*10^18
    uint256 public constant PERCENTAGE_WAD_MULTIPLIER = 10**16;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_5_PERCENT = 100 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_15_PERCENT = 80 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_30_PERCENT = 60 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_60_PERCENT = 30 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_75_PERCENT = 10 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_85_PERCENT = 5 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_90_PERCENT = 2 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant IMMEDIATE_WITHDRAWAL_FEE_100_PERCENT = 5 * PERCENTAGE_WAD_MULTIPLIER / 10;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_5_PERCENT = 20 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_15_PERCENT = 16 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_30_PERCENT = 12 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_60_PERCENT = 6 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_75_PERCENT = 2 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_85_PERCENT = 1 * PERCENTAGE_WAD_MULTIPLIER;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_90_PERCENT = 4 * PERCENTAGE_WAD_MULTIPLIER / 10;
    uint256 public constant DELAYED_WITHDRAWAL_FEE_100_PERCENT = 1 * PERCENTAGE_WAD_MULTIPLIER / 10;
    uint256 public constant WITHDRAWAL_FEE_OVER_100_PERCENT = 5 * PERCENTAGE_WAD_MULTIPLIER / 10;

    ITracerPerpetualSwaps public tracer; // Tracer associated with Insurance Pool

    struct DelayedWithdrawal {
        uint256 timeOfCommit; // Timestamp the commit was made
        uint256 withdrawalAmount;
    }

    event InsuranceDeposit(address indexed market, address indexed user, uint256 indexed amount);
    event InsuranceWithdraw(address indexed market, address indexed user, uint256 indexed amount);
    event InsurancePoolDeployed(address indexed market, address indexed asset);

    constructor(address _tracer) Ownable() {
        tracer = ITracerPerpetualSwaps(_tracer);
        InsurancePoolToken _token = new InsurancePoolToken("Tracer Pool Token", "TPT");
        token = address(_token);
        collateralAsset = tracer.tracerQuoteToken();

        emit InsurancePoolDeployed(_tracer, tracer.tracerQuoteToken());
    }

    /**
     * @notice Allows a user to deposit to a given tracer market insurance pool
     * @dev Mints amount of the pool token to the user
     * @param amount the amount of tokens to deposit. Provided in WAD format
     */
    function deposit(uint256 amount) external override {
        IERC20 collateralToken = IERC20(collateralAsset);

        // convert token amount to WAD
        uint256 quoteTokenDecimals = tracer.quoteTokenDecimals();
        uint256 rawTokenAmount = Balances.wadToToken(quoteTokenDecimals, amount);
        collateralToken.transferFrom(msg.sender, address(this), rawTokenAmount);

        // amount in wad format after being converted from token format
        uint256 wadAmount = uint256(Balances.tokenToWad(quoteTokenDecimals, rawTokenAmount));

        // Update pool balances and user
        updatePoolAmount();
        InsurancePoolToken poolToken = InsurancePoolToken(token);

        // tokens to mint = (pool token supply / collateral holdings) * collateral amount to stake
        uint256 tokensToMint = LibInsurance.calcMintAmount(poolToken.totalSupply(), publicCollateralAmount, wadAmount);

        // mint pool tokens, hold collateral tokens
        poolToken.mint(msg.sender, tokensToMint);
        publicCollateralAmount = publicCollateralAmount + wadAmount;
        emit InsuranceDeposit(address(tracer), msg.sender, wadAmount);
    }

    /**
     * @notice Allows a user to withdraw their assets from a given insurance pool
     * @dev burns amount of tokens from the pool token
     * @param amount the amount of pool tokens to burn. Provided in WAD format
     */
    function withdraw(uint256 amount) external override {
        updatePoolAmount();
        uint256 balance = getPoolUserBalance(msg.sender);
        require(balance >= amount, "INS: balance < amount");

        IERC20 collateralToken = IERC20(collateralAsset);
        InsurancePoolToken poolToken = InsurancePoolToken(token);

        // tokens to return = (collateral holdings / pool token supply) * amount of pool tokens to withdraw
        uint256 wadTokensToSend = LibInsurance.calcWithdrawAmount(
            poolToken.totalSupply(),
            publicCollateralAmount,
            amount
        );

        // convert token amount to raw amount from WAD
        uint256 rawTokenAmount = Balances.wadToToken(tracer.quoteTokenDecimals(), wadTokensToSend);

        // pool amount is always in WAD format
        publicCollateralAmount = publicCollateralAmount - wadTokensToSend;

        // burn pool tokens, return collateral tokens
        poolToken.burnFrom(msg.sender, amount);
        collateralToken.transfer(msg.sender, rawTokenAmount);

        emit InsuranceWithdraw(address(tracer), msg.sender, wadTokensToSend);
    }

    function commitToDelayedWithdrawal() public {

    }

    /**
     * @notice Internally updates a given tracer's pool amount according to the tracer contract
     * @dev Withdraws from tracer, and adds amount to the pool's amount field.
     */
    function updatePoolAmount() public override {
        uint256 quote = uint256((tracer.getBalance(address(this))).position.quote);

        tracer.withdraw(quote);

        if (publicCollateralAmount > 0) {
            // Amount to pay to public is the ratio of public collateral amount to total funds
            uint256 payToPublic = PRBMathUD60x18.mul(
                quote,
                PRBMathUD60x18.div(publicCollateralAmount, getPoolHoldings())
            );

            publicCollateralAmount = publicCollateralAmount + payToPublic;

            // Amount to pay to buffer is the remainder
            bufferCollateralAmount = bufferCollateralAmount + quote - payToPublic;
        } else {
            // Pay to buffer if nothing in public insurance
            bufferCollateralAmount = bufferCollateralAmount + quote;
        }
    }

    /**
     * @notice Deposits some of the insurance pool's amount into the tracer contract
     * @dev If amount is greater than the insurance pool's balance, deposit total balance.
     *      This was done because in such an emergency situation, we want to recover as much as possible
     * @param amount The desired amount to take from the insurance pool
     */
    function drainPool(uint256 amount) external override onlyLiquidation() {
        IERC20 tracerMarginToken = IERC20(tracer.tracerQuoteToken());

        uint256 poolHoldings = getPoolHoldings();

        if (amount >= poolHoldings) {
            // If public collateral left after draining is less than 1 token, we want to keep it at 1 token
            if (publicCollateralAmount > 10**18) {
                // Leave 1 token for the public pool
                amount = poolHoldings - 10**18;
                publicCollateralAmount = 10**18;
            } else {
                amount = bufferCollateralAmount;
            }

            // Drain buffer
            bufferCollateralAmount = 0;
        } else if (amount > bufferCollateralAmount) {
            if (publicCollateralAmount < 10**18) {
                // If there's not enough public collateral for there to be 1 token, cap amount being drained at the buffer
                amount = bufferCollateralAmount;
            } else if (poolHoldings - amount < 10**18) {
                // If the amount of collateral left in the public insurance would be less than 1 token, cap amount being drained
                // from the public insurance such that 1 token is left in the public buffer
                amount = poolHoldings - 10**18;
                publicCollateralAmount = 10**18;
            } else {
                // Take out what you need from the public pool; there's enough for there to be >= 1 token left
                publicCollateralAmount = publicCollateralAmount - (amount - bufferCollateralAmount);
            }

            // Drain buffer
            bufferCollateralAmount = 0;
        } else {
            // Only need to take part of buffer pool out
            bufferCollateralAmount = bufferCollateralAmount - amount;
        }

        tracerMarginToken.approve(address(tracer), amount);
        tracer.deposit(amount);
    }

    /**
     * @notice gets a users balance in a given insurance pool
     * @param user the user whose balance is being retrieved
     */
    function getPoolUserBalance(address user) public view override returns (uint256) {
        return InsurancePoolToken(token).balanceOf(user);
    }

    /**
     * @notice Get total holdings of the insurance pool (= public + buffer collateral)
     */
    function getPoolHoldings() public view override returns (uint256) {
        return bufferCollateralAmount + publicCollateralAmount;
    }

    /**
     * @notice Gets the target fund amount for a given insurance pool
     * @dev The target amount is 1% of the leveraged notional value of the tracer being insured.
     */
    function getPoolTarget() public view override returns (uint256) {
        return tracer.leveragedNotionalValue() / 100;
    }

    /**
     * @notice Gets the 8 hour funding rate for an insurance pool
     * @dev the funding rate is represented as
     *      0.0036523 * (insurance_fund_target - insurance_fund_holdings) / leveraged_notional_value)
     */
    function getPoolFundingRate() external view override returns (uint256) {
        // 0.0036523 as a WAD = 36523 * (10**11)
        uint256 multiplyFactor = 36523 * (10**11);

        uint256 levNotionalValue = tracer.leveragedNotionalValue();

        // Traders only pay the insurance funding rate if the market has leverage
        if (levNotionalValue == 0) {
            return 0;
        }

        uint256 poolHoldings = getPoolHoldings();
        uint256 poolTarget = getPoolTarget();

        // If the pool is above the target, we don't pay the insurance funding rate
        if (poolTarget <= poolHoldings) {
            return 0;
        }

        uint256 ratio = PRBMathUD60x18.div(poolTarget - poolHoldings, levNotionalValue);

        return PRBMathUD60x18.mul(multiplyFactor, ratio);
    }

    function transferOwnership(address newOwner) public override(Ownable, IInsurance) onlyOwner {
        super.transferOwnership(newOwner);
    }

    modifier onlyLiquidation() {
        require(msg.sender == tracer.liquidationContract(), "INS: sender is not Liquidation contract");
        _;
    }
}
