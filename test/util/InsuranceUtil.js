const { expect } = require("chai")

const expectCollaterals = async (insurance, expectedBuffer, expectedPublic) => {
    const actualBuffer = await insurance.bufferCollateralAmount()
    const actualPublic = await insurance.publicCollateralAmount()
    expect(actualBuffer).to.equal(expectedBuffer)
    expect(actualPublic).to.equal(expectedPublic)
}

/**
 * Adds the specified buffer and public amounts to their respective
 * insurance pools
 */
const setCollaterals = async (
    tracer,
    quoteToken,
    insurance,
    bufferAmount,
    publicAmount
) => {
    await tracer.setAccountQuote(insurance.address, bufferAmount)

    await insurance.updatePoolAmount()

    await quoteToken.approve(insurance.address, publicAmount)

    await insurance.deposit(publicAmount)
}

/**
 * Adds the specified buffer and public amounts to their respective
 * insurance pools, then drains the pool with the specified amount
 */
const setAndDrainCollaterals = async (
    tracer,
    quoteToken,
    insurance,
    bufferAmount,
    publicAmount,
    amountToDrain
) => {
    await setCollaterals(
        tracer,
        quoteToken,
        insurance,
        bufferAmount,
        publicAmount
    )

    await insurance.drainPool(amountToDrain)
}

module.exports = {
    expectCollaterals,
    setCollaterals,
    setAndDrainCollaterals,
}
