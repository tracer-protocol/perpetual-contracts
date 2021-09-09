const {
    domain,
    orderType,
    generateDomainData,
} = require("@tracer-protocol/tracer-utils")
const sigUtil = require("eth-sig-util")

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
    let tx = await matchOrders(contracts, long, short)
    return tx
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
    let tx = await contracts.trader.executeTrade(
        [mockSignedOrder1],
        [mockSignedOrder2]
    )
    await contracts.trader.clearFilled(mockSignedOrder1)
    await contracts.trader.clearFilled(mockSignedOrder2)
    return tx
}

// given an order, generates the signed data without needing to call to an external RPC node
const attachSignatureToOrders = (traderAddress, signer, orders) => {
    const type = {
        EIP712Domain: domain,
        Order: orderType,
    }

    const domainData = generateDomainData(traderAddress, 31337)

    // private key buffer must be pure hex without the 0x prefix
    const signerKeyNoPrefix = signer.privateKey.slice(2)
    const privateKeyBuffer = Buffer.from(signerKeyNoPrefix, "hex")

    return orders.map((unsignedOrder) => {
        const data = {
            domain: domainData,
            primaryType: "Order",
            message: unsignedOrder,
            types: type,
        }

        const signature = sigUtil.signTypedData_v4(privateKeyBuffer, {
            data,
        })

        unsignedOrder.signed_data = signature

        const parsedSig = signature.substring(2)
        const r = "0x" + parsedSig.substring(0, 64)
        const s = "0x" + parsedSig.substring(64, 128)
        const v = parseInt(parsedSig.substring(128, 130), 16) // 130 hex = 65bytes

        return {
            order: unsignedOrder,
            sigR: r,
            sigS: s,
            sigV: v,
        }
    })
}

module.exports = {
    executeTrade,
    customOrder,
    matchOrders,
    attachSignatureToOrders,
}
