//@ts-ignore
import { expectRevert } from "@openzeppelin/test-helpers"
import assert from "assert"
import { setupContractsAndTracer } from "../lib/Setup"
import { TracerInstance, TraderInstance } from "../../types/truffle-contracts"
import { signOrder, signOrders, domain, domainData, limitOrder } from "../lib/Signing"
import { accounts, configure, web3 } from "../configure"

describe("Trader Shim unit tests", async () => {
    let deployed;
    let trader: TraderInstance;
    let tracer: TracerInstance;
    
    let sampleMakers: any;
    let sampleTakers: any;
    let badMakers: any;

    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        deployed = await setupContractsAndTracer(accounts);
        tracer = await deployed.tracer;
        trader = await deployed.trader;
    
        sampleMakers = [
            {
                amount: "5000000000000000000",
                price: "100000000",
                side: true,
                user: accounts[1],
                expiration: 1598590237,
                targetTracer: tracer.address,
                nonce: 18,
            },
            {
                amount: "5000002200000000000",
                price: "100000088",
                side: false,
                user: accounts[0],
                expiration: 1598590909,
                targetTracer: tracer.address,
                nonce: 33,
            }
        ];
    
        sampleTakers = [
            {
                amount: "5000000000000000000",
                price: "100000000",
                side: true,
                user: accounts[2],
                expiration: 1598590237,
                targetTracer: tracer.address,
                nonce: 18,
            },
            {
                amount: "5000002200000000000",
                price: "100000088",
                side: false,
                user: accounts[2],
                expiration: 1598590909,
                targetTracer: tracer.address,
                nonce: 33,
            }
        ];

        badMakers = [
            {
                amount: "5000000000000000000",
                price: "100000011",
                side: true,
                user: accounts[1],
                expiration: 1598590237,
                targetTracer: tracer.address,
                nonce: 18,
            },
            {
                amount: "5000002200000000000",
                price: "100000088",
                side: false,
                user: accounts[0],
                expiration: 1598590909,
                targetTracer: tracer.address,
                nonce: 33,
            }
        ];
    })

    describe("executeTrade", () => {
        context("When input array lengths differ", () => {
            it("reverts", async () => {
                let makers: any = sampleMakers;
                let takers: any = sampleTakers.slice(0, 1);
                let market: string = tracer.address;

                /* sign orders for submission */
                let signedMakers: any = await Promise.all(await signOrders(web3, makers, domain, await domainData(trader.address), limitOrder));
                let signedTakers: any = await Promise.all(await signOrders(web3, takers, domain, await domainData(trader.address), limitOrder));

                await expectRevert(
                    trader.executeTrade(signedMakers, signedTakers, market),
                    "TDR: Lengths differ"
                )
            })
        })

        context("When input arrays are both empty", () => {
            it("reverts", async () => {
                let makers: any = [];
                let takers: any = [];
                let market: string = tracer.address;

                await expectRevert(
                    trader.executeTrade(makers, takers, market),
                    "TDR: Received empty arrays")
            })
        })

        context("When there is a price mismatch", () => {
            it("reverts", async () => {
                let makers: any = badMakers;
                let takers: any = sampleTakers;
                let market: string = tracer.address;

                /* sign orders for submission */
                let signedMakers: any = await Promise.all(await signOrders(web3, makers, domain, await domainData(trader.address), limitOrder));
                let signedTakers: any = await Promise.all(await signOrders(web3, takers, domain, await domainData(trader.address), limitOrder));

                await expectRevert(
                    trader.executeTrade(signedMakers, signedTakers, market),
                    "TDR: Price mismatch"
                )
            })
        })

        context("When both input arrays are valid", () => {
            it("passes", async () => {
                let makers: any = sampleMakers;
                let takers: any = sampleTakers;
                let market: string = tracer.address;

                /* sign orders for submission */
                let signedMakers: any = await Promise.all(await signOrders(web3, makers, domain, await domainData(trader.address), limitOrder));
                let signedTakers: any = await Promise.all(await signOrders(web3, takers, domain, await domainData(trader.address), limitOrder));

                assert(trader.executeTrade(signedMakers, signedTakers, market));
            })
        })
    })
})

export {}

