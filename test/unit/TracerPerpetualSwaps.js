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
    pricing.smocked.currentFundingIndex.will.return(0)
    // pricing.smocked.getFundingRate.will.return
    // pricing.smocked.getInsuranceFundingRate.will.return

    // setup tracer contract
    await tracer.setInsuranceContract(insurance.address, { from: deployer })
    await tracer.setPricingContract(pricing.address, { from: deployer })
    await tracer.setWhitelist(deployer, true)
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
    let accounts

    beforeEach(async function () {
        // todo call setup
        let _setup = await setup()
        tracer = _setup.tracer
        insurance = _setup.insurance
        pricing = _setup.pricing
        liquidation = _setup.liquidation
        quoteToken = _setup.quoteToken
        deployer = _setup.deployer
        accounts = await ethers.getSigners()
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
                let tokenBalanceBefore = await quoteToken.balanceOf(deployer)

                // deposit 1 token with dust
                await quoteToken.approve(
                    tracer.address,
                    ethers.utils.parseEther("1.000000001")
                )
                await tracer.deposit(ethers.utils.parseEther("1.000000001"))

                // ensure that token amount has decreased by correct units
                let tokenBalanceAfter = await quoteToken.balanceOf(deployer)
                let difference = tokenBalanceBefore.sub(tokenBalanceAfter)
                // default token only uses 8 decimals, so the last bit should be ignored
                expect(difference).to.equal("100000000")

                // ensure balance in contract has updated by a WAD amount
                let balance = await tracer.balances(deployer)
                await expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("1")
                )
            })
        })
    })

    describe("withdraw", async () => {
        beforeEach(async () => {
            await quoteToken.approve(
                tracer.address,
                ethers.utils.parseEther("5")
            )
            await tracer.deposit(ethers.utils.parseEther("5"))
        })
        context("when the user is withdrawing to below margin", async () => {
            it("reverts", async () => {
                await expect(
                    tracer.withdraw(ethers.utils.parseEther("6"))
                ).to.be.revertedWith("TCR: Withdraw below valid Margin")
            })
        })

        context("when the user is making a valid withdraw", async () => {
            beforeEach(async () => {
                await tracer.withdraw(ethers.utils.parseEther("1"))
            })
            it("updates their quote", async () => {
                let balance = await tracer.balances(deployer)
                expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("4")
                )
            })

            it("updates their leverage", async () => {})

            it("updates the total TVL", async () => {
                let tvl = await tracer.tvl()
                expect(tvl).to.equal(ethers.utils.parseEther("4"))
            })
        })

        context("when the token amount is not a WAD value", async () => {
            it("returns the correct amount of tokens", async () => {
                let tokenBalanceBefore = await quoteToken.balanceOf(deployer)

                // withdraw 1 token with dust
                await tracer.withdraw(ethers.utils.parseEther("1.000000001"))

                // ensure that token amount has decreased by correct units
                let tokenBalanceAfter = await quoteToken.balanceOf(deployer)
                let difference = tokenBalanceAfter.sub(tokenBalanceBefore)
                // default token only uses 8 decimals, so the last bit should be ignored
                expect(difference).to.equal("100000000")

                // ensure balance in contract has updated by a WAD amount
                let balance = await tracer.balances(deployer)
                await expect(balance.position.quote).to.equal(
                    ethers.utils.parseEther("4")
                )
            })
        })
    })

    describe("matchOrders", async () => {
        beforeEach(async () => {
            // whitelist so we can submit trades
        })

        context("when the orders can't match", async () => {
            it("reverts", async () => {
                let order1 = [
                    deployer,
                    tracer.address,
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("1"),
                    0,
                    3621988237, //unrealistic unix timestamp
                    1621988237,
                ]

                let order2 = [
                    deployer,
                    tracer.address,
                    ethers.utils.parseEther("3"),
                    ethers.utils.parseEther("1"),
                    0,
                    3621988237, //unrealistic unix timestamp
                    1621988237,
                ]

                await expect(
                    tracer.matchOrders(
                        order1,
                        order2,
                        ethers.utils.parseEther("1")
                    )
                ).to.be.revertedWith("TCR: Orders cannot be matched")
            })
        })

        context("when the orders can match", async () => {
            beforeEach(async () => {})
            it("settles the accounts", async () => {})

            it("executes the trades", async () => {})

            it("updates the account leverage", async () => {})

            it("records the trade with pricing", async () => {})
        })

        context("when the users don't have enough margin", async () => {
            it("reverts", async () => {
                let order1 = [
                    deployer,
                    tracer.address,
                    ethers.utils.parseEther("3"),
                    ethers.utils.parseEther("1"),
                    0,
                    3621988237, //unrealistic unix timestamp
                    1621988237,
                ]

                let order2 = [
                    accounts[1].address,
                    tracer.address,
                    ethers.utils.parseEther("3"),
                    ethers.utils.parseEther("1"),
                    1,
                    3621988237, //unrealistic unix timestamp
                    1621988237,
                ]

                await expect(
                    tracer.matchOrders(
                        order1,
                        order2,
                        ethers.utils.parseEther("1")
                    )
                ).to.be.revertedWith("TCR: Margin Invalid post trade")
            })
        })
    })

    describe("_executeTrade", async () => {
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
            it("does nothing", async () => {
                let balanceBefore = await tracer.balances(deployer)
                await tracer.settle(deployer)
                let balanceAfter = await tracer.balances(deployer)
                expect(balanceAfter.toString()).to.equal(
                    balanceBefore.toString()
                )
                // expect(pricing.smocked.currentFundingIndex.calls.length).to.equal(1)
            })
        })

        context("if the account isn't up to date", async () => {
            beforeEach(async () => {
                // mock funding index and rates
                pricing.smocked.currentFundingIndex.will.return(1)
                pricing.smocked.getFundingRate.will.return([
                    0,
                    ethers.utils.parseEther("1"),
                    ethers.utils.parseEther("!"),
                ])
            })
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
