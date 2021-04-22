const { expectRevert, time } = require("@openzeppelin/test-helpers")
const assert = require("assert")
const { setupContractsAndTracer } = require("../lib/Setup")
const { signOrders } = require("../lib/Signing")
const Trader = artifacts.require("Trader");

describe("Trader Shim unit tests", async () => {
    let trader
    let account
    let token
    let sampleMakers
    let sampleTakers
    let badMakers
    let now
    let sevenDays
    let accounts

    before(async () => {
        accounts = await web3.eth.getAccounts();
    })

    beforeEach(async () => {
        //Setup all contracts
        let deployed = await setupContractsAndTracer(accounts)

        trader = await Trader.new()
        tracer = deployed.perps
        account = deployed.account
        token = deployed.testToken

        //Get each user to "deposit" 100 tokens into the platform and approve the trader
        for (var i = 0; i < 7; i++) {
            await tracer.setUserPermissions(trader.address, true, { from: accounts[i] })
            await token.approve(account.address, web3.utils.toWei("100000"))
            await account.deposit(web3.utils.toWei("10000"), tracer.address, { from: accounts[i] })
        }

        // amount of gas that each trader will deposit initially
        let gasAllowance: number = 10000000000;

        // get each trader to deposit some gas
        for (let i=0;i<6;i++) {
            // Typescript says BN isn't in web3.utils but it is
            // @ts-ignore
            await trader.depositGas({ from: accounts[i], value: new web3.utils.BN(gasAllowance) });
        }

        // this user has no gas
        noGasUser = accounts[6];

        now = await time.latest()
        sevenDays = parseInt(now) + 604800 //7 days from now

        sampleMakers = [
            {
                amount: "5000000000000000000",
                price: "100000000",
                side: true,
                user: accounts[1],
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 0,
            },
            {
                amount: "5000002200000000000",
                price: "100000088",
                side: false,
                user: accounts[0],
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 0,
            }
        ];

        sampleTakers = [
            {
                amount: "5000000000000000000",
                price: "100000000",
                side: false,
                user: accounts[2],
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 0,
            },
            {
                amount: "5000002200000000000",
                price: "100000088",
                side: true,
                user: accounts[2],
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 1,
            }
        ];

        noGasMaker = {
                amount: "5000002200000000000",
                price: "100000088",
                side: false,
                user: noGasUser,
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 0,
        };

        badMakers = [
            {
                amount: "5000000000000000000",
                price: "100000011",
                side: true,
                user: accounts[1],
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 0,
            },
            {
                amount: "5000002200000000000",
                price: "100000088",
                side: false,
                user: accounts[0],
                expiration: sevenDays,
                targetTracer: tracer.address,
                nonce: 0,
            }
        ];
    })

    describe("executeTrade", () => {
        context("When input array lengths differ", () => {
            it("reverts", async () => {
                let makers = sampleMakers;
                let takers = sampleTakers.slice(0, 1);
                let market = tracer.address;

                /* sign orders for submission */
                let signedMakers = await Promise.all(await signOrders(web3, makers, trader.address));
                let signedTakers = await Promise.all(await signOrders(web3, takers, trader.address));

                await expectRevert(
                    trader.executeTrade(signedMakers, signedTakers, market),
                    "TDR: Lengths differ"
                )
            })
        })

        context("When input arrays are both empty", () => {
            it("reverts", async () => {
                let makers = [];
                let takers = [];
                let market = tracer.address;

                await expectRevert(
                    trader.executeTrade(makers, takers, market),
                    "TDR: Received empty arrays")
            })
        })

        context("When both input arrays are valid", () => {
            it("passes", async () => {
                let makers = sampleMakers;
                let takers = sampleTakers;
                let market = tracer.address;

                /* sign orders for submission */
                let signedMakers = await Promise.all(await signOrders(web3, makers, trader.address));
                let signedTakers = await Promise.all(await signOrders(web3, takers, trader.address));

                assert(await trader.executeTrade(signedMakers, signedTakers, market));
            })

            it("increments nonces correctly", async () => {
                let makers = sampleMakers;
                let takers = sampleTakers;
                let market = tracer.address;

                /* sign orders for submission */
                let signedMakers = await Promise.all(await signOrders(web3, makers, trader.address));
                let signedTakers = await Promise.all(await signOrders(web3, takers, trader.address));

                await trader.executeTrade(signedMakers, signedTakers, market);

                assert.equal(await trader.nonces(accounts[0]), "1")
                assert.equal(await trader.nonces(accounts[1]), "1")
                assert.equal(await trader.nonces(accounts[2]), "2")
            });
        })

        context("When a user has no gas deposited", () => {
            it("reverts", async () => {
                let makers: any = sampleMakers.slice(0, 1);
                makers.push(noGasMaker);
                let takers: any = sampleTakers;
                let market: string = tracer.address;

                /* sign orders for submission */
                let signedMakers: any = await Promise.all(await signOrders(web3, makers, trader.address));
                let signedTakers: any = await Promise.all(await signOrders(web3, takers, trader.address));

                await expectRevert(trader.executeTrade(signedMakers, signedTakers, market), "TDR: Trader has insufficient gas");
            });
        });
    })
})
