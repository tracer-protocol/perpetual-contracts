const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Unit tests: LibLiquidation.sol", function () {
    let libLiquidation
    let accounts
    const long = true
    const short = false

    before(async function () {
        await deployments.fixture(["LibLiquidationMock"])
        const { deployer } = await getNamedAccounts()
        const deployment = await deployments.get("LibLiquidationMock")
        libLiquidation = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    context("calcEscrowLiquidationAmount", async function () {
        it("Should escrow full amount if margin == minMargin", async function () {
            const margin = 123
            const minMargin = 123
            const expectedEscrowAmount = minMargin.toString()

            const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(
                minMargin,
                margin
            )
            expect(escrowAmount.toString()).to.equal(expectedEscrowAmount)
        })

        it("Should escrow less as margin drops below minMargin", async function () {
            const margin = 100
            const minMargin = 123
            const expectedEscrowAmount = 77 // 100 - (123 - 100) = 77

            const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(
                minMargin,
                margin
            )
            expect(escrowAmount.toString()).to.equal(
                expectedEscrowAmount.toString()
            )
        })

        it("Should escrow 0 once margin hits 0", async function () {
            const margin = 0
            const minMargin = 123
            const expectedEscrowAmount = 0 // min(0, 0 - (123 - 0)) = 0

            const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(
                minMargin,
                margin
            )
            expect(escrowAmount.toString()).to.equal(
                expectedEscrowAmount.toString()
            )
        })

        it("Should escrow 0 once margin goes below 0", async function () {
            const margin = -9999
            const minMargin = 123
            const expectedEscrowAmount = 0 // min(0, 0 - (123 - 0)) = 0

            const escrowAmount = await libLiquidation.calcEscrowLiquidationAmount(
                minMargin,
                margin
            )
            expect(escrowAmount.toString()).to.equal(
                expectedEscrowAmount.toString()
            )
        })
    })

    context("liquidationBalanceChanges", async function () {
        it("changes full balance on full liquidation", async function () {
            const liquidatedQuote = "-100"
            const liquidatedBase = "250"
            const amount = "250"

            /* quote goes up or down by 100, base goes up or down by 250, since this is a complete liquidation */
            const expectedLiquidatorQuoteChange = "-100"
            const expectedLiquidatorBaseChange = "250"
            const expectedLiquidateeQuoteChange = "100"
            const expectedLiquidateeBaseChange = "-250"

            const ret = await libLiquidation.liquidationBalanceChanges(
                liquidatedBase,
                liquidatedQuote,
                amount
            )
            expect(ret._liquidatorQuoteChange.toString()).to.equal(
                expectedLiquidatorQuoteChange
            )
            expect(ret._liquidatorBaseChange.toString()).to.equal(
                expectedLiquidatorBaseChange
            )
            expect(ret._liquidateeQuoteChange.toString()).to.equal(
                expectedLiquidateeQuoteChange
            )
            expect(ret._liquidateeBaseChange.toString()).to.equal(
                expectedLiquidateeBaseChange
            )
        })

        it("changes zero balance on zero liquidation", async function () {
            const liquidatedQuote = "100"
            const liquidatedBase = "250"
            const amount = "0"

            /* Nothing changes, since amount = 0 */
            const expectedChange = "0"

            const ret = await libLiquidation.liquidationBalanceChanges(
                liquidatedBase,
                liquidatedQuote,
                amount
            )
            expect(ret._liquidatorQuoteChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidatorBaseChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidateeQuoteChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidateeBaseChange.toString()).to.equal(
                expectedChange
            )
        })

        it("changes part of balance on partial liquidation", async function () {
            const liquidatedQuote = "-100"
            const liquidatedBase = "250"
            const amount = "125"

            /* quote goes up or down by 50, base goes up or down by 125, since this is a 50% partial liquidation */
            const expectedLiquidatorQuoteChange = "-50"
            const expectedLiquidatorBaseChange = "125"
            const expectedLiquidateeQuoteChange = "50"
            const expectedLiquidateeBaseChange = "-125"

            const ret = await libLiquidation.liquidationBalanceChanges(
                liquidatedBase,
                liquidatedQuote,
                amount
            )
            expect(ret._liquidatorQuoteChange.toString()).to.equal(
                expectedLiquidatorQuoteChange
            )
            expect(ret._liquidatorBaseChange.toString()).to.equal(
                expectedLiquidatorBaseChange
            )
            expect(ret._liquidateeQuoteChange.toString()).to.equal(
                expectedLiquidateeQuoteChange
            )
            expect(ret._liquidateeBaseChange.toString()).to.equal(
                expectedLiquidateeBaseChange
            )
        })

        it("Returns 0 if liquidated agent has no balance", async function () {
            const liquidatedQuote = "0"
            const liquidatedBase = "0"
            const amount = "125"

            /* quote goes up or down by 50, base goes up or down by 125, since this is a 50% partial liquidation */
            const expectedChange = "0"

            const ret = await libLiquidation.liquidationBalanceChanges(
                liquidatedBase,
                liquidatedQuote,
                amount
            )
            expect(ret._liquidatorQuoteChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidatorBaseChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidateeQuoteChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidateeBaseChange.toString()).to.equal(
                expectedChange
            )
        })

        it("Caps the amount at min(base, amount) i.e. if amount > base, ", async function () {
            const liquidatedQuote = "0"
            const liquidatedBase = "0"
            const amount = "125"

            /* quote goes up or down by 50, base goes up or down by 125, since this is a 50% partial liquidation */
            const expectedChange = "0"

            const ret = await libLiquidation.liquidationBalanceChanges(
                liquidatedBase,
                liquidatedQuote,
                amount
            )
            expect(ret._liquidatorQuoteChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidatorBaseChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidateeQuoteChange.toString()).to.equal(
                expectedChange
            )
            expect(ret._liquidateeBaseChange.toString()).to.equal(
                expectedChange
            )
        })
    })

    context("calculateSlippage", async function () {
        it("0% slippage", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (1 * 100000000000000000000).toString() // 100%
            const avgPrice = "200000000"
            const receiptPrice = "200000000"
            const expectedSlippage = "0" // 100*2 - 100*2
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                long
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })

        it("reverse slippage (liquidator benefits)", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (0.1 * 100000000000000000000).toString() // 10%
            const avgPrice = "300000000"
            const receiptPrice = "200000000"
            const expectedSlippage = "0"
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                long
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })

        it("slippage over maxSlippage amount", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (0.1 * 100000000000000000000).toString() // 10%
            const avgPrice = ethers.utils.parseEther("1")
            const receiptPrice = ethers.utils.parseEther("2")
            const expectedSlippage = ethers.utils.parseEther("20") // 10% of 200
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                long
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })

        it("50% slippage", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (1 * 100000000000000000000).toString() // 100%
            const avgPrice = ethers.utils.parseEther("1")
            const receiptPrice = ethers.utils.parseEther("2")
            const expectedSlippage = ethers.utils.parseEther("100") // 100*2 - 100*1
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                long
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })

        it("short slippage (price goes up)", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (1 * 100000000000000000000).toString() // 100%
            const avgPrice = ethers.utils.parseEther("2")
            const receiptPrice = ethers.utils.parseEther("1")
            const expectedSlippage = ethers.utils.parseEther("100") // 100*2 - 100*1
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                short
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })

        it("short slippage - slippage exceeds maxSlippage", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (1 * 100000000000000000000).toString() // 100%
            const avgPrice = ethers.utils.parseEther("3")
            const receiptPrice = ethers.utils.parseEther("1")
            const expectedSlippage = ethers.utils.parseEther("100") // 100% of 100
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                short
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })

        it("short slippage - liquidator benefits", async function () {
            const unitsSold = ethers.utils.parseEther("100")
            const maxSlippage = (1 * 100000000000000000000).toString() // 100%
            const avgPrice = ethers.utils.parseEther("1")
            const receiptPrice = ethers.utils.parseEther("5")
            const expectedSlippage = "0"
            const slippage = await libLiquidation.calculateSlippage(
                unitsSold,
                maxSlippage,
                avgPrice,
                receiptPrice,
                short
            )
            expect(slippage.toString()).to.equal(expectedSlippage)
        })
    })
})
