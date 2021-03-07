// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interfaces/ITracer.sol";
import "./Interfaces/IAccount.sol";
import "./Interfaces/IInsurance.sol";
import "./InsurancePoolToken.sol";
import "./lib/LibMath.sol";

contract Insurance is IInsurance, Ownable {
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using SafeERC20 for IERC20;
    using LibMath for uint256;
    using LibMath for int256;

    int256 public override constant INSURANCE_MUL_FACTOR = 1000000000;
    uint256 public constant SAFE_TOKEN_MULTIPLY = 1e18;
    address public immutable TCRTokenAddress;
    IAccount public account;

    struct StakePool { 
        address market;
        address collateralAsset;
        uint256 amount; // amount of underlying collateral in pool
        uint256 rewardsPerToken; // rewards redeemable per pool token
        address token; // tokenized holdings of pool - not necessarily 1 to 1 with underlying
        mapping(address => uint256) userDebt; // record of user debt to the pool
        mapping(address => uint256) lastRewardsUpdate;
    }

    // Tracer market => supported or not supported
    mapping(address => bool) internal supportedTracers;
    // Tracer market => StakePool
    mapping(address => StakePool) internal pools;

    event InsuranceDeposit(address indexed market, address indexed user, uint256 indexed amount);
    event InsuranceWithdraw(address indexed market, address indexed user, uint256 indexed amount);
    event InsurancePoolDeployed(address indexed market, address indexed asset);
    event InsurancePoolRewarded(address indexed market, uint256 indexed amount);

    constructor(address TCR) public {
        TCRTokenAddress = TCR;
    }

    /**
     * @notice Allows a user to stake to a given tracer market insurance pool
     * @dev Mints amount of the pool token to the user
     * @param amount the amount of tokens to stake
     * @param market the address of the tracer market to provide insurance
     */
    function stake(uint256 amount, address market) external override {
        StakePool storage pool = pools[market];
        IERC20 token = IERC20(pool.collateralAsset);
        require(supportedTracers[market], "INS: Tracer not supported");

        token.safeTransferFrom(msg.sender, address(this), amount);
        // Update pool balances and user
        InsurancePoolToken poolToken = InsurancePoolToken(pool.token);
        uint256 tokensToMint;
        if (poolToken.totalSupply() == 0) {
            // Mint at 1:1 ratio if no users in the pool
            tokensToMint = amount;
        } else {
            // Mint at the correct ratio =
            //          Pool tokens (the ones to be minted) / pool.amount (the collateral asset)
            // Note the difference between this and withdraw. Here we are calculating the amount of tokens
            // to mint, and `amount` is the amount to deposit.
            uint256 tokensToCollatRatio = (poolToken.totalSupply()).mul(SAFE_TOKEN_MULTIPLY).div(pool.amount);
            tokensToMint = tokensToCollatRatio.mul(amount).div(SAFE_TOKEN_MULTIPLY);
        }
        // Margin tokens become pool tokens
        poolToken.mint(msg.sender, tokensToMint);
        pool.amount = pool.amount.add(amount);
        emit InsuranceDeposit(market, msg.sender, amount);
    }

    /**
     * @notice Allows a user to withdraw their assets from a given insurance pool
     * @dev burns amount of tokens from the pool token
     * @param amount the amount of pool tokens to burn
     * @param market the tracer contract that the insurance pool is for.
     */
    function withdraw(uint256 amount, address market) external override {
        require(amount > 0, "INS: amount <= 0");
        uint256 balance = getPoolUserBalance(market, msg.sender);
        require(balance >= amount, "INS: balance < amount");
        // Burn tokens and pay out user
        StakePool storage pool = pools[market];
        IERC20 token = IERC20(pool.collateralAsset);
        InsurancePoolToken poolToken = InsurancePoolToken(pool.token);

        // Burn at the correct ratio =
        //             pool.amount (collateral asset) / pool tokens
        // Note the difference between this and stake. Here we are calculating the amount of tokens
        // to withdraw, and `amount` is the amount to burn.
        uint256 collatToTokensRatio = pool.amount.mul(SAFE_TOKEN_MULTIPLY).div(poolToken.totalSupply());
        uint256 tokensToSend = collatToTokensRatio.mul(amount).div(SAFE_TOKEN_MULTIPLY);

        // Pool tokens become margin tokens
        poolToken.burn(msg.sender, amount);
        token.safeTransfer(msg.sender, tokensToSend);
        pool.amount = pool.amount.sub(tokensToSend);
        emit InsuranceWithdraw(market, msg.sender, tokensToSend);
    }


    /**
     * @notice Internally updates a given tracer's pool amount according to the Account contract
     * @dev Withdraws from tracer in account, and adds amount to the pool's amount field
     * @param market the tracer contract that the insurance pool is for.
     */
    function updatePoolAmount(address market) external override {
        ITracer _tracer = ITracer(market);
        IERC20 tracerBaseToken = IERC20(_tracer.tracerBaseToken());
        (int256 margin, , , , , ) = account.getBalance(address(this), market);
        if (margin > 0) {
            account.withdraw(uint(margin), market);
        }
        // Sync with the balance of the tracer margin token
        pools[market].amount = tracerBaseToken.balanceOf(address(this));
    }

    /**
     * @notice Deposits some of the insurance pool's amount into the account contract
     * @dev If amount is greater than the insurance pool's balance, deposit total balance.
     *      This was done because in such an emergency situation, we want to recover as much as possible
     * @param market The Tracer market whose insurance pool will be drained
     * @param amount The desired amount to take from the insurance pool
     */
    function drainPool(address market, uint256 amount) external override onlyAccount() {
        ITracer _tracer = ITracer(market);
        StakePool storage pool = pools[market];
        IERC20 tracerMarginToken = IERC20(_tracer.tracerBaseToken());

        // Enforce a minimum. Very rare as funding rate will be incredibly high at this point
        if (pool.amount < 10 ** 18) {
            return;
        }

        if (amount > pool.amount) {
            amount = pool.amount;
        }

        // What the balance will be after
        uint256 difference = pool.amount - amount;
        if (difference < 10 ** 18) {
            // Once we go below one token, social loss is required
            // This calculation caps draining so pool always has at least one token
            amount = pool.amount - (10 ** 18);
            // Use new amount to compute difference again.
            difference = pool.amount - amount;
        }

        tracerMarginToken.approve(address(account), amount);
        account.deposit(amount, market);
        pool.amount = difference;
    }

    /**
     * @notice Deposits rewards (TCR tokens) into a given pool
     * @dev Transfers TCR tokens to the poolToken address, and calls depositFunds in pool token contract
     * @param amount the amount of TCR tokens to deposit
     * @param market the address of the tracer contract whose pool is to be rewarded
     */
    function reward(uint256 amount, address market) external override onlyOwner() {
        IERC20 tracer = IERC20(TCRTokenAddress);
        require(
            tracer.balanceOf(address(this)) >= amount,
            "INS: amount > rewards"
        );

        // Get pool token and give it the funds to distribute
        InsurancePoolToken poolToken = InsurancePoolToken(pools[market].token);
        tracer.transfer(address(poolToken), amount);
        // Deposit the fund to token holders
        poolToken.depositFunds(amount);
        emit InsurancePoolRewarded(market, amount);
    }

    /**
     * @notice Adds a new tracer market to be insured.
     * @dev Creates a new InsurancePoolToken and StakePool, adding them to pools and setting
     *      this tracer to be supported
     * @param market the address of the new tracer market
     */
    function deployInsurancePool(address market) external override onlyOwner() {
        require(!supportedTracers[market], "INS: pool already exists");
        ITracer _tracer = ITracer(market);
        // Deploy token for the pool
        InsurancePoolToken token = new InsurancePoolToken("Tracer Pool Token", "TPT", TCRTokenAddress);
        StakePool storage pool = pools[market];
        pool.market = market;
        pool.collateralAsset = _tracer.tracerBaseToken();
        pool.amount = 0;
        pool.rewardsPerToken = 0;
        pool.token = address(token);
        supportedTracers[market] = true;
        emit InsurancePoolDeployed(market, _tracer.tracerBaseToken());
    }

    /**
     * @notice gets a users balance in a given insurance pool
     * @param market the market of the insurance pool to get the balance for
     * @param user the user whose balance is being retrieved
     */
    function getPoolUserBalance(address market, address user) public override view returns (uint256) {
        require (supportedTracers[market], "INS: Market not supported");
        return InsurancePoolToken(pools[market].token).balanceOf(user);
    }

    /**
     * @notice Gets the amount of rewards per pool token for a given insurance pool
     * @param market the market of the insurance pool to get the rewards for
     */
    function getRewardsPerToken(address market) external override view returns (uint256) {
        return InsurancePoolToken(pools[market].token).rewardsPerToken();
    }

    /**
     * @notice Gets the token address representing pool ownership for a given pool
     * @param market the market of the insurance pool to get the pool token for
     */
    function getPoolToken(address market) external override view returns (address) {
        return pools[market].token;
    }

    /**
     * @notice Gets the target fund amount for a given insurance pool
     * @dev The target amount is 1% of the leveraged notional value of the tracer being insured.
     * @param market the market of the insurance pool to get the target for.
     */
    function getPoolTarget(address market) public override view returns (uint256) {
        ITracer tracer = ITracer(pools[market].market);
        int256 target = tracer.leveragedNotionalValue().div(100);

        if (target > 0) {
            return uint256(target);
        } else {
            return 0;
        }
    }

    /**
     * @notice Gets the total holdings of collateral for a given insurance pool
     * @param market the market of the insurance pool to get the holdings of.
     */
    function getPoolHoldings(address market) public override view returns (uint256) {
        return pools[market].amount;
    }

    /**
     * @notice Gets the 8 hour funding rate for an insurance pool
     * @dev the funding rate is represented as 0.0036523 * (insurance_fund_target - insurance_fund_holdings) / leveraged_notional_value)
     *      To preserve precision, the rate is multiplied by 10^7.

     * @param market the market of the insurance pool to get the funding rate of.
     */
    function getPoolFundingRate(address market) external override view returns (uint256) {
        ITracer _tracer = ITracer(market);

        uint256 multiplyFactor = 3652300;
        int256 levNotionalValue = _tracer.leveragedNotionalValue();
        if (levNotionalValue <= 0) {
            return 0;
        }

        int256 rate = (multiplyFactor.mul(getPoolTarget(market).sub(getPoolHoldings(market))).toInt256())

            .div(levNotionalValue);
        if (rate < 0) {
            return 0;
        } else {
            return uint256(rate);
        }
    }

    /**
     * @notice returns if the insurance pool needs funding or not
     * @param market the tracer market address
     */
    function poolNeedsFunding(address market) external override view returns (bool) {
        return getPoolTarget(market) > pools[market].amount;
    }

    /**
     * @notice returns if a tracer market is currently insured.
     * @param market the tracer market address
     */
    function isInsured(address market) external override view returns (bool) {
        return supportedTracers[market];
    }

    /**
     * @notice sets the address of the account contract (Account.sol)
     * @param accountContract the new address of the accountContract
     */
    function setAccountContract(address accountContract) external onlyOwner {
        account = IAccount(accountContract);
    }

    /**
     * @notice Checks if msg.sender is the account contract
     */
    modifier onlyAccount() {
        require(msg.sender == address(account), "INS: sender is not account");
        _;
    }
}
