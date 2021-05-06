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
exports.configure = exports.accounts = exports.web3 = void 0;
var web3_1 = __importDefault(require("web3"));
var ganache_core_1 = __importDefault(require("ganache-core"));
var dotenv_1 = __importDefault(require("dotenv"));
var lodash_1 = require("lodash");
var utils_1 = require("./utils");
var artifacts_1 = require("./artifacts");
dotenv_1.default.config();
function configureGanache(config) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var provider, server, web3, web3HttpUrl, web3HttpProvider, web3WebsocketUrl, web3WebsocketProvider, fork, networkId, port, k;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    fork = config === null || config === void 0 ? void 0 : config.fork;
                    networkId = (_a = config === null || config === void 0 ? void 0 : config.networkId) !== null && _a !== void 0 ? _a : 1337;
                    if (!(config === null || config === void 0 ? void 0 : config.server)) return [3 /*break*/, 2];
                    //@ts-ignore
                    server = ganache_core_1.default.server({ port: 0, fork: fork, networkId: networkId, _chainIdRpc: networkId, _chainId: networkId }); //Used by RelayProvider
                    provider = server.provider;
                    return [4 /*yield*/, utils_1.sleepForPort(server, 1000)];
                case 1:
                    port = _b.sent();
                    console.debug("Ganache running on port " + port);
                    web3HttpUrl = "http://localhost:" + port;
                    web3HttpProvider = new web3_1.default.providers.HttpProvider(web3HttpUrl);
                    web3WebsocketUrl = "ws://localhost:" + port;
                    web3WebsocketProvider = new web3_1.default.providers.WebsocketProvider(web3WebsocketUrl);
                    return [3 /*break*/, 3];
                case 2:
                    //@ts-ignore
                    provider = ganache_core_1.default.provider({ fork: fork, networkId: networkId, _chainIdRpc: networkId, _chainId: networkId });
                    _b.label = 3;
                case 3:
                    //@ts-ignore
                    provider.setMaxListeners(200);
                    //@ts-ignore
                    web3 = new web3_1.default(provider);
                    //Configure OZ test-helpers
                    require('@openzeppelin/test-helpers/configure')({
                        provider: provider
                    });
                    for (k in artifacts_1.contracts) {
                        //@ts-ignore
                        artifacts_1.contracts[k].setProvider(provider);
                    }
                    return [2 /*return*/, {
                            provider: provider,
                            server: server,
                            web3: web3,
                            web3HttpUrl: web3HttpUrl,
                            web3HttpProvider: web3HttpProvider,
                            web3WebsocketUrl: web3WebsocketUrl,
                            web3WebsocketProvider: web3WebsocketProvider
                        }];
            }
        });
    });
}
function configureAccounts(web3) {
    return __awaiter(this, void 0, void 0, function () {
        var accounts, k;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, web3.eth.getAccounts()];
                case 1:
                    accounts = _a.sent();
                    web3.eth.defaultAccount = accounts[0];
                    for (k in artifacts_1.contracts) {
                        //@ts-ignore
                        artifacts_1.contracts[k].web3.eth.defaultAccount = accounts[0];
                    }
                    return [2 /*return*/, accounts];
            }
        });
    });
}
var initialConfig = false;
var lastConfig;
var ganacheEnv;
function configure(config) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(!lodash_1.isEqual(lastConfig, config) || !initialConfig)) return [3 /*break*/, 3];
                    initialConfig = true;
                    lastConfig = config;
                    return [4 /*yield*/, configureGanache(config === null || config === void 0 ? void 0 : config.ganacheConfig)];
                case 1:
                    ganacheEnv = _a.sent();
                    return [4 /*yield*/, configureAccounts(ganacheEnv.web3)];
                case 2:
                    exports.accounts = _a.sent();
                    exports.web3 = ganacheEnv.web3;
                    _a.label = 3;
                case 3: return [2 /*return*/, { ganache: ganacheEnv, accounts: exports.accounts }];
            }
        });
    });
}
exports.configure = configure;
