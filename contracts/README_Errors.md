<center><h1><strong>Account Contract (Account.sol) Error Codes</strong></h1></center>

<h2><strong>Account Error Codes (Abbreviations):</strong></h2>

<strong>ACT:</strong> Account Error

<strong>ACTL:</strong> Account - Liquidation Related Error

***

 <center><h2>Errors:</h2></center>

***

    ACT: Deposit Amount <= 0
This error appears because you’re trying to deposit 0 or less tokens. You must deposit at least 1 token. Deposit a greater value.

    Relevant Function:
    function deposit(uint256 amount, address market) external override
***
    ACT: Withdraw Amount <= 0
This error appears because you’re trying to withdraw less than 1 token. You must withdraw at least 1 token. Withdraw a greater number of tokens. 

    Relevant Function:
    function withdraw(uint256 amount, address market) external override
***
    ACT: Withdraw below valid Margin
This error appears because this withdraw would put you below a valid margin, you cannot put yourself in a compromised position via withdrawing 

    Relevant Function:
    function withdraw(uint256 amount, address market) external override
***
    ACT: Target under-margined
This error appears because the target of the settle() function is not in a position to settle due to them being under-margin  

    Relevant Function:
    function settle(
        address account,
        int256 insuranceMultiplyFactor,
        int256 currentGlobalRate,
        int256 currentUserRate,
        int256 currentInsuranceGlobalRate,
        int256 currentInsuranceUserRate,
        int256 oraclePrice,
        int256 gasPrice,
        uint256 priceMultiplier,
        uint256 currentFundingIndex
    ) external override isValidTracer(msg.sender)

***

    ACTL: Liquidation amount <= 0
This error appears because you are trying to liquidate less than 1 token. You must liquidate at least 1 token 

    Relevant Function:
    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external override isValidTracer(market)
***
    ACTL: Account above margin
This error appears because the targeted account is above margin, they are therefore not in a position to be liquidated. 

    Relevant Function:
    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external override isValidTracer(market)

***
    ACTL: Liquidate Amount > Position
This error appears because you are trying to liquidate more than the liquitatable position. You cannot over-liquidate, enter a smaller value.

    Relevant Function:
    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external override isValidTracer(market)

***

    ACTL: GasPrice > FGasPrice

 This error appears because you are attempting to liquidate faster than the faster gasPrice. This is not allowed in order to preserve the insurance pool. 

    Relevant Function:
    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external override isValidTracer(market)

***


    ACTL: Taker undermargined
This error appears because the liquidator is not in a position to process this liquidation as they themselves are under margined.

    Relevant Function:
    function liquidate(
        int256 amount, 
        address account,
        address market
    ) external override isValidTracer(market)
***
    ACTL: Not Entitled
This error appears because you are not entitled to claim the funds related to this receipt as you are not the liquidator 

    Relevant Function:
    function claimEscrow(uint256 receiptID) public override
***
    ACTL: Already claimed
This error appears because this Liquidation ESCROW has already been claimed, you cannot claim again on this receipt

    Relevant Function:
    function claimEscrow(uint256 receiptID) public override
***
    ACTL: Not yet released
This error appears because the receipt has not yet been released; you must wait until the receipt is released. Refer to governance for the specific wait time. 

    Relevant Function:
    function claimEscrow(uint256 receiptID) public override
***
    ACT: Tracer only function
This error appears because an attempt was made to call a function in the account contract that only a valid (confirmed by TracerPerpetualsFactory) tracer contract can call. 

    Relevant Modifier: modifier onlyTracer(address market)
***
    ACT: Target not valid tracer
This error appears when you attempt to call a function with a tracer market as an argument and the address you have provided is not a valid Tracer address (not in TracerPerpetualsFactory). 

    Relevant Modifier: modifier isValidTracer(address market) 
***

<center><h1>Governance Error Codes</h1></center>

<h2>Governance Error Codes (Abbreviations):</h2>

GOV: Governance Error

GOVD: Governance error related to delegating 

***

<center><h2>Error Codes:</h2></center>

***
    GOV: Tokens vote locked

This error appears because you are attempting to withdraw tokens that are in a vote 

    Relevant Function:
    function withdraw(uint96 amount) external override
***
    GOVD: Already delegating
This error appears because you are attempting to delegate tokens when you are already delegating tokens. You can only have 1 delegate. 

    Relevant Function:
    function disableDelegates() external override
***
    GOVD: Delegate not accepting
This error appears because you are attempting to delegate tokens to a user who is not accepting delegations currently. 

    Relevant Function:
    function delegate(address to) external override onlyStaker()
***
    GOVD: Vote locked

This error appears because you are trying to delegate or remove a delegate while you are vote locked. You cannot delegate tokens or take back tokens while you are vote locked.

    Relevant Function:
    function delegate(address to) external override onlyStaker()
***
    GOVD: Already a delegate
This error appears because you are attempting to delegate tokens while you yourself are a delegate. You cannot delegate while being a delegate.

    Relevant Function: 
    function delegate(address to) external override onlyStaker()


***


    GOV: Not enough staked
This error appears because you are trying to make a proposal without having the minimum number of tokens staked in order to do so

    Relevant Function: 
    function propose(
        address[] memory targets, bytes[] memory proposalData
    ) public override onlyStaker()
***
    GOV: targets = 0"
This error appears because you are trying to make a proposal with 0 targets. Your proposal must have at least 1 target 

    Relevant Function: 
    function propose(
        address[] memory targets, bytes[] memory proposalData
    ) public override onlyStaker()
***
    GOV: Targets > max
This error appears because you are trying to make a proposal with too many targets. The maximum number of targets is decided by governance 

    Relevant Function: 
    function propose(
        address[] memory targets, bytes[] memory proposalData
    ) public override onlyStaker()
***
    GOV: Targets != Datas
This error appears because your proposal has a differing number of targets and ABI Data to send to each target. Each target must have its own proposal data. Length(address[]) = Length(bytes[]) 

    Relevant Function:  function propose(

        address[] memory targets, bytes[] memory proposalData
    ) public override onlyStaker()

***
    GOV: Proposal state != PASSED
This error appears because you are attempting to execute a proposal that is not currently stored as "passed".
This could be because:
- The required amount of votes have not been received
- The proposal has been rejected
- The proposal has has already been executed

***

    GOV: Proposal expired
This error appears because you are attempting to execute an expired proposal.

    Relevant Function:
    function execute(uint256 proposalId) external override

***

    GOV: Cooling Off
This error appears because you are attempting to execute a proposal that is still cooling off. You must wait until the cooling off period has ended.

    Relevant Function:
    function execute(uint256 proposalId) external override
***
    GOV: Failed execution
This error appears when a target of the proposal has failed to execute its proposal data. All targets must execute in a proposal. 

    Relevant Function:
    function execute(uint256 proposalId) external override
***
    GOV: Warming up
This error appears when you attempt to vote on a proposal that is still warming up. You must wait until the proposal has exited its warming up period. 

    Relevant Function:
    function vote( 
        uint256 proposalId,
        bool userVote,
        uint256 amount
    ) external override onlyStaker()
***
    GOV: Proposer cant vote
This error appears because you are attempting to vote on your own proposal. You cannot vote on your own proposal. 

    Relevant Function:
    function vote( 
        uint256 proposalId,
        bool userVote,
        uint256 amount
    ) external override onlyStaker()

***
    GOV: Proposal note voteable
This error appears because you are trying to vote on a proposal when the proposal's state is not "PROPOSED".
This is due to the fact that the proposal has already been passed or rejected.

***

    GOV: Vote amount > staked amount
This error appears because you are attempting to vote with more tokens than you have staked 

    Relevant Function:
    function vote( 
        uint256 proposalId,
        bool userVote,
        uint256 amount
    ) external override onlyStaker()
***
    GOV: Only governance
This error appears because you are attempting to call a function that only the governance contract can call 

    Relevant Modifier: modifier onlyGov()
***
    GOV: Only staker
This error appears because you are attempting to call a function that only a staker can call. You must stake to use this function 

    Relevant Modifier: modifier onlyStaker()

***








<center><h1>Insurance Error Codes</h1></center>

<h2>Insurance Error Codes (Abbreviations)</h2>

INS: Insurance error 

****
<center><h2>Insurance Errors:</h2></center>

***
    INS: Tracer not supported
This error appears when you attempt to stake in a tracer market that is not supported (i.e. not in TracerPerpetualsFactory) 

    Relevant Functions:
    function stake(uint256 amount, address market) external override
***
    INS: amount <= 0
This error appears when you attempting to withdraw 0 or less tokens from an insurance pool. You must withdraw at least 1 token 

    Relevant Functions:
    function withdraw(uint256 amount, address market) external override
***
    INS: balance < amount
This error appears because you are attempting to withdraw more tokens from the insurance pool than you have. 

    Relevant Functions:
    function withdraw(uint256 amount, address market) external override
***
    INS: amount > rewards
This error appears when the amount of rewards that are being given to a pool exceeds the Insurance funds Tracer Token balance

    Relevant Functions:
    function reward(uint256 amount, address market) external override onlyOwner()

***
    INS: sender is not account
This error appears because you are trying to call a function with the onlyAccount modifier, which makes sure msg.sender is the account contract

    Relevant Functions:
    modifier onlyAccount();

***




<center><h1>Insurance Pool Token Error Codes </h1></center>

<h2>Insurance Pool Token Error Codes (Abbreviations):</h2>

IPT: Insurance pool token error 

***
<center><h2>Insurance Pool Token Errors:</h2></center>

***
    IPT: reward > holdings
This error appears when the token contract doesn’t have enough reward tokens to distribute considering the amount you are depositing 

    Relevant Function:
    function depositFunds(uint256 amount) public
***
    IPT: Transfer failed
This error appears when you attempt to withdraw all your tokens from an insurance pool and it fails 

    Relevant Function:
    function _withdrawFunds(address account) internal
***

 
<center><h1>Pricing Error Codes</h1></center>

<h2>Pricing Error Codes (Abbreviations)</h2>

PRC: Pricing Error 

***
<center><h2>Pricing Errors:</h2></center>

***
    PRC: Only Tracer
This error appears because you are trying to call a function that is accessible only to valid tracers (tracers that are in TracerPerpetualsFactory)

    Relevant Modifier: modifier onlyTracer(address market)
***


<center><h1>Receipt Error Codes</h1></center>



<h2>Receipt Error Codes (Abbreviations)</h2>

LIQ: Liquidation Error 
***
<center><h2>Liquidation Errors:</h2></enter>

***

    LIQ: Liquidator mismatch
This error appears because the liquidator address provided as an argument does not match the address of the liquidator named on the receipt. They must be the same 

    Relevant Function:
    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        address market,
        address liquidator
    ) external override onlyAccount returns (uint256)
***
    LIQ: claim time passed
This error appears because you are attempting to claim a receipt that has not been released yet. Wait until after the release time

    Relevant Function:
    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        address market,
        address liquidator
    ) external override onlyAccount returns (uint256)
***
    LIQ: Already claimed
This error appears because you are attempting to claim a receipt that has already been claimed. You cannot claim a receipt twice. 

    Relevant Function:
    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        address market,
        address liquidator
    ) external override onlyAccount returns (uint256)

****


    LIQ: Unit mismatch
This error appears because the amount of liquidated units sold off does not match up with the amount that was supposed to be liquidated. (I.e. the wrong number of OrderIDs have been provided). 

    Relevant Function:
    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        address market,
        address liquidator
    ) external override onlyAccount returns (uint256)
***
    LIQ: Liquidatee mismatch
This error appears because the liquidate address supplied to the function does not match the liquidate listed on the receipt relevant to this ESCROW. 

    Relevant Function:
    function claimEscrow(uint256 receiptID, address liquidatee) public override onlyAccount returns (int256)
***
    LIQ: Escrow claimed
This error appears because you are attempting to claim escrow that has been previously claimed. You cannot reclaim the escrow relevant to the same receipt more than once. 

    Relevant Function:
    function claimEscrow(uint256 receiptID, address liquidatee) public override onlyAccount returns (int256)
***
    LIQ: Not released
This error appears because the escrow you are trying to claim has not yet been released. Refer to the release time on your receipt to find when you can claim this escrow 

    Relevant Function:
    function claimEscrow(uint256 receiptID, address liquidatee) public override onlyAccount returns (int256)
***
    LIQ: Order creation before liquidation
This error appears because the orders that you are claiming the receipt for slippage against were created before the liquidation receipt was created. You can only claim receipts on orders that were made with the position acquired from the liquidation.

    Relevant Function:
    function claimReceipts(
        uint256 escrowId,
        uint256[] memory orderIds,
        uint256 priceMultiplier,
        address market,
        address liquidator
    ) external override onlyAccount returns (uint256);
***
    LIQ: Only accounts
This error appears because you are attempting to call a function that only an account contract can call 

    Relevant modifier:
    modifier onlyAccount()


***


<center><h1>Tracer Error Codes</h1></center>

<h2>Tracer Error Codes (Abbreviations)</h2>

TRC: Tracer Error 

***

<center><h1>Tracer Errors:</h1></center>

***

    TCR: Pricing already set
This error is appearing because you are attempting to initialize pricing on a tracer who has had its price set already. 

    Relevant function: function initializePricing() public override onlyOwner
***
    TCR: Invalid margin
This error is appearing is because you are attempting to an order that would put you in an invalid margin position. You cannot put yourself in a compromised position through a trade/order. Make a different order. 

    Relevant functions: 
    function permissionedMakeOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration,
        address maker
    ) public override isPermissioned(maker) returns (uint256)
 & 

    function makeOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration
    ) public override returns (uint256)
***
    TCR: Margin change <=0
This error appears because an attempt was made to take an order that would result in a negative (or even) margin change. Taken orders must result in a positive margin change.

    Relevant Function: 
    function permissionedTakeOrder(
        uint256 orderId,
        uint256 amount,
        address _taker
    ) public override isPermissioned(_taker)

***


    TCR: Margin Invalid post trade
This error appears because you are attempting to take an order that would result in either the maker or taker being in a compromised margin position post trade. You cannot take an order that would result in you or the other party becoming under-margined. 

    Relevant Function: 
    function permissionedTakeOrder(
        uint256 orderId,
        uint256 amount,
        address _taker
    ) public override isPermissioned(_taker)
***

    TCR: No trade permission
This error appears because you are trying use a function that only a a valid account contract with trade permissions can call

    Relevant modifier:
    modifier isPermissioned(address account) 

***

<center><h1>Tracer Factory Error Codes</h1></center>


<h2>Trader Error Codes (Abbreviations)</h2>

TRC: Tracer Factory Error 
***

<center><h2>Tracer Factory Errors:</h2></center>

***


    TFC: Market already deployed
This error appears because you are trying deploy a tracer market that already exists. You cannot deploy the same market twice. 

    Relevant Function:
    function deployTracer(
        bytes calldata _data
    ) external onlyOwner()
***

<center><h1>Trader Error Codes</h1></center>


<h2>Trader Error Codes (Abbreviations)</h2>

TDR: Trader Error 
***

<center><h2>Trader Errors:</h2></center>

***


    TDR: incorrect make sig or nonce
This error appears because one of the helper functions `verifySignature` or `verifyNonce` returned false for a provided make order. This means there is an issue with one of the signature or nonce-related fields in a provided make order. 

    Relevant Functions:

    function executeTrade(
        Types.SignedLimitOrder[] memory makerOrders,
        Types.SignedLimitOrder[] memory takerOrders,
        address market
    ) external
&

    function verify(
        address signer,
        Types.LimitOrder memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view returns (bool) {
&

    function verifySignature(
        address signer,
        Types.LimitOrder memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view returns (bool) {

***

    TDR: Mismatched sides
This error appears because the `executeTrade` function received two arrays of unequal length. This is an error as the semantics of `executeTrade` require each make order to have a corresponding taker, and vice versa.

    Relevant Functions:

    function executeTrade(
        Types.SignedLimitOrder[] memory makerOrders,
        Types.SignedLimitOrder[] memory takerOrders,
        address market
    ) external

***


    TDR: incorrect take sig or nonce
This error appears because one of the helper functions `verifySignature` or `verifyNonce` returned false for a provided take order. This means there is an issue with one of the signature or nonce-related fields in a provided take order. 

    Relevant Functions:

    function executeTrade(
        Types.SignedLimitOrder[] memory makerOrders,
        Types.SignedLimitOrder[] memory takerOrders,
        address market
    ) external
&

    function verify(
        address signer,
        Types.LimitOrder memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view returns (bool) {
&

    function verifySignature(
        address signer,
        Types.LimitOrder memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view returns (bool) {

***

    TDR: price mismatch
This error appears when one of the provided take orders has a price that is different from its corresponding make order's price.

    Relevant Function:

    function executeTrade(
        Types.SignedLimitOrder[] memory makerOrders,
        Types.SignedLimitOrder[] memory takerOrders,
        address market
    ) external

***

<center><h1>LogDex Error Codes</h1></center>

<h2>LogDex Error Codes (Abbreviations)</h2>

LDX: LogDex error 

****
<center><h2>LogDex Errors:</h2></center>

***

    LDX: Order exists
This error occurs when you are trying to make an order, but an order of that ID already exists.

    Relevant function:
    function _makeOrder(
        uint256 amount,
        int256 price,
        bool side,
        uint256 expiration,
        address maker
    ) internal returns (bytes32)

***

    LDX: Order doesn't exist
This error occurs when you are trying to take an order, but an order of that ID does not exist.

    Relevant function:
    function _takeOrder(
        OrderLib.Order memory order,
        uint256 amount,
        address _taker
    ) internal

***

    LDX: amount > order amount
This error occurs when you are trying to take an order, but you the amount given as a parameter is more than the order's amount. i.e. You are trying to buy more units than are available in this order.

    Relevant function:
    function _takeOrder(
        OrderLib.Order memory order,
        uint256 amount,
        address _taker
    ) internal

***

    LDX: Order expired
This error occurs when you are trying to take an order, but the order of the given ID has expired.

    Relevant function:
    function _takeOrder(
        OrderLib.Order memory order,
        uint256 amount,
        address _taker
    ) internal

***

<center><h1>PackedDex Error Codes</h1></center>

<h2>PackedDex Error Codes (Abbreviations)</h2>

PDX: PackedDex error 

****
<center><h2>PackedDex Errors:</h2></center>

*** 

    PDX: amount > order amount
This error occurs when you are trying to take an order, but you the amount given as a parameter is more than the order's amount. i.e. You are trying to buy more units than are available in this order.

    Relevant function:
    function _takeOrder(
        bytes32 orderId,
        uint32 amount,
        address _taker
    ) internal returns (OrderLibV2.Order memory, uint256)

***

    PDX: Order expired
This error occurs when you are trying to take an order, but the order of the given ID has expired.

    Relevant function:
    function _takeOrder(
        bytes32 orderId,
        uint32 amount,
        address _taker
    ) internal returns (OrderLibV2.Order memory, uint256)

***

<center><h1>SimpleDex Error Codes</h1></center>

<h2>SimpleDex Error Codes (Abbreviations)</h2>

SDX: SimpleDex error 

****
<center><h2>SimpleDex Errors:</h2></center>

*** 

    SDX: Order filled
This error occurs when you are trying to take an order, but the order has already been filled.

    Relevant function:
    function _takeOrder(
        bytes32 orderId,
        uint32 amount,
        address _taker
    ) internal returns (OrderLibV2.Order memory, uint256)

***

    SDX: Order expired
This error occurs when you are trying to take an order, but the order has expired.

    Relevant function:
    function _takeOrder(
        bytes32 orderId,
        uint32 amount,
        address _taker
    ) internal returns (OrderLibV2.Order memory, uint256)

***

<center><h1>HeapLib Error Codes</h1></center>

<h2>HeapLib Error Codes (Abbreviations)</h2>

HLB: HeapLib error 

****
<center><h2>HeapLib Errors:</h2></center>

*** 

    HLB: heap length <= 1
This error occurs when you are trying to remove the root of a heap, but their is only one element.

    Relevant function:
    function removeRoot(bytes32[] storage heap, bytes4 compareSelector) internal returns (bytes32)

***
