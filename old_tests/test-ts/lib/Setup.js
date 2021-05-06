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
exports.fillInsurancePool = exports.deployMultiTracers = exports.setupContractsAndTracer = exports.setupContracts = exports.setupReceipt = exports.setupAccountFull = exports.setupAccount = exports.setupPricing = exports.setupPerpsFactoryFull = exports.setupPerpsFactory = exports.setupDeployer = exports.setupGovAndToken = exports.setupGov = exports.setupInsuranceFull = exports.setupInsurance = exports.setupTokens = exports.setupTestToken = exports.setupGovToken = exports.setupOracles = void 0;
//@ts-ignore
var test_helpers_1 = require("@openzeppelin/test-helpers");
//@ts-ignore
var setup_1 = require("@openzeppelin/test-helpers/src/setup");
var artifacts_1 = require("../artifacts");
//All prices in price ($) * 1000000
var oneDollar = new test_helpers_1.BN("100000000");
var onePercent = new test_helpers_1.BN("1");
var oneHour = 3600;
var twentyFourHours = 24 * oneHour;
var threeDays = 259200;
var twoDays = 172800;
function setupOracles() {
    return __awaiter(this, void 0, void 0, function () {
        var oracle, gasPriceOracle, gasOracle, priceOracle;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.Oracle.new()
                    //Deploy gas price oracle
                ];
                case 1:
                    //Deploy oracle
                    oracle = _a.sent();
                    return [4 /*yield*/, artifacts_1.Oracle.new()];
                case 2:
                    gasOracle = _a.sent();
                    return [4 /*yield*/, gasOracle.setDecimals(9)];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, gasOracle.setPrice(setup_1.web3.utils.toWei("250", "gwei"))];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, artifacts_1.Oracle.new()
                        //price * 10^8 as represented by chainlink feeds
                    ];
                case 5:
                    priceOracle = _a.sent();
                    //price * 10^8 as represented by chainlink feeds
                    return [4 /*yield*/, priceOracle.setPrice(160000000000)
                        //Reports the gas price in USD per gwei (eg 250gwei @ 450 USD per ETH in wei)
                        //to get a gas cost, simply multiply this value by amount of gas
                    ]; //$1600
                case 6:
                    //price * 10^8 as represented by chainlink feeds
                    _a.sent(); //$1600
                    return [4 /*yield*/, artifacts_1.GasOracle.new(priceOracle.address, gasOracle.address)];
                case 7:
                    //Reports the gas price in USD per gwei (eg 250gwei @ 450 USD per ETH in wei)
                    //to get a gas cost, simply multiply this value by amount of gas
                    gasPriceOracle = _a.sent();
                    return [2 /*return*/, { oracle: oracle, gasPriceOracle: gasPriceOracle }];
            }
        });
    });
}
exports.setupOracles = setupOracles;
function setupGovToken(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var govToken, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.TestToken.new(setup_1.web3.utils.toWei("100000"))
                    //Send out 10000 test tokens to each address
                ];
                case 1:
                    govToken = _a.sent();
                    i = 1;
                    _a.label = 2;
                case 2:
                    if (!(i < 6)) return [3 /*break*/, 5];
                    return [4 /*yield*/, govToken.transfer(accounts[i], setup_1.web3.utils.toWei("200"))];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, govToken];
            }
        });
    });
}
exports.setupGovToken = setupGovToken;
function setupTestToken(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var testToken, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.TestToken.new(setup_1.web3.utils.toWei("100000"))
                    //Send out 10000 test tokens to each address
                ];
                case 1:
                    //Deploy a test token
                    testToken = _a.sent();
                    i = 1;
                    _a.label = 2;
                case 2:
                    if (!(i < 6)) return [3 /*break*/, 5];
                    return [4 /*yield*/, testToken.transfer(accounts[i], setup_1.web3.utils.toWei("10000"), { from: accounts[0] })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, testToken];
            }
        });
    });
}
exports.setupTestToken = setupTestToken;
function setupTokens(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var testToken, govToken;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupTestToken(accounts)];
                case 1:
                    testToken = _a.sent();
                    return [4 /*yield*/, setupGovToken(accounts)];
                case 2:
                    govToken = _a.sent();
                    return [2 /*return*/, { testToken: testToken, govToken: govToken }];
            }
        });
    });
}
exports.setupTokens = setupTokens;
function setupInsurance(govToken) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.Insurance.new(govToken.address)];
                case 1: 
                // Remember to call insurance.setAccountContract() after account has been made
                return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
exports.setupInsurance = setupInsurance;
function setupInsuranceFull(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var govToken, insurance, account;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupGovToken(accounts)];
                case 1:
                    govToken = _a.sent();
                    return [4 /*yield*/, setupInsurance(govToken)];
                case 2:
                    insurance = _a.sent();
                    return [4 /*yield*/, setupAccountFull(accounts)];
                case 3:
                    account = _a.sent();
                    insurance.setAccountContract(account.address);
                    return [2 /*return*/, { insurance: insurance, account: account, govToken: govToken }];
            }
        });
    });
}
exports.setupInsuranceFull = setupInsuranceFull;
function setupGov(govToken) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.Gov.new(govToken.address)];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
exports.setupGov = setupGov;
function setupGovAndToken(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var govToken, gov;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupGovToken(accounts)];
                case 1:
                    govToken = _a.sent();
                    return [4 /*yield*/, setupGov(govToken)];
                case 2:
                    gov = _a.sent();
                    return [2 /*return*/, { gov: gov, govToken: govToken }];
            }
        });
    });
}
exports.setupGovAndToken = setupGovAndToken;
function setupDeployer() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.DeployerV1.new()];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
exports.setupDeployer = setupDeployer;
function setupPerpsFactory(insurance, deployer, gov) {
    return __awaiter(this, void 0, void 0, function () {
        var perpsFactory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.TracerPerpetualsFactory.new(insurance.address, deployer.address, gov.address)];
                case 1:
                    perpsFactory = _a.sent();
                    return [4 /*yield*/, insurance.setFactory(perpsFactory.address)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, perpsFactory];
            }
        });
    });
}
exports.setupPerpsFactory = setupPerpsFactory;
function setupPerpsFactoryFull(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, insurance, account, govToken, deployer, gov, perpsFactory;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, setupInsuranceFull(accounts)];
                case 1:
                    _a = _b.sent(), insurance = _a.insurance, account = _a.account, govToken = _a.govToken;
                    return [4 /*yield*/, setupDeployer()];
                case 2:
                    deployer = _b.sent();
                    return [4 /*yield*/, setupGov(govToken)];
                case 3:
                    gov = _b.sent();
                    return [4 /*yield*/, setupPerpsFactory(insurance, deployer, gov)];
                case 4:
                    perpsFactory = _b.sent();
                    return [4 /*yield*/, insurance.setFactory(perpsFactory.address)];
                case 5:
                    _b.sent();
                    return [2 /*return*/, { perpsFactory: perpsFactory, gov: gov, deployer: deployer, account: account, insurance: insurance, govToken: govToken }];
            }
        });
    });
}
exports.setupPerpsFactoryFull = setupPerpsFactoryFull;
function setupPricing(tracerFacAddress) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.Pricing.new(tracerFacAddress)];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
exports.setupPricing = setupPricing;
function setupAccount(insuranceAddr, gasPriceAddr, perpsFactoryAddr, pricingAddr, govAddr) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.Account.new(insuranceAddr, gasPriceAddr, perpsFactoryAddr, pricingAddr, govAddr)];
                case 1: return [2 /*return*/, (_a.sent())];
            }
        });
    });
}
exports.setupAccount = setupAccount;
function setupAccountFull(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var govToken, insurance, gasPriceOracle, gov, deployer, perpsFactory, pricing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupTokens(accounts)];
                case 1:
                    govToken = (_a.sent()).govToken;
                    return [4 /*yield*/, setupInsurance(govToken)];
                case 2:
                    insurance = _a.sent();
                    return [4 /*yield*/, setupOracles()];
                case 3:
                    gasPriceOracle = (_a.sent()).gasPriceOracle;
                    return [4 /*yield*/, setupGov(govToken)];
                case 4:
                    gov = _a.sent();
                    return [4 /*yield*/, setupDeployer()];
                case 5:
                    deployer = _a.sent();
                    return [4 /*yield*/, setupPerpsFactory(insurance, deployer, gov)];
                case 6:
                    perpsFactory = _a.sent();
                    return [4 /*yield*/, setupPricing(perpsFactory.address)];
                case 7:
                    pricing = _a.sent();
                    return [4 /*yield*/, setupAccount(insurance.address, gasPriceOracle.address, perpsFactory.address, pricing.address, gov.address)];
                case 8: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.setupAccountFull = setupAccountFull;
function setupReceipt(account, govAddr) {
    return __awaiter(this, void 0, void 0, function () {
        var receipt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, artifacts_1.Receipt.new(account.address, new test_helpers_1.BN("1000000"), govAddr)]; // Just set unlimited max slippage for flexibility in tests
                case 1:
                    receipt = _a.sent() // Just set unlimited max slippage for flexibility in tests
                    ;
                    return [4 /*yield*/, account.setReceiptContract(receipt.address)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, receipt];
            }
        });
    });
}
exports.setupReceipt = setupReceipt;
function setupContracts(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var receipt, deployer, testToken, perpsFactory, oracle, gov, govToken, insurance, account, pricing, gasPriceOracle, oracles, tokens;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupOracles()];
                case 1:
                    oracles = _a.sent();
                    return [4 /*yield*/, setupTokens(accounts)];
                case 2:
                    tokens = _a.sent();
                    oracle = oracles.oracle;
                    gasPriceOracle = oracles.gasPriceOracle;
                    testToken = tokens.testToken;
                    govToken = tokens.govToken;
                    return [4 /*yield*/, setupInsurance(govToken)
                        //Deploy tracer deployer
                    ];
                case 3:
                    //Deploy insurance
                    insurance = _a.sent();
                    return [4 /*yield*/, setupDeployer()];
                case 4:
                    //Deploy tracer deployer
                    deployer = _a.sent();
                    return [4 /*yield*/, setupGov(govToken)];
                case 5:
                    //Deploy gov
                    gov = _a.sent();
                    return [4 /*yield*/, setupPerpsFactory(insurance, deployer, gov)
                        //Deploy pricing contract
                    ];
                case 6:
                    //Deploy the tracer perpsFactory
                    perpsFactory = _a.sent();
                    return [4 /*yield*/, setupPricing(perpsFactory.address)
                        //Deploy account state contract
                    ];
                case 7:
                    //Deploy pricing contract
                    pricing = _a.sent();
                    return [4 /*yield*/, setupAccount(insurance.address, gasPriceOracle.address, perpsFactory.address, pricing.address, accounts[0])
                        //Deploy and link receipt contract
                    ];
                case 8:
                    //Deploy account state contract
                    account = _a.sent();
                    return [4 /*yield*/, setupReceipt(account, gov.address)
                        //Link insurance contract
                    ];
                case 9:
                    //Deploy and link receipt contract
                    receipt = _a.sent();
                    //Link insurance contract
                    return [4 /*yield*/, insurance.setAccountContract(account.address)];
                case 10:
                    //Link insurance contract
                    _a.sent();
                    return [2 /*return*/, {
                            gov: gov,
                            govToken: govToken,
                            perpsFactory: perpsFactory,
                            testToken: testToken,
                            account: account,
                            pricing: pricing,
                            insurance: insurance,
                            receipt: receipt,
                            oracle: oracle,
                            gasPriceOracle: gasPriceOracle,
                            deployer: deployer,
                        }];
            }
        });
    });
}
exports.setupContracts = setupContracts;
function setupContractsAndTracer(accounts) {
    return __awaiter(this, void 0, void 0, function () {
        var receipt, deployer, testToken, perpsFactory, perps, oracle, gov, govToken, insurance, account, pricing, gasPriceOracle, now, contracts, maxLeverage, deleveragingCliff, deployTracerData, proposeTracerData, tracerAddr, i, transferOwnershipProposal;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupContracts(accounts)];
                case 1:
                    contracts = _a.sent();
                    gov = contracts.gov;
                    govToken = contracts.govToken;
                    perpsFactory = contracts.perpsFactory;
                    testToken = contracts.testToken;
                    account = contracts.account;
                    pricing = contracts.pricing;
                    insurance = contracts.insurance;
                    receipt = contracts.receipt;
                    oracle = contracts.oracle;
                    gasPriceOracle = contracts.gasPriceOracle;
                    deployer = contracts.deployer;
                    maxLeverage = 125000;
                    deleveragingCliff = 20 // 20% of ins pool
                    ;
                    deployTracerData = setup_1.web3.eth.abi.encodeParameters(["bytes32", "address", "address", "address", "address", "address", "int256", "uint256", "int256"], [
                        setup_1.web3.utils.fromAscii("TEST/USD"),
                        testToken.address,
                        oracle.address,
                        gasPriceOracle.address,
                        account.address,
                        pricing.address,
                        maxLeverage,
                        1,
                        deleveragingCliff
                    ]);
                    proposeTracerData = setup_1.web3.eth.abi.encodeFunctionCall({
                        name: "deployTracer",
                        type: "function",
                        inputs: [
                            {
                                type: "bytes",
                                name: "_data",
                            },
                        ],
                    }, [deployTracerData]);
                    return [4 /*yield*/, govToken.approve(gov.address, setup_1.web3.utils.toWei("10"))];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, gov.stake(setup_1.web3.utils.toWei("10"))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, govToken.approve(gov.address, setup_1.web3.utils.toWei("10"), { from: accounts[1] })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, gov.stake(setup_1.web3.utils.toWei("10"), { from: accounts[1] })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, gov.propose([perpsFactory.address], [proposeTracerData])];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, gov.voteFor(0, setup_1.web3.utils.toWei("10"), { from: accounts[1] })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, gov.execute(0)];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, perpsFactory.tracersByIndex(0)];
                case 11:
                    tracerAddr = _a.sent();
                    return [4 /*yield*/, artifacts_1.TracerPerpetualSwaps.at(tracerAddr)
                        //Get each user to "deposit" 100 tokens into the platform
                    ];
                case 12:
                    perps = _a.sent();
                    i = 0;
                    _a.label = 13;
                case 13:
                    if (!(i < 6)) return [3 /*break*/, 16];
                    return [4 /*yield*/, testToken.approve(account.address, setup_1.web3.utils.toWei("10000"), { from: accounts[i] })];
                case 14:
                    _a.sent();
                    _a.label = 15;
                case 15:
                    i++;
                    return [3 /*break*/, 13];
                case 16:
                    transferOwnershipProposal = setup_1.web3.eth.abi.encodeFunctionCall({
                        name: "transferOwnership",
                        type: "function",
                        inputs: [
                            {
                                type: "address",
                                name: "newOwner",
                            },
                        ],
                    }, [accounts[0]]);
                    return [4 /*yield*/, gov.propose([perps.address], [transferOwnershipProposal])
                        //4th proposal
                    ];
                case 17:
                    _a.sent();
                    //4th proposal
                    return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                case 18:
                    //4th proposal
                    _a.sent();
                    return [4 /*yield*/, gov.voteFor(1, setup_1.web3.utils.toWei("10"), { from: accounts[1] })];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                case 20:
                    _a.sent();
                    return [4 /*yield*/, gov.execute(1)
                        //Set time as of end of setup
                    ];
                case 21:
                    _a.sent();
                    return [4 /*yield*/, test_helpers_1.time.latest()];
                case 22:
                    //Set time as of end of setup
                    now = _a.sent();
                    return [2 /*return*/, {
                            gov: gov,
                            govToken: govToken,
                            perpsFactory: perpsFactory,
                            testToken: testToken,
                            perps: perps,
                            account: account,
                            pricing: pricing,
                            insurance: insurance,
                            receipt: receipt,
                            oracle: oracle,
                            gasPriceOracle: gasPriceOracle,
                            deployer: deployer,
                        }];
            }
        });
    });
}
exports.setupContractsAndTracer = setupContractsAndTracer;
function deployMultiTracers(accounts, perpsFactory, gov, govToken, insurance, oracle, gasPriceOracle, account, pricing) {
    return __awaiter(this, void 0, void 0, function () {
        var proposalNum, _a, tokens, tracers, maxLeverage, deleveragingCliff, i, token, deployTracerData, proposeTracerData, tracerAddr, perps, i, j;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = parseInt;
                    return [4 /*yield*/, gov.proposalCounter()];
                case 1:
                    proposalNum = _a.apply(void 0, [(_b.sent()).toString()]);
                    tokens = [];
                    tracers = [];
                    return [4 /*yield*/, govToken.approve(gov.address, setup_1.web3.utils.toWei("10"))];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, gov.stake(setup_1.web3.utils.toWei("10"))];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, govToken.approve(gov.address, setup_1.web3.utils.toWei("10"), { from: accounts[1] })];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, gov.stake(setup_1.web3.utils.toWei("10"), { from: accounts[1] })
                        // maxLeveraged = 12.5 * 10,000. notional_value/margin is at most 12.5
                    ];
                case 5:
                    _b.sent();
                    maxLeverage = 125000;
                    deleveragingCliff = 20 // 20% of ins pool
                    ;
                    i = 0;
                    _b.label = 6;
                case 6:
                    if (!(i < 4)) return [3 /*break*/, 16];
                    return [4 /*yield*/, artifacts_1.TestToken.new(setup_1.web3.utils.toWei("100000"))];
                case 7:
                    token = _b.sent();
                    tokens.push(token);
                    deployTracerData = setup_1.web3.eth.abi.encodeParameters(["bytes32", "address", "address", "address", "address", "address", "uint256", "uint256", "int256"], [
                        setup_1.web3.utils.fromAscii("TEST" + i + "/USD"),
                        token.address,
                        oracle.address,
                        gasPriceOracle.address,
                        account.address,
                        pricing.address,
                        maxLeverage,
                        1,
                        deleveragingCliff
                    ]);
                    proposeTracerData = setup_1.web3.eth.abi.encodeFunctionCall({
                        name: "deployTracer",
                        type: "function",
                        inputs: [
                            {
                                type: "bytes",
                                name: "_data",
                            },
                        ],
                    }, [deployTracerData]);
                    return [4 /*yield*/, gov.propose([perpsFactory.address], [proposeTracerData])];
                case 8:
                    _b.sent();
                    return [4 /*yield*/, test_helpers_1.time.increase(twoDays + 1)];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, gov.voteFor(proposalNum, setup_1.web3.utils.toWei("10"), { from: accounts[1] })];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, test_helpers_1.time.increase(twoDays)];
                case 11:
                    _b.sent();
                    return [4 /*yield*/, gov.execute(proposalNum)];
                case 12:
                    _b.sent();
                    return [4 /*yield*/, perpsFactory.tracersByIndex(i)];
                case 13:
                    tracerAddr = _b.sent();
                    return [4 /*yield*/, artifacts_1.TracerPerpetualSwaps.at(tracerAddr)];
                case 14:
                    perps = _b.sent();
                    tracers.push(perps);
                    //create insurance pools
                    proposalNum++;
                    _b.label = 15;
                case 15:
                    i++;
                    return [3 /*break*/, 6];
                case 16:
                    i = 0;
                    _b.label = 17;
                case 17:
                    if (!(i < 4)) return [3 /*break*/, 23];
                    j = 0;
                    _b.label = 18;
                case 18:
                    if (!(j < 6)) return [3 /*break*/, 22];
                    return [4 /*yield*/, tokens[i].transfer(accounts[j], setup_1.web3.utils.toWei("5000"), { from: accounts[0] })];
                case 19:
                    _b.sent();
                    return [4 /*yield*/, tokens[i].approve(account.address, setup_1.web3.utils.toWei("5000"), { from: accounts[j] })];
                case 20:
                    _b.sent();
                    _b.label = 21;
                case 21:
                    j++;
                    return [3 /*break*/, 18];
                case 22:
                    i++;
                    return [3 /*break*/, 17];
                case 23: return [2 /*return*/, { tracers: tracers, tokens: tokens }];
            }
        });
    });
}
exports.deployMultiTracers = deployMultiTracers;
function fillInsurancePool(token, account, insurance, market) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, token.approve(insurance.address, setup_1.web3.utils.toWei("10000"), { from: account })];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, insurance.stake(setup_1.web3.utils.toWei("10000"), market, { from: account })];
                case 2:
                    _c.sent();
                    _b = (_a = console).log;
                    return [4 /*yield*/, insurance.getPoolHoldings(market)];
                case 3:
                    _b.apply(_a, [(_c.sent()).toString()]);
                    return [2 /*return*/];
            }
        });
    });
}
exports.fillInsurancePool = fillInsurancePool;
