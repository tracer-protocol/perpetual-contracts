const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")

describe("Liquidation functional tests", async () => {
    context("calcAmountToReturn", async () => {
        context(
            "when units sold is greater than liquidation amount",
            async () => {
                it("Reverts ", async () => {})
            }
        )

        context("When there is slippage", async () => {
            it("Calculates accurately", async () => {})
        })

        context("When there is no slippage", async () => {
            it("Returns 0 ", async () => {})
        })
    })

    context("calcUnitsSold", async () => {
        context("When no orders given", async () => {
            it("Does nothing ", async () => {})
        })

        context("in the normal case", async () => {
            it("Calculates correctly", async () => {})
        })

        context("when all invalid orders", async () => {
            it("Returns nothing ", async () => {})
        })

        context("when some invalid orders", async () => {
            it("Calculates correctly", async () => {})
        })
    })

    context("getLiquidationReceipt", async () => {
        context("after a receipt submission", async () => {
            it("Returns a valid receipt", async () => {})
        })

        context("on invalid submission", async () => {
            it("Returns nothing", async () => {})
        })
    })

    context("liquidate", async () => {
        context(
            "when liquidation would put liquidator below minimum margin",
            async () => {
                it("Reverts", async () => {})
            }
        )

        context("when agent isn't below margin", async () => {
            it("Reverts", async () => {})
        })

        context("when gas price is above fast gas price", async () => {
            it("Reverts", async () => {})
        })

        context("when negative liquidation amount", async () => {
            it("Reverts", async () => {})
        })

        context("when liquidation amount == 0", async () => {
            it("Reverts", async () => {})
        })
        context("when amount > agent base amount", async () => {
            it("Reverts", async () => {})
        })

        context("on full liquidation", async () => {
            it("Updates accounts and escrow correctly", async () => {})
        })

        context("on partial liquidation", async () => {
            it("Updates accounts and escrow correctly", async () => {})
        })
    })

    context("claimReceipt", async () => {
        context("when receipt doesn't exist", async () => {
            it("Reverts", async () => {})
        })

        context("when non-whitelisted trader is given", async () => {
            it("Reverts", async () => {})
        })

        context("when claim time has passed", async () => {
            it("Reverts ", async () => {})
        })

        context("when sender isn't liquidator", async () => {
            it("reverts", async () => {})
        })

        context("on a receipt that's already claimed", async () => {
            it("reverts", async () => {})
        })

        context("when slippage occurs - below escrow amount", async () => {
            it("Accurately updates accounts", async () => {})
        })

        context(
            "when slippage occurs - below escrow amount & empty insurance pool",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context(
            "when slippage occurs - below escrow amount & half-full insurance pool",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context(
            "when slippage occurs - below escrow amount & full insurance pool",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context(
            "when slippage occurs - above maxSlippage (caps at maxSlippage)",
            async () => {
                it("Accurately updates accounts", async () => {})
            }
        )

        context("when No slippage", async () => {
            it("Makes no changes (to all 3 accounts) ", async () => {})
        })

        context("when units sold is 0", async () => {
            it("Makes no changes (to all 3 accounts) ", async () => {})
        })
    })

    context("claimEscrow", async () => {
        context("when caller not liquidatee", async () => {
            it("Reverts ", async () => {})
        })

        context(
            "when receipt already claimed through claimEscrow",
            async () => {
                it("Reverts ", async () => {})
            }
        )

        context("when calling too early", async () => {
            it("Reverts ", async () => {})
        })

        context(
            "when receipt partially claimed by liquidator on claimReceipt",
            async () => {
                it("Claims accurately", async () => {})
            }
        )

        context(
            "when receipt fully claimed by liquidator on claimReceipt",
            async () => {
                it("Claims accurately", async () => {})
            }
        )

        context(
            "when receipt not claimed by liquidator on claimReceipt",
            async () => {
                it("Claims accurately", async () => {})
            }
        )
    })

    context("currentLiquidationId", async () => {
        context("liquidation ID", async () => {
            it("Correctly increments", async () => {})
        })
    })

    context("setMaxSlippage", async () => {
        context("maxSlippage", async () => {
            it("correctly updates ", async () => {})
        })
    })

    context("E2E", async () => {
        context("End-to-end Test", async () => {
            it("Passes", async () => {})
        })
    })
})
