const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const zeroAddress = "0x0000000000000000000000000000000000000000"

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    const { deployer } = await getNamedAccounts()

    // deploy contracts
    await deployments.fixture(["FullDeploy"])
    const Tracer = await deployments.get("TracerPerpetualSwaps")
    let tracer = await ethers.getContractAt(Tracer.abi, Tracer.address)

    // setup mocks for the contracts and relink
    const Insurance = await deployments.get("Insurance")
    let insurance = await ethers.getContractAt(Insurance.abi, Insurance.address)

    const Pricing = await deployments.get("Pricing")
    let pricing = await ethers.getContractAt(Pricing.abi, Pricing.address)

    const Liquidation = await deployments.get("Liquidation")
    let liquidation = await ethers.getContractAt(
        Liquidation.abi,
        Liquidation.address
    )

    const QuoteToken = await deployments.get("QuoteToken")
    let quoteToken = await ethers.getContractAt(
        QuoteToken.abi,
        QuoteToken.address
    )

    insurance = await smockit(insurance)
    pricing = await smockit(pricing)
    liquidation = await smockit(liquidation)

    // mock function calls for insurance
    // pricing.smocked.currentFundingIndex.will.return
    // pricing.smocked.currentInsuranceFundingIndex.will.return
    // pricing.smocked.getFundingRate.will.return
    // pricing.smocked.getInsuranceFundingRate.will.return

    await tracer.setInsuranceContract(insurance.address, { from: deployer })
    return {
        tracer,
        insurance,
        pricing,
        liquidation,
        quoteToken,
        deployer,
    }
})

describe("Unit tests: TracerPerpetualSwaps.sol", function () {
    let tracer
    let insurance
    let pricing
    let liquidation
    let quoteToken
    let deployer

    beforeEach(async function () {
        // todo call setup
        let _setup = await setup()
        tracer = _setup.tracer
        insurance = _setup.insurance
        pricing = _setup.pricing
        liquidation = _setup.liquidation
        quoteToken = _setup.quoteToken
        deployer = _setup.deployer
        console.log(quoteToken.address)
    })

    describe("deposit", async () => {
        context("when the user has set allowance", async () => {
            beforeEach(async () => {
                await quoteToken.approve(
                    tracer.address,
                    ethers.utils.parseEther("5")
                )
                await tracer.deposit(ethers.utils.parseEther("5"))
            })
            it("updates their quote", async () => {
                let balance = await tracer.balances(deployer)
                await expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("5")
                )
            })

            it("updates the total TVL", async () => {
                let tvl = await tracer.tvl()
                expect(tvl).to.equal(ethers.utils.parseEther("5"))
            })
        })

        context("when the user has not set allowance", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.deposit(ethers.utils.parseEther("5"))
                ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
            })
        })

        context("when the token amount is not a WAD value", async () => {
            it("update their quote as a WAD value", async () => {
                // todo once deposit changes are propogated
            })
        })
    })

    describe("withdraw", async () => {
        beforeEach(async() => {
            await quoteToken.approve(
                tracer.address,
                ethers.utils.parseEther("5")
            )
            await tracer.deposit(ethers.utils.parseEther("5"))
        })
        context("when the user is withdrawing to below margin", async () => {
            it.only("reverts", async () => {
                await expect(tracer.withdraw(ethers.utils.parseEther("6"))).to.be.revertedWith("TCR: Withdraw below valid Margin")
            })
        })

        context("when the user is making a valid withdraw", async () => {
            it("updates their quote", async () => {})

            it("updates their leverage", async () => {})

            it("updates the total TVL", async () => {})
        })

        context("when the token amount is not a WAD value", async () => {
            it("returns the correct amount of tokens", async () => {})
        })
    })

    describe("matchOrders", async () => {
        context("when the orders can't match", async () => {
            it("reverts", async () => {})
        })

        context("when the orders can match", async () => {
            it("settles the accounts", async () => {})

            it("executes the trades", async () => {})

            it("updates the account leverage", async () => {})

            it("records the trade with pricing", async () => {})
        })

        context("when the users don't have enough margin", async () => {
            it("reverts", async () => {})
        })
    })

    describe("executeTrade", async () => {
        context("when fill amount = 0", async () => {
            it("does nothing", async () => {})
        })

        context("when fill amount > 0", async () => {
            it("updates quote and base appropriately", async () => {})

            it("takes a fee if set", async () => {})
        })
    })

    describe("_updateAccountLeverage", async () => {
        context("when called", async () => {
            it("updates the accounts leverage", async () => {})

            it("updates the markets total leverage", async () => {})
        })
    })

    describe("updateAccountsOnLiquidation", async () => {
        context("when called with more than fast gas", async () => {
            it("reverts", async () => {})
        })

        context("when not called by liquidation", async () => {
            it("reverts", async () => {})
        })

        context("when the liquidators margin isn't valid", async () => {
            it("reverts", async () => {})
        })

        context("when called with valid accounts", async () => {
            it("liquidates the account appropriately", async () => {})
        })
    })

    describe("updateAccountsOnClaim", async () => {
        context("when not called by liquidation", async () => {
            it("reverts", async () => {})
        })

        context("when the insurance fund ends up empty", async () => {
            it("reverts", async () => {})
        })

        context("when called with valid params", async () => {
            it("takes from insurance", async () => {})

            it("gives to the claimaint", async () => {})

            it("gives to the liquidatee", async () => {})
        })
    })

    describe("settle", async () => {
        context("if the account is on the latest global index", async () => {
            it("does nothing", async () => {})
        })

        context("if the account isn't up to date", async () => {
            it("pays the funding rate", async () => {})

            it("pays the insurance funding rate", async () => {})

            it("update their latest gas price", async () => {})

            it("updates their last updated index", async () => {})
        })

        context("if the account is under margin", async () => {
            it("reverts", async () => {})
        })
    })

    describe("marginIsValid", async () => {
        context("when margin >= minMargin", async () => {
            it("returns true", async () => {})
        })

        context("when margin < minMargin", async () => {
            it("returns false", async () => {})
        })

        context("when minMargin == 0", async () => {
            it("returns true", async () => {})
        })
    })

    describe("setLiquidationContract", async () => {
        context("when called by the owner", async () => {
            it("sets a new liquidation contract address", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setPricingContract", async () => {
        context("when called by the owner", async () => {
            it("sets a new pricing contract address", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setGasOracle", async () => {
        context("when called by the owner", async () => {
            it("sets a new gas oracle contract address", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setFeeReceiver", async () => {
        context("when called by the owner", async () => {
            it("sets a new fee receiver contract address", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("withdrawFee", async () => {
        context("when called by the fee receiver", async () => {
            it("withdraws the fees", async () => {})

            it("resets fees to 0", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setFeeRate", async () => {
        context("when called by the owner", async () => {
            it("sets a new fee rate", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setMaxLeverage", async () => {
        context("when called by the owner", async () => {
            it("sets the new max leverage", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setFundingRateSensitivity", async () => {
        context("when called by the owner", async () => {
            it("sets a new funding rate sensitivity", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("transferOwnership", async () => {
        context("when called by the owner", async () => {
            it("sets a new owner", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })

    describe("setWhitelist", async () => {
        context("when called by the owner", async () => {
            it("whitelists a contract", async () => {})

            it("can remove a contract from the whitelist", async () => {})
        })

        context("when called by someone who isn't the owner", async () => {
            it("reverts", async () => {})
        })
    })
})
