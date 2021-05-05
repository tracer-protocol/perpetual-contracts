/**
* LibWadMath implements WAD based arithmatic as introduced by DS-MATH
* This library exists as DS-MATH does not yet support Solidity 0.8.
* This implementation is based off 
* https://github.com/dapphub/ds-math/blob/master/src/math.sol
*/

//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library LibWadMath {
    uint constant WAD = 10 ** 18;

    //rounds to zero if x*y < WAD / 2
    function wmul(uint x, uint y) internal pure returns (uint z) {
        z = ((x * y) + ( WAD / 2)) / WAD;
    }
    //rounds to zero if x*y < WAD / 2
    function wdiv(uint x, uint y) internal pure returns (uint z) {
        z = ((x * WAD) + (y / 2)) / y;
    }
}