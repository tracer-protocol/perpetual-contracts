/* Support types for signing */
const domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
]

const limitOrder = [
    { name: "amount", type: "uint256" },
    { name: "price", type: "int256" },
    { name: "side", type: "bool" },
    { name: "user", type: "address" },
    { name: "expiration", type: "uint256" },
    { name: "targetTracer", type: "address" },
    { name: "nonce", type: "uint256" },
]

function domainData(trader_address) {
    return {
        name: "Tracer Protocol",
        version: "1.0",
        chainId: 1337,
        verifyingContract: trader_address,
    }
}

/* Helpers for signing */

const signOrder = async (web3, signingAccount, data, callback) => {
    const signer = web3.utils.toChecksumAddress(signingAccount)
    return new Promise((resolve, reject) => {
        web3.currentProvider.send(
            {
                method: "eth_signTypedData",
                params: [signer, data],
                from: signer,
            },

            async (err, result) => {
                if (err) {
                    reject(err)
                }
                let parsedSig = result.result.substring(2)
                const r = "0x" + parsedSig.substring(0, 64)
                const s = "0x" + parsedSig.substring(64, 128)
                const v = parseInt(parsedSig.substring(128, 130), 16) //130 hex = 65bytes
                return resolve([r, s, v])
            }
        )
    })
}


//Process and sign orders
const signOrders = async (web3, orders, traderAddress) => {
    let _domainData = domainData(traderAddress)
    return await orders.map(async (order) => {
        let type = {
            EIP712Domain: domain,
            LimitOrder: limitOrder,
        }

        let dataToSign = {
            domain: _domainData,
            primaryType: "LimitOrder",
            message: order,
            types: type,
        }

        let signedData = await signOrder(web3, order.user, dataToSign)

        return {
            order: order,
            sigR: signedData[0],
            sigS: signedData[1],
            sigV: signedData[2],
        }
    })
}

module.exports = {
    domain,
    limitOrder,
    domainData,
    signOrder,
    signOrders
}