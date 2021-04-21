const truffleAssert = require('truffle-assertions');
//@ts-ignore
import { BN } from "@openzeppelin/test-helpers"
import {  web3 } from "../configure"

export const printValueLogs = (tx: Object): BN => {
    truffleAssert.eventEmitted(tx, "Value", (ev: any) => {
        // console.log(web3.utils.fromWei(ev.value.toString()))
        console.log((ev.value.toString()))
        return true;
    });
}