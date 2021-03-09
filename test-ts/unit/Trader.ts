//@ts-ignore
import { expectRevert } from "@openzeppelin/test-helpers"
import { setupContractsAndTracer } from "../lib/Setup"
import { TracerInstance, TraderInstance } from "../../types/truffle-contracts"
import { signOrder, signOrders, domain, domainData, limitOrder } from "../lib/Signing"
import { accounts, configure, web3 } from "../configure"

describe("Trader Shim unit tests", async () => {
    let deployed;
    let trader: TraderInstance;
    let tracer: TracerInstance;

    let sampleMakers: any = [
        {
            amount: "5000000000000000000",
            price: "100000000",
            side: true,
            user: "0x392D3d2313E71aF6B5E7DA923aB01919F7393997",
            expiration: 1598590237,
            targetTracer: "0xC921f73263d751774603e7a2bB5f9c989eb349dE",
            nonce: 18,
        },
        {
            amount: "5000002200000000000",
            price: "100000088",
            side: false,
            user: "0x392D3d2313E71aF6B5E7DA923aB01919F7393997",
            expiration: 1598590909,
            targetTracer: "0xC921f73263d751774603e7a2bB5f9c989eb349dE",
            nonce: 33,
        }
    ];

    let sampleTakers: any = [
        {
            amount: "5000000000000000000",
            price: "100000000",
            side: true,
            user: "0x392D3d2313E71aF6B5E7DA923aB01919F7393997",
            expiration: 1598590237,
            targetTracer: "0xC921f73263d751774603e7a2bB5f9c989eb349dE",
            nonce: 18,
        },
        {
            amount: "5000002200000000000",
            price: "100000088",
            side: false,
            user: "0x392D3d2313E71aF6B5E7DA923aB01919F7393997",
            expiration: 1598590909,
            targetTracer: "0xC921f73263d751774603e7a2bB5f9c989eb349dE",
            nonce: 33,
        }
    ];


    before(async () => {
        await configure()
    })

    beforeEach(async () => {
        deployed = await setupContractsAndTracer(accounts);
        tracer = await deployed.tracer;
        trader = await deployed.trader;
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
    })
})

export {}

