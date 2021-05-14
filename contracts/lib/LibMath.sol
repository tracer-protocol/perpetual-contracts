//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

library LibMath {
    uint256 private constant POSITIVE_INT256_MAX = 2**255 - 1;

    function toInt256(uint256 x) internal pure returns (int256) {
        require(x <= POSITIVE_INT256_MAX, "uint256 overflow");
        return int256(x);
    }

    function abs(int256 x) internal pure returns (int256) {
        return x > 0 ? int256(x) : int256(-1 * x);
    }

    function sum(uint256[] arr) internal pure returns (uint256) {
        uint256 n = arr.len;
        uint256 total = 0;

        for (uint256 i = 0; i < n; i++) {
            total += arr[i];
        }

        return total;
    }

    function mean(uint256[] arr) internal pure returns (uint256) {
        uint256 n = arr.len;

        return sum(arr) / n;
    }
}
