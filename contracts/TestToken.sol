// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    uint8 internal internalDecimals;

    constructor(
        uint256 initialSupply,
        string memory name,
        string memory symbol,
        uint8 _decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        internalDecimals = _decimals;
    }

    function decimals() public view override returns (uint8) {
        return internalDecimals;
    }
}
