const { expect } = require("chai")
const { ethers, getNamedAccounts, deployments } = require("hardhat")
const { deploy } = deployments
const zeroAddress = "0x0000000000000000000000000000000000000000"

describe("Unit tests: LibPrices.sol", function () {
    let accounts
    let libPerpetuals

    before(async function () {
        const { deployer } = await getNamedAccounts()

        libPrices = await deploy("Prices", {
            from: deployer,
            log: true,
        })

        await deploy("LibPricesMock", {
            from: deployer,
            log: true,
            libraries: {
                Prices: libPrices.address,
            },
        })

        let deployment = await deployments.get("LibPricesMock")
        libPrices = await ethers.getContractAt(
            deployment.abi,
            deployment.address
        )
        accounts = await ethers.getSigners()
    })

    describe("fairPrice", async () => {
        context("when called with a positive time value", async () => {
            it("returns as expected", async () => {
                let oraclePrice = ethers.utils.parseEther("100");
                let timeValue = ethers.utils.parseEther("10");

                let result = await libPrices.fairPrice(oraclePrice, timeValue);

                expect(result.toString()).to.equal(ethers.utils.parseEther("90").toString());
            })
        })

        context("when called with a negative time value", async () => {
            it("returns as expected", async () => {
                let oraclePrice = ethers.utils.parseEther("100");
                let timeValue = ethers.utils.parseEther("-10");

                let result = await libPrices.fairPrice(oraclePrice, timeValue);

                expect(result.toString()).to.equal(ethers.utils.parseEther("110").toString());
            })
        })

        context("when called with time value > oracle price", async () => {
            it("returns 0", async () => {
                let oraclePrice = ethers.utils.parseEther("100");
                let timeValue = ethers.utils.parseEther("110");

                let result = await libPrices.fairPrice(oraclePrice, timeValue);

                expect(result.toString()).to.equal(ethers.utils.parseEther("10").toString());
            })
        })
    })

    describe("timeValue", async () => {
        context(
            "when average oracle price > average tracer price",
            async () => {
                it("returns a negative value", async () => {
                    let averageTracerPrice = ethers.utils.parseEther("9100");
                    let averageOraclePrice = ethers.utils.parseEther("10000");

                    let result = await libPrices.timeValue(averageTracerPrice, averageOraclePrice);

                    // expect(result.toString()).to.equal(result.eq(ethers.utils.parseEther("-10"))).to.be.true;
                })
            }
        )

        context(
            "when average tracer price >= average oracle price",
            async () => {
                it("returns a positive value", async () => {
                    let averageTracerPrice = ethers.utils.parseEther("10000");
                    let averageOraclePrice = ethers.utils.parseEther("9100");

                    let result = await libPrices.timeValue(averageTracerPrice, averageOraclePrice);

                    expect(result.toString()).to.equal(ethers.utils.parseEther("10")); // (10000 - 9100) / 90 = 10
                })
            }
        )
    })

    describe("averagePrice", async () => {
        context("when trades == 0", async () => {
            it("returns 0", async() => {
                let price = [ethers.utils.parseEther("1"), ethers.utils.parseEther("0")];

                let result = await libPrices.averagePrice(price);

                expect(result.toString()).to.equal(ethers.BigNumber.from("0").toString());
            })
        })

        context("when trades != 0", async () => {
            it("returns the average trade price", async() => {
                let price = {};

                price.cumulativePrice = ethers.utils.parseEther("10");
                price.trades = ethers.utils.parseEther("1");

                let result = await libPrices.averagePrice(price);

                expect(result.toString()).to.equal(ethers.BigNumber.from("10").toString());
            })
        })
    })


    describe("averagePriceForPeriod", async () => {
        context("when prices length > 24", async () => {
            it("returns the average price for the first 24 periods", async() => {
                let prices = new Array();
                let average = 0;

                for (i = 0; i < 24; i++) {
                    let yeet = [ethers.utils.parseEther(i.toString()), ethers.BigNumber.from(i.toString())];
                    prices += yeet;
                }

                // expect(libPrices.averagePriceForPeriod(prices)).to.equal(ethers.BigNumber.from("24"));
            })
        })

        context("when prices length < 24", async () => {
            it("returns the average price for the number of periods present", async() => {
                
            })
        })
    })

    describe("globalLeverage", async () => {
        context("when leverage has increased", async () => {
            it("increases global leverage", async() => {
                let globalLeverageInitial = ethers.utils.parseEther("100");
                let oldAccountLeverage = ethers.utils.parseEther("10");
                let newAccountLeverage = ethers.utils.parseEther("20");

                let result = await libPrices.globalLeverage(
                    globalLeverageInitial,
                    oldAccountLeverage,
                    newAccountLeverage
                );

                expect(result.toString()).to.equal(ethers.utils.parseEther("110").toString());
            })
        })

        context("when leverage has not increased", async () => {
            it("decreases global leverage", async() => {
                let globalLeverageInitial = ethers.utils.parseEther("100");
                let oldAccountLeverage = ethers.utils.parseEther("20");
                let newAccountLeverage = ethers.utils.parseEther("10");

                let result = await libPrices.globalLeverage(
                    globalLeverageInitial,
                    oldAccountLeverage, 
                    newAccountLeverage
                );

                expect(result.toString()).to.equal(ethers.utils.parseEther("90").toString());
            })
        })
    })

    describe("calculateTwap", async () => {
        context("returns as expected"), async() => {
            it("", async() => {

            })
        }
    })
})
