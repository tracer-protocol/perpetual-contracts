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
var artifacts_1 = require("../artifacts");
var configure_1 = require("../configure");
var Setup_1 = require("../lib/Setup");
describe("Receipt: unit tests", function () { return __awaiter(void 0, void 0, void 0, function () {
    var receipt, mockTracer, gov, maxSlippage;
    return __generator(this, function (_a) {
        maxSlippage = new test_helpers_1.BN("1000") // 10%*10000
        ;
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
            var govAndToken;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, artifacts_1.MockTracerPerpetualSwaps.new(5, 3, test_helpers_1.ether("1"), true, configure_1.accounts[4], 1, new test_helpers_1.BN("100000000"))];
                    case 1:
                        //Deploy receipt contract and let account 4 be the accounts contract
                        mockTracer = _a.sent();
                        return [4 /*yield*/, Setup_1.setupGovAndToken(configure_1.accounts)];
                    case 2:
                        govAndToken = _a.sent();
                        gov = govAndToken.gov;
                        return [4 /*yield*/, artifacts_1.Receipt.new(configure_1.accounts[4], maxSlippage, gov.address)
                            //Set up a receipt where accounts 1 is the liquidator
                            //and accounts2 is the liquidatee
                        ];
                    case 3:
                        receipt = _a.sent();
                        //Set up a receipt where accounts 1 is the liquidator
                        //and accounts2 is the liquidatee
                        return [4 /*yield*/, receipt.submitLiquidation(mockTracer.address, configure_1.accounts[1], configure_1.accounts[2], test_helpers_1.ether("1"), test_helpers_1.ether("5"), test_helpers_1.ether("3"), true, { from: configure_1.accounts[4] })];
                    case 4:
                        //Set up a receipt where accounts 1 is the liquidator
                        //and accounts2 is the liquidatee
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        describe("claimReceipts", function () {
            context("When the claimer isnt the receipt owner", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _a = test_helpers_1.expectRevert;
                                _c = (_b = receipt).claimReceipts;
                                _d = [0, [0, 1, 2]];
                                return [4 /*yield*/, mockTracer.priceMultiplier()];
                            case 1: return [4 /*yield*/, _a.apply(void 0, [_c.apply(_b, _d.concat([_e.sent(), mockTracer.address, configure_1.accounts[3], { from: configure_1.accounts[4] }])), "REC: Liquidator mismatch"])];
                            case 2:
                                _e.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When the claim time has passed", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.time.increase(15 * 60)]; //15 mins
                            case 1:
                                _e.sent(); //15 mins
                                _a = test_helpers_1.expectRevert;
                                _c = (_b = receipt).claimReceipts;
                                _d = [0, [0, 1, 2]];
                                return [4 /*yield*/, mockTracer.priceMultiplier()];
                            case 2: //15 mins
                            return [4 /*yield*/, _a.apply(void 0, [_c.apply(_b, _d.concat([_e.sent(), mockTracer.address, configure_1.accounts[1], { from: configure_1.accounts[4] }])), "REC: claim time passed"])];
                            case 3:
                                _e.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When the refund is already claimed", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var mockTracerWithCorrectUnits, receipt2, _a, _b, _c, _d, _e, _f, _g;
                    return __generator(this, function (_h) {
                        switch (_h.label) {
                            case 0: return [4 /*yield*/, artifacts_1.MockTracerPerpetualSwaps.new(0, 0, test_helpers_1.ether("1"), true, configure_1.accounts[1], 0, new test_helpers_1.BN("100000000"))];
                            case 1:
                                mockTracerWithCorrectUnits = _h.sent();
                                return [4 /*yield*/, artifacts_1.Receipt.new(configure_1.accounts[4], maxSlippage, gov.address)];
                            case 2:
                                receipt2 = _h.sent();
                                return [4 /*yield*/, receipt2.submitLiquidation(mockTracer.address, configure_1.accounts[1], configure_1.accounts[2], test_helpers_1.ether("5"), test_helpers_1.ether("0"), test_helpers_1.ether("0"), true, { from: configure_1.accounts[4] })
                                    //Mark refund as claimed via account[4] (the aeccount contract)
                                ];
                            case 3:
                                _h.sent();
                                _b = (_a = receipt2).claimReceipts;
                                _c = [0, [0, 1, 2]];
                                return [4 /*yield*/, mockTracer.priceMultiplier()];
                            case 4: 
                            //Mark refund as claimed via account[4] (the aeccount contract)
                            return [4 /*yield*/, _b.apply(_a, _c.concat([_h.sent(), mockTracerWithCorrectUnits.address, configure_1.accounts[1], { from: configure_1.accounts[4] }]))];
                            case 5:
                                //Mark refund as claimed via account[4] (the aeccount contract)
                                _h.sent();
                                _d = test_helpers_1.expectRevert;
                                _f = (_e = receipt2).claimReceipts;
                                _g = [0, [0, 1, 2]];
                                return [4 /*yield*/, mockTracer.priceMultiplier()];
                            case 6: return [4 /*yield*/, _d.apply(void 0, [_f.apply(_e, _g.concat([_h.sent(), mockTracerWithCorrectUnits.address, configure_1.accounts[1], { from: configure_1.accounts[4] }])), "REC: Already claimed"])];
                            case 7:
                                _h.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When not all units have been sold", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, _b, _c, _d;
                    return __generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _a = test_helpers_1.expectRevert;
                                _c = (_b = receipt).claimReceipts;
                                _d = [0, [0, 1, 2]];
                                return [4 /*yield*/, mockTracer.priceMultiplier()];
                            case 1: return [4 /*yield*/, _a.apply(void 0, [_c.apply(_b, _d.concat([_e.sent(), mockTracer.address, configure_1.accounts[1], { from: configure_1.accounts[4] }])), "REC: Unit mismatch"])];
                            case 2:
                                _e.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe("claimEscrow", function () {
            context("When the sender is not the party entitled to the escrowed funds", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(receipt.claimEscrow(0, configure_1.accounts[3], { from: configure_1.accounts[4] }), "REC: Liquidatee mismatch")];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When the escrow has already been claimed", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                test_helpers_1.time.increase(16 * 60); //16mins
                                return [4 /*yield*/, receipt.claimEscrow(0, configure_1.accounts[2], { from: configure_1.accounts[4] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.expectRevert(receipt.claimEscrow(0, configure_1.accounts[2], { from: configure_1.accounts[4] }), "REC: Escrow claimed")];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            context("When the escrow has not expired", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, test_helpers_1.expectRevert(receipt.claimEscrow(0, configure_1.accounts[2], { from: configure_1.accounts[4] }), "REC: Not released")];
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
