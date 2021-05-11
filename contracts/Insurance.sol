// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/IInsurance.sol";
import "./Interfaces/ITracerPerpetualsFactory.sol";
import "./InsurancePoolToken.sol";
import "./lib/LibMath.sol";
import "./lib/SafetyWithdraw.sol";
import {Balances} from "./lib/LibBalances.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "prb-math/contracts/PRBMathSD59x18.sol";
import "prb-math/contracts/PRBMathUD60x18.sol";

contract Insurance is IInsurance, Ownable, SafetyWithdraw {
    using LibMath for uint256;
    using LibMath for int256;
    ITracerPerpetualsFactory public perpsFactory;

    address public collateralAsset; // Address of collateral asset
    uint256 public poolAmount; // amount of underlying collateral in pool
    address public token; // tokenized holdings of pool - not necessarily 1 to 1 with underlying

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

    constructor(address _tracer, address _perpsFactory) {
        perpsFactory = ITracerPerpetualsFactory(_perpsFactory);
        require(
            perpsFactory.validTracers(_tracer),
            "Pool not deployed by perpsFactory"
        );

        tracer = ITracerPerpetualSwaps(_tracer);
        InsurancePoolToken _token =
            new InsurancePoolToken("Tracer Pool Token", "TPT");
        token = address(_token);
        collateralAsset = tracer.tracerBaseToken();
        poolAmount = 0;

        emit InsurancePoolDeployed(_tracer, tracer.tracerBaseToken());
    }

    /**
     * @notice Allows a user to stake to a given tracer market insurance pool
     * @dev Mints amount of the pool token to the user
     * @param amount the amount of tokens to stake. Provided in token native units
     */
    function stake(uint256 amount) external override {
        IERC20 collateralToken = IERC20(collateralAsset);
        collateralToken.transferFrom(msg.sender, address(this), amount);

        // convert token amount to WAD
        uint256 amountToUpdate =
            uint256(Balances.tokenToWad(tracer.baseTokenDecimals(), amount));

        // Update pool balances and user
        updatePoolAmount();
        InsurancePoolToken poolToken = InsurancePoolToken(token);
        uint256 tokensToMint;

        if (poolToken.totalSupply() == 0) {
            // Mint at 1:1 ratio if no users in the pool
            tokensToMint = amountToUpdate;
        } else {
            // Mint at the correct ratio =
            //          Pool tokens (the ones to be minted) / poolAmount (the collateral asset)
            // Note the difference between this and withdraw. Here we are calculating the amount of tokens
            // to mint, and `amount` is the amount to deposit.
            tokensToMint = PRBMathUD60x18.mul(
                PRBMathUD60x18.div(poolToken.totalSupply(), poolAmount),
                amountToUpdate
            );
        }
        // Margin tokens become pool tokens
        poolToken.mint(msg.sender, tokensToMint);
        poolAmount = poolAmount + amountToUpdate;
        emit InsuranceDeposit(address(tracer), msg.sender, amountToUpdate);
    }

    /**
     * @notice Allows a user to withdraw their assets from a given insurance pool
     * @dev burns amount of tokens from the pool token
     * @param amount the amount of pool tokens to burn. Provided in WAD format
     */
    function withdraw(uint256 amount) external override {
        require(amount > 0, "INS: amount <= 0");

        updatePoolAmount();
        uint256 balance = getPoolUserBalance(msg.sender);
        require(balance >= amount, "INS: balance < amount");

        IERC20 collateralToken = IERC20(collateralAsset);
        // Burn tokens and pay out user
        InsurancePoolToken poolToken = InsurancePoolToken(token);

        // Burn at the correct ratio =
        //             poolAmount (collateral asset) / pool tokens
        // Note the difference between this and stake. Here we are calculating the amount of tokens
        // to withdraw, and `amount` is the amount to burn.
        uint256 wadTokensToSend =
            PRBMathUD60x18.mul(
                PRBMathUD60x18.div(poolAmount, poolToken.totalSupply()),
                amount
            );

        // convert token amount to raw amount from WAD
        uint256 tokensToSend =
            Balances.wadToToken(tracer.baseTokenDecimals(), wadTokensToSend);

        // Pool tokens become margin tokens
        poolToken.burnFrom(msg.sender, amount);
        collateralToken.transfer(msg.sender, tokensToSend);
        // pool amount is always in WAD format
        poolAmount = poolAmount - wadTokensToSend;
        emit InsuranceWithdraw(address(tracer), msg.sender, wadTokensToSend);
    }

    /**
     * @notice Internally updates a given tracer's pool amount according to the tracer contract
     * @dev Withdraws from tracer, and adds amount to the pool's amount field.
     */
    function updatePoolAmount() public override {
        int256 base = (tracer.getBalance(address(this))).position.base;
        if (base > 0) {
            tracer.withdraw(uint256(base));
            poolAmount = poolAmount + uint256(base);
        }
    }

    /**
     * @notice Deposits some of the insurance pool's amount into the tracer contract
     * @dev If amount is greater than the insurance pool's balance, deposit total balance.
     *      This was done because in such an emergency situation, we want to recover as much as possible
     * @param amount The desired amount to take from the insurance pool
     */
    function drainPool(uint256 amount) external override onlyLiquidation() {
        IERC20 tracerMarginToken = IERC20(tracer.tracerBaseToken());

        // Enforce a minimum. Very rare as funding rate will be incredibly high at this point
        if (poolAmount < 10**18) {
            return;
        }

        // Enforce a maximum at poolAmount
        if (amount > poolAmount) {
            amount = poolAmount;
        }

        // What the balance will be after
        uint256 difference = poolAmount - amount;
        if (difference < 10**18) {
            // Once we go below one token, social loss is required
            // This calculation caps draining so pool always has at least one token
            amount = poolAmount - (10**18);
            // Use new amount to compute difference again.
            difference = poolAmount - amount;
        }

        tracerMarginToken.approve(address(tracer), amount);
        tracer.deposit(amount);
        poolAmount = difference;
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
     * @dev the funding rate is represented as 0.0036523 * (insurance_fund_target - insurance_fund_holdings) / leveraged_notional_value)
     *      To preserve precision, the rate is multiplied by 10^7.
     */
    function getPoolFundingRate() external view override returns (uint256) {
        // 0.0036523 as a WAD = 36523 * (10**11)
        uint256 multiplyFactor = 36523 * (10**11);

        uint256 levNotionalValue = tracer.leveragedNotionalValue();
        if (levNotionalValue <= 0) {
            return 0;
        }

        uint256 ratio =
            PRBMathUD60x18.div(getPoolTarget() - poolAmount, levNotionalValue);
        return PRBMathUD60x18.mul(multiplyFactor, ratio);
    }

    /**
     * @notice returns if the insurance pool needs funding or not
     */
    function poolNeedsFunding() external view override returns (bool) {
        return getPoolTarget() > poolAmount;
    }

    modifier onlyLiquidation() {
        require(
            msg.sender == tracer.liquidationContract(),
            "INS: sender is not Liquidation contract"
        );
        _;
    }
}
