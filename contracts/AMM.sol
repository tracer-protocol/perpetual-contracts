//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./lib/LibMath.sol";
import "./lib/LibBalances.sol";
import "./Interfaces/ITracerPerpetualSwaps.sol";

contract AMM is Ownable {
    using LibMath for uint256;
    using LibMath for int256;

    uint256 constant DECIMAL_FACTOR = 10 ** 9;

    /* provided for semantic clarity */
    uint256 constant SECONDS_PER_MINUTE = 60;
    uint256 constant MINUTES_PER_HOUR = 60;
    uint256 constant HOURS_PER_DAY = 24;

    /********************************* STATE **********************************/

    ITracerPerpetualSwaps tracer;
    Balances.Account hfAccount;
    Balances.Account lfAccount;

    enum PoolChoice {
        HIGH_FEE,
        LOW_FEE
    }

    struct Pool {
        int256 base;
        int256 quote;
        int256 baseTarget;
        int256 quoteTarget;
        int256 basePosition;
        int256 quotePosition;
        uint256 liquidityShareSupply;
        mapping (address => uint256) liquidityShares;
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
    constructor(
        address _tracer
    ) public Ownable {
        tracer = ITracerPerpetualSwaps(_tracer);
    }

    /**
     * @notice Synchronise base and quote with AMM position from possible
     *          funding rate and liquidation expenses
     *
     */
    function syncWithPosition() public {
        /* high-fee side */

        /* targets change proportional to the change in base */
        highFeePool.baseTarget *= highFeePool.base / highFeePool.basePosition;
        highFeePool.quoteTarget *= highFeePool.base / highFeePool.basePosition;
        highFeePool.base = highFeePool.basePosition;

        /* check that at least one currency is within target (note that it
         * should not be possible for this condition to be true) */
        if(highFeePool.base < highFeePool.baseTarget && highFeePool.quote < highFeePool.quoteTarget) {
            /* reduce quote target to satisfy safety condition */
            highFeePool.quoteTarget = highFeePool.quote - (highFeePool.baseTarget - highFeePool.base) / getFairPrice();

            /* resync quote value now that quote target has changed */
            highFeePool.quote = highFeePool.quoteTarget + highFeePool.quotePosition;
        }

        /* low-fee side */

        /* targets change proportional to the change in base */
        lowFeePool.baseTarget *= lowFeePool.base / lowFeePool.basePosition;
        lowFeePool.quoteTarget *= lowFeePool.base / lowFeePool.basePosition;
        lowFeePool.base = lowFeePool.basePosition;

        /* check that at least one currency is within target (note that it
         * should not be possible for this condition to be true) */
        if(lowFeePool.base < lowFeePool.baseTarget && lowFeePool.quote < lowFeePool.quoteTarget) {
            /* reduce quote target to satisfy safety condition */
            lowFeePool.quoteTarget = lowFeePool.quote - (lowFeePool.baseTarget - lowFeePool.base) / getFairPrice();

            /* resync quote value now that quote target has changed */
            lowFeePool.quote = lowFeePool.quoteTarget + lowFeePool.quotePosition;
        }
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

        (, int256 liquidityProviderBase, , , ,) = tracer.getBalance(
                                                    address(hfAccount),
                                                    address(tracer));

        /* sync base and quote currencies */
        syncWithPosition();

        /* retrieve maximum allowable leverage for this market */
        uint256 maxLeverage = getMaxLeverage(); /* TODO: get maximum leverage */

        /* retrieve the fair price for this market */
        int256 fairPrice = getFairPrice(); /* TODO: get fair price */

        pool.basePosition  = pool.basePosition + amount;
        pool.quoteTarget += amount / getFairPrice() * int(maxLeverage);
        pool.quote += amount / getFairPrice() * int(maxLeverage);

        uint256 liquidityIncrease = 0;

        if(pool.baseTarget == 0) { /* pool is empty */
            require(amount > 0);
            lastFeeUpdate = block.number;
            liquidityIncrease = uint(amount);
            pool.liquidityShares[msg.sender] += liquidityIncrease;
            pool.liquidityShareSupply += liquidityIncrease;
        } else if(pool.baseTarget > 0) { /* pool already has liquidity */
            liquidityIncrease = uint(amount * pool.baseTarget / pool.base);

            pool.liquidityShares[msg.sender] += uint(liquidityIncrease *
                pool.liquidityShareSupply / uint(pool.baseTarget));
            pool.liquidityShareSupply += uint(liquidityIncrease *
                pool.liquidityShareSupply / uint(pool.baseTarget));
        }

        /* update pool's target and position (in *base* currency) */
        pool.baseTarget += int(liquidityIncrease);
        pool.base += amount;
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

        require(int(highFeePool.liquidityShares[msg.sender]) >= amount,
            "Insufficient LP share balance");
        syncWithPosition();
        pool.liquidityShares[msg.sender] -= uint(amount);

        /* transfer base currency to msg.sender */
        pool.basePosition -= (pool.base * amount) / int(pool.liquidityShareSupply);
        // lpBasePosition += (pool.base * amount) / pool.liquidityShares; /* TODO: API issue */
        pool.base -= (pool.base * amount) / int(pool.liquidityShareSupply);

        /* update the BaseTarget in order to remain proportionate */
        pool.baseTarget -= ((pool.baseTarget / pool.base) * amount) /
            int(pool.liquidityShareSupply);
        pool.basePosition -= (pool.baseTarget * amount) / int(pool.liquidityShareSupply);

        /* if the AMM is exposed at the time of withdrawal, the withdrawing LP
         * gets their portion of that exposure */
        pool.quotePosition -= ((pool.quoteTarget - pool.quote) * amount) /
            int(pool.liquidityShareSupply);
        // lpPositionQuote += ((pool.quoteTarget - pool.quote) * amount) / /* TODO: API issue */
        //     pool.liquidityShares;
        pool.quote -= (pool.quoteTarget - pool.quote) * amount /
            int(pool.liquidityShareSupply);
        pool.quotePosition -= ((pool.quoteTarget - pool.quote) * amount) /
            int(pool.liquidityShareSupply);
        pool.liquidityShareSupply -= uint(amount);
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

        require(highFeePool.baseTarget > 0 || 0 < lowFeePool.baseTarget);
        require(daysSinceFeeUpdate > 1);

        uint256 skew = uint((highFeePool.baseTarget / (highFeePool.baseTarget + lowFeePool.baseTarget)) * int(DECIMAL_FACTOR));

        uint256 adjustedMinutesSinceFeeUpdate = (block.timestamp - lastFeeUpdate -
            (SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY)) / SECONDS_PER_MINUTE;

        /* calculate fee */
        if(skew > 500000000) {
            lowFee = LibMath.min(250000000 * DECIMAL_FACTOR, lowFee * (4 * (skew - 500000000) ** 2 + 1));
        } else if(skew < 500000000) {
            //lowFee = lowFee * (-2 * (skew - 500000000)**2 + 1);
        }

        /* handle keeper payment */
        uint256 keeperPayment = 10000000 * (adjustedMinutesSinceFeeUpdate) ** 3;
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

        if(pool.base == pool.baseTarget) {
            require(amount < 0);
        } else {
            require(pool.base < pool.baseTarget);
        }

        traderPositionBase -= int(amount);
        uint256 maxLeverage = getMaxLeverage(); // TODO: get max leverage
        int256 fairPrice = getFairPrice(); // TODO: get fair price
        uint256 feeCollected = uint(amount) * lowFee * 2;

        if(pool.base + amount < 0) {
            feeCollected += (0 - (uint(pool.base + amount))) / maxLeverage;
        }

        if(amount > 0) {
            amount -= int(feeCollected);
        }

        if(amount < 0) {
            amount += int(feeCollected);
        }

        pool.quoteTarget += int(
            int(feeCollected) / getFairPrice() * int(maxLeverage) * pool.quoteTarget / pool.quote);
        pool.quote += int(feeCollected) * pool.baseTarget / pool.base;

        if (amount > 0) {
            require(amount <= pool.baseTarget - pool.base);
        }

        uint256 exposure = uint(((pool.base + amount / 2) - pool.baseTarget) / pool.baseTarget);
        int256 tradePrice = getFairPrice() + int(sensitivity) * getFairPrice() * int(exposure);

        /* `quotePayment` is the amount of the quote asset LEAVING the AMM.
         * If `amount` is positive, then so is `quotePayment`.
         * If `quotePeyment` is negative, then the trader receives negative
         *      quote and AMM gains positive quote asset balance.
         */
        int256 quotePayment = tradePrice * amount;

        /* Deposit `amount` of base int AMM now that the quote payment has been
         * determined.
         */
        pool.basePosition += amount;
        pool.base += amount;

        /* Transfer quote currency to `msg.sender` */
        pool.quotePosition -= quotePayment;
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

        if(pool.quote == pool.quoteTarget) {
            require(amount < 0);
        } else {
            require(pool.quote < pool.quoteTarget);
        }

        traderPositionQuote -= amount;
        uint256 maxLeverage = getMaxLeverage();
        uint256 exposure = uint((pool.quoteTarget - (pool.quote - amount / 2)) /
                                pool.quoteTarget);
        int256 hfPrice = getFairPrice() + int(sensitivity) * getFairPrice() * int(exposure);
        uint256 feeCollected = uint(amount) * lowFee * 2 * uint(hfPrice);

        if (pool.quote + amount < 0) {
            feeCollected += (0 - (uint(pool.quote + amount))) / maxLeverage * uint(getFairPrice());
        }

        traderPositionBase -= int(feeCollected);
        pool.basePosition += int(feeCollected);
        pool.quoteTarget += int(feeCollected) / getFairPrice() * int(maxLeverage) *
                                pool.quoteTarget / pool.quote;
        pool.quote += int(feeCollected) / getFairPrice() * int(maxLeverage);
        pool.baseTarget += int(feeCollected) * pool.baseTarget / pool.base;
        pool.base += int(feeCollected);

        if (amount > 0) {
            require(amount <= pool.baseTarget - pool.base);
        }

        int256 tradePrice = getFairPrice() + int(sensitivity) * getFairPrice() * int(exposure);
        int256 basePayment = tradePrice * amount;
        pool.quotePosition += amount;
        pool.quote += amount;

        pool.basePosition -= basePayment;
        traderPositionBase += basePayment;
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

