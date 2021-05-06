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
var truffleAssert = require('truffle-assertions');
var artifacts_1 = require("../artifacts");
var Setup_1 = require("../lib/Setup");
var configure_1 = require("../configure");
/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("Insurance", function () { return __awaiter(void 0, void 0, void 0, function () {
    var oneDollar, oneHour, twentyFourHours, perpsFactory, oracle, gov, tracerGovToken, insurance, account, pricing, gasPriceOracle, tokens, tracers, now, sevenDays;
    return __generator(this, function (_a) {
        oneDollar = new test_helpers_1.BN("100000000");
        oneHour = 3600;
        twentyFourHours = 24 * oneHour;
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
            var deployed, tracerAndTokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Setup_1.setupContracts(configure_1.accounts)];
                    case 1:
                        deployed = _a.sent();
                        perpsFactory = deployed.perpsFactory;
                        oracle = deployed.oracle;
                        gov = deployed.gov;
                        insurance = deployed.insurance;
                        account = deployed.account;
                        pricing = deployed.pricing;
                        gasPriceOracle = deployed.gasPriceOracle;
                        tracerGovToken = deployed.govToken;
                        return [4 /*yield*/, Setup_1.deployMultiTracers(configure_1.accounts, perpsFactory, gov, tracerGovToken, insurance, oracle, gasPriceOracle, account, pricing)];
                    case 2:
                        tracerAndTokens = _a.sent();
                        tracers = tracerAndTokens.tracers;
                        tokens = tracerAndTokens.tokens;
                        return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 3:
                        //Set end of test setup times for use throughout tests
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        return [2 /*return*/];
                }
            });
        }); });
        context("Stake", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Allows users to deposit into pools", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                _c.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)];
                            case 2:
                                _c.sent();
                                _b = (_a = chai_1.assert).equal;
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[0])];
                            case 3:
                                _b.apply(_a, [(_c.sent()).toString(), configure_1.web3.utils.toWei("5")]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Allows users to update their stake", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("8"))];
                            case 1:
                                _c.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)];
                            case 2:
                                _c.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("3"), tracers[0].address)];
                            case 3:
                                _c.sent();
                                _b = (_a = chai_1.assert).equal;
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[0])];
                            case 4:
                                _b.apply(_a, [(_c.sent()).toString(), configure_1.web3.utils.toWei("8")]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Gets the correct ratio of tokens on stake", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tracerMarginAddr, tracerBaseToken, poolTokensAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //User stakes in at a 1:1 ratio (MT to PT)
                            return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                //User stakes in at a 1:1 ratio (MT to PT)
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)
                                    //Insurance state: 5 margin tokens, 5 pool tokens
                                ];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, tracers[0].tracerBaseToken()];
                            case 3:
                                tracerMarginAddr = _a.sent();
                                return [4 /*yield*/, artifacts_1.TestToken.at(tracerMarginAddr)];
                            case 4:
                                tracerBaseToken = _a.sent();
                                return [4 /*yield*/, tracerBaseToken.transfer(insurance.address, configure_1.web3.utils.toWei("5"))
                                    //Deposit into insurance pool and sync holdings
                                ];
                            case 5:
                                _a.sent();
                                //Deposit into insurance pool and sync holdings
                                return [4 /*yield*/, account.depositTo(configure_1.web3.utils.toWei("5"), tracers[0].address, insurance.address)];
                            case 6:
                                //Deposit into insurance pool and sync holdings
                                _a.sent();
                                return [4 /*yield*/, insurance.updatePoolAmount(tracers[0].address)
                                    //Insurance state: margin: 10, outstandingPoolTokens: 5. (2:1)
                                ];
                            case 7:
                                _a.sent();
                                //Insurance state: margin: 10, outstandingPoolTokens: 5. (2:1)
                                return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[1] })];
                            case 8:
                                //Insurance state: margin: 10, outstandingPoolTokens: 5. (2:1)
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("10"), tracers[0].address, { from: configure_1.accounts[1] })];
                            case 9:
                                _a.sent();
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[1])
                                    // The ratio of MT:PT is 2:1. Therefore, staking 10 tokens should give 5 pool tokens
                                ];
                            case 10:
                                poolTokensAfter = _a.sent();
                                // The ratio of MT:PT is 2:1. Therefore, staking 10 tokens should give 5 pool tokens
                                chai_1.assert.equal(poolTokensAfter.toString(), configure_1.web3.utils.toWei("5"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Withdraw", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Allows users to withdraw from pools", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                _c.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)];
                            case 2:
                                _c.sent();
                                return [4 /*yield*/, insurance.withdraw(configure_1.web3.utils.toWei("5"), tracers[0].address)];
                            case 3:
                                _c.sent();
                                _b = (_a = chai_1.assert).equal;
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[0])];
                            case 4:
                                _b.apply(_a, [(_c.sent()).toString(), configure_1.web3.utils.toWei("0")]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Allows users to partially withdraw from pools", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                _c.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)];
                            case 2:
                                _c.sent();
                                return [4 /*yield*/, insurance.withdraw(configure_1.web3.utils.toWei("2"), tracers[0].address)];
                            case 3:
                                _c.sent();
                                _b = (_a = chai_1.assert).equal;
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[0])];
                            case 4:
                                _b.apply(_a, [(_c.sent()).toString(), configure_1.web3.utils.toWei("3")]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Gets the correct ratio of tokens on withdraw", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tracerMarginAddr, tracerBaseToken, marginBefore, poolTokensBefore, marginAfter, poolTokensAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //User stakes in at a 1:1 ratio (MT to PT)
                            return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                //User stakes in at a 1:1 ratio (MT to PT)
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)
                                    //Insurance state: 5 margin tokens, 5 pool tokens
                                ];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, tracers[0].tracerBaseToken()];
                            case 3:
                                tracerMarginAddr = _a.sent();
                                return [4 /*yield*/, artifacts_1.TestToken.at(tracerMarginAddr)
                                    //Sync the insurance pool with its margin holding
                                ];
                            case 4:
                                tracerBaseToken = _a.sent();
                                //Sync the insurance pool with its margin holding
                                return [4 /*yield*/, account.depositTo(configure_1.web3.utils.toWei("5"), tracers[0].address, insurance.address)];
                            case 5:
                                //Sync the insurance pool with its margin holding
                                _a.sent();
                                return [4 /*yield*/, insurance.updatePoolAmount(tracers[0].address)
                                    //Insurance state: margin: 10, outstandingPoolTokens: 5
                                    //each pool token is withdrawable for 2 margin tokens
                                ];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, tracerBaseToken.balanceOf(configure_1.accounts[0])];
                            case 7:
                                marginBefore = _a.sent();
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[0])
                                    //Withdraw all pool tokens. Exchanges 5 pool tokens for 10 margin tokens
                                ];
                            case 8:
                                poolTokensBefore = _a.sent();
                                //Withdraw all pool tokens. Exchanges 5 pool tokens for 10 margin tokens
                                return [4 /*yield*/, insurance.withdraw(poolTokensBefore, tracers[0].address)];
                            case 9:
                                //Withdraw all pool tokens. Exchanges 5 pool tokens for 10 margin tokens
                                _a.sent();
                                return [4 /*yield*/, tracerBaseToken.balanceOf(configure_1.accounts[0])];
                            case 10:
                                marginAfter = _a.sent();
                                return [4 /*yield*/, insurance.getPoolUserBalance(tracers[0].address, configure_1.accounts[0])];
                            case 11:
                                poolTokensAfter = _a.sent();
                                chai_1.assert.equal((marginAfter.sub(marginBefore)).toString(), configure_1.web3.utils.toWei("10"));
                                chai_1.assert.equal(poolTokensAfter.toString(), configure_1.web3.utils.toWei("0"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Rewards", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Allows rewards to be deposited to a pool and be claimed", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var rewards, balanceBefore, poolTokenAddr, poolToken, balanceAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)
                                    //Send rewards to the pool
                                ];
                            case 2:
                                _a.sent();
                                //Send rewards to the pool
                                return [4 /*yield*/, tracerGovToken.transfer(insurance.address, configure_1.web3.utils.toWei("50"))];
                            case 3:
                                //Send rewards to the pool
                                _a.sent();
                                return [4 /*yield*/, insurance.reward(configure_1.web3.utils.toWei("50"), tracers[0].address)
                                    //Check that pool has rewards to claim
                                ];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, insurance.getRewardsPerToken(tracers[0].address)
                                    //5 tokens staked and a reward of 50 = 10 rewards per token staked
                                ];
                            case 5:
                                rewards = _a.sent();
                                //5 tokens staked and a reward of 50 = 10 rewards per token staked
                                chai_1.assert.equal(rewards.toString(), configure_1.web3.utils.toWei("10"));
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])
                                    //await insurance.claim(tracers[0].address)
                                ];
                            case 6:
                                balanceBefore = _a.sent();
                                return [4 /*yield*/, insurance.getPoolToken(tracers[0].address)];
                            case 7:
                                poolTokenAddr = _a.sent();
                                return [4 /*yield*/, artifacts_1.InsurancePoolToken.at(poolTokenAddr)];
                            case 8:
                                poolToken = _a.sent();
                                return [4 /*yield*/, poolToken.withdrawFunds()];
                            case 9:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 10:
                                balanceAfter = _a.sent();
                                chai_1.assert.equal(balanceAfter.sub(balanceBefore).toString(), configure_1.web3.utils.toWei("50").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Stops users claiming a reward multiple times", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var poolTokenAddr, poolToken, balanceBefore, balanceAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("5"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)
                                    //Send rewards to the pool
                                ];
                            case 2:
                                _a.sent();
                                //Send rewards to the pool
                                return [4 /*yield*/, tracerGovToken.transfer(insurance.address, configure_1.web3.utils.toWei("50"))];
                            case 3:
                                //Send rewards to the pool
                                _a.sent();
                                return [4 /*yield*/, insurance.reward(configure_1.web3.utils.toWei("50"), tracers[0].address)
                                    //Claim reward
                                ];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, insurance.getPoolToken(tracers[0].address)];
                            case 5:
                                poolTokenAddr = _a.sent();
                                return [4 /*yield*/, artifacts_1.InsurancePoolToken.at(poolTokenAddr)];
                            case 6:
                                poolToken = _a.sent();
                                return [4 /*yield*/, poolToken.withdrawFunds()
                                    //Record balance before attempted next claim
                                ];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 8:
                                balanceBefore = _a.sent();
                                return [4 /*yield*/, poolToken.withdrawFunds()];
                            case 9:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 10:
                                balanceAfter = _a.sent();
                                chai_1.assert.equal(balanceAfter.sub(balanceBefore).toString(), configure_1.web3.utils.toWei("0").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Transferring pool tokens claims any outstanding rewards", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balanceBefore, poolTokenAddr, poolToken, balanceAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("50"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("50"), tracers[0].address)
                                    //Send rewards to the pool
                                ];
                            case 2:
                                _a.sent();
                                //Send rewards to the pool
                                return [4 /*yield*/, tracerGovToken.transfer(insurance.address, configure_1.web3.utils.toWei("50"))];
                            case 3:
                                //Send rewards to the pool
                                _a.sent();
                                return [4 /*yield*/, insurance.reward(configure_1.web3.utils.toWei("50"), tracers[0].address)
                                    //Transfer
                                ];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 5:
                                balanceBefore = _a.sent();
                                return [4 /*yield*/, insurance.getPoolToken(tracers[0].address)];
                            case 6:
                                poolTokenAddr = _a.sent();
                                return [4 /*yield*/, artifacts_1.InsurancePoolToken.at(poolTokenAddr)];
                            case 7:
                                poolToken = _a.sent();
                                return [4 /*yield*/, poolToken.transfer(configure_1.accounts[0], configure_1.web3.utils.toWei("50"))
                                    //Check balance has updated
                                ];
                            case 8:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 9:
                                balanceAfter = _a.sent();
                                chai_1.assert.equal(balanceAfter.sub(balanceBefore).toString(), configure_1.web3.utils.toWei("50").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Staking more and withdrawing claims rewards", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var balanceBefore, balanceAfter, balanceBeforeWithdraw, balanceAfterWithdraw;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("8"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("5"), tracers[0].address)
                                    //Send rewards to the pool
                                ];
                            case 2:
                                _a.sent();
                                //Send rewards to the pool
                                return [4 /*yield*/, tracerGovToken.transfer(insurance.address, configure_1.web3.utils.toWei("50"))];
                            case 3:
                                //Send rewards to the pool
                                _a.sent();
                                return [4 /*yield*/, insurance.reward(configure_1.web3.utils.toWei("50"), tracers[0].address)];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])
                                    //Add to stake which will claim outstanding rewards first
                                ];
                            case 5:
                                balanceBefore = _a.sent();
                                //Add to stake which will claim outstanding rewards first
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("3"), tracers[0].address)];
                            case 6:
                                //Add to stake which will claim outstanding rewards first
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 7:
                                balanceAfter = _a.sent();
                                chai_1.assert.equal(balanceAfter.sub(balanceBefore).toString(), configure_1.web3.utils.toWei("50").toString());
                                //Add more rewards in
                                return [4 /*yield*/, tracerGovToken.transfer(insurance.address, configure_1.web3.utils.toWei("50"))];
                            case 8:
                                //Add more rewards in
                                _a.sent();
                                return [4 /*yield*/, insurance.reward(configure_1.web3.utils.toWei("50"), tracers[0].address)
                                    //Withdraw
                                ];
                            case 9:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 10:
                                balanceBeforeWithdraw = _a.sent();
                                return [4 /*yield*/, insurance.withdraw(configure_1.web3.utils.toWei("8"), tracers[0].address)];
                            case 11:
                                _a.sent();
                                return [4 /*yield*/, tracerGovToken.balanceOf(configure_1.accounts[0])];
                            case 12:
                                balanceAfterWithdraw = _a.sent();
                                chai_1.assert.equal(balanceAfterWithdraw.sub(balanceBeforeWithdraw).toString(), configure_1.web3.utils.toWei("50").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        it("Correctly records the insurance fund variables (target and funding rate)", function () { return __awaiter(void 0, void 0, void 0, function () {
            var tracer, lev, target, holdings, rate, actualRate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tracer = tracers[0];
                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[1] })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[2] })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("1000"), tracer.address, { from: configure_1.accounts[3] })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, oracle.setPrice(oneDollar)
                            //Long order for 20 TEST/USD at a price of $1 (2x leverage)
                            //Leveraged notional value = $10
                        ];
                    case 5:
                        _a.sent();
                        //Long order for 20 TEST/USD at a price of $1 (2x leverage)
                        //Leveraged notional value = $10
                        return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("10000"), oneDollar, true, sevenDays)
                            //Short order for 20 TEST/USD against placed order
                        ];
                    case 6:
                        //Long order for 20 TEST/USD at a price of $1 (2x leverage)
                        //Leveraged notional value = $10
                        _a.sent();
                        //Short order for 20 TEST/USD against placed order
                        return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("10000"), { from: configure_1.accounts[1] })
                            //Leveraged notional value = $180
                        ];
                    case 7:
                        //Short order for 20 TEST/USD against placed order
                        _a.sent();
                        return [4 /*yield*/, tracer.leveragedNotionalValue()];
                    case 8:
                        lev = _a.sent();
                        chai_1.assert.equal(lev.toString(), configure_1.web3.utils.toWei("18000"));
                        return [4 /*yield*/, insurance.getPoolTarget(tracer.address)];
                    case 9:
                        target = _a.sent();
                        chai_1.assert.equal(target.toString(), configure_1.web3.utils.toWei("180")); //1% of 18000
                        return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                    case 10:
                        holdings = _a.sent();
                        rate = Math.max(0, new test_helpers_1.BN("3652300").mul(target.sub(holdings)).div(lev));
                        return [4 /*yield*/, insurance.getPoolFundingRate(tracer.address)];
                    case 11:
                        actualRate = _a.sent();
                        chai_1.assert.equal(rate.toString(), actualRate.toString());
                        return [2 /*return*/];
                }
            });
        }); });
        context("Withdrawing earned insurance fees", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Earned insurance fees are deposited back into the pool", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tracer, poolHoldings;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                tracer = tracers[0];
                                //Setup leveraged positions
                                return [4 /*yield*/, oracle.setPrice(oneDollar)];
                            case 1:
                                //Setup leveraged positions
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
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 5:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("2000"), oneDollar, true, sevenDays)
                                    //Short order for 5 TEST/USD against placed order
                                ];
                            case 6:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                //Short order for 5 TEST/USD against placed order
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("2000"), { from: configure_1.accounts[1] })
                                    //Total Leveraged Value = $20
                                    //Time travel a day
                                ];
                            case 7:
                                //Short order for 5 TEST/USD against placed order
                                _a.sent();
                                //Total Leveraged Value = $20
                                //Time travel a day
                                return [4 /*yield*/, test_helpers_1.time.increase(twentyFourHours)
                                    //Place order to trigger updates in contract pricing for the 24 hour period
                                ];
                            case 8:
                                //Total Leveraged Value = $20
                                //Time travel a day
                                _a.sent();
                                //Place order to trigger updates in contract pricing for the 24 hour period
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("1000"), oneDollar, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 9:
                                //Place order to trigger updates in contract pricing for the 24 hour period
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("1000"), { from: configure_1.accounts[3] })
                                    //Total leveraged value = $40
                                    //Funding rate should now be 0 as price is the same
                                    //Insurance funding rate should be
                                    // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
                                    // = 0.000036523% --> including 1000000000 multiply factor = 36523
                                ];
                            case 10:
                                _a.sent();
                                //Total leveraged value = $40
                                //Funding rate should now be 0 as price is the same
                                //Insurance funding rate should be
                                // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
                                // = 0.000036523% --> including 1000000000 multiply factor = 36523
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[0])];
                            case 11:
                                //Total leveraged value = $40
                                //Funding rate should now be 0 as price is the same
                                //Insurance funding rate should be
                                // max(0 , 0.0036523 * (0.01 * 40 - 0) / 40)
                                // = 0.000036523% --> including 1000000000 multiply factor = 36523
                                _a.sent();
                                return [4 /*yield*/, tracer.settle(configure_1.accounts[1])
                                    //00036523 * 2 = 0.00073046
                                    //Pull fees into insurance pool
                                ];
                            case 12:
                                _a.sent();
                                //00036523 * 2 = 0.00073046
                                //Pull fees into insurance pool
                                return [4 /*yield*/, insurance.updatePoolAmount(tracer.address)];
                            case 13:
                                //00036523 * 2 = 0.00073046
                                //Pull fees into insurance pool
                                _a.sent();
                                return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                            case 14:
                                poolHoldings = _a.sent();
                                chai_1.assert.equal(poolHoldings.toString(), configure_1.web3.utils.toWei("0.073046"));
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Liquidation", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Keeps one token in the insurance pool when pool is completely drained", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var tracer, newPrice, insuranceBalance;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                tracer = tracers[0];
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("500"), tracer.address, { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, tokens[0].approve(insurance.address, configure_1.web3.utils.toWei("2000"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, insurance.stake(configure_1.web3.utils.toWei("250"), tracer.address)
                                    //Long order for 5 TEST/USD at a price of $1
                                ];
                            case 4:
                                _a.sent();
                                //Long order for 5 TEST/USD at a price of $1
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("500"), oneDollar, true, sevenDays)];
                            case 5:
                                //Long order for 5 TEST/USD at a price of $1
                                _a.sent();
                                return [4 /*yield*/, oracle.setPrice(oneDollar)];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(1, configure_1.web3.utils.toWei("500"), { from: configure_1.accounts[1] })
                                    //Price increases 95%, short order now is under margin requirements
                                    //$1 + 95% = 1.95
                                    //margin = (1000 - 42.8) / (500 * 1.80) - 1 = 6.34%
                                ];
                            case 7:
                                _a.sent();
                                //Price increases 95%, short order now is under margin requirements
                                //$1 + 95% = 1.95
                                //margin = (1000 - 42.8) / (500 * 1.80) - 1 = 6.34%
                                return [4 /*yield*/, oracle.setPrice(new test_helpers_1.BN("195000000"))
                                    //Third party liquidates and takes on the short position
                                ];
                            case 8:
                                //Price increases 95%, short order now is under margin requirements
                                //$1 + 95% = 1.95
                                //margin = (1000 - 42.8) / (500 * 1.80) - 1 = 6.34%
                                _a.sent();
                                //Third party liquidates and takes on the short position
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[2] })];
                            case 9:
                                //Third party liquidates and takes on the short position
                                _a.sent();
                                return [4 /*yield*/, account.deposit(configure_1.web3.utils.toWei("750"), tracer.address, { from: configure_1.accounts[3] })];
                            case 10:
                                _a.sent();
                                return [4 /*yield*/, account.liquidate(configure_1.web3.utils.toWei("500"), configure_1.accounts[1], tracer.address, { from: configure_1.accounts[2] })
                                    //Before liquidator sells, price jumps, causing slippage on a short position
                                ];
                            case 11:
                                _a.sent();
                                newPrice = new test_helpers_1.BN("295000000");
                                return [4 /*yield*/, oracle.setPrice(newPrice)
                                    //Liquidator sells his positions across multiple orders, and as maker and taker
                                ];
                            case 12:
                                _a.sent();
                                //Liquidator sells his positions across multiple orders, and as maker and taker
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), newPrice, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 13:
                                //Liquidator sells his positions across multiple orders, and as maker and taker
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(2, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[3] })];
                            case 14:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("100"), newPrice, false, sevenDays, {
                                        from: configure_1.accounts[3],
                                    })];
                            case 15:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(3, configure_1.web3.utils.toWei("100"), { from: configure_1.accounts[2] })];
                            case 16:
                                _a.sent();
                                return [4 /*yield*/, tracer.makeOrder(configure_1.web3.utils.toWei("200"), newPrice, true, sevenDays, { from: configure_1.accounts[2] })];
                            case 17:
                                _a.sent();
                                return [4 /*yield*/, tracer.takeOrder(4, configure_1.web3.utils.toWei("200"), { from: configure_1.accounts[3] })];
                            case 18:
                                _a.sent();
                                return [4 /*yield*/, account.claimReceipts(0, [2, 3, 4], tracer.address, { from: configure_1.accounts[2] })];
                            case 19:
                                _a.sent();
                                return [4 /*yield*/, insurance.getPoolHoldings(tracer.address)];
                            case 20:
                                insuranceBalance = _a.sent();
                                chai_1.assert.equal(insuranceBalance.toString(), configure_1.web3.utils.toWei("1"));
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
