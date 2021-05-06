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
var artifacts_1 = require("../artifacts");
var Setup_1 = require("../lib/Setup");
var configure_1 = require("../configure");
var Signing_1 = require("../lib/Signing");
require("dotenv").config();
var threeDays = 259200;
var twoDays = 172800;
/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Trader", function () { return __awaiter(void 0, void 0, void 0, function () {
    var oneDollar, deployer, testToken, perpsFactory, tracer, oracle, trader, receipt, gov, govToken, insurance, account, now, sevenDays;
    return __generator(this, function (_a) {
        oneDollar = new test_helpers_1.BN("100000000");
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
            var deployed, i;
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
                        gov = deployed.gov;
                        govToken = deployed.govToken;
                        insurance = deployed.insurance;
                        account = deployed.account;
                        return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 2:
                        //Set end of test setup times for use throughout tests
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        return [4 /*yield*/, artifacts_1.Trader.new()
                            //Get each user to "deposit" 100 tokens into the platform and approve the trader
                        ];
                    case 3:
                        trader = _a.sent();
                        i = 0;
                        _a.label = 4;
                    case 4:
                        if (!(i < 6)) return [3 /*break*/, 7];
                        return [4 /*yield*/, tracer.setUserPermissions(trader.address, true, { from: configure_1.accounts[i] })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 4];
                    case 7: return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 8:
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        return [2 /*return*/];
                }
            });
        }); });
        context("Trading", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Can batch execute trades (simple)", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makes, takes, signedTakes, _a, _b, signedMakes, _c, _d, order, account1, account2;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                makes = [
                                    {
                                        amount: configure_1.web3.utils.toWei("500"),
                                        price: oneDollar.toString(),
                                        side: true,
                                        user: configure_1.accounts[0],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                ];
                                takes = [
                                    {
                                        amount: configure_1.web3.utils.toWei("500"),
                                        price: oneDollar.toString(),
                                        side: false,
                                        user: configure_1.accounts[1],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    }
                                ];
                                _b = (_a = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takes, trader.address)];
                            case 1: return [4 /*yield*/, _b.apply(_a, [_e.sent()])];
                            case 2:
                                signedTakes = _e.sent();
                                _d = (_c = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makes, trader.address)];
                            case 3: return [4 /*yield*/, _d.apply(_c, [_e.sent()])];
                            case 4:
                                signedMakes = _e.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 5:
                                _e.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 6:
                                _e.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[2] })];
                            case 7:
                                _e.sent();
                                return [4 /*yield*/, trader.executeTrade(signedMakes, signedTakes, tracer.address)
                                    //Check post trade positions
                                    //assert amount, filled
                                ];
                            case 8:
                                _e.sent();
                                return [4 /*yield*/, tracer.getOrder(1)];
                            case 9:
                                order = _e.sent();
                                chai_1.assert.equal(order[0].toString(), configure_1.web3.utils.toWei("500").toString());
                                chai_1.assert.equal(order[1].toString(), configure_1.web3.utils.toWei("500").toString());
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[0], tracer.address)];
                            case 10:
                                account1 = _e.sent();
                                return [4 /*yield*/, account.getBalance(configure_1.accounts[1], tracer.address)
                                    //Account 1 margin and position (MAKER)
                                ];
                            case 11:
                                account2 = _e.sent();
                                //Account 1 margin and position (MAKER)
                                chai_1.assert.equal(account1[0].toString(), configure_1.web3.utils.toWei("0").toString());
                                chai_1.assert.equal(account1[1].toString(), configure_1.web3.utils.toWei("500").toString());
                                //Account 2 margin and position
                                chai_1.assert.equal(account2[0].toString(), configure_1.web3.utils.toWei("1000").toString());
                                chai_1.assert.equal(account2[1].toString(), configure_1.web3.utils.toWei("-500").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Detects replay attacks in the same batch", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makes, takes, takesReplay, signedTakesNormal, _a, _b, signedTakesReplay, _c, _d, signedMakes, _e, _f, signedTakes;
                    return __generator(this, function (_g) {
                        switch (_g.label) {
                            case 0:
                                makes = [
                                    {
                                        amount: configure_1.web3.utils.toWei("200"),
                                        price: oneDollar.toString(),
                                        side: true,
                                        user: configure_1.accounts[0],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                    {
                                        amount: configure_1.web3.utils.toWei("200"),
                                        price: oneDollar.toString(),
                                        side: true,
                                        user: configure_1.accounts[0],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 1,
                                    },
                                ];
                                takes = [
                                    {
                                        amount: configure_1.web3.utils.toWei("200"),
                                        price: oneDollar.toString(),
                                        side: false,
                                        user: configure_1.accounts[1],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                ];
                                takesReplay = [
                                    {
                                        amount: configure_1.web3.utils.toWei("200"),
                                        price: oneDollar.toString(),
                                        side: false,
                                        user: configure_1.accounts[1],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                ];
                                _b = (_a = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takes, trader.address)];
                            case 1: return [4 /*yield*/, _b.apply(_a, [_g.sent()])];
                            case 2:
                                signedTakesNormal = _g.sent();
                                _d = (_c = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takesReplay, trader.address)];
                            case 3: return [4 /*yield*/, _d.apply(_c, [_g.sent()])];
                            case 4:
                                signedTakesReplay = _g.sent();
                                _f = (_e = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makes, trader.address)];
                            case 5: return [4 /*yield*/, _f.apply(_e, [_g.sent()])];
                            case 6:
                                signedMakes = _g.sent();
                                signedTakes = signedTakesNormal.concat(signedTakesReplay);
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 7:
                                _g.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 8:
                                _g.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(trader.executeTrade(signedMakes, signedTakes, tracer.address), "TDR: Incorrect nonce")];
                            case 9:
                                _g.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Detects replay attacks in the different batches", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makes, takes, makes2, takesReplay, signedTakesNormal, _a, _b, signedTakesReplay, _c, _d, signedMakes, _e, _f, signedMakes2, _g, _h;
                    return __generator(this, function (_j) {
                        switch (_j.label) {
                            case 0:
                                makes = [
                                    {
                                        amount: configure_1.web3.utils.toWei("500"),
                                        price: oneDollar.toString(),
                                        side: true,
                                        user: configure_1.accounts[0],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                ];
                                takes = [
                                    {
                                        amount: configure_1.web3.utils.toWei("200"),
                                        price: oneDollar.toString(),
                                        side: false,
                                        user: configure_1.accounts[1],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                ];
                                makes2 = [
                                    {
                                        amount: configure_1.web3.utils.toWei("500"),
                                        price: oneDollar.toString(),
                                        side: true,
                                        user: configure_1.accounts[0],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 1,
                                    },
                                ];
                                takesReplay = [
                                    {
                                        amount: configure_1.web3.utils.toWei("200"),
                                        price: oneDollar.toString(),
                                        side: false,
                                        user: configure_1.accounts[1],
                                        expiration: sevenDays,
                                        targetTracer: tracer.address,
                                        nonce: 0,
                                    },
                                ];
                                _b = (_a = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takes, trader.address)];
                            case 1: return [4 /*yield*/, _b.apply(_a, [_j.sent()])];
                            case 2:
                                signedTakesNormal = _j.sent();
                                _d = (_c = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takes, trader.address)];
                            case 3: return [4 /*yield*/, _d.apply(_c, [_j.sent()])];
                            case 4:
                                signedTakesReplay = _j.sent();
                                _f = (_e = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makes, trader.address)];
                            case 5: return [4 /*yield*/, _f.apply(_e, [_j.sent()])];
                            case 6:
                                signedMakes = _j.sent();
                                _h = (_g = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makes2, trader.address)];
                            case 7: return [4 /*yield*/, _h.apply(_g, [_j.sent()])];
                            case 8:
                                signedMakes2 = _j.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 9:
                                _j.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 10:
                                _j.sent();
                                return [4 /*yield*/, trader.executeTrade(signedMakes, signedTakesNormal, tracer.address)];
                            case 11:
                                _j.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(trader.executeTrade(signedMakes2, signedTakesReplay, tracer.address), "TDR: Incorrect nonce")];
                            case 12:
                                _j.sent();
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
