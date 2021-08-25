const { expect } = require("chai")
// Executes a successful trade at a specified price and amount.
// Uses account 1 as the long maker and account 2 as the short maker by default.
const executeTrade = async (
    contracts,
    accounts,
    price,
    amount,
    longMaker = accounts[1].address,
    shortMaker = accounts[2].address
) => {
    const long = customOrder(contracts, price, amount, 0, longMaker)
    const short = customOrder(contracts, price, amount, 1, shortMaker)
    await matchOrders(contracts, long, short)
}

// Returns an order object with specified attributes. Unspecified attributes are set to valid default values.
// Must provide the deployment fixture, price, amount, side and maker
const customOrder = (
    contracts,
    _price,
    _amount,
    _side,
    _maker,
    _market = contracts.tracer.address,
    _expires = 3621988237,
    _created = 0
) => {
    return {
        maker: _maker,
        market: _market,
        price: _price,
        amount: _amount,
        side: _side, // long = 0, short = 1
        expires: _expires,
        created: _created,
    }
}

// matches two orders
const matchOrders = async (contracts, order1, order2) => {
    // set up basic trades
    const mockSignedOrder1 = [
        order1,
        ethers.utils.formatBytes32String("DummyString"),
        ethers.utils.formatBytes32String("DummyString"),
        0,
    ]

    const mockSignedOrder2 = [
        order2,
        ethers.utils.formatBytes32String("DummyString"),
        ethers.utils.formatBytes32String("DummyString"),
        0,
    ]

    // place trades
    let trade = await contracts.trader.executeTrade(
        [mockSignedOrder1],
        [mockSignedOrder2]
    )
    await contracts.trader.clearFilled(mockSignedOrder1)
    await contracts.trader.clearFilled(mockSignedOrder2)
    expect(trade).to.emit(contracts.tracer, "MatchedOrders")
}

module.exports = {
    executeTrade,
    customOrder,
    matchOrders,
}
