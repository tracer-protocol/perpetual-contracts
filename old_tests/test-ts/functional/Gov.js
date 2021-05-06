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
describe("Gov", function () { return __awaiter(void 0, void 0, void 0, function () {
    var sampleProposalData, sampleSelfUpdate, gov, govToken, twoDays;
    return __generator(this, function (_a) {
        twoDays = 172800;
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
                    case 0: return [4 /*yield*/, Setup_1.setupGovAndToken(configure_1.accounts)];
                    case 1:
                        deployed = _a.sent();
                        gov = deployed.gov;
                        govToken = deployed.govToken;
                        sampleProposalData = configure_1.web3.eth.abi.encodeFunctionCall({
                            name: "setProposalThreshold",
                            type: "function",
                            inputs: [
                                {
                                    type: "uint96",
                                    name: "newThreshold",
                                },
                            ],
                        }, ['12800']);
                        sampleSelfUpdate = configure_1.web3.eth.abi.encodeFunctionCall({
                            name: "setCoolingOff",
                            type: "function",
                            inputs: [
                                {
                                    type: "uint32",
                                    name: "newCoolingOff",
                                },
                            ],
                        }, ['1'] //set to 1
                        );
                        return [2 /*return*/];
                }
            });
        }); });
        context("Staking", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Users can stake", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var stakedBefore, stakedAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[2])];
                            case 1:
                                stakedBefore = _a.sent();
                                chai_1.assert.equal(stakedBefore.toString(), "0");
                                return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[2])];
                            case 4:
                                stakedAfter = _a.sent();
                                chai_1.assert.equal(stakedAfter.toString(), configure_1.web3.utils.toWei("10").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Users can withdraw their stake", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var stakedBefore, stakedAfter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[2])];
                            case 1:
                                stakedBefore = _a.sent();
                                chai_1.assert.equal(stakedBefore.toString(), "0");
                                return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.withdraw(configure_1.web3.utils.toWei("5"), { from: configure_1.accounts[2] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[2])];
                            case 5:
                                stakedAfter = _a.sent();
                                chai_1.assert.equal(stakedAfter.toString(), configure_1.web3.utils.toWei("5").toString());
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Users cant withdraw more then their stake", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.withdraw(configure_1.web3.utils.toWei("11"), { from: configure_1.accounts[2] }), "SafeMath96: subtraction underflow")];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Proposing", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Stakers can propose function executions", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"))
                                    //Propose to set accounts 1 to receive fees
                                ];
                            case 2:
                                _a.sent();
                                //Propose to set accounts 1 to receive fees
                                return [4 /*yield*/, gov.propose([gov.address], [sampleProposalData])];
                            case 3:
                                //Propose to set accounts 1 to receive fees
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Stakers can propose multiple function executions", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"))
                                    //Propose to set accounts 1 to receive fees
                                ];
                            case 2:
                                _a.sent();
                                //Propose to set accounts 1 to receive fees
                                return [4 /*yield*/, gov.propose([gov.address, gov.address], [sampleProposalData, sampleSelfUpdate])];
                            case 3:
                                //Propose to set accounts 1 to receive fees
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("If a proposal is given with incorrect arity, it should be reverted", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([gov.address, gov.address], [sampleSelfUpdate]), "GOV: Targets != Datas")];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Below proposal threshold", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"), { from: configure_1.accounts[2] })];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("0.1"), { from: configure_1.accounts[2] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([gov.address], [sampleProposalData], { from: configure_1.accounts[2] }), "GOV: Not enough staked")];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("Target length should be within bounds", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: 
                            //Stake
                            return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("10"))];
                            case 1:
                                //Stake
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("10"))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([], []), "GOV: targets = 0")];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose(Array(13).fill(gov.address), Array(13).fill(sampleProposalData)), "GOV: Targets > max")];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/];
            });
        }); });
        context("Voting", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                it("Voting on an already-executed proposal should revert", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var proposalId;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("500"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("500"))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, gov.proposalCounter()];
                            case 5:
                                proposalId = _a.sent();
                                return [4 /*yield*/, gov.propose([gov.address], [sampleProposalData], { from: configure_1.accounts[1] })];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 7:
                                _a.sent();
                                return [4 /*yield*/, gov.voteFor(proposalId, configure_1.web3.utils.toWei("500"))];
                            case 8:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 9:
                                _a.sent();
                                return [4 /*yield*/, gov.execute(proposalId)];
                            case 10:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("5"), { from: configure_1.accounts[2] })];
                            case 11:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("5"), { from: configure_1.accounts[2] })];
                            case 12:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(0, configure_1.web3.utils.toWei("5"), { from: configure_1.accounts[2] }), "GOV: Proposal note voteable")];
                            case 13:
                                _a.sent();
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
