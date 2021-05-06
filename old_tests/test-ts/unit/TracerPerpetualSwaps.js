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
var Setup_1 = require("../lib/Setup");
var configure_1 = require("../configure");
var twoDays = 172800;
/**
 * Note: For all tests in this file, all admin functions are not called via the Governance system but
 * simply by the owning account. For governance tests, see test/Gov.js
 */
describe("TracerPerpetualSwaps: units tests", function () { return __awaiter(void 0, void 0, void 0, function () {
    var oneHour, gov, tracer, govToken, now, sevenDays;
    return __generator(this, function (_a) {
        oneHour = 3600;
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
                        gov = deployed.gov;
                        govToken = deployed.govToken;
                        tracer = deployed.perps;
                        return [4 /*yield*/, test_helpers_1.time.latest()];
                    case 2:
                        //Set end of test setup times for use throughout tests
                        now = _a.sent();
                        sevenDays = parseInt(now) + 604800; //7 days from now
                        return [2 /*return*/];
                }
            });
        }); });
        describe("initializePricing", function () {
            context("When pricing has already been initialized", function () {
                it("fails", function () { return __awaiter(void 0, void 0, void 0, function () {
                    var proposeInitData, proposalCounter;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, govToken.approve(gov.address, configure_1.web3.utils.toWei("50"), { from: configure_1.accounts[1] })];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, gov.stake(configure_1.web3.utils.toWei("50"), { from: configure_1.accounts[1] })
                                    // Get governance contract to call initializePricing again
                                ];
                            case 2:
                                _a.sent();
                                proposeInitData = configure_1.web3.eth.abi.encodeFunctionCall({
                                    name: "initializePricing",
                                    type: "function",
                                    inputs: [],
                                }, []);
                                return [4 /*yield*/, gov.proposalCounter()];
                            case 3:
                                proposalCounter = _a.sent();
                                return [4 /*yield*/, gov.propose([tracer.address], [proposeInitData])];
                            case 4:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                            case 5:
                                _a.sent();
                                return [4 /*yield*/, gov.voteFor(proposalCounter, configure_1.web3.utils.toWei("50"), { from: configure_1.accounts[1] })];
                            case 6:
                                _a.sent();
                                return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)
                                    // Should fail since initializePricing is already called in perpsFactory.deployTracer
                                ];
                            case 7:
                                _a.sent();
                                // Should fail since initializePricing is already called in perpsFactory.deployTracer
                                return [4 /*yield*/, test_helpers_1.expectRevert(gov.execute(proposalCounter), "GOV: Failed execution")];
                            case 8:
                                // Should fail since initializePricing is already called in perpsFactory.deployTracer
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
