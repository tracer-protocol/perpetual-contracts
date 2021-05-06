"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printValueLogs = void 0;
var truffleAssert = require('truffle-assertions');
var configure_1 = require("../configure");
var printValueLogs = function (tx) {
    truffleAssert.eventEmitted(tx, "Value", function (ev) {
        console.log(configure_1.web3.utils.fromWei(ev.value.toString()));
        // console.log((ev.value.toString()))
        return true;
    });
};
exports.printValueLogs = printValueLogs;
