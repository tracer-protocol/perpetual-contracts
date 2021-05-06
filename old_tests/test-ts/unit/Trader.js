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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-ignore
var test_helpers_1 = require("@openzeppelin/test-helpers");
var assert_1 = __importDefault(require("assert"));
var Setup_1 = require("../lib/Setup");
var Signing_1 = require("../lib/Signing");
var configure_1 = require("../configure");
var artifacts_1 = require("../artifacts");
describe("Trader Shim unit tests", function () { return __awaiter(void 0, void 0, void 0, function () {
    var trader, tracer, account, token, sampleMakers, sampleTakers, badMakers, now, sevenDays;
    return __generator(this, function (_a) {
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
                        return [4 /*yield*/, artifacts_1.Trader.new()];
                    case 2:
                        trader = _a.sent();
                        tracer = deployed.perps;
                        account = deployed.account;
                        token = deployed.testToken;
                        i = 0;
                        _a.label = 3;
                    case 3:
                        if (!(i < 3)) return [3 /*break*/, 8];
                        return [4 /*yield*/, tracer.setUserPermissions(trader.address, true, { from: configure_1.accounts[i] })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, token.approve(account.address, configure_1.web3.utils.toWei("100000"))];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("10000"), tracer.address, { from: configure_1.accounts[i] })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 3];
                    case 8: return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 9:
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        sampleMakers = [
                            {
                                amount: "5000000000000000000",
                                price: "100000000",
                                side: true,
                                user: configure_1.accounts[1],
                                expiration: sevenDays,
                                targetTracer: tracer.address,
                                nonce: 0,
                            },
                            {
                                amount: "5000002200000000000",
                                price: "100000088",
                                side: false,
                                user: configure_1.accounts[0],
                                expiration: sevenDays,
                                targetTracer: tracer.address,
                                nonce: 0,
                            }
                        ];
                        sampleTakers = [
                            {
                                amount: "5000000000000000000",
                                price: "100000000",
                                side: false,
                                user: configure_1.accounts[2],
                                expiration: sevenDays,
                                targetTracer: tracer.address,
                                nonce: 0,
                            },
                            {
                                amount: "5000002200000000000",
                                price: "100000088",
                                side: true,
                                user: configure_1.accounts[2],
                                expiration: sevenDays,
                                targetTracer: tracer.address,
                                nonce: 1,
                            }
                        ];
                        badMakers = [
                            {
                                amount: "5000000000000000000",
                                price: "100000011",
                                side: true,
                                user: configure_1.accounts[1],
                                expiration: sevenDays,
                                targetTracer: tracer.address,
                                nonce: 0,
                            },
                            {
                                amount: "5000002200000000000",
                                price: "100000088",
                                side: false,
                                user: configure_1.accounts[0],
                                expiration: sevenDays,
                                targetTracer: tracer.address,
                                nonce: 0,
                            }
                        ];
                        return [2 /*return*/];
                }
            });
        }); });
        describe("executeTrade", function () {
            context("When input array lengths differ", function () {
                it("reverts", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makers, takers, market, signedMakers, _a, _b, signedTakers, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                makers = sampleMakers;
                                takers = sampleTakers.slice(0, 1);
                                market = tracer.address;
                                _b = (_a = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makers, trader.address)];
                            case 1: return [4 /*yield*/, _b.apply(_a, [_e.sent()])];
                            case 2:
                                signedMakers = _e.sent();
                                _d = (_c = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takers, trader.address)];
                            case 3: return [4 /*yield*/, _d.apply(_c, [_e.sent()])];
                            case 4:
                                signedTakers = _e.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(trader.executeTrade(signedMakers, signedTakers, market), "TDR: Lengths differ")];
                            case 5:
                                _e.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When input arrays are both empty", function () {
                it("reverts", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makers, takers, market;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                makers = [];
                                takers = [];
                                market = tracer.address;
                                return [4 /*yield*/, test_helpers_1.expectRevert(trader.executeTrade(makers, takers, market), "TDR: Received empty arrays")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When both input arrays are valid", function () {
                it("passes", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makers, takers, market, signedMakers, _a, _b, signedTakers, _c, _d, _e;
                    return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0:
                                makers = sampleMakers;
                                takers = sampleTakers;
                                market = tracer.address;
                                _b = (_a = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makers, trader.address)];
                            case 1: return [4 /*yield*/, _b.apply(_a, [_f.sent()])];
                            case 2:
                                signedMakers = _f.sent();
                                _d = (_c = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takers, trader.address)];
                            case 3: return [4 /*yield*/, _d.apply(_c, [_f.sent()])];
                            case 4:
                                signedTakers = _f.sent();
                                _e = assert_1.default;
                                return [4 /*yield*/, trader.executeTrade(signedMakers, signedTakers, market)];
                            case 5:
                                _e.apply(void 0, [_f.sent()]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("increments nonces correctly", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var makers, takers, market, signedMakers, _a, _b, signedTakers, _c, _d, _e, _f, _g, _h, _j, _k;
                    return __generator(this, function (_l) {
                        switch (_l.label) {
                            case 0:
                                makers = sampleMakers;
                                takers = sampleTakers;
                                market = tracer.address;
                                _b = (_a = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, makers, trader.address)];
                            case 1: return [4 /*yield*/, _b.apply(_a, [_l.sent()])];
                            case 2:
                                signedMakers = _l.sent();
                                _d = (_c = Promise).all;
                                return [4 /*yield*/, Signing_1.signOrders(configure_1.web3, takers, trader.address)];
                            case 3: return [4 /*yield*/, _d.apply(_c, [_l.sent()])];
                            case 4:
                                signedTakers = _l.sent();
                                return [4 /*yield*/, trader.executeTrade(signedMakers, signedTakers, market)];
                            case 5:
                                _l.sent();
                                _f = (_e = assert_1.default).equal;
                                return [4 /*yield*/, trader.nonces(configure_1.accounts[0])];
                            case 6:
                                _f.apply(_e, [_l.sent(), "1"]);
                                _h = (_g = assert_1.default).equal;
                                return [4 /*yield*/, trader.nonces(configure_1.accounts[1])];
                            case 7:
                                _h.apply(_g, [_l.sent(), "1"]);
                                _k = (_j = assert_1.default).equal;
                                return [4 /*yield*/, trader.nonces(configure_1.accounts[2])];
                            case 8:
                                _k.apply(_j, [_l.sent(), "2"]);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        return [2 /*return*/];
    });
}); });
