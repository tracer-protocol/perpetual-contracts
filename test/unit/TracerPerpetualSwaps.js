const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const { smockit } = require("@eth-optimism/smock")
const { BigNumber } = require("ethers")
const zeroAddress = "0x0000000000000000000000000000000000000000"

// create hardhat optimised feature
const setup = deployments.createFixture(async () => {
    // todo setup and mock appropriate functions
})

describe("Unit tests: Insurance.sol", function () {
    beforeEach(async function () {
        // todo call setup
    })

    describe("deposit", async () => {
        context("when the user has set allowance", async () => {
            it("updates their quote", async () => {})

            it("updates their leverage", async () => {})

            it("updates the total TVL", async () => {})
        })

        context("when the user has not set allowance", async () => {
            it("reverts", async () => {})
        })

        context("when the token amount is not a WAD value", async () => {
            it("update their quote as a WAD value", async () => {})
        })
    })

    describe("withdraw", async () => {
        context("when the user is withdrawing to below margin", async () => {
            it("reverts", async () => {})
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
