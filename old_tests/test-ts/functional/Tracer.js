"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
var test_helpers_1 = require("@openzeppelin/test-helpers");
var chai_1 = require("chai");
var Setup_1 = require("../lib/Setup");
var configure_1 = require("../configure");
var EventLogging_1 = require("../lib/EventLogging");
var truffleAssert = require('truffle-assertions');
/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Tracer", function () { return __awaiter(void 0, void 0, void 0, function () {
    var oneDollar, oneHour, twentyFourHours, twoDays, receipt, deployer, testToken, perpsFactory, tracer, oracle, insurance, account, pricing, gasPriceOracle, gov, now, sevenDays;
    return __generator(this, function (_a) {
        oneDollar = new test_helpers_1.BN("100000000");
        oneHour = 3600;
        twentyFourHours = 24 * oneHour;
        twoDays = twentyFourHours * 2;
        before(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, configure_1.configure()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            var deployed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Setup_1.setupContractsAndTracer(configure_1.accounts)];
                    case 1:
                        deployed = _a.sent();
                        receipt = deployed.receipt;
                        deployer = deployed.deployer;
                        testToken = deployed.testToken;
                        perpsFactory = deployed.perpsFactory;
                        tracer = deployed.perps;
                        oracle = deployed.oracle;
                        insurance = deployed.insurance;
                        account = deployed.account;
                        pricing = deployed.pricing;
                        gasPriceOracle = deployed.gasPriceOracle;
                        gov = deployed.gov;
                        return [4 /*yield*/, Setup_1.fillInsurancePool(testToken, configure_1.accounts[5], insurance, tracer.address)
                            //Set end of test setup times for use throughout tests
                        ];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 3:
                        //Set end of test setup times for use throughout tests
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        return [2 /*return*/];
                }
            });
        }); });
        context("Initialization", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Balances are set to 0", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balance;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                            case 1:
                                balance = _a.sent();
                                chai_1.assert.equal(balance[0].toString(), new test_helpers_1.BN("0").toString());
                                chai_1.assert.equal(balance[1].toString(), new test_helpers_1.BN("0").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Deposit", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Updates balances and tvl accordingly", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balance, contractTokenBal, tvl;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //let tracer = await Tracer.deployed()
                            return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                //let tracer = await Tracer.deployed()
                                _a.sent();
                                return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                            case 2:
                                balance = _a.sent();
                                return [4 /*yield*/, testToken.balanceOf(account.address)];
                            case 3:
                                contractTokenBal = _a.sent();
                                return [4 /*yield*/, account.tvl(tracer.address)];
                            case 4:
                                tvl = _a.sent();
                                chai_1.assert.equal(balance[0].toString(), configure_1.web3.utils.toWei("500").toString());
                                chai_1.assert.equal(contractTokenBal.toString(), configure_1.web3.utils.toWei("500").toString());
                                chai_1.assert.equal(tvl.toString(), configure_1.web3.utils.toWei("500"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Withdraw", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Updates balance and tvl accordingly", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balance, tvl;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.withdraw(configure_1.web3.utils.toWei("2"), tracer.address)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[0], tracer.address)];
                            case 3:
                                balance = _a.sent();
                                chai_1.assert.equal(balance[0].toString(), configure_1.web3.utils.toWei("498").toString());
                                return [4 /*yield*/, account.tvl(tracer.address)];
                            case 4:
                                tvl = _a.sent();
                                chai_1.assert.equal(tvl.toString(), configure_1.web3.utils.toWei("498"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Prevents withdrawing more than available from margin", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //let tracer = await Tracer.deployed()
                            return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("5"), tracer.address)];
                            case 1:
                                //let tracer = await Tracer.deployed()
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(account.withdraw(configure_1.web3.utils.toWei("6"), tracer.address), "ACT: Withdraw below valid Margin")];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Prevents withdrawing to below the margin percentage", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tx, tx2, _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: 
                            //let tracer = await Tracer.deployed()
                            return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                //let tracer = await Tracer.deployed()
                                _c.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1 5x leverage
                                ];
                            case 2:
                                _c.sent();
                                //Long order for 5 TEST/USD at a price of $1 5x leverage
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, true, sevenDays)
                                    // console.log((await account.realMaxLeverage(tracer.address)).toString())
                                    // console.log(await account.userMarginIsValid(accounts[1], tracer.address))
                                    //Short order for 5 TEST/USD against placed order 5x leverage
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1 5x leverage
                                _c.sent();
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("1000"), { from: configure_1.accounts[1] })
                                    // printValueLogs(tx);
                                ];
                            case 4:
                                tx = _c.sent();
                                return [4 /*yield*/, account.userMarginIsValid(configure_1.accounts[1], tracer.address)];
                            case 5:
                                tx2 = _c.sent();
                                console.log("elo");
                                EventLogging_1.printValueLogs(tx2);
                                console.log("poop");
                                _b = (_a = console).log;
                                return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                            case 6:
                                _b.apply(_a, [(_c.sent()).toString()]);
                                //Current margin % = 1 - ((500 + gas cost (42.87)) / 1000)
                                return [4 /*yield*/, test_helpers_1.expectRevert(account.withdraw(configure_1.web3.utils.toWei("400"), tracer.address), "ACT: Withdraw below valid Margin")];
                            case 7:
                                //Current margin % = 1 - ((500 + gas cost (42.87)) / 1000)
                                _c.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Make Order Onchain", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Creates a successful order (no leverage)", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tx, order;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)
                                //Long order for 5 TEST/USD at a price of $1
                            ];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)];
                            case 2:
                                tx = _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectEvent(tx.receipt, "OrderMade", {
                                        //DEPRECATED: tracerId: web3.utils.padRight(web3.utils.asciiToHex("TEST/USD"), 64),
                                        orderId: new test_helpers_1.BN("1"),
                                        amount: configure_1.web3.utils.toWei("500").toString(),
                                        price: oneDollar,
                                        maker: configure_1.accounts[0],
                                        isLong: true,
                                    })
                                    //amount, filled, price, side
                                ];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 4:
                                order = _a.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("500").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(order[2].toString(), oneDollar.toString());
                                chai_1.assert.equal(order[3], true);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Creates a successful order (8x leverage)", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tx, order;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)
                                //Long order for 4000 TEST/USD at a price of $1
                            ];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("4000"), oneDollar, true, sevenDays)];
                            case 2:
                                tx = _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectEvent(tx.receipt, "OrderMade", {
                                        //DEPRECATED: tracerId: web3.utils.padRight(web3.utils.asciiToHex("TEST/USD"), 64),
                                        orderId: new test_helpers_1.BN("1"),
                                        amount: configure_1.web3.utils.toWei("4000").toString(),
                                        price: oneDollar,
                                        maker: configure_1.accounts[0],
                                        isLong: true,
                                    })
                                    //amount, filled, price, side
                                ];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 4:
                                order = _a.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("4000").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(order[2].toString(), oneDollar.toString());
                                chai_1.assert.equal(order[3], true);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Enforces requiring enough margin for the order", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("100"), tracer.address)
                                // Minimum Margin becomes 6*25.4064 + 1000/12.5 = 232.44
                                // but margin is just 100
                            ];
                            case 1:
                                _a.sent();
                                // Minimum Margin becomes 6*25.4064 + 1000/12.5 = 232.44
                                // but margin is just 100
                                return [4 /*yield*/, test_helpers_1.expectRevert(
                                    //Order over 10x leverage
                                    tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, true, sevenDays), "TCR: Invalid margin")];
                            case 2:
                                // Minimum Margin becomes 6*25.4064 + 1000/12.5 = 232.44
                                // but margin is just 100
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Take Order Onchain", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Fully matches an order successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var order, account1, account2, orderTakerAmount;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //assert amount, filled
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 5:
                                order = _a.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("500").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("500").toString());
                                return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                            case 6:
                                account1 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Account 1 margin and position (MAKER)
                                ];
                            case 7:
                                account2 = _a.sent();
                                //Account 1 margin and position (MAKER)
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("500").toString());
                                //Account 2 margin and position (TAKER)
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1000").toString());
                                chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-500").toString());
                                return [4 /*yield*/, tracer.getOrderTakerAmount(1, configure_1.accounts[1])];
                            case 8:
                                orderTakerAmount = _a.sent();
                                chai_1.assert.equal(orderTakerAmount.toString(), configure_1.web3.utils.toWei("500").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Fully matches an order successfully (leveraged)", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var order, account1, account2, orderTakerAmount;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("1000"), { from: configure_1.accounts[1] })
                                    //assert amount, filled
                                ];
                            case 5:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 6:
                                order = _a.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("1000").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("1000").toString());
                                return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                            case 7:
                                account1 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Account 1 margin and position (MAKER)
                                ];
                            case 8:
                                account2 = _a.sent();
                                //Account 1 margin and position (MAKER)
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("1000").toString());
                                chai_1.assert.equal(account1[2].toString(), configure_1.web3.utils.toWei("0").toString());
                                //Account 2 margin and position (TAKER)
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1500").toString());
                                chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-1000").toString());
                                chai_1.assert.equal(account2[2].toString(), configure_1.web3.utils.toWei("500").toString());
                                return [4 /*yield*/, tracer.getOrderTakerAmount(1, configure_1.accounts[1])];
                            case 9:
                                orderTakerAmount = _a.sent();
                                chai_1.assert.equal(orderTakerAmount.toString(), configure_1.web3.utils.toWei("1000").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Rejects taking a fully matched order", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Short order for 3 TEST/USD against placed order
                                ];
                            case 5:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Short order for 3 TEST/USD against placed order
                                return [4 /*yield*/, test_helpers_1.expectRevert(
                                    //Order over 10x leverage
                                    tracer.takeOrder(2, configure_1.web3.utils.toWei("3"), { from: configure_1.accounts[2] }), "SDX: Order filled")];
                            case 6:
                                //Short order for 3 TEST/USD against placed order
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Partially matches an order successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var order, account1, account2, account3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 3 TEST/USD against placed order
                                ];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 3 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("30"), { from: configure_1.accounts[1] })
                                    //Short order for 3 TEST/USD against placed order, only fills 2
                                ];
                            case 5:
                                //Short order for 3 TEST/USD against placed order
                                _a.sent();
                                //Short order for 3 TEST/USD against placed order, only fills 2
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("30"), { from: configure_1.accounts[2] })
                                    //assert amount, filled
                                ];
                            case 6:
                                //Short order for 3 TEST/USD against placed order, only fills 2
                                _a.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 7:
                                order = _a.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("500").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("60").toString());
                                return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                            case 8:
                                account1 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)];
                            case 9:
                                account2 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)
                                    //Account 1 margin and position (MAKER)
                                ];
                            case 10:
                                account3 = _a.sent();
                                //Account 1 margin and position (MAKER)
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("440").toString());
                                chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("60").toString());
                                //Account 2 margin and position (TAKER)
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("530").toString());
                                chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-30").toString());
                                //Account 3 margin and position (2nd TAKER)
                                chai_1.assert.equal(account3[0].toString(), configure_1.web3.utils.toWei("530").toString());
                                chai_1.assert.equal(account3[1].toString(), configure_1.web3.utils.toWei("-30").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Rejects taking an expired order", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, now)];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(tracer.takeOrder(1, configure_1.web3.utils.toWei("3"), { from: configure_1.accounts[2] }), "SDX: Order expired")];
                            case 5:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context('Match Orders', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip('Can sucessfully match two made orders on chain', function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        it.skip("Fully matches an order successfully", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var order, account1, account2, orderTakerAmount;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                            //Long order for 5 TEST/USD at a price of $1
                                        ];
                                    case 2:
                                        _a.sent();
                                        //Long order for 5 TEST/USD at a price of $1
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                            //Short order for 5 TEST/USD
                                        ];
                                    case 3:
                                        //Long order for 5 TEST/USD at a price of $1
                                        _a.sent();
                                        //Short order for 5 TEST/USD
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, false, sevenDays, { from: configure_1.accounts[1] })];
                                    case 4:
                                        //Short order for 5 TEST/USD
                                        _a.sent();
                                        return [4 /*yield*/, tracer.matchOrders(1, 2)
                                            //assert amount, filled
                                        ];
                                    case 5:
                                        _a.sent();
                                        return [4 /*yield*/, tracer.getOrder(1)];
                                    case 6:
                                        order = _a.sent();
                                        chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("500").toString());
                                        chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("500").toString());
                                        return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                                    case 7:
                                        account1 = _a.sent();
                                        return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                            //Account 1 margin and position (MAKER)
                                        ];
                                    case 8:
                                        account2 = _a.sent();
                                        //Account 1 margin and position (MAKER)
                                        chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                        chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("500").toString());
                                        //Account 2 margin and position (TAKER)
                                        chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1000").toString());
                                        chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-500").toString());
                                        return [4 /*yield*/, tracer.getOrderTakerAmount(1, configure_1.accounts[1])];
                                    case 9:
                                        orderTakerAmount = _a.sent();
                                        chai_1.assert.equal(orderTakerAmount.toString(), configure_1.web3.utils.toWei("500").toString());
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        it.skip("Fully matches an order successfully (leveraged)", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var order, account1, account2, orderTakerAmount;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                                    case 2:
                                        _a.sent();
                                        return [4 /*yield*/, oracle.setPrice(oneDollar)
                                            //Long order for 5 TEST/USD at a price of $1
                                        ];
                                    case 3:
                                        _a.sent();
                                        //Long order for 5 TEST/USD at a price of $1
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, true, sevenDays)
                                            //Short order for 5 TEST/USD
                                        ];
                                    case 4:
                                        //Long order for 5 TEST/USD at a price of $1
                                        _a.sent();
                                        //Short order for 5 TEST/USD
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, false, sevenDays, { from: configure_1.accounts[1] })];
                                    case 5:
                                        //Short order for 5 TEST/USD
                                        _a.sent();
                                        return [4 /*yield*/, tracer.matchOrders(1, 2)
                                            //assert amount, filled
                                        ];
                                    case 6:
                                        _a.sent();
                                        return [4 /*yield*/, tracer.getOrder(1)];
                                    case 7:
                                        order = _a.sent();
                                        chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("1000").toString());
                                        chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("1000").toString());
                                        return [4 /*yield*/, tracer.tracerGetBalance(configure_1.accounts[0])];
                                    case 8:
                                        account1 = _a.sent();
                                        return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                            //Account 1 margin and position (MAKER)
                                        ];
                                    case 9:
                                        account2 = _a.sent();
                                        //Account 1 margin and position (MAKER)
                                        chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                        chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("1000").toString());
                                        chai_1.assert.equal(account1[2].toString(), configure_1.web3.utils.toWei("0").toString());
                                        //Account 2 margin and position (TAKER)
                                        chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1500").toString());
                                        chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-1000").toString());
                                        chai_1.assert.equal(account2[2].toString(), configure_1.web3.utils.toWei("500").toString());
                                        return [4 /*yield*/, tracer.getOrderTakerAmount(1, configure_1.accounts[1])];
                                    case 10:
                                        orderTakerAmount = _a.sent();
                                        chai_1.assert.equal(orderTakerAmount.toString(), configure_1.web3.utils.toWei("1000").toString());
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        it.skip("Rejects taking a fully matched order", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                                    case 1:
                                        _b.sent();
                                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                                    case 2:
                                        _b.sent();
                                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })
                                            //Long order for 5 TEST/USD at a price of $1
                                        ];
                                    case 3:
                                        _b.sent();
                                        //Long order for 5 TEST/USD at a price of $1
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)];
                                    case 4:
                                        //Long order for 5 TEST/USD at a price of $1
                                        _b.sent();
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, false, sevenDays, { from: configure_1.accounts[1] })];
                                    case 5:
                                        _b.sent();
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("300"), oneDollar, false, sevenDays, { from: configure_1.accounts[2] })
                                            //Short order for 5 TEST/USD against placed order
                                        ];
                                    case 6:
                                        _b.sent();
                                        //Short order for 5 TEST/USD against placed order
                                        return [4 /*yield*/, tracer.matchOrders(1, 2)
                                            //Short order for 3 TEST/USD against placed order
                                        ];
                                    case 7:
                                        //Short order for 5 TEST/USD against placed order
                                        _b.sent();
                                        _a = test_helpers_1.expectRevert;
                                        //Order over 10x leverage
                                        return [4 /*yield*/, tracer.matchOrders(1, 3)];
                                    case 8: 
                                    //Short order for 3 TEST/USD against placed order
                                    return [4 /*yield*/, _a.apply(void 0, [
                                            //Order over 10x leverage
                                            _b.sent(), "SDX: Order filled"])];
                                    case 9:
                                        //Short order for 3 TEST/USD against placed order
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        it.skip("Rejects taking an expired order", function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                                    case 1:
                                        _b.sent();
                                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                                    case 2:
                                        _b.sent();
                                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })
                                            //Long order for 5 TEST/USD at a price of $1
                                        ];
                                    case 3:
                                        _b.sent();
                                        //Long order for 5 TEST/USD at a price of $1
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, now)];
                                    case 4:
                                        //Long order for 5 TEST/USD at a price of $1
                                        _b.sent();
                                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, false, sevenDays, { from: configure_1.accounts[1] })];
                                    case 5:
                                        _b.sent();
                                        _a = test_helpers_1.expectRevert;
                                        return [4 /*yield*/, tracer.matchOrders(1, 2)];
                                    case 6: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), "SDX: Order expired"])];
                                    case 7:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        return [2 /*return*/];
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Liquidation", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Current liquidation gas cost is 25.4064 * 10^18 USD
                // maxLeverage is 12.5
                it.skip("Updates balances after liquidation with 0 escrow amount", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var account1, account2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 80%, short order now is under margin requirements
                                    //$1 + 80% = 1.80
                                    //margin = 1000 + -500 * 1.8 = $100
                                    //minMargin = 6*25.4064 + 900/12.5 = 224.44
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 80%, short order now is under margin requirements
                                //$1 + 80% = 1.80
                                //margin = 1000 + -500 * 1.8 = $100
                                //minMargin = 6*25.4064 + 900/12.5 = 224.44
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("180000000"))
                                    //Third party liquidates and takes on the short position
                                ];
                            case 5:
                                //Price increases 80%, short order now is under margin requirements
                                //$1 + 80% = 1.80
                                //margin = 1000 + -500 * 1.8 = $100
                                //minMargin = 6*25.4064 + 900/12.5 = 224.44
                                _a.sent();
                                //Third party liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 6:
                                //Third party liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)];
                            case 8:
                                account1 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)
                                    //Account 2 base and quote (Liquidated fully with some in escrow)
                                ];
                            case 9:
                                account2 = _a.sent();
                                //Account 2 base and quote (Liquidated fully with some in escrow)
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("0").toString());
                                //Account 3 margin and position (Taking on liquidated position)
                                //quote = -500
                                //base = 1000
                                //margin = 1000
                                //amount to escrow = max(0, 100 - (224 - 100)) = 0
                                // Base and quote do not change
                                // base = 1000 + 750 where 750 is the deposited amount, which doesn't decrease due to 0 escrow
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1750").toString());
                                chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-500").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Updates balances after liquidation with non-zero escrow amount", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var result, account1, account2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 60%, short order now is under margin requirements
                                    //$1 + 60% = 1.60
                                    //margin = 1000 + -500 * 1.6 = $200
                                    //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("160000000"))
                                    //Third party liquidates and takes on the short position
                                ];
                            case 5:
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                _a.sent();
                                //Third party liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 6:
                                //Third party liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })];
                            case 7:
                                result = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)];
                            case 8:
                                account1 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)
                                    //Account 2 base and quote (Liquidated fully with some in escrow)
                                ];
                            case 9:
                                account2 = _a.sent();
                                //Account 2 base and quote (Liquidated fully with some in escrow)
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("0").toString());
                                //Account 3 margin and position (Taking on liquidated position)
                                //quote = -500
                                //base = 1000
                                //margin = 1000
                                //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
                                // Base and quote do not change
                                // base = 1000 + 750 - 183.5616 where 183.5616 is the escrow amount
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1566.4384").toString());
                                chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-500").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Only liquidates accounts under margin", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("5"), { from: configure_1.accounts[1] })
                                    //Price increases 10%, both accounts still in margin
                                    //$1 + 10% = 1.1
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 10%, both accounts still in margin
                                //$1 + 10% = 1.1
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("110000000"))
                                    //Short order for 3 TEST/USD against placed order
                                ];
                            case 5:
                                //Price increases 10%, both accounts still in margin
                                //$1 + 10% = 1.1
                                _a.sent();
                                //Short order for 3 TEST/USD against placed order
                                return [4 /*yield*/, test_helpers_1.expectRevert(
                                    //Order over 10x leverage
                                    account.liquidate(configure_1.web3.utils.toWei("3"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[0] }), "ACTL: Account above margin ")];
                            case 6:
                                //Short order for 3 TEST/USD against placed order
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Keeps an accurate record of liquidation receipts", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var liquidatorReceipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 58%, short order now is under margin requirements
                                    //$1 + 58% = 1.58
                                    //margin = 1000 + -500 * 1.58 = $200
                                    //minMargin = 6*25.4064 + 790/12.5 = 215.6384
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 58%, short order now is under margin requirements
                                //$1 + 58% = 1.58
                                //margin = 1000 + -500 * 1.58 = $200
                                //minMargin = 6*25.4064 + 790/12.5 = 215.6384
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("158000000"))
                                    //Third party liquidates and takes on the short position
                                ];
                            case 5:
                                //Price increases 58%, short order now is under margin requirements
                                //$1 + 58% = 1.58
                                //margin = 1000 + -500 * 1.58 = $200
                                //minMargin = 6*25.4064 + 790/12.5 = 215.6384
                                _a.sent();
                                //Third party liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 6:
                                //Third party liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })
                                    //Check liquidation receipt
                                    //amount escrowed = 204.3616
                                ];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, receipt.getLiquidationReceipt(0)];
                            case 8:
                                liquidatorReceipt = _a.sent();
                                chai_1.assert.equal(liquidatorReceipt[0].toString(), tracer.address); // market
                                chai_1.assert.equal(liquidatorReceipt[1].toString(), configure_1.accounts[2]); // liquidator
                                chai_1.assert.equal(liquidatorReceipt[2].toString(), configure_1.accounts[1]); // liquidatee
                                chai_1.assert.equal(liquidatorReceipt[3].toString(), new test_helpers_1.BN("158000000")); // price
                                chai_1.assert.equal(liquidatorReceipt[5].toString(), configure_1.web3.utils.toWei("204.3616").toString()); // escrowedAmount
                                chai_1.assert.equal(liquidatorReceipt[6].sub(liquidatorReceipt[4]).toString(), new test_helpers_1.BN(900)); // releaseTime: 15 mins in secs
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Trader can claim escrowed funds after the 15 minute safety period", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balanceBefore, balanceAfter, escrowReceipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 60%, short order now is under margin requirements
                                    //$1 + 60% = 1.60
                                    //margin = 1000 + -500 * 1.6 = $200
                                    //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("160000000"))
                                    //Third party liquidates and takes on the short position
                                ];
                            case 5:
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                _a.sent();
                                //Third party liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 6:
                                //Third party liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })
                                    //Time not passed to claim escrow, will revert
                                ];
                            case 7:
                                _a.sent();
                                //Time not passed to claim escrow, will revert
                                return [4 /*yield*/, test_helpers_1.expectRevert(account.claimEscrow(0, { from: configure_1.accounts[1] }), "ACTL: Not yet released")
                                    //15 mins + 1s
                                ];
                            case 8:
                                //Time not passed to claim escrow, will revert
                                _a.sent();
                                //15 mins + 1s
                                return [4 /*yield*/, test_helpers_1.time.increase(901)];
                            case 9:
                                //15 mins + 1s
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Invalid account trying to claim escrow
                                ];
                            case 10:
                                balanceBefore = _a.sent();
                                //Invalid account trying to claim escrow
                                return [4 /*yield*/, test_helpers_1.expectRevert(account.claimEscrow(0, { from: configure_1.accounts[2] }), "ACTL: Not Entitled ")
                                    //Claim escrow from the liquidation
                                ];
                            case 11:
                                //Invalid account trying to claim escrow
                                _a.sent();
                                //Claim escrow from the liquidation
                                return [4 /*yield*/, account.claimEscrow(0, { from: configure_1.accounts[1] })];
                            case 12:
                                //Claim escrow from the liquidation
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)];
                            case 13:
                                balanceAfter = _a.sent();
                                return [4 /*yield*/, receipt.getLiquidationReceipt(0)];
                            case 14:
                                escrowReceipt = _a.sent();
                                chai_1.assert.equal(escrowReceipt[8], true);
                                //Balance has increased by 183.5616 (Escrowed amount)
                                chai_1.assert.equal(balanceAfter[0].sub(balanceBefore[0]).toString(), configure_1.web3.utils.toWei("183.5616"));
                                //Will reject if they attempt to claim again
                                return [4 /*yield*/, test_helpers_1.expectRevert(account.claimEscrow(0, { from: configure_1.accounts[1] }), "ACTL: Already claimed")];
                            case 15:
                                //Will reject if they attempt to claim again
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Liquidator can claim escrowed funds with valid receipts", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var lowerPrice, balanceBefore, traderBalanceBefore, balanceAfter, traderBalanceAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 60%, short order now is under margin requirements
                                    //$1 + 60% = 1.60
                                    //margin = 1000 + -500 * 1.6 = $200
                                    //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("160000000"))
                                    //accounts[2] liquidates and takes on the short position
                                ];
                            case 5:
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                _a.sent();
                                //accounts[2] liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 6:
                                //accounts[2] liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[3] })];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })
                                    //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
                                ];
                            case 8:
                                _a.sent();
                                lowerPrice = new test_helpers_1.BN("161000000");
                                //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
                                return [4 /*yield*/, oracle.setPrice(lowerPrice)
                                    //Liquidator sells his positions across multiple orders, and as maker and taker
                                ];
                            case 9:
                                //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
                                _a.sent();
                                //Liquidator sells his positions across multiple orders, and as maker and taker
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 10:
                                //Liquidator sells his positions across multiple orders, and as maker and taker
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[3] })];
                            case 11:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("100"), lowerPrice, false, sevenDays, {
                                        from: configure_1.accounts[3],
                                    })];
                            case 12:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(3, configure_1.web3.utils.toWei("100"), { from: configure_1.accounts[2] })];
                            case 13:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 14:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(4, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[3] })
                                    // Liquidated at $1.6, sold at $1.61.
                                    // 1.61*500 - 1.6 * 500 = $5
                                ];
                            case 15:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)];
                            case 16:
                                balanceBefore = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)];
                            case 17:
                                traderBalanceBefore = _a.sent();
                                return [4 /*yield*/, account.claimReceipts(0, [2, 3, 4], tracer.address, { from: configure_1.accounts[2] })];
                            case 18:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)];
                            case 19:
                                balanceAfter = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Refunded $5 of the escrowed amount, because that's how much was lost due to slippage
                                ];
                            case 20:
                                traderBalanceAfter = _a.sent();
                                //Refunded $5 of the escrowed amount, because that's how much was lost due to slippage
                                chai_1.assert.equal(balanceAfter[0].sub(balanceBefore[0]).toString(), configure_1.web3.utils.toWei("5"));
                                //escrowedAmount - amountRefunded = 183.5616 - 5 = $178.5616 returned to trader
                                chai_1.assert.equal(traderBalanceAfter[0].sub(traderBalanceBefore[0]).toString(), configure_1.web3.utils.toWei("178.5616"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Appropriately caps the slippage", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var setMaxSlippage, proposalId, lowerPrice, balanceBefore, traderBalanceBefore, balanceAfter, traderBalanceAfter, setMaxSlippageBack, nextProposalId;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setMaxSlippage = configure_1.web3.eth.abi.encodeFunctionCall({
                                    name: "setMaxSlippage",
                                    type: "function",
                                    inputs: [
                                        {
                                            type: "int256",
                                            name: "_maxSlippage",
                                        },
                                    ],
                                }, ["100"] // 1% * 10000
                                );
                                return [4 /*yield*/, gov.propose([receipt.address], [setMaxSlippage])];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.proposalCounter()];
                            case 2:
                                proposalId = (_a.sent()).sub(new test_helpers_1.BN("1"));
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.voteFor(proposalId, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 5:
                                _a.sent();
                                return [4 /*yield*/, gov.execute(proposalId)];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 8:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 9:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 60%, short order now is under margin requirements
                                    //$1 + 60% = 1.60
                                    //margin = 1000 + -500 * 1.6 = $200
                                    //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                ];
                            case 10:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("160000000"))
                                    //accounts[2] liquidates and takes on the short position
                                ];
                            case 11:
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                _a.sent();
                                //accounts[2] liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 12:
                                //accounts[2] liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[3] })];
                            case 13:
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })
                                    //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
                                    //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
                                    //But it is 1.25%, which is greater than the max slippage of 1%.
                                ];
                            case 14:
                                _a.sent();
                                lowerPrice = new test_helpers_1.BN("162000000");
                                return [4 /*yield*/, oracle.setPrice(lowerPrice)
                                    //Liquidator sells his positions across multiple orders, and as maker and taker
                                ];
                            case 15:
                                _a.sent();
                                //Liquidator sells his positions across multiple orders, and as maker and taker
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 16:
                                //Liquidator sells his positions across multiple orders, and as maker and taker
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[3] })];
                            case 17:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("100"), lowerPrice, false, sevenDays, {
                                        from: configure_1.accounts[3],
                                    })];
                            case 18:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(3, configure_1.web3.utils.toWei("100"), { from: configure_1.accounts[2] })];
                            case 19:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), lowerPrice, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 20:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(4, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[3] })
                                    // Liquidated at $1.6, sold at $1.62.
                                    // 1.62*500 - 1.6 * 500 = $10
                                    // However, that is over the 1%. A 1% slippage would be $8 loss
                                ];
                            case 21:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)];
                            case 22:
                                balanceBefore = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)];
                            case 23:
                                traderBalanceBefore = _a.sent();
                                return [4 /*yield*/, account.claimReceipts(0, [2, 3, 4], tracer.address, { from: configure_1.accounts[2] })];
                            case 24:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[2], tracer.address)];
                            case 25:
                                balanceAfter = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Refunded $5 of the escrowed amount, because that's how much was lost due to slippage
                                ];
                            case 26:
                                traderBalanceAfter = _a.sent();
                                //Refunded $5 of the escrowed amount, because that's how much was lost due to slippage
                                chai_1.assert.equal(balanceAfter[0].sub(balanceBefore[0]).toString(), configure_1.web3.utils.toWei("8"));
                                //escrowedAmount - amountRefunded = 183.5616 - 8 = $175.5616 returned to trader
                                chai_1.assert.equal(traderBalanceAfter[0].sub(traderBalanceBefore[0]).toString(), configure_1.web3.utils.toWei("175.5616"));
                                setMaxSlippageBack = configure_1.web3.eth.abi.encodeFunctionCall({
                                    name: "setMaxSlippage",
                                    type: "function",
                                    inputs: [
                                        {
                                            type: "int256",
                                            name: "_maxSlippage",
                                        },
                                    ],
                                }, ["100000"] // 1000% * 10000
                                );
                                return [4 /*yield*/, gov.propose([receipt.address], [setMaxSlippage])];
                            case 27:
                                _a.sent();
                                return [4 /*yield*/, gov.proposalCounter()];
                            case 28:
                                nextProposalId = (_a.sent()).sub(new test_helpers_1.BN("1"));
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 29:
                                _a.sent();
                                return [4 /*yield*/, gov.voteFor(nextProposalId, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[1] })];
                            case 30:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 31:
                                _a.sent();
                                return [4 /*yield*/, gov.execute(nextProposalId)];
                            case 32:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Liquidator can not claim escrowed funds with orders that are too old", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var currentOrderId, oneSixtyOne, oneSixty;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                currentOrderId = 1;
                                oneSixtyOne = new test_helpers_1.BN("161000000");
                                oneSixty = new test_helpers_1.BN("160000000");
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[2] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[3] })
                                    // Price rises before any liquidation happens, which could allow short 
                                    // liquidator to trick contracts in the future
                                ];
                            case 4:
                                _a.sent();
                                // Price rises before any liquidation happens, which could allow short 
                                // liquidator to trick contracts in the future
                                return [4 /*yield*/, oracle.setPrice(oneSixtyOne)];
                            case 5:
                                // Price rises before any liquidation happens, which could allow short 
                                // liquidator to trick contracts in the future
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneSixtyOne, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(currentOrderId, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[3] })];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)];
                            case 8:
                                _a.sent();
                                currentOrderId++;
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 9:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(currentOrderId, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 60%, short order now is under margin requirements
                                    //$1 + 60% = 1.60
                                    //margin = 1000 + -500 * 1.6 = $200
                                    //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                ];
                            case 10:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                return [4 /*yield*/, oracle.setPrice(oneSixty)
                                    //accounts[2] liquidates and takes on the short position
                                ];
                            case 11:
                                //Price increases 60%, short order now is under margin requirements
                                //$1 + 60% = 1.60
                                //margin = 1000 + -500 * 1.6 = $200
                                //minMargin = 6*25.4064 + 800/12.5 = 216.44
                                _a.sent();
                                //accounts[2] liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 12:
                                //accounts[2] liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[3] })];
                            case 13:
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })
                                    //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
                                    //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
                                ];
                            case 14:
                                _a.sent();
                                //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
                                //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
                                return [4 /*yield*/, oracle.setPrice(oneSixtyOne)];
                            case 15:
                                //amount to escrow = max(0, 200 - (216.4384 - 200)) = 183.5616
                                //Before liquidator sells, price rises small amount (causing slippage since he is a short agent)
                                _a.sent();
                                currentOrderId++;
                                return [4 /*yield*/, test_helpers_1.expectRevert(account.claimReceipts(0, [0], tracer.address, { from: configure_1.accounts[2] }), "REC: Order creation before liquidation")];
                            case 16:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Calculates Margin Correctly", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Gives correct margin on deposits", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var margin;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.getUserMargin(configure_1.accounts[0], tracer.address)];
                            case 2:
                                margin = _a.sent();
                                chai_1.assert.equal(margin.toString(), configure_1.web3.utils.toWei("500"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Factors in the gas cost of liquidation while calculating minimum margin", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var minMargin0, minMargin1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("750"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("750"), { from: configure_1.accounts[1] })
                                    //Check margin of account
                                ];
                            case 5:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, account.getUserMinMargin(configure_1.accounts[0], tracer.address)];
                            case 6:
                                minMargin0 = _a.sent();
                                return [4 /*yield*/, account.getUserMinMargin(configure_1.accounts[1], tracer.address)];
                            case 7:
                                minMargin1 = _a.sent();
                                chai_1.assert.equal(minMargin0.toString(), configure_1.web3.utils.toWei("212.4384"));
                                chai_1.assert.equal(minMargin1.toString(), configure_1.web3.utils.toWei("212.4384"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Gives correct margin and notional value after trades", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var margin, margin2, notional1, notional2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("200"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Check margin of leveraged account (SHORT)
                                    //margin is ((600 - 42.87) / 500) - 1
                                ];
                            case 5:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, account.getUserMargin(configure_1.accounts[0], tracer.address)];
                            case 6:
                                margin = _a.sent();
                                return [4 /*yield*/, account.getUserMargin(configure_1.accounts[1], tracer.address)];
                            case 7:
                                margin2 = _a.sent();
                                return [4 /*yield*/, account.getUserNotionalValue(configure_1.accounts[0], tracer.address)];
                            case 8:
                                notional1 = _a.sent();
                                return [4 /*yield*/, account.getUserNotionalValue(configure_1.accounts[1], tracer.address)];
                            case 9:
                                notional2 = _a.sent();
                                chai_1.assert.equal(configure_1.web3.utils.fromWei(margin.toString()), "1000");
                                chai_1.assert.equal(configure_1.web3.utils.fromWei(margin2.toString()), "200");
                                chai_1.assert.equal(configure_1.web3.utils.fromWei(notional1.toString()), "500");
                                chai_1.assert.equal(configure_1.web3.utils.fromWei(notional2.toString()), "500");
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Gives correct margin after price changes", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var margin1, margin2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 3:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //50% price increase to $1.5
                                ];
                            case 4:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //50% price increase to $1.5
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("150000000"))
                                    //New margin on accounts
                                    //acc1 --> 1 - ((42.87) / (500 * 1.5))
                                    //acc2 --> ((1000 - 42.87) / 500 * 1.5) - 1
                                ];
                            case 5:
                                //50% price increase to $1.5
                                _a.sent();
                                return [4 /*yield*/, account.getUserMargin(configure_1.accounts[0], tracer.address)];
                            case 6:
                                margin1 = _a.sent();
                                chai_1.assert.equal(margin1.toString(), configure_1.web3.utils.toWei("750"));
                                return [4 /*yield*/, account.getUserMargin(configure_1.accounts[1], tracer.address)];
                            case 7:
                                margin2 = _a.sent();
                                chai_1.assert.equal(margin2.toString(), configure_1.web3.utils.toWei("250"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Settlement", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Handles complex funding rate settlements", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var currentHour, twap, account0, account1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Setup orders -> average order price $1 about oracle price (10% price diff)
                            return [4 /*yield*/, oracle.setPrice(oneDollar)];
                            case 1:
                                //Setup orders -> average order price $1 about oracle price (10% price diff)
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[1] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[2] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[3] })
                                    //Long order for 5 TEST/USD at a price of $1.01
                                ];
                            case 5:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1.01
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("505"), new test_helpers_1.BN("101000000"), true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 6:
                                //Long order for 5 TEST/USD at a price of $1.01
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("505"), { from: configure_1.accounts[1] })
                                    //Time travel a day
                                ];
                            case 7:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Time travel a day
                                return [4 /*yield*/, test_helpers_1.time.increase(twentyFourHours)
                                    // Place order to trigger updates in contract pricing for the 24 hour period
                                ];
                            case 8:
                                //Time travel a day
                                _a.sent();
                                // Place order to trigger updates in contract pricing for the 24 hour period
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("505"), new test_helpers_1.BN("101000000"), true, sevenDays, { from: configure_1.accounts[2] })];
                            case 9:
                                // Place order to trigger updates in contract pricing for the 24 hour period
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("505"), { from: configure_1.accounts[3] })
                                    //Check 24 hour prices
                                ];
                            case 10:
                                _a.sent();
                                return [4 /*yield*/, tracer.currentHour()];
                            case 11:
                                currentHour = (_a.sent()).toNumber();
                                return [4 /*yield*/, pricing.getTWAPs(tracer.address, currentHour - 1)
                                    //underlying twap price should be (8*1 + 7*1) / (8+7) = 1
                                ];
                            case 12:
                                twap = _a.sent();
                                //underlying twap price should be (8*1 + 7*1) / (8+7) = 1
                                chai_1.assert.equal(twap[0].toString(), new test_helpers_1.BN("100000000").toString());
                                //derivative twap price should be (8*1.1 + 7*1.1) / (8+7) = 1.1
                                chai_1.assert.equal(twap[1].toString(), new test_helpers_1.BN("101000000").toString());
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[0])];
                            case 13:
                                _a.sent();
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[1])
                                    //Funding rate should now be
                                    //1.01 - 1 - ((1.01 - 1) / 90) = 0.00988888889
                                    //global funding rate = 0.01 * 1 = 0.00988888889
                                    //due to rounding this becomes     0.00988889 -> 8dp of precision when values are cents
                                ];
                            case 14:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[0], tracer.address)];
                            case 15:
                                account0 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Ensure positions are updated
                                    //Account 1 --> LONG
                                    //Originally 0 margin, 5 position
                                    //Must pay short 1% the value of his position from current margin account
                                    // initial_base - (amount_spent_on_order) - (funding_rate * notional_value)
                                    // 1000 - (505*1.01) - 0.00988889*505*1 = 484.95611055
                                ];
                            case 16:
                                account1 = _a.sent();
                                //Ensure positions are updated
                                //Account 1 --> LONG
                                //Originally 0 margin, 5 position
                                //Must pay short 1% the value of his position from current margin account
                                // initial_base - (amount_spent_on_order) - (funding_rate * notional_value)
                                // 1000 - (505*1.01) - 0.00988889*505*1 = 484.95611055
                                chai_1.assert.equal(account0[0].toString(), configure_1.web3.utils.toWei("484.95611055").toString());
                                //Account 2 --> SHORT has gained opposite amount
                                //1000 + (505*1.01) + 0.00988889*505*1 = 1515.04388945
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("1515.04388945").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Handles complex funding rate settlements with insurance funding rate", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var account1, account2, poolBalance;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Setup orders -> average order price $1 about oracle price (10% price diff)
                            return [4 /*yield*/, oracle.setPrice(oneDollar)];
                            case 1:
                                //Setup orders -> average order price $1 about oracle price (10% price diff)
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[1] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[2] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[3] })
                                    //Long order
                                ];
                            case 5:
                                _a.sent();
                                //Long order
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("2000"), oneDollar, true, sevenDays)
                                    //Short order
                                ];
                            case 6:
                                //Long order
                                _a.sent();
                                //Short order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("2000"), { from: configure_1.accounts[1] })
                                    //Total Leveraged Value = $2000
                                    //Time travel a day
                                ];
                            case 7:
                                //Short order
                                _a.sent();
                                //Total Leveraged Value = $2000
                                //Time travel a day
                                return [4 /*yield*/, test_helpers_1.time.increase(twentyFourHours)
                                    //Place order to trigger updates in contract pricing for the 24 hour period
                                ];
                            case 8:
                                //Total Leveraged Value = $2000
                                //Time travel a day
                                _a.sent();
                                //Place order to trigger updates in contract pricing for the 24 hour period
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 9:
                                //Place order to trigger updates in contract pricing for the 24 hour period
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("1000"), { from: configure_1.accounts[3] })
                                    //Total leveraged value = $4000
                                    //Funding rate should now be 0 as price is the same
                                    //Insurance funding rate should be
                                    // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
                                    // = 0.000036523% --> including 1000000000 multiply factor = 36523
                                ];
                            case 10:
                                _a.sent();
                                //Total leveraged value = $4000
                                //Funding rate should now be 0 as price is the same
                                //Insurance funding rate should be
                                // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
                                // = 0.000036523% --> including 1000000000 multiply factor = 36523
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[0])];
                            case 11:
                                //Total leveraged value = $4000
                                //Funding rate should now be 0 as price is the same
                                //Insurance funding rate should be
                                // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
                                // = 0.000036523% --> including 1000000000 multiply factor = 36523
                                _a.sent();
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[1])
                                    //Ensure positions are updated
                                ];
                            case 12:
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[0], tracer.address)];
                            case 13:
                                account1 = _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Account 1 --> LONG
                                    //Originally 0 margin, 5 position
                                    //Must pay short 1% the value of his position from current margin account
                                    // 1000 - (2000*1) - 0.000036523 * 1000 (leveraged notional value = $10)
                                    //= -10.00036523
                                ];
                            case 14:
                                account2 = _a.sent();
                                //Account 1 --> LONG
                                //Originally 0 margin, 5 position
                                //Must pay short 1% the value of his position from current margin account
                                // 1000 - (2000*1) - 0.000036523 * 1000 (leveraged notional value = $10)
                                //= -10.00036523
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("-1000.036523").toString());
                                //Account 2 --> SHORT has paid same amount
                                //1000 + (2000 * 1) - 0.000036523 * 1000
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("2999.963477").toString());
                                return [4 /*yield*/, account.getBalance(insurance.address, tracer.address)];
                            case 15:
                                poolBalance = _a.sent();
                                chai_1.assert.equal(poolBalance[0].toString(), configure_1.web3.utils.toWei("0.073046"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Permissioned Orders", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Allows permissioned users to make and take orders", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tx, order;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, tracer.setUserPermissions(configure_1.accounts[1], true)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, tracer.permissionedMakeOrder(configure_1.web3.utils.toWei("5"), oneDollar, true, sevenDays, configure_1.accounts[0], { from: configure_1.accounts[1] })];
                            case 3:
                                tx = _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectEvent(tx.receipt, "OrderMade", {
                                        //DEPRECATED: tracerId: web3.utils.padRight(web3.utils.asciiToHex("TEST/USD"), 64),
                                        orderId: new test_helpers_1.BN("1"),
                                        amount: configure_1.web3.utils.toWei("5").toString(),
                                        price: oneDollar,
                                        maker: configure_1.accounts[0],
                                        isLong: true,
                                    })
                                    //amount, filled, price, side
                                ];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 5:
                                order = _a.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("5").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(order[2].toString(), oneDollar.toString());
                                chai_1.assert.equal(order[3], true);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Rejects addresses with TCR: No trade permission from making orders", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)
                                //Long order for 5 TEST/USD at a price of $1
                            ];
                            case 1:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, test_helpers_1.expectRevert(tracer.permissionedMakeOrder(configure_1.web3.utils.toWei("5"), oneDollar, true, sevenDays, configure_1.accounts[0], {
                                        from: configure_1.accounts[1],
                                    }), "TCR: No trade permission")];
                            case 2:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("internal state", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it.skip("Keeps track of the rolling hourly average price and oracle price", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var currentHour, averagePrice, oracleAverage, fairPrice, avgPrices, fairPriceUpdated, avgPricesUpdated, avgDerivativePrice, avgOraclePrice, timeValue, expectedFairPrice;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Make trades
                            return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("2000"), tracer.address)];
                            case 1:
                                //Make trades
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("2000"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 3:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("5"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 4:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("5"), { from: configure_1.accounts[1] })
                                    //Long order for 2 TEST/USD at a price of $2
                                ];
                            case 5:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Long order for 2 TEST/USD at a price of $2
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("2"), new test_helpers_1.BN("200000000"), true, sevenDays)
                                    //Short order for 2 TEST/USD against placed order
                                ];
                            case 6:
                                //Long order for 2 TEST/USD at a price of $2
                                _a.sent();
                                //Short order for 2 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("2"), { from: configure_1.accounts[1] })
                                    //Long order for 1 TEST/USD at a price of $2
                                ];
                            case 7:
                                //Short order for 2 TEST/USD against placed order
                                _a.sent();
                                //Long order for 1 TEST/USD at a price of $2
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1"), new test_helpers_1.BN("300000000"), true, sevenDays)
                                    //Short order for 1 TEST/USD against placed order
                                ];
                            case 8:
                                //Long order for 1 TEST/USD at a price of $2
                                _a.sent();
                                //Short order for 1 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(3, configure_1.web3.utils.toWei("1"), { from: configure_1.accounts[1] })
                                    //fast forward time
                                ];
                            case 9:
                                //Short order for 1 TEST/USD against placed order
                                _a.sent();
                                //fast forward time
                                return [4 /*yield*/, test_helpers_1.time.increase(oneHour + 600)
                                    //Make a trade to tick over into the next hour
                                ];
                            case 10:
                                //fast forward time
                                _a.sent();
                                //Make a trade to tick over into the next hour
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("200000000"))
                                    //Long order for 1 TEST/USD at a price of $2
                                ];
                            case 11:
                                //Make a trade to tick over into the next hour
                                _a.sent();
                                //Long order for 1 TEST/USD at a price of $2
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1"), new test_helpers_1.BN("300000000"), true, sevenDays)
                                    //Short order for 1 TEST/USD against placed order
                                ];
                            case 12:
                                //Long order for 1 TEST/USD at a price of $2
                                _a.sent();
                                //Short order for 1 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(4, configure_1.web3.utils.toWei("1"), { from: configure_1.accounts[1] })
                                    //Average price over last hour = 1+2+3/3 = 2
                                    //average oracle price over last hour = 200000000
                                ];
                            case 13:
                                //Short order for 1 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, tracer.currentHour()];
                            case 14:
                                currentHour = (_a.sent()).toNumber();
                                return [4 /*yield*/, pricing.getHourlyAvgTracerPrice(currentHour - 1, tracer.address)];
                            case 15:
                                averagePrice = _a.sent();
                                return [4 /*yield*/, pricing.getHourlyAvgOraclePrice(currentHour - 1, tracer.address)];
                            case 16:
                                oracleAverage = _a.sent();
                                return [4 /*yield*/, pricing.fairPrices(tracer.address)];
                            case 17:
                                fairPrice = _a.sent();
                                chai_1.assert.equal(averagePrice.toString(), new test_helpers_1.BN("200000000").toString());
                                chai_1.assert.equal(oracleAverage.toString(), new test_helpers_1.BN("100000000").toString());
                                chai_1.assert.equal(fairPrice.toString(), new test_helpers_1.BN("200000000").toString());
                                return [4 /*yield*/, pricing.get24HourPrices(tracer.address)];
                            case 18:
                                avgPrices = _a.sent();
                                chai_1.assert.equal(avgPrices[0].toString(), new test_helpers_1.BN("250000000").toString());
                                chai_1.assert.equal(avgPrices[1].toString(), new test_helpers_1.BN("150000000").toString());
                                //fast forward 24 hours and check fair price has now updated
                                return [4 /*yield*/, test_helpers_1.time.increase(24 * oneHour)
                                    //Long order for 1 TEST/USD at a price of $1
                                ];
                            case 19:
                                //fast forward 24 hours and check fair price has now updated
                                _a.sent();
                                //Long order for 1 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1"), new test_helpers_1.BN("100000000"), true, sevenDays)
                                    //Short order for 1 TEST/USD against placed order
                                ];
                            case 20:
                                //Long order for 1 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 1 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(5, configure_1.web3.utils.toWei("1"), { from: configure_1.accounts[1] })];
                            case 21:
                                //Short order for 1 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, pricing.fairPrices(tracer.address)];
                            case 22:
                                fairPriceUpdated = _a.sent();
                                return [4 /*yield*/, pricing.get24HourPrices(tracer.address)
                                    //fair price = oracle price - time value = $1 - (avg derivative price - average oracle price)/90
                                ];
                            case 23:
                                avgPricesUpdated = _a.sent();
                                avgDerivativePrice = new test_helpers_1.BN(avgPricesUpdated[0].toString());
                                avgOraclePrice = new test_helpers_1.BN(avgPricesUpdated[1].toString());
                                timeValue = avgDerivativePrice.sub(avgOraclePrice).div(new test_helpers_1.BN(90));
                                expectedFairPrice = (new test_helpers_1.BN("200000000")).sub(timeValue);
                                chai_1.assert.equal(fairPriceUpdated.toString(), expectedFairPrice.toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it.skip("Keeps track of the leveraged notional value", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var userBalance, lev, updatedLev, updatedLev2, updatedLev3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Make trades
                            return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                            case 1:
                                //Make trades
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("2000"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("2200"), tracer.address, { from: configure_1.accounts[3] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)
                                    //Long order for 2000 TEST/USD at a price of $1 (2x leverage)
                                    //Leveraged notional value = $1000
                                ];
                            case 5:
                                _a.sent();
                                //Long order for 2000 TEST/USD at a price of $1 (2x leverage)
                                //Leveraged notional value = $1000
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("2000"), oneDollar, true, sevenDays)
                                    //Short order for 2000 TEST/USD against placed order
                                ];
                            case 6:
                                //Long order for 2000 TEST/USD at a price of $1 (2x leverage)
                                //Leveraged notional value = $1000
                                _a.sent();
                                //Short order for 2000 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("2000"), { from: configure_1.accounts[1] })
                                    //Leveraged notional value = $1000
                                ];
                            case 7:
                                //Short order for 2000 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[0], tracer.address)];
                            case 8:
                                userBalance = _a.sent();
                                chai_1.assert.equal(userBalance[2].toString(), configure_1.web3.utils.toWei("1000"));
                                return [4 /*yield*/, tracer.leveragedNotionalValue()];
                            case 9:
                                lev = _a.sent();
                                chai_1.assert.equal(lev.toString(), configure_1.web3.utils.toWei("1000"));
                                //fast forward time
                                return [4 /*yield*/, test_helpers_1.time.increase(oneHour + 600)
                                    //Make a trade to tick over into the next hour
                                ];
                            case 10:
                                //fast forward time
                                _a.sent();
                                //Make a trade to tick over into the next hour
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("100000000"))
                                    //Long order for 200 TEST/USD at a price of $1.
                                    //user deposited in 1000 so is borrowing 1200 to get to a notional value of $1200
                                ];
                            case 11:
                                //Make a trade to tick over into the next hour
                                _a.sent();
                                //Long order for 200 TEST/USD at a price of $1.
                                //user deposited in 1000 so is borrowing 1200 to get to a notional value of $1200
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), oneDollar, true, sevenDays)
                                    //Short order for 200 TEST/USD against placed order
                                ];
                            case 12:
                                //Long order for 200 TEST/USD at a price of $1.
                                //user deposited in 1000 so is borrowing 1200 to get to a notional value of $1200
                                _a.sent();
                                //Short order for 200 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[2] })
                                    //Leveraged notional value = $1000 + $200
                                ];
                            case 13:
                                //Short order for 200 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, tracer.leveragedNotionalValue()];
                            case 14:
                                updatedLev = _a.sent();
                                chai_1.assert.equal(updatedLev.toString(), configure_1.web3.utils.toWei("1200"));
                                //Account 1 goes further short to increase leverage
                                //leverage increased by $300
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("300"), oneDollar, false, sevenDays, { from: configure_1.accounts[1] })];
                            case 15:
                                //Account 1 goes further short to increase leverage
                                //leverage increased by $300
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(3, configure_1.web3.utils.toWei("300"), { from: configure_1.accounts[2] })
                                    //Account 1 has deposited $2000 and now has 2300 short positions worth $2300
                                    //total Leveraged notional value = $1200 + $300 = accounts[0].leveragedNotionalValue + accounts[1].leveragedNotionalValue
                                ];
                            case 16:
                                _a.sent();
                                return [4 /*yield*/, tracer.leveragedNotionalValue()];
                            case 17:
                                updatedLev2 = _a.sent();
                                chai_1.assert.equal(updatedLev2.toString(), configure_1.web3.utils.toWei("1500"));
                                //Account 0 sells off all of their long, reducing system leverage
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1200"), oneDollar, true, sevenDays, { from: configure_1.accounts[3] })];
                            case 18:
                                //Account 0 sells off all of their long, reducing system leverage
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(4, configure_1.web3.utils.toWei("1200"), { from: configure_1.accounts[0] })
                                    //total Leveraged notional value = $15 - $12
                                ];
                            case 19:
                                _a.sent();
                                return [4 /*yield*/, tracer.leveragedNotionalValue()];
                            case 20:
                                updatedLev3 = _a.sent();
                                chai_1.assert.equal(updatedLev3.toString(), configure_1.web3.utils.toWei("300"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        return [2 /*return*/];
    });
}); });
