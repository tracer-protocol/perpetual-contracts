//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./lib/LibMath.sol";
import "./lib/LibBalances.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";

contract AMM is Ownable {
    using LibMath for uint256;
    using LibMath for int256;

    uint256 constant DECIMAL_FACTOR = 10**9;

    /* provided for semantic clarity */
    uint256 constant SECONDS_PER_MINUTE = 60;
    uint256 constant MINUTES_PER_HOUR = 60;
    uint256 constant HOURS_PER_DAY = 24;

    /********************************* STATE **********************************/

    ITracerPerpetualSwaps tracer;
    Balances.Account highFeeAccount;
    Balances.Account lowFeeAccount;

    enum PoolChoice {
        HIGH_FEE,
        LOW_FEE
    }

    struct Pool {
        Balances.Position actual;
        Balances.Position target;
        Balances.Position foobarPosition; /* TODO: what is this for? */
        uint256 liquidityShareSupply;
        mapping(address => uint256) liquidityShares;
    }

    Pool highFeePool;
    Pool lowFeePool;

    /* timestamp of last successful fee update */
    uint256 lastFeeUpdate;

    int256 traderPositionBase; // TODO: API placeholder
    int256 traderPositionQuote; // TODO: API placeholder

    uint256 lowFee;
    uint256 highFee;
    uint256 sensitivity; // TODO: what does this do?

    /****************************** PUBLIC API ********************************/

    /**
     * @notice Creates a new Tracer dnAMM instance
     *
     */
    constructor(address _tracer) Ownable() {
        tracer = ITracerPerpetualSwaps(_tracer);
    }

    /**
     * @notice Synchronise base and quote with AMM position from possible
     *          funding rate and liquidation expenses
     *
     */
    function syncWithPosition() public {
        syncPoolWithPosition(highFeePool);
        syncPoolWithPosition(lowFeePool);
    }

    /**
     * @notice Deposits liquidity into the specified pool
     * @param amount The quantity of *base* currency to deposit into the pool
     * @param poolChoice The target pool
     */
    function deposit(int256 amount, PoolChoice poolChoice) public {
        Pool storage pool = highFeePool; /* default to the high fee pool */

        /* determine what pool to use based on caller's selection */
        if (poolChoice == PoolChoice.HIGH_FEE) {
            pool = highFeePool;
        } else if (poolChoice == PoolChoice.LOW_FEE) {
            pool = lowFeePool;
        }

        Balances.Account memory lpAccount = tracer.getBalance(msg.sender);
        Balances.Position memory lpPosition = lpAccount.position;
        int256 liquidityProviderBase = lpPosition.base;

        /* sync base and quote currencies */
        syncWithPosition();

        /* retrieve maximum allowable leverage for this market */
        uint256 maxLeverage = getMaxLeverage(); /* TODO: get maximum leverage */

        /* retrieve the fair price for this market */
        int256 fairPrice = getFairPrice(); /* TODO: get fair price */

        pool.foobarPosition.base = pool.foobarPosition.base + amount;
        pool.target.quote += (amount / getFairPrice()) * int256(maxLeverage);
        pool.actual.quote += (amount / getFairPrice()) * int256(maxLeverage);

        uint256 liquidityIncrease = 0;

        if (pool.target.base == 0) {
            /* pool is empty */
            require(amount > 0);
            lastFeeUpdate = block.number;
            liquidityIncrease = uint256(amount);
            pool.liquidityShares[msg.sender] += liquidityIncrease;
            pool.liquidityShareSupply += liquidityIncrease;
        } else if (pool.target.base > 0) {
            /* pool already has liquidity */
            liquidityIncrease = uint256((amount * pool.target.base) / pool.actual.base);

            pool.liquidityShares[msg.sender] += uint256(
                (liquidityIncrease * pool.liquidityShareSupply) / uint256(pool.target.base)
            );
            pool.liquidityShareSupply += uint256(
                (liquidityIncrease * pool.liquidityShareSupply) / uint256(pool.target.base)
            );
        }

        /* update pool's target and position (in *base* currency) */
        pool.target.base += int256(liquidityIncrease);
        pool.actual.base += amount;
    }

    /**
     * @notice Withdraws liquidity from the high-fee pool
     * @param amount The quantity of LP shares to burn
     * @param poolChoice The target pool
     */
    function withdraw(int256 amount, PoolChoice poolChoice) public {
        Pool storage pool = highFeePool; /* default to the high fee pool */

        /* determine what pool to use based on caller's selection */
        if (poolChoice == PoolChoice.HIGH_FEE) {
            pool = highFeePool;
        } else if (poolChoice == PoolChoice.LOW_FEE) {
            pool = lowFeePool;
        }

        require(int256(highFeePool.liquidityShares[msg.sender]) >= amount, "Insufficient LP share balance");
        syncWithPosition();
        pool.liquidityShares[msg.sender] -= uint256(amount);

        /* transfer base currency to msg.sender */
        pool.foobarPosition.base -= (pool.actual.base * amount) / int256(pool.liquidityShareSupply);
        // lpBasePosition += (pool.actual.base * amount) / pool.liquidityShares; /* TODO: API issue */
        pool.actual.base -= (pool.actual.base * amount) / int256(pool.liquidityShareSupply);

        /* update the BaseTarget in order to remain proportionate */
        pool.target.base -= ((pool.target.base / pool.actual.base) * amount) / int256(pool.liquidityShareSupply);
        pool.foobarPosition.base -= (pool.target.base * amount) / int256(pool.liquidityShareSupply);

        /* if the AMM is exposed at the time of withdrawal, the withdrawing LP
         * gets their portion of that exposure */
        pool.foobarPosition.quote -=
            ((pool.target.quote - pool.actual.quote) * amount) /
            int256(pool.liquidityShareSupply);
        // lpPositionQuote += ((pool.target.quote - pool.actual.quote) * amount) / /* TODO: API issue */
        //     pool.liquidityShares;
        pool.actual.quote -= ((pool.target.quote - pool.actual.quote) * amount) / int256(pool.liquidityShareSupply);
        pool.foobarPosition.quote -=
            ((pool.target.quote - pool.actual.quote) * amount) /
            int256(pool.liquidityShareSupply);
        pool.liquidityShareSupply -= uint256(amount);
    }

    /**
     * @notice
     *
     */
    function updateFee() public {
        /* TODO: updateFee */
        syncWithPosition();

        uint256 daysSinceFeeUpdate = (block.timestamp - lastFeeUpdate) /
            (SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY);

        require(highFeePool.target.base > 0 || 0 < lowFeePool.target.base);
        require(daysSinceFeeUpdate > 1);

        uint256 skew = uint256(
            (highFeePool.target.base / (highFeePool.target.base + lowFeePool.target.base)) * int256(DECIMAL_FACTOR)
        );

        uint256 adjustedMinutesSinceFeeUpdate = (block.timestamp -
            lastFeeUpdate -
            (SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY)) / SECONDS_PER_MINUTE;

        /* calculate fee */
        if (skew > 500000000) {
            lowFee = LibMath.min(250000000 * DECIMAL_FACTOR, lowFee * (4 * (skew - 500000000)**2 + 1));
        } else if (skew < 500000000) {
            //lowFee = lowFee * (-2 * (skew - 500000000)**2 + 1);
        }

        /* handle keeper payment */
        uint256 keeperPayment = 10000000 * (adjustedMinutesSinceFeeUpdate)**3;
        highFeePool.liquidityShareSupply += keeperPayment / 2;
        lowFeePool.liquidityShareSupply += keeperPayment / 2;
        highFeePool.liquidityShares[msg.sender] += keeperPayment / 2;
        lowFeePool.liquidityShares[msg.sender] += keeperPayment / 2;
    }

    /**
     * @notice Sends `amount` of *base* currency from the trader to the high-fee
     *          pool
     * @param amount The quantity of the *base* currency the trader is sending
     *          to the pool
     * @param poolChoice The target pool
     */
    function tradeBase(int256 amount, PoolChoice poolChoice) public {
        Pool storage pool = highFeePool; /* default to the high fee pool */

        /* determine what pool to use based on caller's selection */
        if (poolChoice == PoolChoice.HIGH_FEE) {
            pool = highFeePool;
        } else if (poolChoice == PoolChoice.LOW_FEE) {
            pool = lowFeePool;
        }

        syncWithPosition();

        if (pool.actual.base == pool.target.base) {
            require(amount < 0);
        } else {
            require(pool.actual.base < pool.target.base);
        }

        traderPositionBase -= int256(amount);
        uint256 maxLeverage = getMaxLeverage(); // TODO: get max leverage
        int256 fairPrice = getFairPrice(); // TODO: get fair price
        uint256 feeCollected = uint256(amount) * lowFee * 2;

        if (pool.actual.base + amount < 0) {
            feeCollected += (0 - (uint256(pool.actual.base + amount))) / maxLeverage;
        }

        if (amount > 0) {
            amount -= int256(feeCollected);
        }

        if (amount < 0) {
            amount += int256(feeCollected);
        }

        pool.target.quote += int256(
            ((int256(feeCollected) / getFairPrice()) * int256(maxLeverage) * pool.target.quote) / pool.actual.quote
        );
        pool.actual.quote += (int256(feeCollected) * pool.target.base) / pool.actual.base;

        if (amount > 0) {
            require(amount <= pool.target.base - pool.actual.base);
        }

        uint256 exposure = uint256(((pool.actual.base + amount / 2) - pool.target.base) / pool.target.base);
        int256 tradePrice = getFairPrice() + int256(sensitivity) * getFairPrice() * int256(exposure);

        /* `quotePayment` is the amount of the quote asset LEAVING the AMM.
         * If `amount` is positive, then so is `quotePayment`.
         * If `quotePeyment` is negative, then the trader receives negative
         *      quote and AMM gains positive quote asset balance.
         */
        int256 quotePayment = tradePrice * amount;

        /* Deposit `amount` of base int AMM now that the quote payment has been
         * determined.
         */
        pool.foobarPosition.base += amount;
        pool.actual.base += amount;

        /* Transfer quote currency to `msg.sender` */
        pool.foobarPosition.quote -= quotePayment;
        traderPositionQuote += quotePayment;
    }

    /**
     * @notice Sends `amount` of *quote* currency from the trader to the
     *          high-fee pool
     * @param amount The quantity of the *quote* currency the trader is sending
     *          to the pool
     * @param poolChoice The target pool
     */
    function tradeQuote(int256 amount, PoolChoice poolChoice) public {
        Pool storage pool = highFeePool; /* default to the high fee pool */

        /* determine what pool to use based on caller's selection */
        if (poolChoice == PoolChoice.HIGH_FEE) {
            pool = highFeePool;
        } else if (poolChoice == PoolChoice.LOW_FEE) {
            pool = lowFeePool;
        }

        syncWithPosition();

        if (pool.actual.quote == pool.target.quote) {
            require(amount < 0);
        } else {
            require(pool.actual.quote < pool.target.quote);
        }

        traderPositionQuote -= amount;
        uint256 maxLeverage = getMaxLeverage();
        uint256 exposure = uint256((pool.target.quote - (pool.actual.quote - amount / 2)) / pool.target.quote);
        int256 highFeePrice = getFairPrice() + int256(sensitivity) * getFairPrice() * int256(exposure);
        uint256 feeCollected = uint256(amount) * lowFee * 2 * uint256(highFeePrice);

        if (pool.actual.quote + amount < 0) {
            feeCollected += ((0 - (uint256(pool.actual.quote + amount))) / maxLeverage) * uint256(getFairPrice());
        }

        traderPositionBase -= int256(feeCollected);
        pool.foobarPosition.base += int256(feeCollected);
        pool.target.quote +=
            ((int256(feeCollected) / getFairPrice()) * int256(maxLeverage) * pool.target.quote) /
            pool.actual.quote;
        pool.actual.quote += (int256(feeCollected) / getFairPrice()) * int256(maxLeverage);
        pool.target.base += (int256(feeCollected) * pool.target.base) / pool.actual.base;
        pool.actual.base += int256(feeCollected);

        if (amount > 0) {
            require(amount <= pool.target.base - pool.actual.base);
        }

        int256 tradePrice = getFairPrice() + int256(sensitivity) * getFairPrice() * int256(exposure);
        int256 basePayment = tradePrice * amount;
        pool.foobarPosition.quote += amount;
        pool.actual.quote += amount;

        pool.foobarPosition.base -= basePayment;
        traderPositionBase += basePayment;
    }

    /*********************************** PRIVATE ******************************/

    function syncPoolWithPosition(Pool storage pool) internal {
        /* targets change proportional to the change in base */
        pool.target.base *= pool.actual.base / pool.foobarPosition.base;
        pool.target.quote *= pool.actual.base / pool.foobarPosition.base;
        pool.actual.base = pool.foobarPosition.base;

        /* check that at least one currency is within target (note that it
         * should not be possible for this condition to be true) */
        if (pool.actual.base < pool.target.base && pool.actual.quote < pool.target.quote) {
            /* reduce quote target to satisfy safety condition */
            pool.target.quote = pool.actual.quote - (pool.target.base - pool.actual.base) / getFairPrice();

            /* resync quote value now that quote target has changed */
            pool.actual.quote = pool.target.quote + pool.foobarPosition.quote;
        }
    }

    /********************************** UTILITIES *****************************/

    /**
     * @notice Retrieves the maximum allowed leverage for the Tracer market
     *
     */
    function getMaxLeverage() private returns (uint256) {
        /* TODO: getMaxLeverage */
    }

    /**
     * @notice Retrieves the fair price of the underlying asset for the Tracer
     *          market
     *
     */
    function getFairPrice() private returns (int256) {
        /* TODO: getFairPrice */
    }
}
