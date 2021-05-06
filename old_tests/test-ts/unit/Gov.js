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
var configure_1 = require("../configure");
describe("Gov: unit tests", function () { return __awaiter(void 0, void 0, void 0, function () {
    var twoDays, sevenDays, maxLeverage, sampleProposalData, setCoolingOffData, setWarmUpData, gov, govToken, proposalNum;
    return __generator(this, function (_a) {
        twoDays = 172800;
        sevenDays = 604800;
        maxLeverage = 12500;
        proposalNum = 0;
        before(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, configure_1.configure()];
                    case 1:
                        _a.sent();
                        sampleProposalData = configure_1.web3.eth.abi.encodeFunctionCall({
                            name: "setFeeReceiver",
                            type: "function",
                            inputs: [
                                {
                                    type: "address",
                                    name: "receiver",
                                },
                            ],
                        }, [configure_1.accounts[1]]);
                        setCoolingOffData = configure_1.web3.eth.abi.encodeFunctionCall({
                            name: "setCoolingOff",
                            type: "function",
                            inputs: [
                                {
                                    type: "uint32",
                                    name: "newProposalDuration",
                                },
                            ],
                        }, ['1']);
                        setWarmUpData = configure_1.web3.eth.abi.encodeFunctionCall({
                            name: "setWarmUp",
                            type: "function",
                            inputs: [
                                {
                                    type: "uint32",
                                    name: "newWarmup",
                                },
                            ],
                        }, ['1']);
                        return [2 /*return*/];
                }
            });
        }); });
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, artifacts_1.TestToken.new(test_helpers_1.ether("1000000"))]; //1million
                    case 1:
                        //Setup all contracts
                        govToken = _a.sent(); //1million
                        return [4 /*yield*/, govToken.transfer(configure_1.accounts[1], test_helpers_1.ether("100"))]; //100
                    case 2:
                        _a.sent(); //100
                        return [4 /*yield*/, govToken.transfer(configure_1.accounts[2], test_helpers_1.ether("100"))];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, govToken.transfer(configure_1.accounts[3], test_helpers_1.ether("100"))];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, artifacts_1.Gov.new(govToken.address)];
                    case 5:
                        gov = _a.sent();
                        proposalNum = 0;
                        return [2 /*return*/];
                }
            });
        }); });
        describe("stake", function () {
            it("reverts if gov is not approved to transfer", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.stake(test_helpers_1.ether("100"), { from: configure_1.accounts[1] }), "ERC20: transfer amount exceeds allowance")];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if staking more than tokens held", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("100"), { from: configure_1.accounts[1] })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.stake(test_helpers_1.ether("101"), { from: configure_1.accounts[1] }), "ERC20: transfer amount exceeds balance")];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if stake amount would overflow", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.stake(new test_helpers_1.BN("79228162514264337593543950335")), // MAX_UINT95 - 1
                                "SafeMath96: addition overflow")];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("starts accounts with 0 staked", function () { return __awaiter(void 0, void 0, void 0, function () {
                var staked;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[2])];
                        case 1:
                            staked = _a.sent();
                            chai_1.assert.isTrue(staked.eq(new test_helpers_1.BN("0")));
                            return [2 /*return*/];
                    }
                });
            }); });
            it("increases totalStaked by the amount staked", function () { return __awaiter(void 0, void 0, void 0, function () {
                var stakedBefore, stakedAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.totalStaked()];
                        case 2: return [4 /*yield*/, _a.sent()];
                        case 3:
                            stakedBefore = _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.totalStaked()];
                        case 5:
                            stakedAfter = _a.sent();
                            chai_1.assert.isTrue(stakedAfter.sub(stakedBefore).eq(test_helpers_1.ether("50")));
                            return [2 /*return*/];
                    }
                });
            }); });
            it("transfers the staked tokens to the Gov contract", function () { return __awaiter(void 0, void 0, void 0, function () {
                var stakedBefore, stakedAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, govToken.balanceOf(gov.address)];
                        case 2:
                            stakedBefore = _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, govToken.balanceOf(gov.address)];
                        case 4:
                            stakedAfter = _a.sent();
                            chai_1.assert.isTrue(stakedAfter.sub(stakedBefore).eq(test_helpers_1.ether("50")));
                            return [2 /*return*/];
                    }
                });
            }); });
            it("updates the staked amount of the user", function () { return __awaiter(void 0, void 0, void 0, function () {
                var stakedBefore, stakedAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                        case 2:
                            stakedBefore = _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                        case 4:
                            stakedAfter = _a.sent();
                            chai_1.assert.isTrue(stakedAfter.sub(stakedBefore).eq(test_helpers_1.ether("50")));
                            return [2 /*return*/];
                    }
                });
            }); });
            it("uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                var receipt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            receipt = (_a.sent()).receipt;
                            chai_1.assert.isAtMost(receipt.gasUsed, 107000); //106500
                            return [2 /*return*/];
                    }
                });
            }); });
            it("uses an expected amount of gas for additional stakes", function () { return __awaiter(void 0, void 0, void 0, function () {
                var receipt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("25"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("25"))];
                        case 3:
                            receipt = (_a.sent()).receipt;
                            chai_1.assert.isAtMost(receipt.gasUsed, 62000);
                            return [2 /*return*/];
                    }
                });
            }); });
            context("when delegating votes", function () {
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.constants.MAX_UINT256)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("25"))];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("adds to the staker's stakedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _b = (_a = chai_1.assert).isTrue;
                                _d = (_c = test_helpers_1.ether("25")).eq;
                                return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                            case 1:
                                _b.apply(_a, [_d.apply(_c, [_e.sent()])]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("adds to the delegated user's delegatedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _b = (_a = chai_1.assert).isTrue;
                                _d = (_c = test_helpers_1.ether("25")).eq;
                                return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                            case 1:
                                _b.apply(_a, [_d.apply(_c, [_e.sent()])]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("additional staked amounts are added to the staker's stakedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    return __generator(this, function (_j) {
                        switch (_j.label) {
                            case 0:
                                _b = (_a = chai_1.assert).isTrue;
                                _d = (_c = test_helpers_1.ether("25")).eq;
                                return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                            case 1:
                                _b.apply(_a, [_d.apply(_c, [_j.sent()])]);
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("25"))];
                            case 2:
                                _j.sent();
                                _f = (_e = chai_1.assert).isTrue;
                                _h = (_g = test_helpers_1.ether("50")).eq;
                                return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                            case 3:
                                _f.apply(_e, [_h.apply(_g, [_j.sent()])]);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("additional staked amounts are added to the delegated user's delegatedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d, _e, _f, _g, _h;
                    return __generator(this, function (_j) {
                        switch (_j.label) {
                            case 0:
                                _b = (_a = chai_1.assert).isTrue;
                                _d = (_c = test_helpers_1.ether("25")).eq;
                                return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                            case 1:
                                _b.apply(_a, [_d.apply(_c, [_j.sent()])]);
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("25"))];
                            case 2:
                                _j.sent();
                                _f = (_e = chai_1.assert).isTrue;
                                _h = (_g = test_helpers_1.ether("50")).eq;
                                return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                            case 3:
                                _f.apply(_e, [_h.apply(_g, [_j.sent()])]);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe("withdraw", function () {
            context("after staking", function () {
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if withdrawing more than tokens staked", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.withdraw(test_helpers_1.ether("51")), "SafeMath96: subtraction underflow")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("updates the staked amount of the user", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var staked;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                            case 2:
                                staked = _a.sent();
                                chai_1.assert.isTrue(staked.eq(new test_helpers_1.BN("0")));
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var receipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("50"))];
                            case 1:
                                receipt = (_a.sent()).receipt;
                                chai_1.assert.isAtMost(receipt.gasUsed, 28000); //27000
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("uses an expected amount of gas for additional withdrawals", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var receipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                            case 2:
                                receipt = (_a.sent()).receipt;
                                chai_1.assert.isAtMost(receipt.gasUsed, 28000);
                                return [2 /*return*/];
                        }
                    });
                }); });
                context("when delegating votes", function () {
                    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, test_helpers_1.time.increase(sevenDays + 1)];
                                case 3:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    it("removes from the staker's stakedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var staked, _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0: return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                                case 1:
                                    staked = _e.sent();
                                    return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                                case 2:
                                    _e.sent();
                                    _b = (_a = chai_1.assert).isTrue;
                                    _d = (_c = test_helpers_1.ether("25")).eq;
                                    return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                                case 3:
                                    _b.apply(_a, [_d.apply(_c, [_e.sent()])]);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    it("removes from the delegated user's delegatedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0: return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                                case 1:
                                    _e.sent();
                                    _b = (_a = chai_1.assert).isTrue;
                                    _d = (_c = test_helpers_1.ether("25")).eq;
                                    return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                                case 2:
                                    _b.apply(_a, [_d.apply(_c, [_e.sent()])]);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    it("additional withdrawn amounts are removed from the staker's stakedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0: return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                                case 1:
                                    _j.sent();
                                    _b = (_a = chai_1.assert).isTrue;
                                    _d = (_c = test_helpers_1.ether("25")).eq;
                                    return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                                case 2:
                                    _b.apply(_a, [_d.apply(_c, [_j.sent()])]);
                                    return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                                case 3:
                                    _j.sent();
                                    _f = (_e = chai_1.assert).isTrue;
                                    _h = (_g = test_helpers_1.ether("0")).eq;
                                    return [4 /*yield*/, gov.getUserStaked(configure_1.accounts[0])];
                                case 4:
                                    _f.apply(_e, [_h.apply(_g, [_j.sent()])]);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    it("additional withdrawn amounts are removed from the delegated user's delegatedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0: return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                                case 1:
                                    _j.sent();
                                    _b = (_a = chai_1.assert).isTrue;
                                    _d = (_c = test_helpers_1.ether("25")).eq;
                                    return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                                case 2:
                                    _b.apply(_a, [_d.apply(_c, [_j.sent()])]);
                                    return [4 /*yield*/, gov.withdraw(test_helpers_1.ether("25"))];
                                case 3:
                                    _j.sent();
                                    _f = (_e = chai_1.assert).isTrue;
                                    _h = (_g = test_helpers_1.ether("0")).eq;
                                    return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                                case 4:
                                    _f.apply(_e, [_h.apply(_g, [_j.sent()])]);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                });
            });
        });
        describe("propose", function () {
            it("reverts if the proposer does not have enough staked", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("1"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("1"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([configure_1.accounts[0]], [sampleProposalData]), "GOV: Not enough staked")];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            context("with enough staked", function () {
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if no target is specified", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([], [sampleProposalData]), "GOV: targets = 0")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if GOV: Targets > max", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                    configure_1.accounts[0],
                                ], [sampleProposalData]), "GOV: Targets > max")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if argument length mismatch", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([configure_1.accounts[0], configure_1.accounts[0], configure_1.accounts[0], configure_1.accounts[0]], [sampleProposalData, sampleProposalData]), "GOV: Targets != Datas")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("stores the successful proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var proposal, staked, proposedState;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.propose([configure_1.accounts[0]], [sampleProposalData])];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.proposals(0)];
                            case 2:
                                proposal = _a.sent();
                                return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[0])
                                    //@ts-ignore
                                ];
                            case 3:
                                staked = _a.sent();
                                //@ts-ignore
                                chai_1.assert.equal(configure_1.accounts[0], proposal.proposer);
                                //@ts-ignore
                                chai_1.assert.isTrue(proposal.yes.eq(staked));
                                //@ts-ignore
                                chai_1.assert.equal(0, proposal.no);
                                //@ts-ignore
                                chai_1.assert.equal(0, proposal.passTime);
                                proposedState = 0;
                                //@ts-ignore
                                chai_1.assert.equal(proposedState, proposal.state);
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("emits a ProposalCreated event", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var receipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.propose([configure_1.accounts[0]], [sampleProposalData])];
                            case 1:
                                receipt = (_a.sent()).receipt;
                                test_helpers_1.expectEvent(receipt, "ProposalCreated", {
                                    proposalId: "0",
                                });
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var receipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.propose([configure_1.accounts[0]], [sampleProposalData])];
                            case 1:
                                receipt = (_a.sent()).receipt;
                                chai_1.assert.isAtMost(receipt.gasUsed, 275000);
                                return [2 /*return*/];
                        }
                    });
                }); });
                context("when delegating votes", function () {
                    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                                case 2:
                                    _a.sent();
                                    return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                                case 3:
                                    _a.sent();
                                    return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                                case 4:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    it("creates the proposal with the staked and delegated amount counted", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var proposal, staked, proposedState;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, gov.propose([configure_1.accounts[0]], [sampleProposalData], { from: configure_1.accounts[1] })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, gov.proposals(0)];
                                case 2:
                                    proposal = _a.sent();
                                    return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])
                                        //@ts-ignore
                                    ];
                                case 3:
                                    staked = _a.sent();
                                    //@ts-ignore
                                    chai_1.assert.equal(configure_1.accounts[1], proposal.proposer);
                                    //@ts-ignore
                                    chai_1.assert.isTrue(proposal.yes.eq(staked));
                                    //@ts-ignore
                                    chai_1.assert.equal(0, proposal.no);
                                    //@ts-ignore
                                    chai_1.assert.equal(0, proposal.passTime);
                                    proposedState = 0;
                                    //@ts-ignore
                                    chai_1.assert.equal(proposedState, proposal.state);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                });
            });
        });
        describe("vote", function () {
            beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[2] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[3] })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 6:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[2] })];
                        case 7:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[3] })];
                        case 8:
                            _a.sent();
                            return [4 /*yield*/, gov.propose([configure_1.accounts[0]], [sampleProposalData])];
                        case 9:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposal hasn't started", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] }), "GOV: Warming up")];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            context("after the proposal is ready", function () {
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if called by the proposer", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(proposalNum, test_helpers_1.ether("50")), "GOV: Proposer cant vote")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if proposal was passed", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(0, test_helpers_1.ether("50"), { from: configure_1.accounts[2] }), "GOV: Proposal note voteable")];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if proposal was rejected", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.voteAgainst(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.voteAgainst(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[2] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteAgainst(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[3] }), "GOV: Proposal note voteable")];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if proposal was executed", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.voteFor(0, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.execute(0)];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[2] }), "GOV: Proposal note voteable")];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts if voting with more tokens than staked", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(proposalNum, test_helpers_1.ether("51"), { from: configure_1.accounts[1] }), "GOV: Vote amount > staked amount")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("allows voting both yes and no", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.voteAgainst(proposalNum, test_helpers_1.ether("25"), { from: configure_1.accounts[1] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("25"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("vote locks the caller", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[0] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[0], { from: configure_1.accounts[1] }), "GOVD: Vote locked")];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var receipt;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 1:
                                receipt = (_a.sent()).receipt;
                                chai_1.assert.isAtMost(receipt.gasUsed, 121000);
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe("delegate", function () {
            it("reverts if caller is not a staker", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[1]), "GOV: Only staker")];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the to address is not accepting delegates", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[1]), "GOVD: Delegate not accepting")];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if GOVD: Vote locked", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.removeDelegate()]; // with no delegate set, this basically just locks an account
                        case 1:
                            _a.sent(); // with no delegate set, this basically just locks an account
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[1]), "GOVD: Vote locked")];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if a delegate is already set", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(sevenDays + 1)];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[1]), "GOV: Only staker")];
                        case 6:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if tokens are already delegated to the caller", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[0] })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 6:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 7:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[0], { from: configure_1.accounts[1] }), "GOVD: Already a delegate")];
                        case 8:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if trying to propose when delegating", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.propose([configure_1.accounts[0]], [sampleProposalData]), "GOV: Only staker")];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if trying to vote when delegating", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 6:
                            _a.sent();
                            return [4 /*yield*/, gov.propose([configure_1.accounts[0]], [sampleProposalData], { from: configure_1.accounts[1] })];
                        case 7:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.voteFor(proposalNum, test_helpers_1.ether("50")), "GOV: Only staker")];
                        case 8:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("counts the caller's stakedAmount to the delegate", function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _e.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _e.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _e.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _e.sent();
                            _b = (_a = chai_1.assert).isTrue;
                            _d = (_c = test_helpers_1.ether("50")).eq;
                            return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                        case 5:
                            _b.apply(_a, [_d.apply(_c, [_e.sent()])]);
                            return [2 /*return*/];
                    }
                });
            }); });
            it("locks the caller's tokens", function () { return __awaiter(void 0, void 0, void 0, function () {
                var staker;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.stakers(configure_1.accounts[0])
                                //@ts-ignore
                            ];
                        case 5:
                            staker = _a.sent();
                            //@ts-ignore
                            chai_1.assert.isAbove(Number(staker.lockedUntil), 0);
                            return [2 /*return*/];
                    }
                });
            }); });
            it("sets the caller's delegate", function () { return __awaiter(void 0, void 0, void 0, function () {
                var staker;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.stakers(configure_1.accounts[0])
                                //@ts-ignore
                            ];
                        case 5:
                            staker = _a.sent();
                            //@ts-ignore
                            chai_1.assert.equal(staker.delegate, configure_1.accounts[1]);
                            return [2 /*return*/];
                    }
                });
            }); });
            it("adds to the delegate's amount", function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _e.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _e.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _e.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _e.sent();
                            _b = (_a = chai_1.assert).isTrue;
                            _d = (_c = test_helpers_1.ether("50")).eq;
                            return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                        case 5:
                            _b.apply(_a, [_d.apply(_c, [_e.sent()])]);
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                var receipt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            receipt = (_a.sent()).receipt;
                            chai_1.assert.isAtMost(receipt.gasUsed, 91500);
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("removeDelegate", function () {
            beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if GOVD: Vote locked", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.removeDelegate(), "GOVD: Vote locked")];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("removes from the delegated address delegatedAmount", function () { return __awaiter(void 0, void 0, void 0, function () {
                var delegateBefore, stakedAndDelegatedBefore, delegatedAfter, stakedAndDelegatedAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.stakers(configure_1.accounts[1])];
                        case 1:
                            delegateBefore = _a.sent();
                            return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                        case 2:
                            stakedAndDelegatedBefore = _a.sent();
                            chai_1.assert.isTrue(stakedAndDelegatedBefore.eq(test_helpers_1.ether("50")));
                            //@ts-ignore
                            chai_1.assert.isTrue(delegateBefore.delegatedAmount.eq(test_helpers_1.ether("50")));
                            return [4 /*yield*/, test_helpers_1.time.increase(sevenDays + 1)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.removeDelegate()];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.stakers(configure_1.accounts[1])];
                        case 5:
                            delegatedAfter = _a.sent();
                            return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                        case 6:
                            stakedAndDelegatedAfter = _a.sent();
                            chai_1.assert.isTrue(stakedAndDelegatedAfter.eq(test_helpers_1.ether("0")));
                            //@ts-ignore
                            chai_1.assert.isTrue(delegatedAfter.delegatedAmount.eq(test_helpers_1.ether("0")));
                            return [2 /*return*/];
                    }
                });
            }); });
            it("clears the delegate address for the staker", function () { return __awaiter(void 0, void 0, void 0, function () {
                var stakerBefore, stakerAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.stakers(configure_1.accounts[0])
                            //@ts-ignore
                        ];
                        case 1:
                            stakerBefore = _a.sent();
                            //@ts-ignore
                            chai_1.assert.equal(configure_1.accounts[1], stakerBefore.delegate);
                            return [4 /*yield*/, test_helpers_1.time.increase(sevenDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.removeDelegate()];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.stakers(configure_1.accounts[0])
                                //@ts-ignore
                            ];
                        case 4:
                            stakerAfter = _a.sent();
                            //@ts-ignore
                            chai_1.assert.equal(test_helpers_1.constants.ZERO_ADDRESS, stakerAfter.delegate);
                            return [2 /*return*/];
                    }
                });
            }); });
            it("Uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                var receipt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, test_helpers_1.time.increase(sevenDays + 1)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.removeDelegate()];
                        case 2:
                            receipt = (_a.sent()).receipt;
                            chai_1.assert.isAtMost(receipt.gasUsed, 21400);
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("acceptDelegates", function () {
            it("delegating reverts if this has not been called from a delegate", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.delegate(configure_1.accounts[1]), "GOVD: Delegate not accepting")];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("enables the accepting of delegate tokens", function () { return __awaiter(void 0, void 0, void 0, function () {
                var delegatedAmount;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.getStakedAndDelegated(configure_1.accounts[1])];
                        case 5:
                            delegatedAmount = _a.sent();
                            chai_1.assert.isTrue(test_helpers_1.ether("50").eq(delegatedAmount));
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("disableDelegates", function () {
            it("reverts if tokens are already delegated", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.delegate(configure_1.accounts[1])];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.disableDelegates({ from: configure_1.accounts[1] }), "GOVD: Already delegating")];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("disables the acceptingDelegates flag", function () { return __awaiter(void 0, void 0, void 0, function () {
                var stakerBefore, stakerAfter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.acceptDelegates({ from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.stakers(configure_1.accounts[1])
                                //@ts-ignore
                            ];
                        case 4:
                            stakerBefore = _a.sent();
                            //@ts-ignore
                            chai_1.assert.isTrue(stakerBefore.acceptingDelegates);
                            return [4 /*yield*/, gov.disableDelegates({ from: configure_1.accounts[1] })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, gov.stakers(configure_1.accounts[1])
                                //@ts-ignore
                            ];
                        case 6:
                            stakerAfter = _a.sent();
                            //@ts-ignore
                            chai_1.assert.isFalse(stakerAfter.acceptingDelegates);
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe("execute", function () {
            beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 4:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposalId does not exist", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposal has not passed", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposal was rejected", function () { return __awaiter(void 0, void 0, void 0, function () {
                var proposal, rejectedState;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.voteAgainst(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, gov.proposals(0)
                                // The number associated with ProposalState.REJECTED
                            ];
                        case 4:
                            proposal = _a.sent();
                            rejectedState = 3;
                            //@ts-ignore
                            chai_1.assert.equal(rejectedState, proposal.state);
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposal was already executed", function () { return __awaiter(void 0, void 0, void 0, function () {
                var proposal, executedState;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.execute(0)];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, gov.proposals(0)
                                // The number associated with ProposalState.EXECUTED
                            ];
                        case 6:
                            proposal = _a.sent();
                            executedState = 2;
                            //@ts-ignore
                            chai_1.assert.equal(executedState, proposal.state);
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), "GOV: Proposal state != PASSED")];
                        case 7:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposal is still cooling off", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), "GOV: Cooling Off")];
                        case 4:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the proposal is expired", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays * 200)];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), 'GOV: Proposal expired')];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("reverts if the target function call fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [sampleProposalData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(0), "GOV: Failed execution")];
                        case 5:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            it("executes internal function calls", function () { return __awaiter(void 0, void 0, void 0, function () {
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _d.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _d.sent();
                            return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _d.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 4:
                            _d.sent();
                            return [4 /*yield*/, gov.execute(0)
                                //@ts-ignore
                            ];
                        case 5:
                            _d.sent();
                            //@ts-ignore
                            _b = (_a = chai_1.assert).equal;
                            _c = [1];
                            return [4 /*yield*/, gov.coolingOff()];
                        case 6:
                            //@ts-ignore
                            _b.apply(_a, _c.concat([_d.sent()]));
                            return [2 /*return*/];
                    }
                });
            }); });
            it("uses an expected amount of gas", function () { return __awaiter(void 0, void 0, void 0, function () {
                var receipt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, gov.execute(0)];
                        case 5:
                            receipt = (_a.sent()).receipt;
                            chai_1.assert.isAtMost(receipt.gasUsed, 66000);
                            return [2 /*return*/];
                    }
                });
            }); });
            /*
            it("executes external function calls", async () => {
                var deployTracerData = web3.eth.abi.encodeParameters(
                    ["bytes32", "address", "address", "address", "address", "address", "uint256"],
                    [
                        web3.utils.fromAscii(`TEST/USD`),
                        testToken.address,
                        oracle.address,
                        gasPriceOracle.address,
                        account.address,
                        pricing.address,
                        oneDollar,
                        1 //funding rate sensitivity
                    ]
                )
                const proposeTracerData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: "deployTracer",
                        type: "function",
                        inputs: [
                            {
                                type: "bytes",
                                name: "_data",
                            },
                        ],
                    },
                    [deployTracerData]
                )
    
                await gov.propose([perpsFactory.address], [proposeTracerData])
                await time.increase(twoDays + 1)
                await gov.voteFor(proposalNum, ether("50"), { from: accounts[1] })
                await time.increase(twoDays + 1)
                await gov.execute(0)
                let tracerAddress = await perpsFactory.tracers(web3.utils.fromAscii(`TEST/USD`))
                assert.equal(true, await perpsFactory.validTracers(tracerAddress))
            })
        })
        */
            describe("setCoolingOff", function () {
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts when called by an external account", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.setCoolingOff(0), "GOV: Only governance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("sets through a proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, gov.propose([gov.address], [setCoolingOffData])];
                            case 1:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _d.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 4:
                                _d.sent();
                                return [4 /*yield*/, gov.execute(0)
                                    //@ts-ignore
                                ];
                            case 5:
                                _d.sent();
                                //@ts-ignore
                                _b = (_a = chai_1.assert).equal;
                                _c = [1];
                                return [4 /*yield*/, gov.coolingOff()];
                            case 6:
                                //@ts-ignore
                                _b.apply(_a, _c.concat([_d.sent()]));
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe("setWarmUp", function () {
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts when called by an external account", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.setWarmUp(0), "GOV: Only governance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("sets through a proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, gov.propose([gov.address], [setWarmUpData])];
                            case 1:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _d.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 4:
                                _d.sent();
                                return [4 /*yield*/, gov.execute(0)
                                    //@ts-ignore
                                ];
                            case 5:
                                _d.sent();
                                //@ts-ignore
                                _b = (_a = chai_1.assert).equal;
                                _c = [1];
                                return [4 /*yield*/, gov.warmUp()];
                            case 6:
                                //@ts-ignore
                                _b.apply(_a, _c.concat([_d.sent()]));
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe("setProposalDuration", function () {
                var setProposalDurationData;
                before(function () {
                    setProposalDurationData = configure_1.web3.eth.abi.encodeFunctionCall({
                        name: "setProposalDuration",
                        type: "function",
                        inputs: [
                            {
                                type: "uint32",
                                name: "newProposalDuration",
                            },
                        ],
                    }, ['1']);
                });
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts when called by an external account", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.setProposalDuration(0), "GOV: Only governance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("sets through a proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, gov.propose([gov.address], [setProposalDurationData])];
                            case 1:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _d.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 4:
                                _d.sent();
                                return [4 /*yield*/, gov.execute(0)
                                    //@ts-ignore
                                ];
                            case 5:
                                _d.sent();
                                //@ts-ignore
                                _b = (_a = chai_1.assert).equal;
                                _c = [1];
                                return [4 /*yield*/, gov.proposalDuration()];
                            case 6:
                                //@ts-ignore
                                _b.apply(_a, _c.concat([_d.sent()]));
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe("setLockDuration", function () {
                var setLockDurationData;
                before(function () {
                    setLockDurationData = configure_1.web3.eth.abi.encodeFunctionCall({
                        name: "setLockDuration",
                        type: "function",
                        inputs: [
                            {
                                type: "uint32",
                                name: "newLockDuration",
                            },
                        ],
                    }, ['1']);
                });
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts when called by an external account", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.setLockDuration(0), "GOV: Only governance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("sets through a proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, gov.propose([gov.address], [setLockDurationData])];
                            case 1:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _d.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 4:
                                _d.sent();
                                return [4 /*yield*/, gov.execute(0)
                                    //@ts-ignore
                                ];
                            case 5:
                                _d.sent();
                                //@ts-ignore
                                _b = (_a = chai_1.assert).equal;
                                _c = [1];
                                return [4 /*yield*/, gov.lockDuration()];
                            case 6:
                                //@ts-ignore
                                _b.apply(_a, _c.concat([_d.sent()]));
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe("setMaxProposalTargets", function () {
                var setMaxProposalTargetsData;
                before(function () {
                    setMaxProposalTargetsData = configure_1.web3.eth.abi.encodeFunctionCall({
                        name: "setMaxProposalTargets",
                        type: "function",
                        inputs: [
                            {
                                type: "uint32",
                                name: "newMaxProposalTargets",
                            },
                        ],
                    }, ['1']);
                });
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts when called by an external account", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.setMaxProposalTargets(0), "GOV: Only governance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("sets through a proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, gov.propose([gov.address], [setMaxProposalTargetsData])];
                            case 1:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _d.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 4:
                                _d.sent();
                                return [4 /*yield*/, gov.execute(0)
                                    //@ts-ignore
                                ];
                            case 5:
                                _d.sent();
                                //@ts-ignore
                                _b = (_a = chai_1.assert).equal;
                                _c = [1];
                                return [4 /*yield*/, gov.maxProposalTargets()];
                            case 6:
                                //@ts-ignore
                                _b.apply(_a, _c.concat([_d.sent()]));
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe("setProposalThreshold", function () {
                var setProposalThresholdData;
                before(function () {
                    setProposalThresholdData = configure_1.web3.eth.abi.encodeFunctionCall({
                        name: "setProposalThreshold",
                        type: "function",
                        inputs: [
                            {
                                type: "uint96",
                                name: "newThreshold",
                            },
                        ],
                    }, ['1']);
                });
                beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"))];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, govToken.approve(gov.address, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"))];
                            case 3:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 4:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("reverts when called by an external account", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(gov.setProposalThreshold(0), "GOV: Only governance")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                it("sets through a proposal", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, gov.propose([gov.address], [setProposalThresholdData])];
                            case 1:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 2:
                                _d.sent();
                                return [4 /*yield*/, gov.voteFor(proposalNum, test_helpers_1.ether("50"), { from: configure_1.accounts[1] })];
                            case 3:
                                _d.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 4:
                                _d.sent();
                                return [4 /*yield*/, gov.execute(0)
                                    //@ts-ignore
                                ];
                            case 5:
                                _d.sent();
                                //@ts-ignore
                                _b = (_a = chai_1.assert).equal;
                                _c = [1];
                                return [4 /*yield*/, gov.proposalThreshold()];
                            case 6:
                                //@ts-ignore
                                _b.apply(_a, _c.concat([_d.sent()]));
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        return [2 /*return*/];
    });
}); });
