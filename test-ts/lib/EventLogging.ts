const truffleAssert = require('truffle-assertions');
//@ts-ignore
import { BN } from "@openzeppelin/test-helpers"

export const printValueLogs = (tx: Object): BN => {
    truffleAssert.eventEmitted(tx, "Value", (ev: any) => {
        console.log(ev.value.toString())
        return true;
    });
}