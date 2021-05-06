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
var configure_1 = require("../configure");
/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Unit tests: Insurance", function () { return __awaiter(void 0, void 0, void 0, function () {
    var insurance, tracer, testToken;
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
            var deployed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Setup_1.setupContractsAndTracer(configure_1.accounts)];
                    case 1:
                        deployed = _a.sent();
                        insurance = deployed.insurance;
                        tracer = deployed.perps;
                        testToken = deployed.testToken;
                        return [2 /*return*/];
                }
            });
        }); });
        describe("stake", function () {
            context("When the tracer market is not supported", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(insurance.stake(configure_1.web3.utils.toWei("5"), configure_1.accounts[0]), "INS: Tracer not supported")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When the user does not hold enough margin tokens", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(insurance.stake(configure_1.web3.utils.toWei("10000000"), tracer.address), "ERC20: transfer amount exceeds balance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe("withdraw", function () {
            context("Withdrawing 0 or less tokens", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(insurance.withdraw(configure_1.web3.utils.toWei("0"), tracer.address), "INS: amount <= 0")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("Withdrawing more than the users pool token balance", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(insurance.withdraw(configure_1.web3.utils.toWei("1"), tracer.address), "INS: balance < amount")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe("updatePoolAmount", function () {
            it("Updates if the insurance contract does not have a account contract balance", function () { return __awaiter(void 0, void 0, void 0, function () {
                var balanceBefore, balanceAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                        case 1:
                            balanceBefore = _a.sent();
                            return [4 /*yield*/, testToken.transfer(insurance.address, configure_1.web3.utils.toWei("5"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, insurance.updatePoolAmount(tracer.address)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                        case 4:
                            balanceAfter = _a.sent();
                            assert_1.default.strict(balanceAfter.sub(balanceBefore), configure_1.web3.utils.toWei("5"));
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("reward", function () {
            context("When not enough gov tokens are held", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(insurance.reward(configure_1.web3.utils.toWei("50"), tracer.address), "INS: amount > rewards")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe("deployInsurancePool", function () {
            context("When a pool already exists", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(insurance.deployInsurancePool(tracer.address), "INS: pool already exists")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        return [2 /*return*/];
    });
}); });
