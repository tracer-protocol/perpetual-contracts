"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifacts = exports.contracts = exports.MockTracerPerpetualSwaps = exports.Trader = exports.InsurancePoolToken = exports.Gov = exports.Receipt = exports.DeployerV1 = exports.Pricing = exports.Account = exports.Insurance = exports.GasOracle = exports.Oracle = exports.TestToken = exports.TracerPerpetualsFactory = exports.TracerPerpetualSwaps = void 0;
var TracerPerpetualSwaps_json_1 = __importDefault(require("../build/contracts/TracerPerpetualSwaps.json"));
var TracerPerpetualsFactory_json_1 = __importDefault(require("../build/contracts/TracerPerpetualsFactory.json"));
var TestToken_json_1 = __importDefault(require("../build/contracts/TestToken.json"));
var Oracle_json_1 = __importDefault(require("../build/contracts/Oracle.json"));
var GasOracle_json_1 = __importDefault(require("../build/contracts/GasOracle.json"));
var Insurance_json_1 = __importDefault(require("../build/contracts/Insurance.json"));
var InsurancePoolToken_json_1 = __importDefault(require("../build/contracts/InsurancePoolToken.json"));
var Account_json_1 = __importDefault(require("../build/contracts/Account.json"));
var Pricing_json_1 = __importDefault(require("../build/contracts/Pricing.json"));
var DeployerV1_json_1 = __importDefault(require("../build/contracts/DeployerV1.json"));
var Receipt_json_1 = __importDefault(require("../build/contracts/Receipt.json"));
var Gov_json_1 = __importDefault(require("../build/contracts/Gov.json"));
var Trader_json_1 = __importDefault(require("../build/contracts/Trader.json"));
var MockTracerPerpetualSwaps_json_1 = __importDefault(require("../build/contracts/MockTracerPerpetualSwaps.json"));
var Contract = require("@truffle/contract");
exports.TracerPerpetualSwaps = Contract(TracerPerpetualSwaps_json_1.default);
exports.TracerPerpetualsFactory = Contract(TracerPerpetualsFactory_json_1.default);
exports.TestToken = Contract(TestToken_json_1.default);
exports.Oracle = Contract(Oracle_json_1.default);
exports.GasOracle = Contract(GasOracle_json_1.default);
exports.Insurance = Contract(Insurance_json_1.default);
exports.Account = Contract(Account_json_1.default);
exports.Pricing = Contract(Pricing_json_1.default);
exports.DeployerV1 = Contract(DeployerV1_json_1.default);
exports.Receipt = Contract(Receipt_json_1.default);
exports.Gov = Contract(Gov_json_1.default);
exports.InsurancePoolToken = Contract(InsurancePoolToken_json_1.default);
exports.Trader = Contract(Trader_json_1.default);
exports.MockTracerPerpetualSwaps = Contract(MockTracerPerpetualSwaps_json_1.default);
var otherContracts = {
    "Tracer": exports.TracerPerpetualSwaps,
    "TracerPerpetualsFactory": exports.TracerPerpetualsFactory,
    "TestToken": exports.TestToken,
    "Oracle": exports.Oracle,
    "GasOracle": exports.GasOracle,
    "Insurance": exports.Insurance,
    "Account": exports.Account,
    "Pricing": exports.Pricing,
    "DeployerV1": exports.DeployerV1,
    "Receipt": exports.Receipt,
    "Gov": exports.Gov,
    "InsurancePoolToken": exports.InsurancePoolToken,
    "Trader": exports.Trader,
    "MockTracerPerpetualSwaps": exports.MockTracerPerpetualSwaps,
};
exports.contracts = __assign({}, otherContracts);
//patch mock artifacts object for backwards-compatibility
exports.artifacts = {
    require: function (name) {
        return exports.contracts[name];
    }
};
