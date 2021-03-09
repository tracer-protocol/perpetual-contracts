//@ts-ignore
import { BN, expectRevert, time } from "@openzeppelin/test-helpers"
import { assert } from "chai"
import { AccountInstance, DeployerV1Instance, GasOracleInstance, GovInstance, InsuranceInstance, OracleInstance, PricingInstance, ReceiptInstance, TestTokenInstance, TracerFactoryInstance, TracerInstance, TraderInstance } from "../../types/truffle-contracts"
import { Trader } from "../artifacts"
import { setupContractsAndTracer } from "../lib/Setup"
import { accounts, web3, configure } from "../configure"

/* Support types for signing */
export let domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
]

export let limitOrder = [
    { name: "amount", type: "uint256" },
    { name: "price", type: "int256" },
    { name: "side", type: "bool" },
    { name: "user", type: "address" },
    { name: "expiration", type: "uint256" },
    { name: "targetTracer", type: "address" },
    { name: "nonce", type: "uint256" },
]

export async function domainData(trader_address: string) {
    return {
        name: "Tracer Protocol",
        version: "1.0",
        chainId: 1337,
        verifyingContract: trader_address,
    }
}

/* Helpers for signing */

//@ts-ignore
export const signOrder = async (web3, signingAccount, data, callback) => {
    const signer = web3.utils.toChecksumAddress(signingAccount)
    return new Promise((resolve, reject) => {
        web3.currentProvider.send(
            {
                method: "eth_signTypedData",
                params: [signer, data],
                from: signer,
            },
            //@ts-ignore
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
//@ts-ignore
export const signOrders = async (web3, orders, domain, domainData, limitOrder) => {
    //@ts-ignore
    return await orders.map(async (order) => {
        let type = {
            EIP712Domain: domain,
            LimitOrder: limitOrder,
        }

        let dataToSign = {
            domain: domainData,
            primaryType: "LimitOrder",
            message: order,
            types: type,
        }

        //@ts-ignore
        let signedData: [string, string, string] = await signOrder(web3, order.user, dataToSign)

        return {
            order: order,
            sigR: signedData[0],
            sigS: signedData[1],
            sigV: signedData[2],
        }
    })
}
