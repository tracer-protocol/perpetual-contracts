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
    uint256 public override collateralAmount; // amount of underlying collateral in pool, in WAD format
    address public token; // token representation of a users holding in the pool

    ITracerPerpetualSwaps public tracer; // Tracer associated with Insurance Pool

    event InsuranceDeposit(
        address indexed market,
        address indexed user,
        uint256 indexed amount
    );
    event InsuranceWithdraw(
        address indexed market,
        address indexed user,
        uint256 indexed amount
    );
    event InsurancePoolDeployed(address indexed market, address indexed asset);

    constructor(address _tracer) Ownable() {
        tracer = ITracerPerpetualSwaps(_tracer);
        InsurancePoolToken _token = new InsurancePoolToken(
            "Tracer Pool Token",
            "TPT"
        );
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
        uint256 rawTokenAmount = Balances.wadToToken(
            quoteTokenDecimals,
            amount
        );
        collateralToken.transferFrom(msg.sender, address(this), rawTokenAmount);

        // amount in wad format after being converted from token format
        uint256 wadAmount = uint256(
            Balances.tokenToWad(quoteTokenDecimals, rawTokenAmount)
        );
        // Update pool balances and user
        updatePoolAmount();
        InsurancePoolToken poolToken = InsurancePoolToken(token);

        // tokens to mint = (pool token supply / collateral holdings) * collaterael amount to stake
        uint256 tokensToMint = LibInsurance.calcMintAmount(
            poolToken.totalSupply(),
            collateralAmount,
            wadAmount
        );

        // mint pool tokens, hold collateral tokens
        poolToken.mint(msg.sender, tokensToMint);
        collateralAmount = collateralAmount + wadAmount;
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
            collateralAmount,
            amount
        );

        // convert token amount to raw amount from WAD
        uint256 rawTokenAmount = Balances.wadToToken(
            tracer.quoteTokenDecimals(),
            wadTokensToSend
        );

        // burn pool tokens, return collateral tokens
        poolToken.burnFrom(msg.sender, amount);
        collateralToken.transfer(msg.sender, rawTokenAmount);

        // pool amount is always in WAD format
        collateralAmount = collateralAmount - wadTokensToSend;
        emit InsuranceWithdraw(address(tracer), msg.sender, wadTokensToSend);
    }

    /**
     * @notice Internally updates a given tracer's pool amount according to the tracer contract
     * @dev Withdraws from tracer, and adds amount to the pool's amount field.
     */
    function updatePoolAmount() public override {
        int256 quote = (tracer.getBalance(address(this))).position.quote;
        if (quote > 0) {
            tracer.withdraw(uint256(quote));
            collateralAmount = collateralAmount + uint256(quote);
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

        // Enforce a minimum. Very rare as funding rate will be incredibly high at this point
        if (collateralAmount < 10**18) {
            return;
        }

        // Enforce a maximum at poolAmount
        if (amount > collateralAmount) {
            amount = collateralAmount;
        }

        // What the balance will be after
        uint256 difference = collateralAmount - amount;
        if (difference < 10**18) {
            // Once we go below one token, social loss is required
            // This calculation caps draining so pool always has at least one token
            amount = collateralAmount - (10**18);
            // Use new amount to compute difference again.
            difference = collateralAmount - amount;
        }

        tracerMarginToken.approve(address(tracer), amount);
        tracer.deposit(amount);
        collateralAmount = difference;
    }

    /**
     * @notice gets a users balance in a given insurance pool
     * @param user the user whose balance is being retrieved
     */
    function getPoolUserBalance(address user)
        public
        view
        override
        returns (uint256)
    {
        return InsurancePoolToken(token).balanceOf(user);
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
        if (levNotionalValue <= 0) {
            return 0;
        }

        uint256 ratio = PRBMathUD60x18.div(
            getPoolTarget() - collateralAmount,
            levNotionalValue
        );
        return PRBMathUD60x18.mul(multiplyFactor, ratio);
    }

    function transferOwnership(address newOwner)
        public
        override(Ownable, IInsurance)
        onlyOwner
    {
        super.transferOwnership(newOwner);
    }

    /**
     * @notice returns if the insurance pool needs funding or not
     */
    function poolNeedsFunding() external view override returns (bool) {
        return getPoolTarget() > collateralAmount;
    }

    modifier onlyLiquidation() {
        require(
            msg.sender == tracer.liquidationContract(),
            "INS: sender is not Liquidation contract"
        );
        _;
    }
}
