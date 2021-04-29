// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "./lib/SafetyWithdraw.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* The Tracer Insurance Pool Token is a minimal implementation of ERC2222
* https://github.com/ethereum/EIPs/issues/2222
*/
contract InsurancePoolToken is ERC20, Ownable, SafetyWithdraw {
    uint256 public constant SAFE_TOKEN_MULTIPLY = 1e18;
    address public immutable rewardToken;
    uint256 public rewardsPerToken;
    uint256 public rewardsLocked;

    // account => most recent rewards per token
    mapping(address => uint256) public lastRewardsUpdate;

    event FundsDistributed(address indexed by, uint256 fundsDistributed);

    constructor(
        string memory name,
        string memory symbol,
        address _rewardToken
    ) public ERC20(name, symbol) {
        rewardToken = _rewardToken;
    }

    // Override ERC20 functions
    function mint(address to, uint256 amount) external onlyOwner() {
        _withdrawFunds(to);
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner() {
        _withdrawFunds(from);
        _burn(from, amount);
    }

    function transfer(address to, uint256 amount) public override returns(bool) {
        _withdrawFunds(msg.sender);
        super._transfer(msg.sender, to, amount);
        return true;
    }

    /**
    * @notice Deposits funds to token holders
    */
    function depositFunds(uint256 amount) public {
        require(
            ERC20(rewardToken).balanceOf(address(this)) - rewardsLocked >= amount,
            "IPT: reward > holdings"
        );
        uint256 updateRewardsPerToken = (amount * SAFE_TOKEN_MULTIPLY) / totalSupply();
        // Update the running total of rewards per token
        rewardsPerToken = rewardsPerToken + updateRewardsPerToken;
        // Lock these tokens to pay out to insurers
        rewardsLocked = rewardsLocked + amount;
        emit FundsDistributed(msg.sender, amount);
    }

    /**
    * @notice Returns the amount of funds (rewards) withdrawable by the sender 
    */
    function withdrawableFundsOf() external view returns (uint256) {
        uint256 userRewardsPerToken = rewardsPerToken - lastRewardsUpdate[msg.sender];
        uint256 rewards = (userRewardsPerToken * balanceOf(msg.sender)) / SAFE_TOKEN_MULTIPLY;
        return rewards;
    }

    function withdrawFunds() external {
        return _withdrawFunds(msg.sender);
    }

    /**
    * @notice withdraws all funds (rewards) for a user
    */
    function _withdrawFunds(address account) internal {
        uint256 userRewardsPerToken = rewardsPerToken - lastRewardsUpdate[account];
        if (userRewardsPerToken == 0) {
            return;
        }
        uint256 rewards = (userRewardsPerToken * balanceOf(account)) / SAFE_TOKEN_MULTIPLY;
        // Unlock rewards
        rewardsLocked = rewardsLocked - rewards;
        // Update the users last rewards update to be current time
        lastRewardsUpdate[account] = rewardsPerToken;
        // Pay user
        require(ERC20(rewardToken).transfer(account, rewards), "IPT: Transfer failed");
    }
}
