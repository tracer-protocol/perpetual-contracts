//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

interface IInsurance {

    function stake(uint256 amount, address market) external;

    function withdraw(uint256 amount, address market) external;

    function reward(uint256 amount, address market) external;

    function updatePoolAmount(address market) external;

    function drainPool(address market, uint256 amount) external;

    function deployInsurancePool(address market) external;

    function getPoolUserBalance(address market, address user) external view returns (uint256);

    function getRewardsPerToken(address market) external view returns (uint256);

    function getPoolToken(address market) external view returns (address);

    function getPoolTarget(address market) external view returns (uint256);

    function getPoolHoldings(address market) external view returns (uint256);

    function getPoolFundingRate(address market) external view returns (uint256);

    function poolNeedsFunding(address market) external view returns (bool);

    function isInsured(address market) external view returns (bool);

    function setFactory(address perpsFactory) external;

    function setAccountContract(address accountContract) external;

    function INSURANCE_MUL_FACTOR() external view returns (int256);
    
}
