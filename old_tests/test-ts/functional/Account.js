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
/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Account", function () { return __awaiter(void 0, void 0, void 0, function () {
    var oneDollar, account, testToken, tracer, oracle, insurance, oneHour, twentyFourHours, twoDays, now, sevenDays;
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
                        account = deployed.account;
                        testToken = deployed.testToken;
                        tracer = deployed.perps;
                        insurance = deployed.insurance;
                        oracle = deployed.oracle;
                        return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 2:
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        return [2 /*return*/];
                }
            });
        }); });
        context("withdrawERC20Token", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Can withdraw an ERC20 token", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balanceAfter, _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, testToken.transfer(account.address, 123)];
                            case 1:
                                _c.sent();
                                return [4 /*yield*/, testToken.balanceOf(configure_1.accounts[0])];
                            case 2:
                                balanceAfter = _c.sent();
                                return [4 /*yield*/, account.withdrawERC20Token(testToken.address, configure_1.accounts[0], 123)];
                            case 3:
                                _c.sent();
                                _b = (_a = chai_1.assert).notStrictEqual;
                                return [4 /*yield*/, testToken.balanceOf(configure_1.accounts[0])];
                            case 4:
                                _b.apply(_a, [_c.sent(), balanceAfter.add(new test_helpers_1.BN(123))]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Deleverage", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Correctly calculates the maxLeverage when an insurance pool is drained", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var insuranceHoldings, realMaxLeverage;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            // Deposit into market
                            return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                            case 1:
                                // Deposit into market
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("200"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[2] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[3] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 5:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 6:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    /* Make a bunch of trades to fill up insurance pool a bit */
                                ];
                            case 7:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                /* Make a bunch of trades to fill up insurance pool a bit */
                                return [4 /*yield*/, test_helpers_1.time.increase(twentyFourHours)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 8:
                                /* Make a bunch of trades to fill up insurance pool a bit */
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays, { from: configure_1.accounts[2] })
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 9:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[3] })];
                            case 10:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twentyFourHours)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 11:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays, { from: configure_1.accounts[3] })
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 12:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(3, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[2] })];
                            case 13:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twentyFourHours)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 14:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays, { from: configure_1.accounts[3] })
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 15:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(4, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[2] })
                                    /*
                                     Global funding rate: 146092
                                     User funding rate: 36523
                                     Amount to pay
                                       = (globalFundingRate - userFundingRate) * accountTotalLeveragedValue * 10^18 / 10^9
                                       = (146092 - 36523) * 300 * 10^18 / 10^8
                                       = 0.0328707 * 10^18
                                    */
                                ];
                            case 16:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                /*
                                 Global funding rate: 146092
                                 User funding rate: 36523
                                 Amount to pay
                                   = (globalFundingRate - userFundingRate) * accountTotalLeveragedValue * 10^18 / 10^9
                                   = (146092 - 36523) * 300 * 10^18 / 10^8
                                   = 0.0328707 * 10^18
                                */
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[1])];
                            case 17:
                                /*
                                 Global funding rate: 146092
                                 User funding rate: 36523
                                 Amount to pay
                                   = (globalFundingRate - userFundingRate) * accountTotalLeveragedValue * 10^18 / 10^9
                                   = (146092 - 36523) * 300 * 10^18 / 10^8
                                   = 0.0328707 * 10^18
                                */
                                _a.sent();
                                return [4 /*yield*/, insurance.updatePoolAmount(tracer.address)];
                            case 18:
                                _a.sent();
                                return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                            case 19:
                                insuranceHoldings = _a.sent();
                                chai_1.assert.equal(configure_1.web3.utils.fromWei(insuranceHoldings), "0.0328707");
                                return [4 /*yield*/, account.realMaxLeverage(tracer.address)];
                            case 20:
                                realMaxLeverage = _a.sent();
                                chai_1.assert.equal(realMaxLeverage.toString(), "16267");
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Correctly bottoms out the max leverage at 1", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var realMaxLeverage;
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
                                    // 300 total leveraged notional value, but insurance pool is 0% filled.
                                ];
                            case 5:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                return [4 /*yield*/, account.realMaxLeverage(tracer.address)
                                    // Should equal 10,000 since we times maxLeverage by 10k for decimal accuracy
                                ];
                            case 6:
                                realMaxLeverage = _a.sent();
                                // Should equal 10,000 since we times maxLeverage by 10k for decimal accuracy
                                chai_1.assert.equal(realMaxLeverage.toString(), "10000");
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
